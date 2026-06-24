import os
import requests
import http.cookiejar
from dotenv import load_dotenv
from youtube_transcript_api import YouTubeTranscriptApi
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_nomic import NomicEmbeddings
from langchain_groq import ChatGroq
from langchain_community.vectorstores import FAISS
from langchain_core.prompts import PromptTemplate
from langchain_core.runnables import RunnableParallel, RunnablePassthrough, RunnableLambda
from langchain_core.output_parsers import StrOutputParser

load_dotenv()


def get_video_id(url):
    """Extract video ID from any YouTube URL format."""
    if "youtu.be" in url:
        return url.split("youtu.be/")[-1].split("?")[0]
    elif "v=" in url:
        return url.split("v=")[-1].split("&")[0]
    else:
        raise ValueError(f"Invalid YouTube URL: {url}")


def get_transcript(video_id):
    """Fetch transcript — fallback to any available language."""
    session = requests.Session()
    cookies = http.cookiejar.MozillaCookieJar("cookies.txt")
    cookies.load()
    session.cookies = cookies
def get_transcript(video_id):
    """Fetch transcript — fallback to any available language."""
    session = requests.Session()
    cookies = http.cookiejar.MozillaCookieJar("cookies.txt")
    cookies.load()
    session.cookies = cookies

    ytt = YouTubeTranscriptApi(http_client=session)

    try:
        return " ".join(chunk.text for chunk in ytt.fetch(video_id))
    except Exception:
        transcript_list = ytt.list(video_id)
        for transcript in transcript_list:
            try:
                return " ".join(chunk.text for chunk in transcript.fetch())
            except Exception:
                continue
        raise ValueError(f"No transcript available for {video_id}")

def build_vector_store(transcript, url, video_id):
    """Chunk transcript and build FAISS vector store."""
    doc = Document(
        page_content=transcript,
        metadata={"source": url, "video_id": video_id}
    )
    chunks = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200
    ).split_documents([doc])

    embeddings = NomicEmbeddings(model="nomic-embed-text-v1.5")
    vector_store = FAISS.from_documents(chunks, embeddings)
    return vector_store


def build_chain(retriever):
    """Build the RAG chain with chat history."""
    llm = ChatGroq(model="llama-3.3-70b-versatile", temperature=0.3)

    prompt = PromptTemplate(
        template="""
        You are a helpful assistant that answers questions about a YouTube video.
        Answer ONLY from the provided transcript context.
        If the context is insufficient, just say you don't know.

        Previous conversation:
        {chat_history}

        Context: {context}
        Question: {question}
        """,
        input_variables=["context", "question", "chat_history"]
    )

    def format_docs(docs):
        return "\n\n".join(doc.page_content for doc in docs)

    chain = RunnableParallel({
        "context": RunnableLambda(lambda x: x["question"]) | retriever | RunnableLambda(format_docs),
        "question": RunnableLambda(lambda x: x["question"]),
        "chat_history": RunnableLambda(lambda x: x["chat_history"])
    }) | prompt | llm | StrOutputParser()

    return chain

def build_pipeline(url):
    """Full pipeline: URL → chain ready to query."""
    print(f"Processing: {url}")

    video_id = get_video_id(url)
    print(f"Video ID: {video_id}")

    print("Fetching transcript...")
    transcript = get_transcript(video_id)
    print(f"Transcript length: {len(transcript)} chars")

    print("Building vector store...")
    vector_store = build_vector_store(transcript, url, video_id)
    retriever = vector_store.as_retriever(
        search_type="similarity",
        search_kwargs={"k": 5}
    )
    print(f"Total vectors indexed: {vector_store.index.ntotal}")

    print("Building chain...")
    chain = build_chain(retriever)
    print("Pipeline ready!")

    return chain

def build_multi_pipeline(urls):
    """Build a pipeline from multiple YouTube URLs."""
    all_chunks = []

    for url in urls:
        try:
            video_id = get_video_id(url)
            print(f"Processing: {video_id}")

            # Check if already saved
            index_path = f"faiss_index_{video_id}"
            if os.path.exists(index_path):
                print(f"Loading existing index for {video_id}...")
                vector_store = load_vector_store(index_path)
                # get chunks from existing store
                chunks = list(vector_store.docstore._dict.values())
            else:
                print(f"Fetching transcript for {video_id}...")
                transcript = get_transcript(video_id)
                doc = Document(
                    page_content=transcript,
                    metadata={"source": url, "video_id": video_id}
                )
                chunks = RecursiveCharacterTextSplitter(
                    chunk_size=1000,
                    chunk_overlap=200
                ).split_documents([doc])
                print(f"Got {len(chunks)} chunks from {video_id}")

            all_chunks.extend(chunks)

        except Exception as e:
            print(f"Skipping {url} — Error: {e}")
            continue

    if not all_chunks:
        raise ValueError("No chunks found — check your URLs")

    print(f"\nTotal chunks across all videos: {len(all_chunks)}")

    # Build one shared vector store
    embeddings = NomicEmbeddings(model="nomic-embed-text-v1.5")
    combined_store = FAISS.from_documents(all_chunks, embeddings)
    retriever = combined_store.as_retriever(
        search_type="similarity",
        search_kwargs={"k": 5}
    )

    chain = build_chain(retriever)
    print("Multi-video pipeline ready!")
    return chain    