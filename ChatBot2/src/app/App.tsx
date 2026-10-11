import { useState, useRef, useEffect, KeyboardEvent } from "react";
import {
  ArrowUp, X, GraduationCap, ChevronRight, Minus, Sparkles, MapPin,
  Settings, Wifi, WifiOff, Globe2, Star, ThumbsUp, ThumbsDown, Copy, BarChart2,
  Check, MessageSquare, BookOpen, Clock, Zap, ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Dashboard from "../components/Dashboard";

/* ─── Types ─────────────────────────────────────────────── */
type Role = "user" | "assistant";

interface Message {
  id: string;
  role: Role;
  content: string;
  time: string;
  liked?: boolean | null;
}

/* ─── Data ───────────────────────────────────────────────── */
const SUGGESTIONS = [
  { label: "Comment candidater ?", icon: "📋" },
  { label: "Pays éligibles", icon: "🗺️" },
  { label: "Bourses disponibles", icon: "💰" },
  { label: "Délais & calendrier", icon: "📅" },
];

const FEATURE_HIGHLIGHTS = [
  { icon: Globe2, label: "30+ pays", sub: "Destinations Erasmus+" },
  { icon: BookOpen, label: "Infos claires", sub: "Réponses immédiates" },
  { icon: Zap, label: "Disponible 24/7", sub: "Assistance continue" },
];

const RESPONSES: Record<string, string> = {
  candidater:
    "Pour candidater à Erasmus+, vérifiez d'abord votre éligibilité auprès de votre coordinateur pédagogique, puis soumettez votre dossier via le portail de votre établissement avant la date limite. Je peux vous guider étape par étape !",
  pays: "Plus de 30 pays participent à Erasmus+ : les 27 États membres de l'UE, ainsi que la Turquie, la Norvège, l'Islande et d'autres. Quel pays vous intéresse en particulier ?",
  bourses:
    "Les bourses Erasmus+ couvrent partiellement vos frais de séjour. Le montant dépend du pays de destination et de votre situation. Des compléments régionaux peuvent s'y ajouter.",
  délais:
    "Les candidatures pour le semestre d'automne ferment en mars-avril, et pour le semestre de printemps en octobre-novembre. Votre bureau des Relations Internationales vous confirmera les dates exactes.",
};

const API_CONFIG = {
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
  endpoint: "/api/chat",
  mode: "api" as "mock" | "api",
};

/* ─── Helpers ────────────────────────────────────────────── */
function getTime() {
  return new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

async function callBackendAPI(message: string): Promise<string> {
  const res = await fetch(`${API_CONFIG.baseURL}${API_CONFIG.endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, stream: false }),
  });
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  const data = await res.json();
  return data.response || data.message || "Désolé, je n'ai pas pu traiter votre demande.";
}


async function callBackendAPIStream(message: string, onToken: (token: string) => void): Promise<void> {
  const res = await fetch(`${API_CONFIG.baseURL}${API_CONFIG.endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, stream: true }),
  });
  if (!res.ok) throw new Error(`API Error: ${res.status}`);
  if (!res.body) throw new Error('ReadableStream non supporté.');
  
  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let done = false;
  
  while (!done) {
    const { value, done: readerDone } = await reader.read();
    done = readerDone;
    if (value) {
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data.trim() === '[DONE]') return;
          const cleanToken = data.replace(/<br>/g, '\n');
          onToken(cleanToken);
        }
      }
    }
  }
}

function getMockResponse(text: string): string {
  const t = text.toLowerCase();
  if (t.includes("candidat") || t.includes("postuler") || t.includes("dossier")) return RESPONSES.candidater;
  if (t.includes("pays") || t.includes("destination") || t.includes("où")) return RESPONSES.pays;
  if (t.includes("bourse") || t.includes("aide") || t.includes("financ")) return RESPONSES.bourses;
  if (t.includes("délai") || t.includes("calendrier") || t.includes("date") || t.includes("quand")) return RESPONSES.délais;
  return "Merci pour votre question ! Notre équipe Relations Internationales peut vous apporter une réponse précise. Souhaitez-vous être mis en contact, ou puis-je vous orienter vers une ressource spécifique ?";
}

