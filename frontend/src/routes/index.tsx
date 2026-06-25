import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Mic, Send, Github, Sparkles, Zap, Brain, Podcast, Plus,
  Check, Loader2, X, Bot, ArrowRight, Play, Link, Trophy, Layers,
  ChevronLeft, ChevronRight, RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "YouTubeChat AI" },
      { name: "description", content: "Turn any YouTube video into an AI you can talk to." },
    ],
  }),
  component: App,
});

type View = "landing" | "loading" | "chat";
type Msg = { id: string; role: "user" | "bot"; text: string; time: string };
type VideoInfo = { video_id: string; url: string; title: string; video_ids?: string[]; titles?: string[] };
type MCQ = {
  id: number;
  question: string;
  options: { A: string; B: string; C: string; D: string };
  correct: string;
  explanation: string;
};
type Flashcard = { id: number; front: string; back: string };

const API_URL = "http://localhost:8000";
const nowTime = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const SUGGESTIONS = ["What is this video about?", "What are the key takeaways?", "Summarize in 3 points"];

// ─── API Functions ───────────────────────────────────────────

const loadVideo = async (url: string) => {
  const response = await fetch(`${API_URL}/load`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) });
  if (!response.ok) { const error = await response.json(); throw new Error(error.detail || "Failed to load video"); }
  return await response.json();
};

const loadMultiVideo = async (urls: string[]) => {
  const response = await fetch(`${API_URL}/load-multi`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ urls }) });
  if (!response.ok) { const error = await response.json(); throw new Error(error.detail || "Failed to load videos"); }
  return await response.json();
};

const streamChat = async (question: string, onChunk: (chunk: string) => void) => {
  const response = await fetch(`${API_URL}/chat`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question }) });
  if (!response.ok) { const error = await response.json(); throw new Error(error.detail || "Failed to get response"); }
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  while (true) { const { done, value } = await reader.read(); if (done) break; onChunk(decoder.decode(value)); }
};

