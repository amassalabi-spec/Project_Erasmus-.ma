import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { ArrowUp, X, GraduationCap, Globe, ChevronRight, Minus, Sparkles, MapPin, Settings, Wifi, WifiOff, BarChart2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Dashboard from '../components/Dashboard';

type Role = "user" | "assistant";

interface Message {
  id: string;
  role: Role;
  content: string;
}

const SUGGESTIONS = [
  "Comment candidater à Erasmus ?",
  "Quels pays sont éligibles ?",
  "Quelles bourses sont disponibles ?",
  "Délais et calendrier",
];

const RESPONSES: Record<string, string> = {
  candidater:
    "Pour candidater à Erasmus+, vérifiez d'abord votre éligibilité auprès de votre coordinateur pédagogique, puis soumettez votre dossier via le portail de votre établissement avant la date limite. Je peux vous guider étape par étape !",
  pays:
    "Plus de **30 pays** participent à Erasmus+ : les 27 États membres de l'UE, ainsi que la Turquie, la Norvège, l'Islande et d'autres. Quel pays vous intéresse en particulier ?",
  bourses:
    "Les bourses Erasmus+ couvrent partiellement vos frais de séjour. Le montant dépend du pays de destination et de votre situation. Des compléments régionaux peuvent s'y ajouter.",
  délais:
    "Les candidatures pour le **semestre d'automne** ferment en mars-avril, et pour le **semestre de printemps** en octobre-novembre. Votre bureau des Relations Internationales vous confirmera les dates exactes.",
};

// Configuration pour l'API backend
const API_CONFIG = {
  // Changez cette URL via le fichier .env (VITE_API_URL) ou laissez localhost par défaut
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
  endpoint: "/api/chat",
  // Mode: "mock" pour tester sans backend, "api" pour utiliser le vrai backend
  mode: "api" as "mock" | "api",
};

async function callBackendAPIStream(message: string, onToken: (token: string) => void): Promise<void> {
  try {
    const response = await fetch(`${API_CONFIG.baseURL}${API_CONFIG.endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message, stream: true }),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    if (!response.body) {
      throw new Error('ReadableStream non supporté.');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let done = false;

    while (!done) {
      const { value, done: readerDone } = await reader.read();
      done = readerDone;
      if (value) {
        const chunk = decoder.decode(value, { stream: true });
        
        // C'est du SSE (Server-Sent Events) généré manuellement par FastAPI 
        // sous la forme \`data: {contenu}\n\n\`
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data.trim() === '[DONE]') {
              return;
            }
            // FastAPI nous envoie <br> pour les sauts de lignes pour ne pas casser le SSE
            const cleanToken = data.replace(/<br>/g, '\n');
            onToken(cleanToken);
          }
        }
      }
    }
  } catch (error) {
    console.error("Erreur lors de l'appel à l'API (Stream):", error);
    throw error;
  }
}

async function callBackendAPI(message: string): Promise<string> {
  try {
    const response = await fetch(`${API_CONFIG.baseURL}${API_CONFIG.endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message, stream: false }),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.response || data.message || "Désolé, je n'ai pas pu traiter votre demande.";
  } catch (error) {
    console.error("Erreur lors de l'appel à l'API:", error);
    throw error;
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

function TypingDots() {
  return (
    <div className="flex items-center gap-[3px] py-0.5 px-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-bounce"
          style={{ animationDelay: `${i * 0.18}s`, animationDuration: "1s" }}
        />
      ))}
    </div>
  );
}

