import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Mic, Send, Github, Sparkles, Zap, Brain, Podcast, Plus,
  Check, Loader2, X, Bot, ArrowRight, Play,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PodcastGPT — Chat with any podcast, instantly" },
      { name: "description", content: "Paste a YouTube podcast URL and chat with it instantly." },
    ],
  }),
  component: App,
});

type View = "landing" | "loading" | "chat";
type Msg = { id: string; role: "user" | "bot"; text: string; time: string };

const nowTime = () =>
  new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const SAMPLE_SESSIONS = [
  { title: "Lex Fridman × Sam Altman", date: "2d ago", count: 14 },
  { title: "Huberman Lab — Sleep Optimization", date: "5d ago", count: 8 },
  { title: "The Tim Ferriss Show — Naval Ravikant", date: "1w ago", count: 22 },
];

const SUGGESTIONS = [
  "What is this podcast about?",
  "What are the key takeaways?",
  "Summarize in 3 points",
];

function App() {
  const [view, setView] = useState<View>("landing");
  const [url, setUrl] = useState("");
  const [submittedUrl, setSubmittedUrl] = useState("");

  const handleStart = () => {
    if (!url.trim()) {
      toast.error("Please paste a YouTube URL first");
      return;
    }
    if (!/youtu\.?be/i.test(url)) {
      toast.error("Could not fetch transcript. Try another URL.");
      return;
    }
    setSubmittedUrl(url);
    setView("loading");
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {view === "landing" && (
        <Landing url={url} setUrl={setUrl} onStart={handleStart} />
      )}
      {view === "loading" && (
        <Loading url={submittedUrl} onDone={() => setView("chat")} />
      )}
      {view === "chat" && (
        <Chat
          url={submittedUrl}
          onNewVideo={() => {
            setView("landing");
            setUrl("");
          }}
        />
      )}
    </div>
  );
}