const fetchMCQ = async (): Promise<MCQ[]> => {
  const response = await fetch(`${API_URL}/mcq`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
  if (!response.ok) throw new Error("Failed to generate quiz");
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let full = "";
  while (true) { const { done, value } = await reader.read(); if (done) break; full += decoder.decode(value); }
  return JSON.parse(full.replace(/```json|```/g, "").trim());
};

const fetchFlashcards = async (): Promise<Flashcard[]> => {
  const response = await fetch(`${API_URL}/flashcards`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
  if (!response.ok) throw new Error("Failed to generate flashcards");
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let full = "";
  while (true) { const { done, value } = await reader.read(); if (done) break; full += decoder.decode(value); }
  return JSON.parse(full.replace(/```json|```/g, "").trim());
};

const resetSession = async () => { await fetch(`${API_URL}/reset`, { method: "DELETE" }); };

// ─── App ─────────────────────────────────────────────────────

function App() {
  const [view, setView] = useState<View>("landing");
  const [urls, setUrls] = useState<string[]>([]);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {view === "landing" && <Landing onStart={(u) => { setUrls(u); setView("loading"); }} />}
      {view === "loading" && (
        <Loading urls={urls}
          onDone={(info) => { setVideoInfo(info); setView("chat"); }}
          onError={() => { toast.error("Could not fetch transcript. Try another URL."); setView("landing"); }}
        />
      )}
      {view === "chat" && (
        <Chat urls={urls} videoInfo={videoInfo}
          onNewVideo={async () => { await resetSession(); setView("landing"); setUrls([]); setVideoInfo(null); }}
        />
      )}
    </div>
  );
}

/* ---------------- LANDING ---------------- */
function Landing({ onStart }: { onStart: (urls: string[]) => void }) {
  const [input, setInput] = useState("");
  const [urlList, setUrlList] = useState<string[]>([]);
  const isValidYouTube = (url: string) => /youtu\.?be/i.test(url);

  const addUrl = () => {
    if (!input.trim()) { toast.error("Please paste a YouTube URL first"); return; }
    if (!isValidYouTube(input)) { toast.error("Please enter a valid YouTube URL"); return; }
    if (urlList.includes(input.trim())) { toast.error("This URL is already added"); return; }
    if (urlList.length >= 5) { toast.error("Maximum 5 URLs allowed"); return; }
    setUrlList((prev) => [...prev, input.trim()]); setInput("");
  };

  const handleStart = () => {
    const allUrls = urlList.length > 0 ? urlList : input.trim() ? [input.trim()] : [];
    if (allUrls.length === 0) { toast.error("Please paste at least one YouTube URL"); return; }
    if (!allUrls.every(isValidYouTube)) { toast.error("Please enter valid YouTube URLs"); return; }
    onStart(allUrls);
  };

  return (
    <div className="min-h-screen flex flex-col animate-fade-in-up">
      <nav className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center"><Podcast className="w-4 h-4 text-primary-foreground" /></div>
          <div className="flex flex-col leading-tight">
            <span className="font-bold text-lg tracking-tight">YouTubeChat AI</span>
            <span className="text-[10px] text-muted-foreground">Chat with any YouTube video, instantly</span>
          </div>
        </div>
        <a href="https://github.com/mariumijay/ytChatbot" target="_blank" rel="noreferrer"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <Github className="w-4 h-4" /> GitHub
        </a>
      </nav>
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/20 blur-[120px] animate-pulse-glow" />
        </div>
        <div className="relative z-10 max-w-3xl w-full text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface border border-border text-xs text-muted-foreground mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" /> Powered by Groq AI
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-5 leading-[1.05]">
            Chat with any YouTube video,<br />
            <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">instantly</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-10">
            Paste a YouTube URL and start asking questions. No rewatching. No scrubbing. Just answers.
          </p>
          <div className="glass-card rounded-2xl p-2 flex flex-col gap-2 mb-4 max-w-2xl mx-auto">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-3 flex-1 px-4">
                <Play className="w-4 h-4 text-muted-foreground shrink-0" />
                <input value={input} onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { if (urlList.length > 0) addUrl(); else handleStart(); } }}
                  placeholder="Paste any YouTube video URL here..."
                  className="flex-1 bg-transparent py-3 outline-none text-sm placeholder:text-muted-foreground" />
              </div>
              <button onClick={addUrl} title="Add another URL"
                className="w-10 h-10 rounded-xl border border-border hover:border-primary hover:text-primary flex items-center justify-center transition-colors shrink-0">
                <Plus className="w-4 h-4" />
              </button>
              <button onClick={handleStart}
                className="bg-primary hover:bg-primary-glow transition-colors text-primary-foreground font-medium px-5 py-3 rounded-xl flex items-center justify-center gap-2 text-sm shrink-0">
                Start Chatting <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            {urlList.length > 0 && (
              <div className="px-3 pb-2 flex flex-col gap-2">
                <p className="text-[10px] text-muted-foreground text-left uppercase tracking-wider">{urlList.length} video{urlList.length > 1 ? "s" : ""} added</p>
                {urlList.map((u, i) => (
                  <div key={i} className="flex items-center gap-2 bg-background border border-border rounded-xl px-3 py-2">
                    <Link className="w-3 h-3 text-primary shrink-0" />
                    <span className="text-xs text-muted-foreground flex-1 truncate text-left">{u}</span>
                    <button onClick={() => setUrlList((prev) => prev.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-foreground transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mb-10">Add up to 5 YouTube video URLs to chat across multiple videos at once</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
            <Feature icon={<Mic className="w-5 h-5" />} title="Any Video" desc="Works with any YouTube video — lectures, podcasts, vlogs, interviews" />
            <Feature icon={<Zap className="w-5 h-5" />} title="Instant Answers" desc="Get answers without rewatching hours of content" />
            <Feature icon={<Brain className="w-5 h-5" />} title="Smart Context" desc="Remembers your conversation as you chat" />
          </div>
        </div>
      </main>
      <footer className="py-8" />
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-4 hover:border-primary/40 transition-colors">
      <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">{icon}</div>
      <h3 className="font-semibold text-sm mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}

/* ---------------- LOADING ---------------- */
function Loading({ urls, onDone, onError }: { urls: string[]; onDone: (info: VideoInfo) => void; onError: () => void }) {
  const steps = ["Fetching transcript...", "Building knowledge base...", "Ready to chat!"];
  const [done, setDone] = useState(0);
  const calledRef = useRef(false);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;
    const runLoad = async () => {
      try {
        setDone(1);
        let result;
        if (urls.length === 1) {
          result = await loadVideo(urls[0]);
          setDone(2); await new Promise((r) => setTimeout(r, 800));
          setDone(3); await new Promise((r) => setTimeout(r, 600));
          onDone({ video_id: result.video_id, url: result.url, title: result.title });
        } else {
          result = await loadMultiVideo(urls);
          setDone(2); await new Promise((r) => setTimeout(r, 800));
          setDone(3); await new Promise((r) => setTimeout(r, 600));
          onDone({ video_id: result.video_ids[0], url: result.urls[0], title: `${result.titles.length} videos loaded`, video_ids: result.video_ids, titles: result.titles });
        }
      } catch (err: any) { toast.error(err.message || "Failed to load video"); onError(); }
    };
    runLoad();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center px-6 relative overflow-hidden animate-fade-in-up">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/30 blur-[120px] animate-pulse-glow" />
      </div>
      <div className="relative z-10 max-w-lg w-full text-center">
        <div className="flex flex-col gap-1 mb-10">
          {urls.map((u, i) => (<div key={i} className="bg-surface border border-border rounded-xl px-4 py-2 text-xs text-muted-foreground truncate mx-auto max-w-md w-full">{u}</div>))}
        </div>
        <div className="flex justify-center mb-10">
          <div className="relative"><Loader2 className="w-16 h-16 text-primary animate-spin" /><div className="absolute inset-0 rounded-full bg-primary/20 blur-2xl" /></div>
        </div>
        <div className="space-y-3 text-left">
          {steps.map((s, i) => {
            const active = done === i; const complete = done > i;
            return (
              <div key={s} className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${complete || active ? "bg-surface border-border" : "bg-surface/40 border-border/50 opacity-50"}`}>
                <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0">
                  {complete ? (<div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center"><Check className="w-3.5 h-3.5 text-green-400" /></div>)
                    : active ? (<Loader2 className="w-4 h-4 text-primary animate-spin" />) : (<div className="w-2 h-2 rounded-full bg-muted-foreground/40" />)}
                </div>
                <span className={`text-sm ${complete ? "text-foreground" : "text-muted-foreground"}`}>{s}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---------------- MCQ MODAL ---------------- */
function MCQModal({ onClose }: { onClose: () => void }) {
  const [state, setState] = useState<"loading" | "quiz" | "results">("loading");
  const [questions, setQuestions] = useState<MCQ[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);

  useEffect(() => {
    fetchMCQ().then((mcqs) => { setQuestions(mcqs); setState("quiz"); })
      .catch(() => { toast.error("Failed to generate quiz. Please load a video first."); onClose(); });
  }, []);

  const q = questions[current];
  const handleSelect = (opt: string) => { if (selected) return; setSelected(opt); if (opt === q.correct) setScore((s) => s + 1); };
  const handleNext = () => { if (current + 1 >= questions.length) { setState("results"); } else { setCurrent((c) => c + 1); setSelected(null); } };
  const handleRetake = () => { setCurrent(0); setSelected(null); setScore(0); setState("quiz"); };
  const getScoreColor = () => score >= 7 ? "text-green-400" : score >= 5 ? "text-yellow-400" : "text-red-400";
  const getScoreMessage = () => score >= 8 ? "Excellent! You mastered this lecture 🎉" : score >= 6 ? "Good job! Review the weak areas 📚" : "Keep studying! Watch the lecture again 💪";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.8)" }}>
      <div className="bg-[#1A1A1A] rounded-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {state === "loading" && (
          <div className="flex flex-col items-center justify-center p-16 gap-6">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <p className="text-muted-foreground text-sm">Generating quiz questions...</p>
          </div>
        )}
        {state === "quiz" && q && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-lg">🧠 Quiz</h2>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">Question {current + 1} of {questions.length}</span>
                <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
              </div>
            </div>
            <div className="w-full h-1.5 bg-border rounded-full mb-6">
              <div className="h-1.5 bg-primary rounded-full transition-all" style={{ width: `${((current + 1) / questions.length) * 100}%` }} />
            </div>
            <p className="text-base font-medium mb-6 leading-relaxed">{q.question}</p>
            <div className="flex flex-col gap-3 mb-6">
              {(["A", "B", "C", "D"] as const).map((opt) => {
                let cls = "w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ";
                if (!selected) cls += "border-border hover:border-primary hover:text-primary cursor-pointer";
                else if (opt === q.correct) cls += "border-green-500 bg-green-500/20 text-green-300";
                else if (opt === selected) cls += "border-red-500 bg-red-500/20 text-red-300";
                else cls += "border-border opacity-50 cursor-not-allowed";
                return <button key={opt} onClick={() => handleSelect(opt)} className={cls}><span className="font-semibold mr-2">{opt}.</span>{q.options[opt]}</button>;
              })}
            </div>
            {selected && <div className="bg-surface border border-border rounded-xl px-4 py-3 mb-6 text-sm text-muted-foreground"><span className="font-semibold text-foreground">Explanation: </span>{q.explanation}</div>}
            {selected && <button onClick={handleNext} className="w-full bg-primary hover:bg-primary-glow text-primary-foreground font-medium py-3 rounded-xl transition-colors">{current + 1 >= questions.length ? "See Results" : "Next Question →"}</button>}
          </div>
        )}
        {state === "results" && (
          <div className="p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center mx-auto mb-6"><Trophy className="w-10 h-10 text-primary" /></div>
            <h2 className="text-2xl font-bold mb-2">Quiz Complete!</h2>
            <p className={`text-5xl font-bold mb-2 ${getScoreColor()}`}>{score}/{questions.length}</p>
            <p className="text-muted-foreground mb-8">{getScoreMessage()}</p>
            <div className="flex gap-3">
              <button onClick={handleRetake} className="flex-1 border border-border hover:border-primary hover:text-primary py-3 rounded-xl text-sm font-medium transition-colors">Retake Quiz</button>
              <button onClick={onClose} className="flex-1 bg-primary hover:bg-primary-glow text-primary-foreground py-3 rounded-xl text-sm font-medium transition-colors">Close</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- FLASHCARD MODAL ---------------- */
function FlashcardModal({ onClose }: { onClose: () => void }) {
  const [state, setState] = useState<"loading" | "cards">("loading");
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [current, setCurrent] = useState(0);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    fetchFlashcards().then((data) => { setCards(data); setState("cards"); })
      .catch(() => { toast.error("Failed to generate flashcards. Please load a video first."); onClose(); });
  }, []);

  const card = cards[current];
  const goNext = () => { if (current < cards.length - 1) { setCurrent((c) => c + 1); setFlipped(false); } };
  const goPrev = () => { if (current > 0) { setCurrent((c) => c - 1); setFlipped(false); } };
  const restart = () => { setCurrent(0); setFlipped(false); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.8)" }}>
      <div className="bg-[#1A1A1A] rounded-2xl w-full max-w-2xl mx-4">
        {state === "loading" && (
          <div className="flex flex-col items-center justify-center p-16 gap-6">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <p className="text-muted-foreground text-sm">Generating flashcards...</p>
          </div>
        )}

        {state === "cards" && card && (
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-lg">🃏 Flashcards</h2>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">{current + 1} / {cards.length}</span>
                <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full h-1.5 bg-border rounded-full mb-6">
              <div className="h-1.5 bg-primary rounded-full transition-all" style={{ width: `${((current + 1) / cards.length) * 100}%` }} />
            </div>

            {/* Flip card */}
            <div
              onClick={() => setFlipped((f) => !f)}
              className="cursor-pointer min-h-[200px] rounded-2xl border border-border flex flex-col items-center justify-center p-8 mb-4 transition-all hover:border-primary/50 relative"
              style={{ background: flipped ? "rgba(124,58,237,0.08)" : "#111111" }}
            >
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground mb-4 absolute top-4 left-1/2 -translate-x-1/2">
                {flipped ? "Answer" : "Question — click to reveal"}
              </span>
              <p className="text-center text-base font-medium leading-relaxed mt-4">
                {flipped ? card.back : card.front}
              </p>
              <div className="absolute bottom-4 right-4 text-muted-foreground">
                <RotateCcw className="w-4 h-4" />
              </div>
            </div>

            <p className="text-center text-xs text-muted-foreground mb-6">Click card to flip</p>

            {/* Navigation */}
            <div className="flex items-center justify-between gap-3">
              <button onClick={goPrev} disabled={current === 0}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm hover:border-primary hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
              <button onClick={restart}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-2 rounded-lg border border-border">
                <RotateCcw className="w-3.5 h-3.5" /> Restart
              </button>
              <button onClick={goNext} disabled={current === cards.length - 1}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm hover:border-primary hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Done state */}
            {current === cards.length - 1 && (
              <div className="mt-4 p-4 rounded-xl bg-green-500/10 border border-green-500/30 text-center">
                <p className="text-green-400 text-sm font-medium">🎉 You've reviewed all {cards.length} flashcards!</p>
                <button onClick={restart} className="mt-2 text-xs text-muted-foreground hover:text-foreground underline">Start over</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- CHAT ---------------- */
function Chat({ urls, videoInfo, onNewVideo }: { urls: string[]; videoInfo: VideoInfo | null; onNewVideo: () => void }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [showQuiz, setShowQuiz] = useState(false);
  const [showFlashcards, setShowFlashcards] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isMulti = urls.length > 1;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || thinking) return;
    const userMsg: Msg = { id: crypto.randomUUID(), role: "user", text: content, time: nowTime() };
    setMessages((m) => [...m, userMsg]);
    setInput(""); setThinking(true);
    const botId = crypto.randomUUID();
    setMessages((m) => [...m, { id: botId, role: "bot", text: "", time: nowTime() }]);
    try {
      await streamChat(content, (chunk) => {
        setMessages((m) => m.map((msg) => msg.id === botId ? { ...msg, text: msg.text + chunk } : msg));
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to get response");
      setMessages((m) => m.filter((msg) => msg.id !== botId));
    } finally { setThinking(false); }
  };

  return (
    <div className="min-h-screen flex animate-fade-in-up">
      {showQuiz && <MCQModal onClose={() => setShowQuiz(false)} />}
      {showFlashcards && <FlashcardModal onClose={() => setShowFlashcards(false)} />}

      {/* Sidebar */}
      <aside className="w-[280px] shrink-0 bg-surface border-r border-border flex flex-col h-screen sticky top-0">
        <div className="p-5 flex items-center gap-2 border-b border-border">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center"><Podcast className="w-4 h-4 text-primary-foreground" /></div>
          <span className="font-bold tracking-tight">YouTube AI</span>
        </div>
        <div className="p-4 border-b border-border">
          {isMulti ? (
            <div className="flex flex-col gap-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">{urls.length} Videos Loaded</p>
              {(videoInfo?.video_ids ?? [videoInfo?.video_id ?? ""]).map((vid, i) => (
                <div key={vid} className="flex items-center gap-2 bg-background border border-border rounded-xl p-2">
                  <img src={`https://img.youtube.com/vi/${vid}/default.jpg`} alt="thumbnail" className="w-12 h-8 object-cover rounded-lg shrink-0" />
                  <p className="text-[10px] text-muted-foreground line-clamp-2">{videoInfo?.titles?.[i] ?? vid}</p>
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="aspect-video rounded-xl bg-gradient-to-br from-primary/30 to-primary/5 border border-border mb-3 flex items-center justify-center overflow-hidden">
                {videoInfo?.video_id ? (<img src={`https://img.youtube.com/vi/${videoInfo.video_id}/mqdefault.jpg`} alt="thumbnail" className="w-full h-full object-cover" />) : (<Play className="w-8 h-8 text-primary/80" fill="currentColor" />)}
              </div>
              <h3 className="text-sm font-medium leading-snug line-clamp-2 mb-2">{videoInfo?.title ?? "Loaded Video"}</h3>
              <span className="inline-block text-[10px] px-2 py-0.5 rounded-md bg-background border border-border text-muted-foreground">{urls[0]?.slice(0, 30)}...</span>
            </>
          )}
        </div>
        <div className="p-4 border-b border-border">
          <button onClick={onNewVideo} className="w-full flex items-center justify-center gap-2 border border-border hover:border-primary hover:text-primary rounded-xl py-2.5 text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" /> New Video
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <h4 className="text-[11px] uppercase tracking-wider text-muted-foreground mb-3 font-semibold">Current Session</h4>
          <div className="p-3 rounded-xl border border-primary/30 bg-background">
            <p className="text-xs font-medium line-clamp-1 mb-1">{isMulti ? `${urls.length} videos` : videoInfo?.title ?? "Current Video"}</p>
            <p className="text-[10px] text-muted-foreground">{messages.filter(m => m.role === "user").length} messages</p>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col h-screen">
        <header className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Chatting with</p>
            <h2 className="text-sm font-semibold truncate">{isMulti ? `${urls.length} videos` : videoInfo?.title ?? urls[0]}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowFlashcards(true)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg border border-border hover:border-primary/50">
              <Layers className="w-3.5 h-3.5" /> Flashcards
            </button>
            <button onClick={() => setShowQuiz(true)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg border border-border hover:border-primary/50">
              <Trophy className="w-3.5 h-3.5" /> Take Quiz
            </button>
            <button onClick={() => setMessages([])}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg border border-border hover:border-primary/50">
              <X className="w-3.5 h-3.5" /> Clear chat
            </button>
          </div>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-8">
          <div className="max-w-3xl mx-auto">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-20">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center mb-5">
                  <Mic className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Ask anything about {isMulti ? "these videos" : "this video"}</h3>
                <p className="text-sm text-muted-foreground mb-8">Try one of these to get started</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {SUGGESTIONS.map((q) => (
                    <button key={q} onClick={() => send(q)} className="px-4 py-2 rounded-full bg-surface border border-border text-sm hover:border-primary hover:text-primary transition-colors">{q}</button>
                  ))}
                  {isMulti && (
                    <button onClick={() => send("What are the differences between these videos?")} className="px-4 py-2 rounded-full bg-surface border border-border text-sm hover:border-primary hover:text-primary transition-colors">Compare all videos</button>
                  )}
                  <button onClick={() => setShowQuiz(true)} className="px-4 py-2 rounded-full bg-primary/10 border border-primary/30 text-primary text-sm hover:bg-primary/20 transition-colors">🧠 Take a Quiz</button>
                  <button onClick={() => setShowFlashcards(true)} className="px-4 py-2 rounded-full bg-primary/10 border border-primary/30 text-primary text-sm hover:bg-primary/20 transition-colors">🃏 Flashcards</button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((m) => (<MessageBubble key={m.id} msg={m} />))}
                {thinking && messages[messages.length - 1]?.role !== "bot" && <ThinkingBubble />}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-border bg-background">
          <div className="max-w-3xl mx-auto px-6 py-4">
            <div className="flex items-center gap-2 bg-surface border border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30 rounded-2xl px-4 py-2 transition-all">
              <input value={input} onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder={`Ask anything about ${isMulti ? "these videos" : "this video"}...`}
                className="flex-1 bg-transparent outline-none text-sm py-2 placeholder:text-muted-foreground"
                disabled={thinking} />
              <button onClick={() => send()} disabled={!input.trim() || thinking}
                className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary-glow disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                {thinking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-2 flex items-center justify-center gap-1.5">
              <Sparkles className="w-3 h-3" /> Powered by Groq AI
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

function MessageBubble({ msg }: { msg: Msg }) {
  if (msg.role === "user") {
    return (
      <div className="flex flex-col items-end animate-fade-in-up">
        <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-md px-4 py-3 max-w-[80%] text-sm leading-relaxed">{msg.text}</div>
        <span className="text-[10px] text-muted-foreground mt-1.5 mr-1">{msg.time}</span>
      </div>
    );
  }
  return (
    <div className="flex gap-3 animate-fade-in-up">
      <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0"><Bot className="w-4 h-4 text-primary" /></div>
      <div className="flex flex-col items-start max-w-[80%]">
        <div className="bg-surface border border-border rounded-2xl rounded-tl-md px-4 py-3 text-sm leading-relaxed text-foreground whitespace-pre-wrap">
          {msg.text || <Loader2 className="w-4 h-4 animate-spin text-primary" />}
        </div>
        <span className="text-[10px] text-muted-foreground mt-1.5 ml-1">{msg.time}</span>
      </div>
    </div>
  );
}

function ThinkingBubble() {
  return (
    <div className="flex gap-3 animate-fade-in-up">
      <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0"><Bot className="w-4 h-4 text-primary" /></div>
      <div className="bg-surface border border-border rounded-2xl rounded-tl-md px-4 py-4 flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (<span key={i} className="w-2 h-2 rounded-full bg-primary animate-bounce-dot" style={{ animationDelay: `${i * 0.15}s` }} />))}
      </div>
    </div>
  );
}