/* ─── Sub-components ─────────────────────────────────────── */
function TypingDots() {
  return (
    <div className="flex items-center gap-[5px] px-1 py-0.5">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-2 h-2 rounded-full"
          style={{ background: "linear-gradient(135deg,#003399,#1E4FD8)" }}
          animate={{ y: [0, -5, 0], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.18, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      navigator.clipboard.writeText(text);
    } catch {
      const el = document.createElement("textarea");
      el.value = text;
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button
      onClick={copy}
      className="w-6 h-6 rounded-lg flex items-center justify-center text-[#9BA3BF] hover:text-[#003399] hover:bg-[#EEF2FF] transition-all"
      title="Copier"
    >
      {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

function MessageBubble({
  msg,
  onLike,
}: {
  msg: Message;
  onLike: (id: string, v: boolean | null) => void;
}) {
  const isUser = msg.role === "user";
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 360, damping: 28 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"} items-end gap-2.5 group`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Assistant avatar */}
      {!isUser && (
        <div
          className="shrink-0 w-8 h-8 rounded-2xl flex items-center justify-center shadow-md"
          style={{ background: "linear-gradient(135deg,#003399 0%,#1E4FD8 100%)" }}
        >
          <GraduationCap className="w-4 h-4 text-white" />
        </div>
      )}

      <div className={`flex flex-col gap-1 max-w-[76%] ${isUser ? "items-end" : "items-start"}`}>
        {/* Bubble */}
        <div
          className={`relative px-4 py-3 text-[13.5px] leading-relaxed tracking-[0.01em] ${
            isUser
              ? "text-white rounded-2xl rounded-br-[5px]"
              : "text-[#1A1F36] rounded-2xl rounded-bl-[5px] bg-white border border-[#E4E8F5]"
          }`}
          style={
            isUser
              ? {
                  background: "linear-gradient(145deg,#003399 0%,#1E4FD8 55%,#4B7FFF 100%)",
                  boxShadow: "0 4px 16px rgba(0,51,153,0.28)",
                }
              : { boxShadow: "0 2px 10px rgba(0,0,0,0.06)" }
          }
        >
          {isUser ? (
            msg.content
          ) : (
            <div className="markdown-body">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({node, ...props}) => <p className="mb-2 last:mb-0" {...props} />,
                  ul: ({node, ...props}) => <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />,
                  ol: ({node, ...props}) => <ol className="list-decimal pl-4 mb-2 space-y-1" {...props} />,
                  li: ({node, ...props}) => <li className="pl-1" {...props} />,
                  a: ({node, ...props}) => <a className="text-[#1E4FD8] underline hover:text-[#3B6EF5]" target="_blank" rel="noreferrer" {...props} />,
                  strong: ({node, ...props}) => <strong className="font-semibold text-gray-900" {...props} />
                }}
              >
                {msg.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Actions row */}
        <div className={`flex items-center gap-1 px-1 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
          <span className="text-[10px] text-[#C0C8DC]">{msg.time}</span>
          {isUser && (
            <span className="flex">
              <Check className="w-3 h-3 text-[#4B7FFF]" />
              <Check className="w-3 h-3 text-[#4B7FFF] -ml-1.5" />
            </span>
          )}

          <AnimatePresence>
            {!isUser && hovered && (
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                className="flex items-center gap-0.5 ml-1"
              >
                <CopyButton text={msg.content} />
                <button
                  onClick={() => onLike(msg.id, msg.liked === true ? null : true)}
                  className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                    msg.liked === true
                      ? "text-[#003399] bg-[#EEF2FF]"
                      : "text-[#9BA3BF] hover:text-[#003399] hover:bg-[#EEF2FF]"
                  }`}
                >
                  <ThumbsUp className="w-3 h-3" />
                </button>
                <button
                  onClick={() => onLike(msg.id, msg.liked === false ? null : false)}
                  className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all ${
                    msg.liked === false
                      ? "text-[#FF6B35] bg-[#FFF3EE]"
                      : "text-[#9BA3BF] hover:text-[#FF6B35] hover:bg-[#FFF3EE]"
                  }`}
                >
                  <ThumbsDown className="w-3 h-3" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* User avatar */}
      {isUser && (
        <div className="shrink-0 w-8 h-8 rounded-2xl flex items-center justify-center shadow-md bg-gradient-to-br from-[#FF6B35] to-[#FF9F6B]">
          <span className="text-white text-[11px] font-bold">V</span>
        </div>
      )}
    </motion.div>
  );
}

/* ─── Main component ─────────────────────────────────────── */
export default function App() {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [showTeaser, setShowTeaser] = useState(false);
  const [welcomeDone, setWelcomeDone] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [apiMode, setApiMode] = useState<"mock" | "api">(API_CONFIG.mode);
  const [showSettings, setShowSettings] = useState(false);
  const [apiError, setApiError] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [activeTab, setActiveTab] = useState<"chat" | "info">("chat");
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const t = setTimeout(() => { if (!open) setShowTeaser(true); }, 1800);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (open && !minimized) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 60);
    }
  }, [messages, open, minimized]);

  const openChat = () => {
    setOpen(true);
    setMinimized(false);
    setShowTeaser(false);
  };

  const startChat = () => {
    setWelcomeDone(true);
    setMessages([
      {
        id: "0",
        role: "assistant",
        content: "Bonjour ! Je suis Lumina, votre assistante mobilité Erasmus+. Posez-moi vos questions sur les candidatures, les destinations, les bourses ou les délais !",
        time: getTime(),
      },
    ]);
  };

  const send = async (text?: string) => {
    if (!welcomeDone) startChat();
    const content = (text ?? input).trim();
    if (!content || typing) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content, time: getTime() };
    setMessages((p) => [...p, userMsg]);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setTyping(true);
    setApiError(false);

    try {
      if (apiMode === "api") {
        const assistantMsgId = Date.now().toString() + "-assistant";
        setMessages((p) => [
          ...p,
          { id: assistantMsgId, role: "assistant", content: "", time: getTime() },
        ]);

        await callBackendAPIStream(content, (token) => {
          setMessages((p) =>
            p.map((msg) =>
              msg.id === assistantMsgId
                ? { ...msg, content: msg.content + token }
                : msg
            )
          );
        });
      } else {
        await new Promise((r) => setTimeout(r, 1000 + Math.random() * 800));
        const response = getMockResponse(content);
        setMessages((p) => [
          ...p,
          { id: (Date.now() + 1).toString(), role: "assistant", content: response, time: getTime() },
        ]);
      }
    } catch {
      setApiError(true);
      setMessages((p) => [
        ...p,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Désolé, je rencontre un problème de connexion. Vérifiez que le backend est démarré ou passez en mode démo.",
          time: getTime(),
        },
      ]);
    } finally {
      setTyping(false);
    }
  };

  const handleLike = (id: string, value: boolean | null) => {
    setMessages((p) => p.map((m) => (m.id === id ? { ...m, liked: value } : m)));
  };

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const autoResize = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
  };

  return (
    <div
      className="size-full flex items-end justify-end p-6 relative overflow-hidden bg-[#F0F4FC]"
      style={{ fontFamily: "'Inter','Segoe UI',sans-serif" }}
    >
      {showDashboard ? (
        <Dashboard onBack={() => setShowDashboard(false)} />
      ) : (
      <div className="absolute inset-0 overflow-auto bg-white pointer-events-none select-none">
        {/* ── Full-screen Erasmus page ── */}

        {/* Top accent bar */}
        <div className="sticky top-0 z-30 h-[3px] bg-gradient-to-r from-[#003399] via-[#FF6B35] to-[#003399]" />

        {/* Navbar */}
        <div className="sticky top-[3px] z-20 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-sm">
          <div className="max-w-7xl mx-auto flex items-center px-8 h-[64px] gap-6">
            <div className="flex items-center gap-3 shrink-0">
              <div className="w-9 h-9 rounded-xl bg-[#003399] flex items-center justify-center shadow-sm">
                <Globe2 className="w-4.5 h-4.5 text-white" />
              </div>
              <div>
                <div className="font-black text-[#003399] text-[15px] leading-none tracking-tight">Erasmus+</div>
                <div className="text-[9px] text-gray-400 font-medium tracking-wider uppercase leading-none mt-0.5">Mobilité Étudiante</div>
              </div>
            </div>
            <nav className="hidden md:flex items-center gap-1 ml-6">
              {[["Accueil", true],["Programmes", false],["Destinations", false],["Candidatures", false],["Actualités", false],["Contact", false]].map(([l, active]) => (
                <span key={l as string} className={`px-3.5 py-1.5 rounded-lg text-[12.5px] font-medium cursor-pointer transition-colors ${active ? "bg-[#EEF2FF] text-[#003399] font-semibold" : "text-gray-500 hover:text-[#003399] hover:bg-gray-50"}`}>{l as string}</span>
              ))}
            </nav>
            <div className="ml-auto flex items-center gap-3">
              <span className="text-[12px] text-gray-400 hidden lg:block">FR · EN</span>
              <button className="px-5 py-2 bg-[#003399] text-white text-[12px] font-bold rounded-xl hover:bg-[#002680] transition-colors shadow-sm">
                Espace étudiant
              </button>
              <button className="px-5 py-2 bg-[#FF6B35] text-white text-[12px] font-bold rounded-xl shadow-sm">
                Candidater
              </button>
            </div>
          </div>
        </div>

        {/* Hero — full width split */}
        <div
          className="relative overflow-hidden"
          style={{ background: "linear-gradient(145deg,#00154d 0%,#002a85 35%,#003399 60%,#0550d4 100%)", minHeight: "520px" }}
        >
          {/* Background texture */}
          <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
          {/* Orbs */}
          <div className="absolute top-[-80px] right-[-80px] w-[500px] h-[500px] rounded-full opacity-10" style={{ background: "radial-gradient(circle,#FF6B35,transparent 70%)" }} />
          <div className="absolute bottom-[-60px] left-[30%] w-[400px] h-[400px] rounded-full opacity-8" style={{ background: "radial-gradient(circle,#4B7FFF,transparent 70%)" }} />

          <div className="max-w-7xl mx-auto px-8 py-20 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              {/* Left */}
              <div className="space-y-7">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#FF6B35] rounded-full text-[10.5px] font-black tracking-widest uppercase text-white shadow">
                  <Star className="w-3 h-3" /> Programme Erasmus+ 2026–2027
                </div>
                <h1 className="text-5xl lg:text-6xl font-black leading-[1.06] tracking-tight text-white">
                  Explorez<br />
                  <span className="text-transparent" style={{ WebkitTextStroke: "2px rgba(255,255,255,0.4)" }}>l&apos;Europe</span>{" "}
                  avec<br />
                  <span className="text-[#FF6B35]">Erasmus+</span>
                </h1>
                <p className="text-white/65 text-[15px] leading-relaxed max-w-md">
                  Partez étudier dans plus de 30 pays européens, bénéficiez de bourses dédiées et développez des compétences uniques pour votre carrière.
                </p>
                <div className="flex gap-3 pt-1">
                  <button className="px-7 py-3 bg-[#FF6B35] text-white rounded-xl font-bold text-sm shadow-xl hover:bg-[#e85d2a] transition-colors">Candidater maintenant</button>
                  <button className="px-7 py-3 bg-white/10 text-white rounded-xl font-semibold text-sm border border-white/20 hover:bg-white/18 transition-colors backdrop-blur-sm">En savoir plus</button>
                </div>
                {/* Stats row */}
                <div className="flex items-center gap-8 pt-2 border-t border-white/10">
                  {[["30+","Pays partenaires"],["400k+","Étudiants/an"],["12 mois","Durée max"]].map(([v,l])=>(
                    <div key={l}>
                      <div className="text-[22px] font-black text-white leading-none">{v}</div>
                      <div className="text-[11px] text-white/45 mt-0.5">{l}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right — country flags grid */}
              <div className="hidden lg:block">
                <div className="grid grid-cols-4 gap-3">
                  {[
                    {f:"🇩🇪",n:"Allemagne"},{f:"🇪🇸",n:"Espagne"},{f:"🇮🇹",n:"Italie"},{f:"🇵🇹",n:"Portugal"},
                    {f:"🇬🇷",n:"Grèce"},{f:"🇫🇷",n:"France"},{f:"🇳🇱",n:"Pays-Bas"},{f:"🇸🇪",n:"Suède"},
                    {f:"🇵🇱",n:"Pologne"},{f:"🇧🇪",n:"Belgique"},{f:"🇦🇹",n:"Autriche"},{f:"🇩🇰",n:"Danemark"},
                  ].map(({f,n}) => (
                    <div key={n} className="aspect-square rounded-2xl bg-white/8 border border-white/12 flex flex-col items-center justify-center gap-1.5 hover:bg-white/16 hover:scale-105 transition-all cursor-pointer">
                      <span className="text-2xl">{f}</span>
                      <span className="text-[9px] text-white/50 font-medium">{n}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Breadcrumb + section header */}
        <div className="bg-[#F7F9FE] border-b border-[#E8EDF8]">
          <div className="max-w-7xl mx-auto px-8 py-3 flex items-center gap-2 text-[11px] text-gray-400">
            <span>Accueil</span><span>/</span><span className="text-[#003399] font-medium">Programmes</span><span>/</span><span>Erasmus+ Mobilité</span>
          </div>
        </div>

        {/* Features + cards */}
        <div className="bg-[#F7F9FE] px-8 py-14">
          <div className="max-w-7xl mx-auto space-y-12">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[11px] font-bold text-[#FF6B35] uppercase tracking-widest mb-2">Pourquoi Erasmus+ ?</p>
                <h2 className="text-3xl font-black text-[#001a66] tracking-tight">Un programme, mille opportunités</h2>
              </div>
              <button className="hidden md:flex items-center gap-2 text-[12.5px] font-semibold text-[#003399] hover:underline">
                Voir tous les programmes <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                {icon:"🌍",t:"30+ Pays",s:"Destinations européennes et partenaires",color:"#EEF2FF",accent:"#003399"},
                {icon:"💰",t:"Jusqu'à 700€",s:"Bourse mensuelle selon destination",color:"#FFF7EE",accent:"#FF6B35"},
                {icon:"🎓",t:"Crédits ECTS",s:"Reconnaissance académique garantie",color:"#F0FDF4",accent:"#16A34A"},
                {icon:"🤝",t:"Réseau alumni",s:"Communauté de 12 millions d'étudiants",color:"#FFF1F2",accent:"#E11D48"},
              ].map((it,i)=>(
                <div key={i} className="bg-white rounded-2xl border border-[#E4E8F5] p-6 hover:shadow-xl hover:-translate-y-1.5 transition-all cursor-pointer group">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mb-4 transition-transform group-hover:scale-110" style={{ background: it.color }}>{it.icon}</div>
                  <div className="font-black text-[#1A1F36] text-[15px]">{it.t}</div>
                  <div className="text-[12px] text-gray-400 mt-1.5 leading-snug">{it.s}</div>
                  <div className="mt-4 flex items-center gap-1 text-[11.5px] font-semibold" style={{ color: it.accent }}>
                    En savoir plus <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              ))}
            </div>

            {/* Calendar band */}
            <div className="bg-white rounded-2xl border border-[#E4E8F5] p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-7">
                <div className="w-1.5 h-8 rounded-full bg-[#FF6B35]" />
                <div>
                  <h3 className="text-[17px] font-black text-[#001a66]">Calendrier des candidatures 2026–2027</h3>
                  <p className="text-[12px] text-gray-400 mt-0.5">Dates limites selon votre établissement d'origine</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {phase:"Semestre d'automne 2026",open:"Mars 2026",close:"15 avril 2026",status:"Ouvert"},
                  {phase:"Semestre de printemps 2027",open:"Octobre 2026",close:"15 nov. 2026",status:"À venir"},
                ].map((item,i)=>(
                  <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-[#F7F9FE] border border-[#E8EDF8]">
                    <div className={`shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-black ${i===0?"bg-green-100 text-green-700":"bg-blue-50 text-blue-600"}`}>{item.status}</div>
                    <div>
                      <div className="text-[13px] font-bold text-[#1A1F36]">{item.phase}</div>
                      <div className="text-[11px] text-gray-400 mt-0.5">Ouverture : {item.open} · Clôture : <strong className="text-[#FF6B35]">{item.close}</strong></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Testimonials */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                {name:"Sofia M.",univ:"Paris-Saclay → Madrid",q:"Une expérience qui a transformé ma vision du monde et boosté ma carrière.",note:"⭐⭐⭐⭐⭐"},
                {name:"Lucas B.",univ:"Lyon 3 → Berlin",q:"L'accompagnement Erasmus+ m'a permis de décrocher un stage dans une startup européenne.",note:"⭐⭐⭐⭐⭐"},
                {name:"Amina K.",univ:"Toulouse → Amsterdam",q:"Le réseau alumni Erasmus m'a ouvert des portes incroyables dès la fin de mes études.",note:"⭐⭐⭐⭐⭐"},
              ].map((t,i)=>(
                <div key={i} className="bg-white rounded-2xl border border-[#E4E8F5] p-6 shadow-sm">
                  <p className="text-[11px]">{t.note}</p>
                  <p className="text-[13px] text-[#1A1F36] leading-relaxed mt-3 italic">&ldquo;{t.q}&rdquo;</p>
                  <div className="flex items-center gap-2.5 mt-4 pt-4 border-t border-[#F0F3FA]">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#003399] to-[#4B7FFF] flex items-center justify-center text-white text-[11px] font-black">{t.name[0]}</div>
                    <div>
                      <div className="text-[12.5px] font-bold text-[#1A1F36]">{t.name}</div>
                      <div className="text-[10.5px] text-gray-400">{t.univ}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#001a66] text-white px-8 py-10">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start justify-between gap-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center"><Globe2 className="w-4 h-4 text-white" /></div>
                <span className="font-black text-[15px] tracking-tight">Erasmus+</span>
              </div>
              <p className="text-[12px] text-white/40 max-w-xs leading-relaxed">Programme de mobilité de la Commission Européenne pour l'éducation, la formation et la jeunesse.</p>
            </div>
            <div className="flex gap-16">
              {[
                {title:"Programme",links:["Présentation","Destinations","Bourses","Partenaires"]},
                {title:"Candidature",links:["Conditions","Dossier","FAQ","Contact"]},
              ].map((col)=>(
                <div key={col.title}>
                  <div className="text-[11px] font-black uppercase tracking-widest text-white/40 mb-3">{col.title}</div>
                  {col.links.map((l)=><div key={l} className="text-[12.5px] text-white/60 hover:text-white cursor-pointer py-0.5 transition-colors">{l}</div>)}
                </div>
              ))}
            </div>
          </div>
          <div className="max-w-7xl mx-auto mt-8 pt-6 border-t border-white/8 flex items-center justify-between text-[11px] text-white/25">
            <span>© 2026 Erasmus+ — Commission Européenne</span>
            <span>Politique de confidentialité · Mentions légales · Accessibilité</span>
          </div>
        </div>

      </div>
      )}

      {/* ── WIDGET ── */}
      <div className="relative z-10 flex flex-col items-end gap-4">

        {/* ── Chat window ── */}
        <AnimatePresence>
          {open && !minimized && (
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.94 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              className="flex flex-col rounded-[28px] overflow-hidden"
              style={{
                width: "540px",
                height: "720px",
                background: "#F3F6FE",
                boxShadow: "0 32px 96px rgba(0,51,153,0.2), 0 8px 32px rgba(0,0,0,0.1), 0 0 0 1px rgba(0,51,153,0.08)",
              }}
            >
              {/* ── Header ── */}
              <div
                className="shrink-0 relative overflow-hidden"
                style={{ background: "linear-gradient(145deg,#001a66 0%,#003399 50%,#0654e0 100%)" }}
              >
                {/* Decorative orbs */}
                <div className="absolute -top-10 -right-10 w-52 h-52 rounded-full bg-white/5 pointer-events-none" />
                <div className="absolute bottom-0 left-1/3 w-32 h-32 rounded-full bg-[#FF6B35]/10 blur-2xl pointer-events-none" />

                <div className="relative px-5 pt-4 pb-0">
                  <div className="flex items-center gap-3">
                    {/* Avatar group */}
                    <div className="relative shrink-0">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center"
                        style={{ background: "rgba(255,255,255,0.12)", border: "1.5px solid rgba(255,255,255,0.2)", backdropFilter: "blur(8px)" }}
                      >
                        <GraduationCap className="w-6 h-6 text-white" />
                      </div>
                      <motion.span
                        className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#22C55E] border-2 border-[#001a66]"
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[15px] font-black text-white tracking-tight">Lumina</span>
                        <span className="text-[9px] px-2 py-0.5 bg-[#FF6B35] text-white rounded-full font-black tracking-widest uppercase">IA</span>
                      </div>
                      <p className="text-[11px] text-white/55 flex items-center gap-1.5 mt-0.5">
                        <span className="flex items-center gap-1">
                          {apiMode === "api"
                            ? <><Wifi className="w-3 h-3" />{apiError ? <span className="text-red-300">Erreur API</span> : "API Live"}</>
                            : <><WifiOff className="w-3 h-3" />Mode Démo</>}
                        </span>
                        <span className="opacity-40">·</span>
                        Erasmus+ Mobilité
                      </p>
                    </div>

                    <div className="flex items-center gap-0.5 shrink-0">
                      <button onClick={() => setShowDashboard(!showDashboard)} className="w-9 h-9 rounded-xl flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all" title="Dashboard Admin">
                        <BarChart2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => setShowSettings(!showSettings)} className="w-9 h-9 rounded-xl flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all">
                        <Settings className="w-4 h-4" />
                      </button>
                      <button onClick={() => setMinimized(true)} className="w-9 h-9 rounded-xl flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all">
                        <Minus className="w-4 h-4" />
                      </button>
                      <button onClick={() => setOpen(false)} className="w-9 h-9 rounded-xl flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Tab bar */}
                  <div className="flex mt-4 gap-0">
                    {(["chat", "info"] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`relative px-5 py-2.5 text-[12.5px] font-semibold transition-all ${
                          activeTab === tab ? "text-white" : "text-white/40 hover:text-white/70"
                        }`}
                      >
                        {tab === "chat" ? "Conversation" : "Infos & FAQ"}
                        {activeTab === tab && (
                          <motion.div
                            layoutId="tab-underline"
                            className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-[#FF6B35]"
                          />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── Settings panel ── */}
              <AnimatePresence>
                {showSettings && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="shrink-0 overflow-hidden bg-white border-b border-[#E4E8F5]"
                  >
                    <div className="px-5 py-3.5 flex items-center gap-4">
                      <span className="text-[12px] font-bold text-[#1A1F36]">Connexion</span>
                      <div className="flex gap-1 bg-[#F0F3FA] p-1 rounded-xl ml-auto">
                        {(["mock", "api"] as const).map((m) => (
                          <button
                            key={m}
                            onClick={() => setApiMode(m)}
                            className={`text-[11px] px-3 py-1.5 rounded-lg font-bold transition-all ${
                              apiMode === m ? "bg-[#003399] text-white shadow-sm" : "text-[#9BA3BF] hover:text-[#1A1F36]"
                            }`}
                          >
                            {m === "mock" ? "Démo" : "API Live"}
                          </button>
                        ))}
                      </div>
                      {apiMode === "api" && (
                        <span className="text-[10px] text-[#9BA3BF] font-mono truncate max-w-[150px]">{API_CONFIG.baseURL}{API_CONFIG.endpoint}</span>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Tab: Info ── */}
              {activeTab === "info" && (
                <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4 [scrollbar-width:thin] [scrollbar-color:#E4E8F5_transparent]">
                  <p className="text-[13px] font-bold text-[#1A1F36]">À propos de Lumina</p>
                  <p className="text-[12.5px] text-[#6B7490] leading-relaxed">
                    Lumina est votre assistante IA dédiée au programme Erasmus+. Elle répond instantanément à vos questions sur les candidatures, bourses, destinations et délais.
                  </p>
                  <div className="space-y-2 pt-1">
                    {[
                      { q: "Comment candidater à Erasmus ?", a: "Contactez d'abord votre Bureau des Relations Internationales pour connaître les dossiers requis et soumettre votre candidature avant la date limite." },
                      { q: "Quels sont les montants des bourses ?", a: "Les montants varient selon le pays de destination (150–700 €/mois). Des compléments peuvent s'ajouter selon votre situation personnelle." },
                      { q: "Mon niveau de langue est-il suffisant ?", a: "En général, un niveau B2 dans la langue du pays est requis. Certains cursus enseignent en anglais avec un B2 en anglais." },
                    ].map((faq, i) => (
                      <FaqItem key={i} q={faq.q} a={faq.a} />
                    ))}
                  </div>
                  <div className="pt-2 grid grid-cols-3 gap-3">
                    {FEATURE_HIGHLIGHTS.map(({ icon: Icon, label, sub }) => (
                      <div key={label} className="bg-white rounded-2xl border border-[#E4E8F5] p-3.5 text-center shadow-sm">
                        <div className="w-9 h-9 mx-auto rounded-xl bg-[#EEF2FF] flex items-center justify-center mb-2">
                          <Icon className="w-4 h-4 text-[#003399]" />
                        </div>
                        <div className="text-[12px] font-bold text-[#1A1F36]">{label}</div>
                        <div className="text-[10px] text-[#9BA3BF] mt-0.5">{sub}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Tab: Chat ── */}
              {activeTab === "chat" && (
                <>
                  {/* Welcome screen */}
                  {!welcomeDone ? (
                    <div className="flex-1 flex flex-col items-center justify-center px-8 py-8 gap-6">
                      <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-center space-y-3"
                      >
                        <div
                          className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto shadow-xl mb-2"
                          style={{ background: "linear-gradient(145deg,#003399,#1E4FD8)" }}
                        >
                          <GraduationCap className="w-10 h-10 text-white" />
                        </div>
                        <h2 className="text-[20px] font-black text-[#1A1F36] tracking-tight">Bonjour, je suis Lumina</h2>
                        <p className="text-[13px] text-[#6B7490] leading-relaxed max-w-xs mx-auto">
                          Votre assistante IA pour toutes vos questions sur le programme Erasmus+ et la mobilité étudiante.
                        </p>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 }}
                        className="w-full grid grid-cols-3 gap-2.5"
                      >
                        {FEATURE_HIGHLIGHTS.map(({ icon: Icon, label, sub }) => (
                          <div key={label} className="bg-white rounded-2xl border border-[#E4E8F5] p-3.5 text-center shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
                            <div className="w-9 h-9 mx-auto rounded-xl bg-[#EEF2FF] flex items-center justify-center mb-2">
                              <Icon className="w-4 h-4 text-[#003399]" />
                            </div>
                            <div className="text-[11.5px] font-bold text-[#1A1F36]">{label}</div>
                            <div className="text-[10px] text-[#9BA3BF] mt-0.5">{sub}</div>
                          </div>
                        ))}
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.35 }}
                        className="w-full space-y-2.5"
                      >
                        <p className="text-[11px] font-bold text-[#9BA3BF] uppercase tracking-widest text-center">Questions fréquentes</p>
                        <div className="grid grid-cols-2 gap-2">
                          {SUGGESTIONS.map((s) => (
                            <button
                              key={s.label}
                              onClick={() => send(s.label)}
                              className="flex items-center gap-2 text-[12.5px] font-semibold text-[#1A1F36] bg-white border border-[#E4E8F5] rounded-2xl px-3.5 py-3 hover:border-[#003399]/30 hover:bg-[#EEF2FF] hover:text-[#003399] transition-all shadow-sm text-left"
                            >
                              <span className="text-base">{s.icon}</span>
                              {s.label}
                            </button>
                          ))}
                        </div>
                      </motion.div>

                      <motion.button
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.45 }}
                        onClick={startChat}
                        className="w-full py-3.5 rounded-2xl text-[13.5px] font-bold text-white transition-all hover:opacity-90 active:scale-[.98] shadow-lg flex items-center justify-center gap-2"
                        style={{ background: "linear-gradient(135deg,#003399,#1E4FD8)" }}
                      >
                        <MessageSquare className="w-4 h-4" />
                        Démarrer la conversation
                      </motion.button>
                    </div>
                  ) : (
                    <>
                      {/* Messages */}
                      <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4 [scrollbar-width:thin] [scrollbar-color:#E4E8F5_transparent]">
                        {messages.map((msg) => (
                          <MessageBubble key={msg.id} msg={msg} onLike={handleLike} />
                        ))}
                        {typing && (
                          <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-end gap-2.5"
                          >
                            <div
                              className="shrink-0 w-8 h-8 rounded-2xl flex items-center justify-center"
                              style={{ background: "linear-gradient(135deg,#003399,#1E4FD8)" }}
                            >
                              <GraduationCap className="w-4 h-4 text-white" />
                            </div>
                            <div className="bg-white rounded-2xl rounded-bl-[5px] border border-[#E4E8F5] px-4 py-3 shadow-sm">
                              <TypingDots />
                            </div>
                            <span className="text-[11px] text-[#C0C8DC] self-center">Lumina écrit…</span>
                          </motion.div>
                        )}
                        <div ref={bottomRef} />
                      </div>

                      {/* Suggestions */}
                      <AnimatePresence>
                        {messages.length <= 1 && !typing && (
                          <motion.div
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 4 }}
                            className="shrink-0 px-5 pb-3 flex flex-wrap gap-2"
                          >
                            {SUGGESTIONS.map((s) => (
                              <button
                                key={s.label}
                                onClick={() => send(s.label)}
                                className="flex items-center gap-1.5 text-[12px] font-semibold text-[#003399] bg-white border border-[#C7D3F5] rounded-full px-3.5 py-1.5 hover:bg-[#003399] hover:text-white hover:border-[#003399] transition-all shadow-sm"
                              >
                                <span>{s.icon}</span>
                                {s.label}
                                <ChevronRight className="w-3 h-3 opacity-60" />
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Input */}
                      <div className="shrink-0 px-4 pb-5 pt-2">
                        <div
                          className="flex items-end gap-2.5 bg-white rounded-2xl px-4 py-3 transition-all"
                          style={{ border: "1.5px solid #E4E8F5", boxShadow: "0 2px 12px rgba(0,51,153,0.06)" }}
                        >
                          <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={(e) => { setInput(e.target.value); autoResize(); }}
                            onKeyDown={handleKey}
                            placeholder="Posez votre question Erasmus+…"
                            rows={1}
                            className="flex-1 resize-none bg-transparent text-[13.5px] text-[#1A1F36] placeholder:text-[#B8C0D8] focus:outline-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                            style={{ minHeight: "22px", maxHeight: "120px", lineHeight: "1.6" }}
                          />
                          <motion.button
                            onClick={() => send()}
                            disabled={!input.trim() || typing}
                            whileHover={{ scale: 1.07 }}
                            whileTap={{ scale: 0.93 }}
                            className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center shadow-md transition-all disabled:opacity-20 disabled:cursor-not-allowed disabled:shadow-none"
                            style={{ background: "linear-gradient(135deg,#003399 0%,#1E4FD8 100%)" }}
                          >
                            <ArrowUp className="w-4.5 h-4.5 text-white" />
                          </motion.button>
                        </div>
                        <p className="text-[10px] text-[#C8CEE0] text-center mt-2 flex items-center justify-center gap-1.5">
                          <Sparkles className="w-3 h-3 text-[#FF6B35]" />
                          Assistant IA · Erasmus+ Mobilité Étudiante
                          <span className="opacity-50">·</span>
                          <Clock className="w-2.5 h-2.5" />
                          Disponible 24/7
                        </p>
                      </div>
                    </>
                  )}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Minimized pill ── */}
        <AnimatePresence>
          {open && minimized && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.88 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8 }}
              onClick={() => setMinimized(false)}
              className="flex items-center gap-3 px-5 py-3 rounded-2xl cursor-pointer"
              style={{
                background: "linear-gradient(135deg,#001a66,#003399)",
                boxShadow: "0 8px 32px rgba(0,51,153,0.38)",
              }}
            >
              <div className="w-7 h-7 rounded-xl bg-white/15 flex items-center justify-center">
                <GraduationCap className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-[13px] font-bold text-white">Lumina · Erasmus+</span>
              <motion.span
                className="w-2 h-2 rounded-full bg-[#22C55E] ml-0.5"
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <ChevronDown className="w-4 h-4 text-white/40 ml-1 rotate-180" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Teaser bubble ── */}
        <AnimatePresence>
          {showTeaser && !open && (
            <motion.div
              initial={{ opacity: 0, x: 28, scale: 0.86 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              onClick={openChat}
              className="flex items-start gap-3 max-w-[300px] cursor-pointer rounded-[20px] rounded-br-[6px] px-4 py-4"
              style={{
                background: "white",
                boxShadow: "0 16px 48px rgba(0,51,153,0.16), 0 2px 8px rgba(0,0,0,0.07), 0 0 0 1px rgba(0,51,153,0.08)",
              }}
            >
              <div
                className="shrink-0 w-9 h-9 rounded-2xl flex items-center justify-center mt-0.5 shadow"
                style={{ background: "linear-gradient(135deg,#FF6B35,#FF9F6B)" }}
              >
                <MapPin className="w-4.5 h-4.5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-[#1A1F36] leading-tight">
                  Besoin d&apos;aide pour votre mobilité ?
                </p>
                <p className="text-[12px] text-[#9BA3BF] mt-1 leading-snug">
                  Lumina répond à toutes vos questions Erasmus+
                </p>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
                  <span className="text-[10.5px] text-[#22C55E] font-semibold">En ligne maintenant</span>
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setShowTeaser(false); }}
                className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[#C0C8DC] hover:text-[#6B7490] hover:bg-[#F0F3FA] transition-all mt-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── FAB ── */}
        <div className="relative self-end">
          {!open && (
            <>
              <motion.span
                className="absolute inset-0 rounded-[20px]"
                style={{ background: "rgba(0,51,153,0.18)" }}
                animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0, 0.4] }}
                transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.span
                className="absolute -inset-3 rounded-[24px] border-2 border-[#003399]/12"
                animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
                transition={{ duration: 3.2, repeat: Infinity, delay: 0.6, ease: "easeInOut" }}
              />
            </>
          )}

          <motion.button
            onClick={() => (open ? setOpen(false) : openChat())}
            whileHover={{ scale: 1.08, rotate: open ? 0 : 5 }}
            whileTap={{ scale: 0.91 }}
            className="relative w-[60px] h-[60px] rounded-[20px] flex items-center justify-center"
            style={{
              background: "linear-gradient(145deg,#003399 0%,#1E4FD8 55%,#4B7FFF 100%)",
              boxShadow: "0 10px 36px rgba(0,51,153,0.42), 0 2px 8px rgba(0,0,0,0.15)",
            }}
            aria-label="Ouvrir l'assistant Erasmus"
          >
            <AnimatePresence mode="wait">
              {open ? (
                <motion.span key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                  <X className="w-6 h-6 text-white" />
                </motion.span>
              ) : (
                <motion.span key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                  <GraduationCap className="w-6 h-6 text-white" />
                </motion.span>
              )}
            </AnimatePresence>

            {!open && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#FF6B35] border-2 border-white flex items-center justify-center shadow"
              >
                <span className="text-[9px] font-black text-white">1</span>
              </motion.span>
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
}

/* ── FAQ accordion ──────────────────────────────────────── */
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white rounded-2xl border border-[#E4E8F5] overflow-hidden shadow-sm">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-[12.5px] font-semibold text-[#1A1F36]">{q}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown className="w-4 h-4 text-[#9BA3BF] shrink-0 ml-2" />
        </motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <p className="px-4 pb-3.5 text-[12px] text-[#6B7490] leading-relaxed border-t border-[#F0F3FA] pt-2.5">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