/* ---------------- LANDING ---------------- */
function Landing({
  url, setUrl, onStart,
}: { url: string; setUrl: (v: string) => void; onStart: () => void }) {
  return (
    <div className="min-h-screen flex flex-col animate-fade-in-up">
      <nav className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
            <Podcast className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg tracking-tight">PodcastGPT</span>
        </div>
        <a
          href="https://github.com"
          target="_blank" rel="noreferrer"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <Github className="w-4 h-4" /> GitHub
        </a>
      </nav>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/20 blur-[120px] animate-pulse-glow" />
        </div>

        <div className="relative z-10 max-w-3xl w-full text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface border border-border text-xs text-muted-foreground mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Powered by Gemini AI
          </div>

          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-5 leading-[1.05]">
            Chat with any podcast,<br />
            <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              instantly
            </span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto mb-10">
            Paste a YouTube URL and start asking questions. No rewatching. No
            scrubbing. Just answers.
          </p>

          <div className="glass-card rounded-2xl p-2 flex flex-col sm:flex-row gap-2 mb-12 max-w-2xl mx-auto">
            <div className="flex items-center gap-3 flex-1 px-4">
              <Play className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onStart()}
                placeholder="Paste YouTube podcast URL here..."
                className="flex-1 bg-transparent py-3 outline-none text-sm placeholder:text-muted-foreground"
              />
            </div>
            <button
              onClick={onStart}
              className="bg-primary hover:bg-primary-glow transition-colors text-primary-foreground font-medium px-5 py-3 rounded-xl flex items-center justify-center gap-2 text-sm"
            >
              Start Chatting <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
            <Feature icon={<Mic className="w-5 h-5" />} title="Any Podcast"
              desc="Works with any YouTube podcast or long video" />
            <Feature icon={<Zap className="w-5 h-5" />} title="Instant Answers"
              desc="Get answers without rewatching hours of content" />
            <Feature icon={<Brain className="w-5 h-5" />} title="Smart Context"
              desc="Remembers your conversation as you chat" />
          </div>
        </div>
      </main>

      <footer className="text-center py-8 text-xs text-muted-foreground">
        Built with LangChain + Gemini + FAISS
      </footer>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-4 hover:border-primary/40 transition-colors">
      <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
        {icon}
      </div>
      <h3 className="font-semibold text-sm mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}

/* ---------------- LOADING ---------------- */
function Loading({ url, onDone }: { url: string; onDone: () => void }) {
  const steps = ["Fetching transcript...", "Building knowledge base...", "Ready to chat!"];
  const [done, setDone] = useState(0);

  useEffect(() => {
    const timers = steps.map((_, i) =>
      setTimeout(() => setDone((d) => Math.max(d, i + 1)), 1300 * (i + 1)),
    );
    const finish = setTimeout(onDone, 4000);
    return () => {
      timers.forEach(clearTimeout);
      clearTimeout(finish);
    };
  }, [onDone]);

  return (
    <div className="min-h-screen flex items-center justify-center px-6 relative overflow-hidden animate-fade-in-up">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/30 blur-[120px] animate-pulse-glow" />
      </div>

      <div className="relative z-10 max-w-lg w-full text-center">
        <div className="bg-surface border border-border rounded-xl px-4 py-3 text-xs text-muted-foreground truncate mb-10 mx-auto max-w-md">
          {url}
        </div>

        <div className="flex justify-center mb-10">
          <div className="relative">
            <Loader2 className="w-16 h-16 text-primary animate-spin" />
            <div className="absolute inset-0 rounded-full bg-primary/20 blur-2xl" />
          </div>
        </div>

        <div className="space-y-3 text-left">
          {steps.map((s, i) => {
            const active = done === i;
            const complete = done > i;
            return (
              <div
                key={s}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                  complete || active
                    ? "bg-surface border-border"
                    : "bg-surface/40 border-border/50 opacity-50"
                }`}
              >
                <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0">
                  {complete ? (
                    <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                      <Check className="w-3.5 h-3.5 text-green-400" />
                    </div>
                  ) : active ? (
                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-muted-foreground/40" />
                  )}
                </div>
                <span className={`text-sm ${complete ? "text-foreground" : "text-muted-foreground"}`}>
                  {s}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ---------------- CHAT ---------------- */
function Chat({ url, onNewVideo }: { url: string; onNewVideo: () => void }) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [activeSession, setActiveSession] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  const send = (text?: string) => {
    const content = (text ?? input).trim();
    if (!content) return;
    const userMsg: Msg = { id: crypto.randomUUID(), role: "user", text: content, time: nowTime() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setThinking(true);
    setTimeout(() => {
      setThinking(false);
      setMessages((m) => [...m, {
        id: crypto.randomUUID(), role: "bot", time: nowTime(),
        text: `Great question. Based on the transcript, here's what stood out: the host and guest explore this idea around the 24-minute mark — they argue that consistent compounding beats intensity, and back it up with two concrete examples from the guest's career.`,
      }]);
    }, 1500);
  };

  return (
    <div className="min-h-screen flex animate-fade-in-up">
      {/* Sidebar */}
      <aside className="w-[280px] shrink-0 bg-surface border-r border-border flex flex-col h-screen sticky top-0">
        <div className="p-5 flex items-center gap-2 border-b border-border">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
            <Podcast className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold tracking-tight">PodcastGPT</span>
        </div>

        <div className="p-4 border-b border-border">
          <div className="aspect-video rounded-xl bg-gradient-to-br from-primary/30 to-primary/5 border border-border mb-3 flex items-center justify-center">
            <Play className="w-8 h-8 text-primary/80" fill="currentColor" />
          </div>
          <h3 className="text-sm font-medium leading-snug line-clamp-2 mb-2">
            The Future of AI Agents — A Conversation on Autonomy
          </h3>
          <span className="inline-block text-[10px] px-2 py-0.5 rounded-md bg-background border border-border text-muted-foreground">
            1h 24m
          </span>
        </div>

        <div className="p-4 border-b border-border">
          <button
            onClick={onNewVideo}
            className="w-full flex items-center justify-center gap-2 border border-border hover:border-primary hover:text-primary rounded-xl py-2.5 text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> New Video
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <h4 className="text-[11px] uppercase tracking-wider text-muted-foreground mb-3 font-semibold">
            Recent Sessions
          </h4>
          <div className="space-y-2">
            {SAMPLE_SESSIONS.map((s, i) => (
              <button
                key={s.title}
                onClick={() => setActiveSession(i)}
                className={`w-full text-left p-3 rounded-xl border transition-colors relative ${
                  activeSession === i
                    ? "bg-background border-border"
                    : "bg-transparent border-transparent hover:bg-background"
                }`}
              >
                {activeSession === i && (
                  <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-primary" />
                )}
                <p className="text-xs font-medium line-clamp-1 mb-1">{s.title}</p>
                <p className="text-[10px] text-muted-foreground">
                  {s.date} · {s.count} messages
                </p>
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col h-screen">
        <header className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Chatting with</p>
            <h2 className="text-sm font-semibold truncate">The Future of AI Agents — A Conversation on Autonomy</h2>
          </div>
          <button
            onClick={() => setMessages([])}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg border border-border hover:border-primary/50"
          >
            <X className="w-3.5 h-3.5" /> Clear chat
          </button>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-8">
          <div className="max-w-3xl mx-auto">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-20">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center mb-5">
                  <Mic className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Ask anything about this podcast</h3>
                <p className="text-sm text-muted-foreground mb-8">Try one of these to get started</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {SUGGESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => send(q)}
                      className="px-4 py-2 rounded-full bg-surface border border-border text-sm hover:border-primary hover:text-primary transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {messages.map((m) => (
                  <MessageBubble key={m.id} msg={m} />
                ))}
                {thinking && <ThinkingBubble />}
              </div>
            )}
          </div>
        </div>

        <div className="border-t border-border bg-background">
          <div className="max-w-3xl mx-auto px-6 py-4">
            <div className="flex items-center gap-2 bg-surface border border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30 rounded-2xl px-4 py-2 transition-all">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Ask anything about this podcast..."
                className="flex-1 bg-transparent outline-none text-sm py-2 placeholder:text-muted-foreground"
              />
              <button
                onClick={() => send()}
                disabled={!input.trim()}
                className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary-glow disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-2 flex items-center justify-center gap-1.5">
              <Sparkles className="w-3 h-3" /> Powered by Gemini AI
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
        <div className="bg-primary text-primary-foreground rounded-2xl rounded-tr-md px-4 py-3 max-w-[80%] text-sm leading-relaxed">
          {msg.text}
        </div>
        <span className="text-[10px] text-muted-foreground mt-1.5 mr-1">{msg.time}</span>
      </div>
    );
  }
  return (
    <div className="flex gap-3 animate-fade-in-up">
      <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
        <Bot className="w-4 h-4 text-primary" />
      </div>
      <div className="flex flex-col items-start max-w-[80%]">
        <div className="bg-surface border border-border rounded-2xl rounded-tl-md px-4 py-3 text-sm leading-relaxed text-foreground">
          {msg.text}
        </div>
        <span className="text-[10px] text-muted-foreground mt-1.5 ml-1">{msg.time}</span>
      </div>
    </div>
  );
}

function ThinkingBubble() {
  return (
    <div className="flex gap-3 animate-fade-in-up">
      <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0">
        <Bot className="w-4 h-4 text-primary" />
      </div>
      <div className="bg-surface border border-border rounded-2xl rounded-tl-md px-4 py-4 flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-2 h-2 rounded-full bg-primary animate-bounce-dot"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}
