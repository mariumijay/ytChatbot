# 🎥 YouTube Chatbot (ytChatbot)

A conversational AI chatbot built with [LangChain](https://www.langchain.com/) that can **extract transcripts from YouTube videos, process them, and answer questions interactively**.  
This project uses Google’s Generative AI for embeddings and chat responses, with FAISS as the vector store for efficient retrieval.

---

## 🚀 Features
- Extracts transcripts directly from YouTube videos (via audio + parsing).  
- Converts transcripts into embeddings using **Google Generative AI**.  
- Stores vectorized data in **FAISS** for fast similarity search.  
- Splits text intelligently with **RecursiveCharacterTextSplitter** for better context management.  
- Chatbot powered by **LangChain + ChatGoogleGenerativeAI**.  
- Supports querying and conversation over YouTube video content.  

---

## 📦 Dependencies
Make sure you have Python 3.9+ installed. Required libraries include:

- `langchain`  
- `langchain-community`  
- `langchain-google-genai`  
- `faiss`  
- `openai-whisper` (for parsing audio into transcripts)  

Install everything with:
```bash
pip install -r requirements.txt
