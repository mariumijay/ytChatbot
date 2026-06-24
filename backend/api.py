import os
import asyncio
import yt_dlp
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import List, Optional
from pipeline import build_pipeline, build_multi_pipeline, get_video_id

app = FastAPI(
    title="PodcastGPT API",
    description="Chat with any YouTube podcast using RAG",
    version="1.0.0"
)

# CORS — allow React frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Session State ───────────────────────────────────────────
session = {
    "chain": None,
    "urls": [],
    "video_ids": [],
    "titles": [],
    "chat_history": []
}

# ─── Request Models ──────────────────────────────────────────
class LoadRequest(BaseModel):
    url: str

class LoadMultiRequest(BaseModel):
    urls: List[str]

class ChatRequest(BaseModel):
    question: str

# ─── Helper ──────────────────────────────────────────────────

def get_video_title(url: str) -> str:
    """Fetch video title using yt-dlp."""
    try:
        with yt_dlp.YoutubeDL({'quiet': True}) as ydl:
            info = ydl.extract_info(url, download=False)
            return info.get('title', 'Unknown Video')
    except:
        return 'Unknown Video'

# ─── Endpoints ───────────────────────────────────────────────

@app.get("/health")
def health():
    """Check if API is running."""
    return {"status": "ok", "message": "PodcastGPT API is running"}


@app.get("/status")
def status():
    """Show currently loaded videos."""
    return {
        "loaded": len(session["urls"]) > 0,
        "urls": session["urls"],
        "video_ids": session["video_ids"],
        "titles": session["titles"],
        "message_count": len(session["chat_history"])
    }


@app.post("/load")
def load_video(request: LoadRequest):
    """Load a single YouTube video into the pipeline."""
    try:
        video_id = get_video_id(request.url)

        # Get video title
        print(f"Fetching title for {video_id}...")
        title = get_video_title(request.url)

        print(f"Loading video: {video_id} - {title}")
        chain = build_pipeline(request.url)

        # Update session
        session["chain"] = chain
        session["urls"] = [request.url]
        session["video_ids"] = [video_id]
        session["titles"] = [title]
        session["chat_history"] = []

        return {
            "success": True,
            "message": "Video loaded successfully",
            "video_id": video_id,
            "title": title,
            "url": request.url
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/load-multi")
def load_multiple_videos(request: LoadMultiRequest):
    """Load multiple YouTube videos into the pipeline."""
    try:
        if not request.urls:
            raise HTTPException(status_code=400, detail="No URLs provided")

        if len(request.urls) > 5:
            raise HTTPException(status_code=400, detail="Maximum 5 URLs allowed")

        print(f"Loading {len(request.urls)} videos...")
        chain = build_multi_pipeline(request.urls)

        # Get video IDs and titles
        video_ids = []
        titles = []
        for url in request.urls:
            try:
                video_ids.append(get_video_id(url))
            except:
                video_ids.append("unknown")
            titles.append(get_video_title(url))

        session["chain"] = chain
        session["urls"] = request.urls
        session["video_ids"] = video_ids
        session["titles"] = titles
        session["chat_history"] = []

        return {
            "success": True,
            "message": f"{len(request.urls)} videos loaded successfully",
            "video_ids": video_ids,
            "titles": titles,
            "urls": request.urls
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/chat")
async def chat(request: ChatRequest):
    """Chat with loaded videos — streams response."""
    if session["chain"] is None:
        raise HTTPException(
            status_code=400,
            detail="No video loaded. Please call /load or /load-multi first."
        )

    if not request.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    async def stream_response():
        try:
            # Format chat history
            history_text = "\n".join(session["chat_history"][-10:])

            # Stream response
            full_response = ""
            async for chunk in session["chain"].astream({
                "question": request.question,
                "chat_history": history_text
            }):
                full_response += chunk
                yield chunk

            # Save to history
            session["chat_history"].append(f"You: {request.question}")
            session["chat_history"].append(f"Bot: {full_response}")

        except Exception as e:
            yield f"Error: {str(e)}"

    return StreamingResponse(
        stream_response(),
        media_type="text/plain"
    )


@app.delete("/reset")
def reset_session():
    """Clear current session and chat history."""
    session["chain"] = None
    session["urls"] = []
    session["video_ids"] = []
    session["titles"] = []
    session["chat_history"] = []

    return {
        "success": True,
        "message": "Session cleared successfully"
    }


# ─── Run ─────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("api:app", host="0.0.0.0", port=8000, reload=True)