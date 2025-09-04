# %%
import os
from dotenv import load_dotenv

# this loads variables from .env into environment
load_dotenv()

# now you can access them
google_key = os.getenv("GOOGLE_API_KEY")
print("Loaded key:", google_key[:6] + "..." if google_key else "Not found")


# %%
import langchain_google_genai

google_key = os.getenv("GOOGLE_API_KEY")



# %%
from langchain.document_loaders import PyPDFLoader
loader = PyPDFLoader("ytvideo.pdf")
pages = loader.load_and_split()

# %%
len(pages)

# %%
page = pages[0]

# %%
print(page.page_content[0:500])

# %%
page.metadata

# %%
from langchain_community.document_loaders.generic import GenericLoader

from langchain_google_genai import GoogleGenerativeAIEmbeddings

from langchain_google_genai import ChatGoogleGenerativeAI

from langchain_community.vectorstores import FAISS

from langchain.prompts import PromptTemplate

from langchain_community.document_loaders.blob_loaders import FileSystemBlobLoader

from langchain.document_loaders.parsers import OpenAIWhisperParser

from langchain.document_loaders.blob_loaders.youtube_audio import YoutubeAudioLoader

from langchain.text_splitter import RecursiveCharacterTextSplitter, CharacterTextSplitter

# %%
chunk_size =1000
chunk_overlap = 200

# %%
r_splitter = RecursiveCharacterTextSplitter(
    chunk_size=chunk_size,
    chunk_overlap=chunk_overlap
)
r_chunks = r_splitter.split_documents(pages)


# %%
for i, chunk in enumerate(r_chunks[:5]):  # how many chunks u want to print
    print(f"--- Chunk {i+1} ---")
    print(chunk.page_content[:2000]) # print first   num of char in chunk
    print()

# %%
embeddings = GoogleGenerativeAIEmbeddings(model="models/embedding-001")

# %%
vector_store = FAISS.from_documents(r_chunks, embeddings)

# %%
query = "What does RAG stand for in AI?"
results = vector_store.similarity_search(query, k=3)

# %%
vector_store.index_to_docstore_id

# %%
vector_store.get_by_ids(['bdaa4387-402a-47e2-8449-025f24fb4a5e'])

# %%
retriever = vector_store.as_retriever(search_type="similarity", search_kwargs={"k": 5})


# %%
retriever_results = retriever.get_relevant_documents(query)
for r in retriever_results:
    print(f"Page {r.metadata['page']}: {r.page_content[:500]}")

# %%
llm = ChatGoogleGenerativeAI(model="gemini-1.5-flash", temperature=1.5)


# %%
prompt = PromptTemplate(
    template="""
      You are a helpful assistant.
      Answer ONLY from the provided transcript context.
      If the context is insufficient, just say you don't know.

      {context}
      Question: {question}
    """,
    input_variables = ['context', 'question']
)

# %%
question          = "What does RAG stand for in AI"
retrieved_docs    = retriever.invoke(query)

# %%
retrieved_docs

# %%
context_text = "\n\n".join(doc.page_content for doc in retrieved_docs)
context_text

# %%
final_prompt = prompt.invoke({"context": context_text, "question": question})

# %%
final_prompt

# %% [markdown]
# # Generation

# %%
answer = llm.invoke(final_prompt)
print(answer.content)

# %% [markdown]
# # Building a Chain

# %%
from langchain_core.runnables import RunnableParallel, RunnablePassthrough, RunnableLambda
from langchain_core.output_parsers import StrOutputParser

# %%
def format_docs(retrieved_docs):
  context_text = "\n\n".join(doc.page_content for doc in retrieved_docs)
  return context_text

# %%
parallel_chain = RunnableParallel({
    'context': retriever | RunnableLambda(format_docs),
    'question': RunnablePassthrough()
})

# %%
parallel_chain.invoke('What does RAG stand for in AI?')

# %%
parser = StrOutputParser()

# %%
main_chain = parallel_chain | prompt | llm | parser

# %%
main_chain.invoke('what is rag ?')

# %%