export default function App() {
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [showTeaser, setShowTeaser] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "0",
      role: "assistant",
      content: "Bonjour ! Je suis Lumina, votre assistante mobilité Erasmus+. Comment puis-je vous aider aujourd'hui ?",
    },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [apiMode, setApiMode] = useState<"mock" | "api">(API_CONFIG.mode);
  const [showSettings, setShowSettings] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false);
  const [apiError, setApiError] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Show teaser bubble after 1.5s if chat not opened
  useEffect(() => {
    const t = setTimeout(() => { if (!open) setShowTeaser(true); }, 1500);
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

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || typing) return;

    const userMsgId = Date.now().toString() + "-user";
    setMessages((p) => [...p, { id: userMsgId, role: "user", content }]);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setTyping(true);
    setApiError(false);

    try {
      if (apiMode === "api") {
        // En mode stream, on crée d'abord un message assistant vide
        const assistantMsgId = Date.now().toString() + "-assistant";
        setMessages((p) => [
          ...p,
          { id: assistantMsgId, role: "assistant", content: "" },
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
        // Mode mock avec délai simulé
        await new Promise(resolve => setTimeout(resolve, 1100 + Math.random() * 700));
        let response = getMockResponse(content);
        setMessages((p) => [
          ...p,
          { id: (Date.now() + 1).toString(), role: "assistant", content: response },
        ]);
      }

    } catch (error) {
      console.error("Erreur:", error);
      setApiError(true);
      setMessages((p) => [
        ...p,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: "Désolé, je rencontre un problème de connexion. Vérifiez que le backend est démarré ou passez en mode démo."
        },
      ]);
    } finally {
      setTyping(false);
    }
  };

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const autoResize = () => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 100) + "px";
  };

  return (
    <div
      className="size-full flex items-end justify-end p-6 bg-background relative overflow-hidden"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* ── Simulated page background (Style Erasmus officiel) ── */}
      {showDashboard ? (
        <Dashboard onBack={() => setShowDashboard(false)} />
      ) : (
      <div className="absolute inset-0 pointer-events-none overflow-auto bg-white">
        {/* Top blue bar - Erasmus official */}
        <div className="sticky top-0 left-0 right-0 bg-[#003399] h-2 z-30" />

        {/* Navbar */}
        <div className="sticky top-2 left-0 right-0 bg-white border-b border-gray-200 flex items-center px-6 h-16 shadow-sm z-20">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#003399] rounded flex items-center justify-center">
                <span className="text-white font-bold text-xs">EU</span>
              </div>
              <span className="text-sm font-bold text-[#003399]">Erasmus+</span>
            </div>
          </div>
          <div className="ml-auto flex gap-6">
            {["Accueil", "Programmes", "Destinations", "Candidatures", "Contact"].map((l) => (
              <span key={l} className="text-xs text-gray-600 hidden sm:block cursor-pointer hover:text-[#003399] transition-colors font-medium">{l}</span>
            ))}
          </div>
        </div>

        {/* Hero section - Official Erasmus style */}
        <div className="relative bg-gradient-to-r from-[#003399] to-[#0052CC] text-white px-10 py-16 overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#FF6B35]/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-white/5 rounded-full blur-2xl" />

          <div className="max-w-6xl mx-auto relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <div className="inline-block px-4 py-1.5 bg-[#FF6B35] text-white text-xs font-bold rounded-full">
                  PROGRAMME ERASMUS+ 2026-2027
                </div>
                <h1 className="text-4xl md:text-5xl font-bold leading-tight">
                  Mobilité Internationale Étudiante
                </h1>
                <p className="text-lg text-white/90 leading-relaxed">
                  Partez étudier en Europe, développez vos compétences et vivez une expérience unique avec le programme Erasmus+.
                </p>
                <div className="flex gap-4 pt-2">
                  <button className="px-6 py-3 bg-[#FF6B35] text-white rounded font-semibold hover:bg-[#FF5722] transition-colors shadow-lg">
                    Candidater maintenant
                  </button>
                  <button className="px-6 py-3 bg-white/10 backdrop-blur text-white rounded font-semibold hover:bg-white/20 transition-colors border border-white/30">
                    En savoir plus
                  </button>
                </div>
              </div>
              <div className="hidden md:flex justify-center items-center gap-4 flex-wrap">
                {["🇩🇪","🇪🇸","🇮🇹","🇵🇹","🇬🇷","🇫🇷","🇳🇱","🇸🇪"].map((f) => (
                  <div key={f} className="w-14 h-14 rounded-full bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center text-2xl shadow-lg hover:scale-110 transition-transform cursor-pointer">
                    {f}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Content section */}
        <div className="bg-gray-50 px-6 py-16">
          <div className="max-w-6xl mx-auto space-y-12">
            {/* Title section */}
            <div className="text-center space-y-3">
              <h2 className="text-3xl font-bold text-[#003399]">Pourquoi choisir Erasmus+ ?</h2>
              <p className="text-base text-gray-600 max-w-2xl mx-auto">
                Une opportunité unique de mobilité internationale pour enrichir votre parcours académique et personnel.
              </p>
            </div>

            {/* Features grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { icon: "🌍", title: "30+ Pays", desc: "Destinations européennes" },
                { icon: "💰", title: "Bourses", desc: "Aides financières adaptées" },
                { icon: "🎓", title: "Formation", desc: "Reconnaissance académique" },
                { icon: "🤝", title: "Réseau", desc: "Communauté internationale" },
              ].map((item, i) => (
                <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 text-center space-y-3 hover:shadow-lg hover:border-[#003399]/30 transition-all cursor-pointer">
                  <div className="w-16 h-16 mx-auto rounded-full bg-[#003399]/5 flex items-center justify-center text-3xl">
                    {item.icon}
                  </div>
                  <h3 className="font-bold text-[#003399]">{item.title}</h3>
                  <p className="text-sm text-gray-600">{item.desc}</p>
                </div>
              ))}
            </div>

            {/* Calendar */}
            <div className="bg-white rounded-lg border border-gray-200 p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-1 h-8 bg-[#FF6B35] rounded-full" />
                <h3 className="text-2xl font-bold text-[#003399]">Calendrier des candidatures 2026-2027</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { date: "Mars 2026", event: "Ouverture candidatures (Automne 2026)", color: "bg-blue-50 text-blue-700" },
                  { date: "15 Avril 2026", event: "Date limite (Automne 2026)", color: "bg-orange-50 text-orange-700" },
                  { date: "Octobre 2026", event: "Ouverture candidatures (Printemps 2027)", color: "bg-blue-50 text-blue-700" },
                  { date: "15 Nov 2026", event: "Date limite (Printemps 2027)", color: "bg-orange-50 text-orange-700" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className={`px-4 py-2 ${item.color} rounded-lg font-bold text-sm whitespace-nowrap`}>
                      {item.date}
                    </div>
                    <span className="text-gray-700 text-sm">{item.event}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* ── WIDGET ── */}
      <div className="relative z-10 flex flex-col items-end gap-3">

        {/* Chat panel */}
        <AnimatePresence>
          {open && !minimized && (
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 340, damping: 30 }}
              className="w-[370px] rounded-2xl overflow-hidden flex flex-col bg-card"
              style={{
                height: "510px",
                boxShadow: "0 12px 48px rgba(30,79,216,0.18), 0 2px 12px rgba(0,0,0,0.1)",
                border: "1px solid rgba(30,79,216,0.15)",
              }}
            >
              {/* Header */}
              <div
                className="shrink-0 px-4 py-3 flex items-center gap-3"
                style={{
                  background: "linear-gradient(135deg, #1E4FD8 0%, #3B6EF5 100%)",
                }}
              >
                <div className="relative">
                  <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                    <GraduationCap className="w-5 h-5 text-white" />
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-white" />
                </div>
                <div className="flex-1">
                  <p className="text-[13px] font-semibold text-white leading-none">Lumina</p>
                  <p className="text-[10px] text-white/65 mt-0.5 flex items-center gap-1">
                    Assistante Erasmus+ ·
                    {apiMode === "api" ? (
                      <span className="flex items-center gap-0.5">
                        <Wifi className="w-2.5 h-2.5" />
                        {apiError ? "Erreur API" : "API Live"}
                      </span>
                    ) : (
                      <span className="flex items-center gap-0.5">
                        <WifiOff className="w-2.5 h-2.5" />
                        Mode Démo
                      </span>
                    )}
                  </p>
                </div>
                <button onClick={() => setShowDashboard(!showDashboard)} className="text-white/60 hover:text-white p-1 rounded transition-colors" title="Dashboard Admin">
                  <BarChart2 className="w-4 h-4" />
                </button>
                <button onClick={() => setShowSettings(!showSettings)} className="text-white/60 hover:text-white p-1 rounded transition-colors" title="Paramètres">
                  <Settings className="w-4 h-4" />
                </button>
                <button onClick={() => setMinimized(true)} className="text-white/60 hover:text-white p-1 rounded transition-colors">
                  <Minus className="w-4 h-4" />
                </button>
                <button onClick={() => setOpen(false)} className="text-white/60 hover:text-white p-1 rounded transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Settings Panel */}
              <AnimatePresence>
                {showSettings && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="shrink-0 overflow-hidden bg-card border-b border-border"
                  >
                    <div className="px-4 py-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-medium text-foreground">Mode de connexion</span>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => setApiMode("mock")}
                            className={`text-[10px] px-2.5 py-1 rounded-md transition-all ${
                              apiMode === "mock"
                                ? "bg-primary text-white font-medium"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                          >
                            Démo
                          </button>
                          <button
                            onClick={() => setApiMode("api")}
                            className={`text-[10px] px-2.5 py-1 rounded-md transition-all ${
                              apiMode === "api"
                                ? "bg-primary text-white font-medium"
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                          >
                            API Live
                          </button>
                        </div>
                      </div>
                      {apiMode === "api" && (
                        <div className="text-[10px] text-muted-foreground bg-muted/50 rounded-md px-2.5 py-2">
                          Backend: <span className="font-mono">{API_CONFIG.baseURL}{API_CONFIG.endpoint}</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-background [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {messages.map((msg) => {
                  const isUser = msg.role === "user";
                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${isUser ? "justify-end" : "justify-start"} items-end gap-2`}
                    >
                      {!isUser && (
                        <div className="shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                          <GraduationCap className="w-3 h-3 text-primary" />
                        </div>
                      )}
                      <div
                        className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed ${
                          isUser
                            ? "text-primary-foreground rounded-br-sm"
                            : "bg-card text-card-foreground border border-border rounded-bl-sm markdown-body"
                        }`}
                        style={isUser ? { background: "linear-gradient(135deg, #1E4FD8, #3B6EF5)" } : {}}
                      >
                        {isUser ? (
                          msg.content
                        ) : (
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
                        )}
                      </div>
                    </motion.div>
                  );
                })}
                {typing && (
                  <div className="flex items-end gap-2">
                    <div className="shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center">
                      <GraduationCap className="w-3 h-3 text-primary" />
                    </div>
                    <div className="bg-card border border-border rounded-2xl rounded-bl-sm px-3.5 py-2.5">
                      <TypingDots />
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Suggestions */}
              {messages.length <= 1 && !typing && (
                <div className="shrink-0 px-4 pb-2 flex flex-wrap gap-1.5">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="flex items-center gap-1 text-[11px] font-medium text-primary border border-primary/25 bg-secondary rounded-full px-3 py-1.5 hover:bg-primary hover:text-white transition-all duration-150"
                    >
                      {s} <ChevronRight className="w-2.5 h-2.5" />
                    </button>
                  ))}
                </div>
              )}

              {/* Input */}
              <div className="shrink-0 border-t border-border px-3 py-3 bg-card">
                <div className="flex items-end gap-2 bg-background border border-border rounded-xl px-3 py-2 focus-within:border-primary/50 transition-colors duration-150">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => { setInput(e.target.value); autoResize(); }}
                    onKeyDown={handleKey}
                    placeholder="Posez votre question…"
                    rows={1}
                    className="flex-1 resize-none bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                    style={{ minHeight: "20px", maxHeight: "100px", lineHeight: "1.5" }}
                  />
                  <button
                    onClick={() => send()}
                    disabled={!input.trim() || typing}
                    className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-150 hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{ background: "linear-gradient(135deg, #1E4FD8, #3B6EF5)" }}
                  >
                    <ArrowUp className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
                <p className="text-[9px] text-muted-foreground text-center mt-1.5 flex items-center justify-center gap-1">
                  <Sparkles className="w-2.5 h-2.5 text-accent" />
                  Assistant IA · Programme Erasmus+ Mobilité Étudiante
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Minimized bar */}
        <AnimatePresence>
          {open && minimized && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              onClick={() => setMinimized(false)}
              className="flex items-center gap-3 px-4 py-2.5 rounded-2xl cursor-pointer shadow-lg"
              style={{
                background: "linear-gradient(135deg, #1E4FD8 0%, #3B6EF5 100%)",
                boxShadow: "0 4px 20px rgba(30,79,216,0.35)",
              }}
            >
              <GraduationCap className="w-4 h-4 text-white" />
              <span className="text-[13px] font-medium text-white">Assistant Erasmus+</span>
              <span className="w-2 h-2 rounded-full bg-green-400" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Teaser bubble */}
        <AnimatePresence>
          {showTeaser && !open && (
            <motion.div
              initial={{ opacity: 0, x: 20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 16, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 300, damping: 26 }}
              className="flex items-start gap-3 max-w-[260px] bg-card rounded-2xl rounded-br-sm px-4 py-3 shadow-xl cursor-pointer"
              style={{
                border: "1px solid rgba(30,79,216,0.2)",
                boxShadow: "0 8px 32px rgba(30,79,216,0.15)",
              }}
              onClick={openChat}
            >
              <div className="shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-primary" />
              </div>
              <div>
                <p className="text-[12px] font-semibold text-foreground leading-snug">
                  Besoin d'aide pour votre mobilité ?
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Je réponds à toutes vos questions Erasmus+
                </p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); setShowTeaser(false); }}
                className="shrink-0 text-muted-foreground hover:text-foreground transition-colors mt-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* FAB — pulsing ring */}
        <div className="relative">
          {/* Pulsing rings */}
          {!open && (
            <>
              <span className="absolute inset-0 rounded-full animate-ping opacity-20 bg-primary" style={{ animationDuration: "2s" }} />
              <span className="absolute -inset-2 rounded-full border-2 border-primary/20 animate-ping opacity-30" style={{ animationDuration: "2.6s", animationDelay: "0.4s" }} />
            </>
          )}

          <motion.button
            onClick={() => (open ? setOpen(false) : openChat())}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.94 }}
            className="relative w-16 h-16 rounded-full flex items-center justify-center shadow-xl"
            style={{
              background: "linear-gradient(135deg, #1E4FD8 0%, #3B6EF5 100%)",
              boxShadow: "0 6px 28px rgba(30,79,216,0.45)",
            }}
            aria-label="Ouvrir l'assistant Erasmus"
          >
            <AnimatePresence mode="wait">
              {open ? (
                <motion.span
                  key="close"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  <X className="w-6 h-6 text-white" />
                </motion.span>
              ) : (
                <motion.span
                  key="open"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.18 }}
                >
                  <GraduationCap className="w-6 h-6 text-white" />
                </motion.span>
              )}
            </AnimatePresence>

            {/* Unread dot */}
            {!open && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-accent border-2 border-white flex items-center justify-center"
              >
                <span className="text-[9px] font-bold text-white">1</span>
              </motion.span>
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
}
