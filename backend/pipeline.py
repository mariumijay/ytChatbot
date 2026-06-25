import os
import warnings
warnings.filterwarnings("ignore")

import requests
import http.cookiejar
import yt_dlp
from groq import Groq
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
from langchain_core.retrievers import BaseRetriever
from langchain_core.callbacks.manager import CallbackManagerForRetrieverRun
from langchain_community.retrievers import BM25Retriever
from typing import List
import imageio_ffmpeg

# Set ffmpeg path automatically
os.environ["FFMPEG_BINARY"] = imageio_ffmpeg.get_ffmpeg_exe()

load_dotenv()

# Write cookies from env var to file (for Render deployment)
_cookies_content = os.getenv("YOUTUBE_COOKIES")
if _cookies_content and not os.path.exists("cookies.txt"):
    with open("cookies.txt", "w") as f:
        f.write(_cookies_content)
    print("cookies.txt written from environment variable")

def get_video_id(url):
    """Extract video ID from any YouTube URL format."""
    if "youtu.be" in url:
        return url.split("youtu.be/")[-1].split("?")[0]
    elif "v=" in url:
        return url.split("v=")[-1].split("&")[0]
    else:
        raise ValueError(f"Invalid YouTube URL: {url}")


def get_transcript_groq_whisper(video_id):
    """Download audio and transcribe using Groq Whisper API."""
    url = f"https://www.youtube.com/watch?v={video_id}"
    audio_file = f"{video_id}.mp3"

    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': f'{video_id}.%(ext)s',
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
        }],
        'ffmpeg_location': imageio_ffmpeg.get_ffmpeg_exe(),
        'cookiefile': '/tmp/cookies.txt' if os.path.exists('/tmp/cookies.txt') else None,
        'quiet': True
    }

    print(f"Downloading audio for {video_id}...")
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([url])

    print(f"Transcribing {video_id} with Groq Whisper...")
    client = Groq(api_key=os.getenv("GROQ_API_KEY"))
    with open(audio_file, "rb") as f:
        transcription = client.audio.transcriptions.create(
            file=(audio_file, f.read()),
            model="whisper-large-v3",
            language="en"
        )

    os.remove(audio_file)
    print(f"Transcription done for {video_id}")
    return transcription.text

def get_transcript(video_id):
    """Fetch transcript — no cookies needed."""
    try:
        # Try without cookies first (works for most videos)
        ytt = YouTubeTranscriptApi()
        return " ".join(chunk.text for chunk in ytt.fetch(video_id))
    except Exception:
        try:
            # Try with cookies if available
            if os.path.exists("cookies.txt"):
                session = requests.Session()
                cookies = http.cookiejar.MozillaCookieJar("cookies.txt")
                cookies.load()
                session.cookies = cookies
                ytt = YouTubeTranscriptApi(http_client=session)
                return " ".join(chunk.text for chunk in ytt.fetch(video_id))
        except Exception:
            pass

        try:
            # Try any available language
            ytt = YouTubeTranscriptApi()
            transcript_list = ytt.list(video_id)
            for transcript in transcript_list:
                try:
                    return " ".join(chunk.text for chunk in transcript.fetch())
                except Exception:
                    continue
        except Exception:
            pass

        # Final fallback — Groq Whisper
        print(f"No captions found — falling back to Groq Whisper...")
        return get_transcript_groq_whisper(video_id)

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


def save_vector_store(vector_store, path="faiss_index"):
    """Save vector store to disk."""
    vector_store.save_local(path)
    print(f"Vector store saved to {path}")


def load_vector_store(path="faiss_index"):
    """Load vector store from disk."""
    embeddings = NomicEmbeddings(model="nomic-embed-text-v1.5")
    vector_store = FAISS.load_local(path, embeddings, allow_dangerous_deserialization=True)
    print(f"Vector store loaded from {path}")
    return vector_store


class HybridRetriever(BaseRetriever):
    """Hybrid retriever combining BM25 keyword + semantic search."""
    bm25_retriever: any
    semantic_retriever: any

    def _get_relevant_documents(
        self, query: str, *, run_manager: CallbackManagerForRetrieverRun = None
    ) -> List[Document]:
        bm25_docs = self.bm25_retriever.invoke(query)
        semantic_docs = self.semantic_retriever.invoke(query)

        # Combine and deduplicate
        seen = set()
        combined = []
        for doc in semantic_docs + bm25_docs:
            key = doc.page_content[:100]
            if key not in seen:
                seen.add(key)
                combined.append(doc)

        return combined[:8]


def build_hybrid_retriever(chunks, vector_store):
    """Build a hybrid retriever combining semantic + keyword search."""
    semantic = vector_store.as_retriever(
        search_type="similarity",
        search_kwargs={"k": 5}
    )
    bm25 = BM25Retriever.from_documents(chunks)
    bm25.k = 5

    return HybridRetriever(bm25_retriever=bm25, semantic_retriever=semantic)


def build_chain(retriever):
    """Build the RAG chain with chat history."""
    llm = ChatGroq(
        model=os.getenv("GROQ_MODEL"),
        temperature=0.3,
        api_key=os.getenv("GROQ_API_KEY")
    )
    prompt = PromptTemplate(
        template="""
        You are a helpful assistant that answers questions about YouTube podcast videos.
        Answer ONLY from the provided transcript context.
        If the context is insufficient, just say you don't know.

        Each chunk of context has a video_id in its metadata.
        When comparing videos, reference them by their video_id.

        Previous conversation:
        {chat_history}

        Context: {context}
        Question: {question}
        """,
        input_variables=["context", "question", "chat_history"]
    )

    def format_docs(docs):
        return "\n\n".join(
            f"[Video: {doc.metadata.get('video_id', 'unknown')}]\n{doc.page_content}"
            for doc in docs
        )

    chain = RunnableParallel({
        "context": RunnableLambda(lambda x: x["question"]) | retriever | RunnableLambda(format_docs),
        "question": RunnableLambda(lambda x: x["question"]),
        "chat_history": RunnableLambda(lambda x: x["chat_history"])
    }) | prompt | llm | StrOutputParser()

    return chain


def build_pipeline(url):
    """Single video pipeline: URL → chain ready to query."""
    video_id = get_video_id(url)
    index_path = f"faiss_index_{video_id}"

    if os.path.exists(index_path):
        print(f"Loading existing index for {video_id}...")
        vector_store = load_vector_store(index_path)
    else:
        print(f"Fetching transcript for {video_id}...")
        transcript = get_transcript(video_id)
        print(f"Transcript length: {len(transcript)} chars")
        vector_store = build_vector_store(transcript, url, video_id)
        save_vector_store(vector_store, index_path)

    chunks = list(vector_store.docstore._dict.values())
    retriever = build_hybrid_retriever(chunks, vector_store)
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

            index_path = f"faiss_index_{video_id}"
            if os.path.exists(index_path):
                print(f"Loading existing index for {video_id}...")
                vector_store = load_vector_store(index_path)
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

    embeddings = NomicEmbeddings(model="nomic-embed-text-v1.5")
    combined_store = FAISS.from_documents(all_chunks, embeddings)
    retriever = build_hybrid_retriever(all_chunks, combined_store)
    chain = build_chain(retriever)

    print("Multi-video pipeline ready!")
    return chain