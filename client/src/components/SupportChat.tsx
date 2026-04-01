import { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send, Bot, User, Loader2, ChevronDown } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

// ── Session ID (persisted across navigations) ─────────────────────────────────
function getSessionId(): string {
  const key = "support_session_id";
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
  }
  return id;
}

// ── Types ─────────────────────────────────────────────────────────────────────
type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  pending?: boolean;
};

const QUICK_REPLIES = [
  "How does Discovery work?",
  "What's included in the Pro plan?",
  "Can I edit AI comments?",
  "How do I connect a social account?",
  "How do I cancel my subscription?",
];

// ── Main Component ────────────────────────────────────────────────────────────
export function SupportChat() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId] = useState(getSessionId);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Load history on first open
  const historyQuery = trpc.support.getHistory.useQuery(
    { sessionId },
    { enabled: open && !hasLoaded, staleTime: Infinity }
  );

  useEffect(() => {
    if (historyQuery.data && !hasLoaded) {
      setMessages(historyQuery.data.map(m => ({ role: m.role, content: m.content })));
      setHasLoaded(true);
    }
  }, [historyQuery.data, hasLoaded]);

  // Show welcome message if no history
  useEffect(() => {
    if (open && hasLoaded && messages.length === 0) {
      setMessages([{
        role: "assistant",
        content: "Hi there! 👋 I'm the Growth Engine support assistant. I can help you with questions about features, pricing, or getting started. What can I help you with today?",
      }]);
    }
  }, [open, hasLoaded, messages.length]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150);
      setUnread(0);
    }
  }, [open]);

  const chatMutation = trpc.support.chat.useMutation({
    onSuccess: (data) => {
      setMessages(prev => {
        const withoutPending = prev.filter(m => !m.pending);
        return [...withoutPending, { role: "assistant", content: data.reply }];
      });
      if (!open) setUnread(n => n + 1);
    },
    onError: () => {
      setMessages(prev => prev.filter(m => !m.pending));
      toast.error("Couldn't send message. Please try again.");
    },
  });

  const sendMessage = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed || chatMutation.isPending) return;

    const history = messages
      .filter(m => !m.pending)
      .slice(-10)
      .map(m => ({ role: m.role, content: m.content }));

    setMessages(prev => [
      ...prev,
      { role: "user", content: trimmed },
      { role: "assistant", content: "", pending: true },
    ]);
    setInput("");

    chatMutation.mutate({ sessionId, message: trimmed, history });
  }, [messages, chatMutation, sessionId]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <>
      {/* ── Floating Action Button ── */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {/* Unread badge */}
        {!open && unread > 0 && (
          <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold z-10">
            {unread}
          </div>
        )}

        {/* FAB */}
        <button
          onClick={() => setOpen(v => !v)}
          aria-label={open ? "Close support chat" : "Open support chat"}
          className={`
            w-14 h-14 rounded-full flex items-center justify-center shadow-2xl
            transition-all duration-300 ease-out
            ${open
              ? "bg-white/10 border border-white/20 text-white hover:bg-white/15"
              : "bg-gradient-to-br from-violet-600 to-cyan-600 text-white hover:scale-110 hover:shadow-violet-500/40"
            }
          `}
        >
          {open
            ? <ChevronDown className="w-5 h-5" />
            : <MessageCircle className="w-6 h-6" />
          }
        </button>
      </div>

      {/* ── Chat Panel ── */}
      <div
        className={`
          fixed bottom-24 right-6 z-50 w-[360px] max-w-[calc(100vw-2rem)]
          flex flex-col rounded-2xl overflow-hidden
          bg-[#0f0f1a] border border-white/10 shadow-2xl shadow-black/50
          transition-all duration-300 ease-out origin-bottom-right
          ${open ? "scale-100 opacity-100 pointer-events-auto" : "scale-90 opacity-0 pointer-events-none"}
        `}
        style={{ height: "480px" }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-violet-600/20 to-cyan-600/20 border-b border-white/10 flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-sm font-semibold">Growth Engine Support</div>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-white/50 text-xs">AI assistant · typically replies instantly</span>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="text-white/40 hover:text-white transition-colors p-1 rounded"
            aria-label="Close chat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
          {historyQuery.isLoading && (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-5 h-5 text-white/30 animate-spin" />
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              {/* Avatar */}
              <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                msg.role === "assistant"
                  ? "bg-gradient-to-br from-violet-500 to-cyan-500"
                  : "bg-white/10 border border-white/20"
              }`}>
                {msg.role === "assistant"
                  ? <Bot className="w-3.5 h-3.5 text-white" />
                  : <User className="w-3.5 h-3.5 text-white/70" />
                }
              </div>

              {/* Bubble */}
              <div className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-gradient-to-br from-violet-600 to-violet-700 text-white rounded-tr-sm"
                  : "bg-white/[0.06] border border-white/10 text-white/85 rounded-tl-sm"
              }`}>
                {msg.pending
                  ? (
                    <div className="flex gap-1 items-center py-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  )
                  : msg.content
                }
              </div>
            </div>
          ))}

          {/* Quick replies — show only after welcome message and no user messages yet */}
          {messages.length === 1 && messages[0]?.role === "assistant" && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {QUICK_REPLIES.map(q => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  disabled={chatMutation.isPending}
                  className="text-xs px-3 py-1.5 rounded-full border border-violet-500/40 text-violet-300 hover:bg-violet-500/20 hover:border-violet-500/60 transition-colors disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-3 py-3 border-t border-white/10 flex-shrink-0">
          <div className="flex gap-2 items-end bg-white/[0.05] border border-white/10 rounded-xl px-3 py-2 focus-within:border-violet-500/50 transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question…"
              rows={1}
              disabled={chatMutation.isPending}
              className="flex-1 bg-transparent text-white/85 text-sm placeholder:text-white/25 resize-none outline-none min-h-[20px] max-h-[80px] leading-5 disabled:opacity-50"
              style={{ fieldSizing: "content" } as React.CSSProperties}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || chatMutation.isPending}
              className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-cyan-600 flex items-center justify-center flex-shrink-0 hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Send message"
            >
              {chatMutation.isPending
                ? <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                : <Send className="w-3.5 h-3.5 text-white" />
              }
            </button>
          </div>
          <p className="text-center text-white/20 text-[10px] mt-1.5">Powered by Growth Engine AI</p>
        </div>
      </div>
    </>
  );
}
