import React, { useState, useEffect, useRef, useCallback } from "react";

/* ============================================================
   OdiaGuru AI — learn to speak, read & understand Odia
   Design language: Konark chakra as signature motif.
   Palette: Ink Indigo / Temple Stone / Vermillion / Turmeric / Teal
   ============================================================ */

const FONT_LINK = "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Work+Sans:wght@400;500;600;700&family=Noto+Sans+Oriya:wght@400;600;700&display=swap";

const COLORS = {
  ink: "#1B2A4A",
  inkSoft: "#28395C",
  stone: "#F4ECDC",
  stoneDeep: "#E9DEC6",
  vermillion: "#C1442D",
  turmeric: "#E8A93B",
  teal: "#1F6F6B",
  charcoal: "#2A211C",
  cream: "#FBF6EC",
};

/* ---------------- storage helpers (plain browser localStorage) ---------------- */
async function getJSON(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
async function setJSON(key, val) {
  try {
    window.localStorage.setItem(key, JSON.stringify(val));
  } catch (e) {
    console.error("storage set failed", e);
  }
}
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

/* ---------------- Claude API helper ---------------- */
// Calls OUR OWN backend (api/odia-ai.js), which holds the real Anthropic key.
// Never call api.anthropic.com directly from the browser in a published app.
async function askAI(system, user) {
  const res = await fetch("/api/odia-ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system, user }),
  });
  if (!res.ok) throw new Error("AI request failed");
  const data = await res.json();
  return data.text || "";
}
function extractJSON(text) {
  const cleaned = text.replace(/```json|```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const arrStart = cleaned.indexOf("[");
  const arrEnd = cleaned.lastIndexOf("]");
  let candidate = cleaned;
  if (start !== -1 && end !== -1 && (arrStart === -1 || start < arrStart)) {
    candidate = cleaned.slice(start, end + 1);
  } else if (arrStart !== -1 && arrEnd !== -1) {
    candidate = cleaned.slice(arrStart, arrEnd + 1);
  }
  return JSON.parse(candidate);
}
const JSON_RULE =
  "Respond with ONLY valid JSON. No markdown fences, no preamble, no explanation text outside the JSON. Keep every field short and concise so the whole response fits comfortably in the token budget.";

/* ---------------- speech helpers ---------------- */
function speak(text, lang) {
  try {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const pick =
      voices.find((v) => v.lang && v.lang.toLowerCase().startsWith(lang)) ||
      voices.find((v) => v.lang && v.lang.toLowerCase().startsWith("hi")) ||
      null;
    if (pick) u.voice = pick;
    u.lang = lang === "or" ? "or-IN" : lang === "hi" ? "hi-IN" : "en-IN";
    u.rate = 0.85;
    window.speechSynthesis.speak(u);
  } catch (e) {
    console.error(e);
  }
}

/* ---------------- Konark chakra (signature element) ---------------- */
function Chakra({ size = 40, spokes = 16, color = COLORS.turmeric, progress = null, thickness = 1.4 }) {
  const r = size / 2;
  const inner = r * 0.28;
  const outer = r * 0.86;
  const lines = [];
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2;
    lines.push(
      <line
        key={i}
        x1={r + inner * Math.cos(a)}
        y1={r + inner * Math.sin(a)}
        x2={r + outer * Math.cos(a)}
        y2={r + outer * Math.sin(a)}
        stroke={color}
        strokeWidth={thickness}
        strokeLinecap="round"
      />
    );
  }
  const circumference = 2 * Math.PI * outer;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={r} cy={r} r={outer} fill="none" stroke={color} strokeWidth={thickness} opacity="0.55" />
      <circle cx={r} cy={r} r={inner} fill="none" stroke={color} strokeWidth={thickness} />
      {lines}
      <circle cx={r} cy={r} r={inner * 0.35} fill={color} />
      {progress !== null && (
        <circle
          cx={r}
          cy={r}
          r={outer + 3}
          fill="none"
          stroke={COLORS.vermillion}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={`${circumference * progress} ${circumference}`}
          transform={`rotate(-90 ${r} ${r})`}
        />
      )}
    </svg>
  );
}

function Spinner({ label }) {
  const [rot, setRot] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setRot((r) => r + 12), 60);
    return () => clearInterval(id);
  }, []);
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 0", gap: 12 }}>
      <div style={{ transform: `rotate(${rot}deg)`, transition: "transform 0.06s linear" }}>
        <Chakra size={52} color={COLORS.vermillion} />
      </div>
      <div style={{ fontFamily: "'Work Sans'", color: COLORS.ink, fontSize: 14, opacity: 0.75 }}>
        {label || "OdiaGuru is thinking…"}
      </div>
    </div>
  );
}

/* ---------------- shared UI atoms ---------------- */
function Header({ title, subtitle, onBack, right }) {
  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${COLORS.ink}, ${COLORS.inkSoft})`,
        padding: "18px 18px 22px",
        color: COLORS.cream,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", right: -18, top: -18, opacity: 0.15 }}>
        <Chakra size={110} color={COLORS.turmeric} spokes={20} />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, position: "relative", zIndex: 1 }}>
        {onBack && (
          <button onClick={onBack} style={iconBtnStyle}>
            ←
          </button>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Fraunces'", fontWeight: 600, fontSize: 22 }}>{title}</div>
          {subtitle && (
            <div style={{ fontFamily: "'Work Sans'", fontSize: 12.5, opacity: 0.75, marginTop: 2 }}>{subtitle}</div>
          )}
        </div>
        {right}
      </div>
    </div>
  );
}
const iconBtnStyle = {
  background: "rgba(255,255,255,0.12)",
  border: "none",
  color: COLORS.cream,
  width: 34,
  height: 34,
  borderRadius: 10,
  fontSize: 16,
  cursor: "pointer",
};

function Card({ children, onClick, style }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: COLORS.cream,
        borderRadius: 16,
        padding: 16,
        boxShadow: "0 2px 10px rgba(27,42,74,0.08)",
        border: `1px solid ${COLORS.stoneDeep}`,
        cursor: onClick ? "pointer" : "default",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Pill({ label, active, onClick, color }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "7px 14px",
        borderRadius: 999,
        border: `1.5px solid ${active ? (color || COLORS.vermillion) : COLORS.stoneDeep}`,
        background: active ? (color || COLORS.vermillion) : "transparent",
        color: active ? COLORS.cream : COLORS.ink,
        fontFamily: "'Work Sans'",
        fontWeight: 600,
        fontSize: 12.5,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

function SpeakerBtn({ text, lang = "or" }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        speak(text, lang);
      }}
      style={{
        border: "none",
        background: COLORS.stoneDeep,
        borderRadius: 999,
        width: 30,
        height: 30,
        fontSize: 13,
        cursor: "pointer",
        flexShrink: 0,
      }}
      title="Listen"
    >
      🔊
    </button>
  );
}

function PrimaryBtn({ children, onClick, style, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: disabled ? COLORS.stoneDeep : COLORS.vermillion,
        color: disabled ? COLORS.ink : COLORS.cream,
        border: "none",
        borderRadius: 12,
        padding: "12px 18px",
        fontFamily: "'Work Sans'",
        fontWeight: 700,
        fontSize: 14.5,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.6 : 1,
        ...style,
      }}
    >
      {children}
    </button>
  );
}

function ErrorNote({ msg }) {
  if (!msg) return null;
  return (
    <div
      style={{
        background: "#FCE9E4",
        color: COLORS.vermillion,
        padding: 12,
        borderRadius: 10,
        fontFamily: "'Work Sans'",
        fontSize: 13,
        margin: "12px 18px",
      }}
    >
      {msg}
    </div>
  );
}

/* ---------------- premium gate ---------------- */
const FREE_DAILY_AI_LIMIT = 5;

function usePremiumGate(profile, setProfile) {
  const [showPaywall, setShowPaywall] = useState(false);
  const checkAndConsume = useCallback(() => {
    if (profile.premium) return true;
    const key = todayStr();
    const used = profile.aiUsage && profile.aiUsage.date === key ? profile.aiUsage.count : 0;
    if (used >= FREE_DAILY_AI_LIMIT) {
      setShowPaywall(true);
      return false;
    }
    setProfile((p) => ({ ...p, aiUsage: { date: key, count: used + 1 } }));
    return true;
  }, [profile, setProfile]);
  return { showPaywall, setShowPaywall, checkAndConsume };
}

function PaywallModal({ onClose, onUnlock }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(27,42,74,0.55)",
        display: "flex",
        alignItems: "flex-end",
        zIndex: 50,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: COLORS.cream,
          width: "100%",
          borderRadius: "20px 20px 0 0",
          padding: 22,
          fontFamily: "'Work Sans'",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
          <Chakra size={44} color={COLORS.turmeric} />
        </div>
        <div style={{ fontFamily: "'Fraunces'", fontSize: 20, fontWeight: 700, textAlign: "center", color: COLORS.ink }}>
          You've used today's free AI lessons
        </div>
        <div style={{ textAlign: "center", fontSize: 13, color: COLORS.charcoal, opacity: 0.7, marginTop: 6 }}>
          Come back tomorrow for {FREE_DAILY_AI_LIMIT} more free AI-generated lessons, or unlock OdiaGuru Premium.
        </div>
        <div style={{ margin: "18px 0", display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            "Unlimited AI conversations",
            "Voice pronunciation practice, no caps",
            "Full Kids Learning Mode",
            "Complete Odisha travel guide",
          ].map((f) => (
            <div key={f} style={{ display: "flex", gap: 10, alignItems: "center", fontSize: 13.5, color: COLORS.ink }}>
              <span style={{ color: COLORS.teal }}>✓</span> {f}
            </div>
          ))}
        </div>
        <PrimaryBtn style={{ width: "100%" }} onClick={onUnlock}>
          Unlock Premium (demo)
        </PrimaryBtn>
        <button
          onClick={onClose}
          style={{ width: "100%", background: "none", border: "none", padding: 12, color: COLORS.ink, opacity: 0.6, fontFamily: "'Work Sans'" }}
        >
          Not now
        </button>
        <div style={{ fontSize: 10.5, textAlign: "center", opacity: 0.5, marginTop: 4 }}>
          Demo app — this switch only toggles local state, no real payment is taken.
        </div>
      </div>
    </div>
  );
}

/* ---------------- level pills ---------------- */
const LEVELS = ["Beginner", "Intermediate", "Advanced"];
function LevelBar({ level, onChange }) {
  return (
    <div style={{ display: "flex", gap: 8, padding: "12px 18px 4px", overflowX: "auto" }}>
      {LEVELS.map((l) => (
        <Pill key={l} label={l} active={level === l} onClick={() => onChange(l)} />
      ))}
    </div>
  );
}

/* ============================================================
   HOME SCREEN
   ============================================================ */
const FEATURES = [
  { id: "words", label: "Daily Odia Words", desc: "10 new words today", icon: "🪔", color: COLORS.turmeric },
  { id: "conversations", label: "Learn Conversations", desc: "8 real-life categories", icon: "💬", color: COLORS.vermillion },
  { id: "voice", label: "Voice Practice", desc: "Listen & speak along", icon: "🎙️", color: COLORS.teal },
  { id: "travel", label: "Travel Phrases", desc: "For visiting Odisha", icon: "🧭", color: COLORS.ink },
  { id: "kids", label: "Kids Learning Mode", desc: "Fun for young learners", icon: "🧒", color: COLORS.vermillion },
  { id: "quiz", label: "Quiz Section", desc: "Test what you've learned", icon: "📝", color: COLORS.teal },
];

function Home({ profile, setProfile, go, gate }) {
  return (
    <div>
      <Header
        title="ଓଡ଼ିଆଗୁରୁ · OdiaGuru AI"
        subtitle="Learn Odia — speak, read, understand"
        right={
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <Chakra size={40} progress={Math.min(profile.streak / 7, 1)} color={COLORS.turmeric} />
            <span style={{ fontSize: 10, opacity: 0.85 }}>{profile.streak}d streak</span>
          </div>
        }
      />
      <LevelBar level={profile.level} onChange={(l) => setProfile((p) => ({ ...p, level: l }))} />

      <div style={{ padding: "10px 18px 4px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: "'Work Sans'", fontSize: 12.5, color: COLORS.ink, opacity: 0.65 }}>
          {profile.premium ? "★ Premium unlocked" : `${Math.max(0, FREE_DAILY_AI_LIMIT - ((profile.aiUsage && profile.aiUsage.date === todayStr()) ? profile.aiUsage.count : 0))} free AI lessons left today`}
        </span>
        {!profile.premium && (
          <button onClick={() => go("premium")} style={{ background: "none", border: "none", color: COLORS.vermillion, fontFamily: "'Work Sans'", fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}>
            Go Premium →
          </button>
        )}
      </div>

      <div style={{ padding: 18, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {FEATURES.map((f) => (
          <Card key={f.id} onClick={() => go(f.id)} style={{ display: "flex", flexDirection: "column", gap: 8, minHeight: 118 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: f.color + "22",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 19,
              }}
            >
              {f.icon}
            </div>
            <div style={{ fontFamily: "'Fraunces'", fontWeight: 600, fontSize: 14.5, color: COLORS.ink, lineHeight: 1.2 }}>
              {f.label}
            </div>
            <div style={{ fontFamily: "'Work Sans'", fontSize: 11.5, color: COLORS.charcoal, opacity: 0.65 }}>{f.desc}</div>
          </Card>
        ))}
      </div>
      <div style={{ padding: "0 18px 28px", fontFamily: "'Work Sans'", fontSize: 11.5, textAlign: "center", opacity: 0.5, color: COLORS.ink }}>
        {profile.savedWords.length} words saved · {profile.quizHistory.length} quizzes taken
      </div>
    </div>
  );
}

/* ============================================================
   DAILY WORDS
   ============================================================ */
function DailyWords({ profile, setProfile, go, gate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (force) => {
    setError("");
    const cacheKey = `lesson:${profile.level}:${todayStr()}`;
    if (!force) {
      const cached = await getJSON(cacheKey, null);
      if (cached) {
        setData(cached);
        setLoading(false);
        return;
      }
    }
    if (!gate.checkAndConsume()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const raw = await askAI(
        `You are OdiaGuru, an expert, encouraging Odia language teacher. ${JSON_RULE} JSON shape: {"words":[{"odia":"","translit":"","hindi":"","english":""}] (exactly 10), "sentences":[{"odia":"","translit":"","english":""}] (exactly 5)}. Use vocabulary appropriate for a ${profile.level} learner. Keep Odia script accurate.`,
        `Give me today's Odia lesson: 10 new everyday words and 5 example sentences using some of them.`
      );
      const parsed = extractJSON(raw);
      setData(parsed);
      await setJSON(cacheKey, parsed);
    } catch (e) {
      setError("Couldn't reach OdiaGuru AI right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [profile.level, gate]);

  useEffect(() => {
    load(false);
    // eslint-disable-next-line
  }, [profile.level]);

  const isSaved = (w) => profile.savedWords.some((x) => x.odia === w.odia);
  const toggleSave = (w) => {
    setProfile((p) => {
      const exists = p.savedWords.some((x) => x.odia === w.odia);
      const savedWords = exists ? p.savedWords.filter((x) => x.odia !== w.odia) : [...p.savedWords, w];
      return { ...p, savedWords };
    });
  };

  return (
    <div>
      <Header title="Daily Odia Words" subtitle={`${profile.level} · ${todayStr()}`} onBack={() => go("home")} />
      <ErrorNote msg={error} />
      {loading && <Spinner label="Preparing today's words…" />}
      {!loading && data && (
        <div style={{ padding: 18 }}>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
            <button onClick={() => load(true)} style={{ background: "none", border: "none", color: COLORS.vermillion, fontFamily: "'Work Sans'", fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}>
              ↻ New set
            </button>
          </div>
          <div style={{ fontFamily: "'Fraunces'", fontWeight: 600, fontSize: 15, color: COLORS.ink, marginBottom: 8 }}>10 words for today</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data.words.map((w, i) => (
              <Card key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: 12 }}>
                <SpeakerBtn text={w.odia} lang="or" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'Noto Sans Oriya'", fontSize: 19, color: COLORS.ink }}>{w.odia}</div>
                  <div style={{ fontFamily: "'Work Sans'", fontSize: 11.5, color: COLORS.charcoal, opacity: 0.7 }}>
                    {w.translit} · हिं: {w.hindi} · EN: {w.english}
                  </div>
                </div>
                <button onClick={() => toggleSave(w)} style={{ background: "none", border: "none", fontSize: 17, cursor: "pointer" }}>
                  {isSaved(w) ? "★" : "☆"}
                </button>
              </Card>
            ))}
          </div>

          <div style={{ fontFamily: "'Fraunces'", fontWeight: 600, fontSize: 15, color: COLORS.ink, margin: "18px 0 8px" }}>Example sentences</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {data.sentences.map((s, i) => (
              <Card key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: 12 }}>
                <SpeakerBtn text={s.odia} lang="or" />
                <div>
                  <div style={{ fontFamily: "'Noto Sans Oriya'", fontSize: 16.5, color: COLORS.ink }}>{s.odia}</div>
                  <div style={{ fontFamily: "'Work Sans'", fontSize: 11.5, color: COLORS.charcoal, opacity: 0.7 }}>
                    {s.translit} — {s.english}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
            <PrimaryBtn style={{ flex: 1 }} onClick={() => go("quiz", { topic: "today's words", level: profile.level })}>
              Take mini quiz
            </PrimaryBtn>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   CONVERSATIONS
   ============================================================ */
const CATEGORIES = ["Greetings", "Family", "Shopping", "Food", "Temple Visits", "Travel", "School", "Daily Life"];

function ConversationList({ go }) {
  return (
    <div>
      <Header title="Learn Conversations" subtitle="Pick a real-life situation" onBack={() => go("home")} />
      <div style={{ padding: 18, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {CATEGORIES.map((c) => (
          <Card key={c} onClick={() => go("conversationDetail", { category: c })} style={{ textAlign: "center", padding: "20px 10px" }}>
            <div style={{ fontFamily: "'Fraunces'", fontWeight: 600, fontSize: 14.5, color: COLORS.ink }}>{c}</div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ConversationDetail({ params, profile, go, gate }) {
  const category = params.category;
  const [convo, setConvo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("view"); // view | practice
  const [step, setStep] = useState(0);
  const [userInput, setUserInput] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [checking, setChecking] = useState(false);

  const load = useCallback(async () => {
    if (!gate.checkAndConsume()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const raw = await askAI(
        `You are OdiaGuru, a friendly Odia teacher. ${JSON_RULE} JSON shape: {"title":"","lines":[{"speaker":"A"|"B","odia":"","translit":"","hindi":"","english":""}]} with 6-8 lines. Suit a ${profile.level} learner.`,
        `Write a short natural Odia conversation for the category "${category}".`
      );
      setConvo(extractJSON(raw));
    } catch (e) {
      setError("Couldn't generate this conversation. Try again.");
    } finally {
      setLoading(false);
    }
  }, [category, profile.level, gate]);

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, [category]);

  async function checkAnswer() {
    if (!userInput.trim() || !convo) return;
    if (!gate.checkAndConsume()) return;
    setChecking(true);
    setFeedback(null);
    try {
      const line = convo.lines[step];
      const raw = await askAI(
        `You are OdiaGuru, a warm, patient, encouraging Odia teacher speaking to a ${profile.level} student. Correct mistakes gently, never harshly. Explain briefly in simple Hindi and English. ${JSON_RULE} JSON shape: {"correct": true|false, "feedback": "1-2 short sentences of gentle feedback in English mixing in a little Hindi", "corrected_odia": "the best Odia version"}`,
        `The target line was Odia: "${line.odia}" (meaning: ${line.english}). The student attempted to say/type: "${userInput}". Evaluate kindly and briefly.`
      );
      setFeedback(extractJSON(raw));
    } catch (e) {
      setFeedback({ correct: null, feedback: "Couldn't check that right now — but keep going, practice matters more than perfection!", corrected_odia: "" });
    } finally {
      setChecking(false);
    }
  }

  return (
    <div>
      <Header title={category} subtitle="Learn Conversations" onBack={() => go("conversations")} />
      <ErrorNote msg={error} />
      {loading && <Spinner label="Writing a conversation…" />}
      {!loading && convo && mode === "view" && (
        <div style={{ padding: 18 }}>
          <div style={{ fontFamily: "'Fraunces'", fontWeight: 600, fontSize: 16, color: COLORS.ink, marginBottom: 10 }}>{convo.title}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {convo.lines.map((l, i) => (
              <Card
                key={i}
                style={{
                  padding: 12,
                  alignSelf: l.speaker === "A" ? "flex-start" : "flex-end",
                  background: l.speaker === "A" ? COLORS.cream : COLORS.stoneDeep,
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                }}
              >
                <SpeakerBtn text={l.odia} lang="or" />
                <div>
                  <div style={{ fontFamily: "'Noto Sans Oriya'", fontSize: 17, color: COLORS.ink }}>{l.odia}</div>
                  <div style={{ fontFamily: "'Work Sans'", fontSize: 11, color: COLORS.charcoal, opacity: 0.7 }}>
                    {l.translit} · हिं: {l.hindi} · EN: {l.english}
                  </div>
                </div>
              </Card>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
            <PrimaryBtn style={{ flex: 1 }} onClick={() => { setMode("practice"); setStep(0); setFeedback(null); setUserInput(""); }}>
              Practice this conversation
            </PrimaryBtn>
            <button onClick={load} style={{ background: "none", border: `1.5px solid ${COLORS.stoneDeep}`, borderRadius: 12, padding: "0 14px", cursor: "pointer" }}>↻</button>
          </div>
        </div>
      )}
      {!loading && convo && mode === "practice" && (
        <div style={{ padding: 18 }}>
          <div style={{ fontFamily: "'Work Sans'", fontSize: 12, opacity: 0.6, marginBottom: 6 }}>
            Line {step + 1} of {convo.lines.length}
          </div>
          <Card style={{ padding: 14 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8 }}>
              <SpeakerBtn text={convo.lines[step].odia} lang="or" />
              <div>
                <div style={{ fontFamily: "'Noto Sans Oriya'", fontSize: 18, color: COLORS.ink }}>{convo.lines[step].odia}</div>
                <div style={{ fontFamily: "'Work Sans'", fontSize: 11, opacity: 0.7 }}>{convo.lines[step].translit} — {convo.lines[step].english}</div>
              </div>
            </div>
            <div style={{ fontFamily: "'Work Sans'", fontSize: 12.5, color: COLORS.ink, marginBottom: 6 }}>
              Now type this line in Odia (or your best transliteration):
            </div>
            <input
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Type your answer…"
              style={{
                width: "100%",
                padding: 10,
                borderRadius: 10,
                border: `1.5px solid ${COLORS.stoneDeep}`,
                fontFamily: "'Work Sans'",
                fontSize: 14,
                boxSizing: "border-box",
              }}
            />
            <PrimaryBtn style={{ marginTop: 10, width: "100%" }} onClick={checkAnswer} disabled={checking}>
              {checking ? "Checking…" : "Check my answer"}
            </PrimaryBtn>
            {feedback && (
              <div
                style={{
                  marginTop: 10,
                  padding: 10,
                  borderRadius: 10,
                  background: feedback.correct ? "#E6F3EF" : "#FCEFE4",
                  fontFamily: "'Work Sans'",
                  fontSize: 12.5,
                  color: COLORS.ink,
                }}
              >
                {feedback.correct === true ? "✓ Sundara! " : feedback.correct === false ? "Almost there — " : ""}
                {feedback.feedback}
                {feedback.corrected_odia && (
                  <div style={{ fontFamily: "'Noto Sans Oriya'", fontSize: 15, marginTop: 4 }}>{feedback.corrected_odia}</div>
                )}
              </div>
            )}
          </Card>
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button
              onClick={() => setMode("view")}
              style={{ flex: 1, background: "none", border: `1.5px solid ${COLORS.stoneDeep}`, borderRadius: 12, padding: 12, fontFamily: "'Work Sans'", cursor: "pointer" }}
            >
              Exit practice
            </button>
            <PrimaryBtn
              style={{ flex: 1 }}
              onClick={() => {
                if (step < convo.lines.length - 1) {
                  setStep(step + 1);
                  setUserInput("");
                  setFeedback(null);
                } else {
                  setMode("view");
                }
              }}
            >
              {step < convo.lines.length - 1 ? "Next line →" : "Finish"}
            </PrimaryBtn>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   VOICE PRACTICE
   ============================================================ */
function VoicePractice({ profile, go, gate }) {
  const [phrases, setPhrases] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [listening, setListening] = useState(null);
  const [heard, setHeard] = useState({});
  const recogRef = useRef(null);
  const supported = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);

  const load = useCallback(async () => {
    if (!gate.checkAndConsume()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const raw = await askAI(
        `You are OdiaGuru, an Odia pronunciation coach. ${JSON_RULE} JSON shape: {"phrases":[{"odia":"","translit":"","english":"","tip":"one short pronunciation tip in English"}]} with exactly 6 items, useful for a ${profile.level} learner.`,
        `Give me 6 short Odia phrases to practice saying out loud, with a pronunciation tip for each.`
      );
      setPhrases(extractJSON(raw).phrases);
    } catch (e) {
      setError("Couldn't load practice phrases. Try again.");
    } finally {
      setLoading(false);
    }
  }, [profile.level, gate]);

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, []);

  function tryListen(i, target) {
    if (!supported) return;
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new Recognition();
    rec.lang = "hi-IN";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    setListening(i);
    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setHeard((h) => ({ ...h, [i]: transcript }));
      setListening(null);
    };
    rec.onerror = () => setListening(null);
    rec.onend = () => setListening((l) => (l === i ? null : l));
    recogRef.current = rec;
    rec.start();
  }

  return (
    <div>
      <Header title="Voice Practice" subtitle="Listen, then say it aloud" onBack={() => go("home")} />
      <ErrorNote msg={error} />
      {loading && <Spinner label="Preparing phrases…" />}
      {!loading && phrases && (
        <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
          {!supported && (
            <div style={{ fontFamily: "'Work Sans'", fontSize: 11.5, color: COLORS.ink, opacity: 0.6, marginBottom: 4 }}>
              Voice input isn't supported on this browser — you can still listen and shadow-speak along.
            </div>
          )}
          {phrases.map((p, i) => (
            <Card key={i} style={{ padding: 14 }}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <SpeakerBtn text={p.odia} lang="or" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "'Noto Sans Oriya'", fontSize: 18, color: COLORS.ink }}>{p.odia}</div>
                  <div style={{ fontFamily: "'Work Sans'", fontSize: 11.5, opacity: 0.7 }}>{p.translit} — {p.english}</div>
                </div>
              </div>
              <div style={{ fontFamily: "'Work Sans'", fontSize: 11, color: COLORS.teal, marginTop: 6 }}>💡 {p.tip}</div>
              {supported && (
                <button
                  onClick={() => tryListen(i, p.odia)}
                  style={{
                    marginTop: 8,
                    border: "none",
                    borderRadius: 10,
                    padding: "8px 12px",
                    background: listening === i ? COLORS.vermillion : COLORS.stoneDeep,
                    color: listening === i ? COLORS.cream : COLORS.ink,
                    fontFamily: "'Work Sans'",
                    fontWeight: 600,
                    fontSize: 12.5,
                    cursor: "pointer",
                  }}
                >
                  {listening === i ? "🎙️ Listening…" : "🎙️ Try saying it"}
                </button>
              )}
              {heard[i] && (
                <div style={{ fontFamily: "'Work Sans'", fontSize: 11.5, marginTop: 6, color: COLORS.ink, opacity: 0.75 }}>
                  Heard: "{heard[i]}" — nice attempt! Keep practicing the tip above.
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   TRAVEL PHRASES
   ============================================================ */
const TRAVEL_SCENARIOS = ["At the Temple", "Local Market", "Taxi / Auto", "Hotel Check-in", "Restaurant", "Emergency"];

function TravelPhrases({ profile, go, gate }) {
  const [scenario, setScenario] = useState(TRAVEL_SCENARIOS[0]);
  const [custom, setCustom] = useState("");
  const [phrases, setPhrases] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load(topic) {
    if (!profile.premium && topic !== TRAVEL_SCENARIOS[0]) {
      if (!gate.checkAndConsume()) return;
    } else if (!gate.checkAndConsume()) {
      return;
    }
    setLoading(true);
    setError("");
    try {
      const raw = await askAI(
        `You are OdiaGuru, helping a tourist in Odisha. ${JSON_RULE} JSON shape: {"phrases":[{"odia":"","translit":"","english":""}]} with exactly 6 practical phrases.`,
        `Give me useful Odia phrases for this travel situation: "${topic}".`
      );
      setPhrases(extractJSON(raw).phrases);
    } catch (e) {
      setError("Couldn't load travel phrases. Try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(TRAVEL_SCENARIOS[0]);
    // eslint-disable-next-line
  }, []);

  return (
    <div>
      <Header title="Travel Phrases" subtitle="For visiting Odisha" onBack={() => go("home")} />
      {!profile.premium && (
        <div style={{ margin: "10px 18px 0", fontFamily: "'Work Sans'", fontSize: 11, color: COLORS.ink, opacity: 0.6 }}>
          Full travel guide is a Premium feature — free users get today's scenario.
        </div>
      )}
      <div style={{ display: "flex", gap: 8, padding: "12px 18px 4px", overflowX: "auto" }}>
        {TRAVEL_SCENARIOS.map((s) => (
          <Pill key={s} label={s} active={scenario === s} color={COLORS.ink} onClick={() => { setScenario(s); load(s); }} />
        ))}
      </div>
      <div style={{ padding: "10px 18px 0", display: "flex", gap: 8 }}>
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="Or describe your own situation…"
          style={{ flex: 1, padding: 10, borderRadius: 10, border: `1.5px solid ${COLORS.stoneDeep}`, fontFamily: "'Work Sans'", fontSize: 13 }}
        />
        <button
          onClick={() => custom.trim() && (setScenario(custom), load(custom))}
          style={{ border: "none", borderRadius: 10, background: COLORS.ink, color: COLORS.cream, padding: "0 14px", cursor: "pointer" }}
        >
          Go
        </button>
      </div>
      <ErrorNote msg={error} />
      {loading && <Spinner label="Packing your phrasebook…" />}
      {!loading && phrases && (
        <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 8 }}>
          {phrases.map((p, i) => (
            <Card key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: 12 }}>
              <SpeakerBtn text={p.odia} lang="or" />
              <div>
                <div style={{ fontFamily: "'Noto Sans Oriya'", fontSize: 17, color: COLORS.ink }}>{p.odia}</div>
                <div style={{ fontFamily: "'Work Sans'", fontSize: 11.5, opacity: 0.7 }}>{p.translit} — {p.english}</div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ============================================================
   KIDS MODE
   ============================================================ */
const ODIA_ALPHABET = [
  { letter: "ଅ", translit: "a", word: "ଅନାନାସ", wordT: "anaanasa", meaning: "pineapple", emoji: "🍍" },
  { letter: "ଆ", translit: "aa", word: "ଆମ", wordT: "aama", meaning: "mango", emoji: "🥭" },
  { letter: "ଇ", translit: "i", word: "ଇଲିଶ", wordT: "ilisha", meaning: "hilsa fish", emoji: "🐟" },
  { letter: "କ", translit: "ka", word: "କଦଳୀ", wordT: "kadali", meaning: "banana", emoji: "🍌" },
  { letter: "ଗ", translit: "ga", word: "ଗାଈ", wordT: "gaai", meaning: "cow", emoji: "🐄" },
  { letter: "ଚ", translit: "cha", word: "ଚିଆ", wordT: "chia", meaning: "tea", emoji: "🍵" },
  { letter: "ଜ", translit: "ja", word: "ଜଳ", wordT: "jala", meaning: "water", emoji: "💧" },
  { letter: "ପ", translit: "pa", word: "ପାଣି", wordT: "paani", meaning: "water (spoken)", emoji: "🚰" },
  { letter: "ମ", translit: "ma", word: "ମାଆ", wordT: "maa", meaning: "mother", emoji: "👩" },
  { letter: "ସ", translit: "sa", word: "ସୂର୍ଯ୍ୟ", wordT: "surya", meaning: "sun", emoji: "☀️" },
  { letter: "ହ", translit: "ha", word: "ହାତୀ", wordT: "haatee", meaning: "elephant", emoji: "🐘" },
  { letter: "ର", translit: "ra", word: "ରଥ", wordT: "ratha", meaning: "chariot", emoji: "🛺" },
];

function KidsMode({ profile, go, gate }) {
  const [idx, setIdx] = useState(0);
  const [story, setStory] = useState(null);
  const [loadingStory, setLoadingStory] = useState(false);
  const [error, setError] = useState("");
  const card = ODIA_ALPHABET[idx];

  if (!profile.premium && idx >= 6) {
    return (
      <div>
        <Header title="Kids Learning Mode" subtitle="Odia for young learners" onBack={() => go("home")} />
        <div style={{ padding: 30, textAlign: "center" }}>
          <Chakra size={60} color={COLORS.turmeric} />
          <div style={{ fontFamily: "'Fraunces'", fontSize: 17, fontWeight: 700, marginTop: 12, color: COLORS.ink }}>
            More letters are a Premium treat!
          </div>
          <div style={{ fontFamily: "'Work Sans'", fontSize: 13, opacity: 0.65, margin: "8px 0 16px" }}>
            Free mode covers the first 6 letters. Unlock Premium for the full alphabet, matching games and stories.
          </div>
          <PrimaryBtn onClick={() => go("premium")}>See Premium</PrimaryBtn>
        </div>
      </div>
    );
  }

  async function genStory() {
    if (!gate.checkAndConsume()) return;
    setLoadingStory(true);
    setError("");
    try {
      const raw = await askAI(
        `You are OdiaGuru telling a tiny story to a child learning Odia. ${JSON_RULE} JSON shape: {"title":"","lines":[{"odia":"","translit":"","english":""}]} with exactly 3 very simple sentences and lots of warmth.`,
        `Write a 3-line simple, happy Odia mini-story for a child, using easy everyday words.`
      );
      setStory(extractJSON(raw));
    } catch (e) {
      setError("Couldn't fetch a story right now.");
    } finally {
      setLoadingStory(false);
    }
  }

  return (
    <div style={{ background: COLORS.stone, minHeight: "100%" }}>
      <Header title="🧒 Kids Learning Mode" subtitle="Odia for young learners" onBack={() => go("home")} />
      <div style={{ padding: 18 }}>
        <Card style={{ textAlign: "center", padding: 24, background: COLORS.cream }}>
          <div style={{ fontSize: 60, fontFamily: "'Noto Sans Oriya'", color: COLORS.vermillion }}>{card.letter}</div>
          <div style={{ fontFamily: "'Work Sans'", fontSize: 13, opacity: 0.6, marginBottom: 10 }}>"{card.translit}"</div>
          <div style={{ fontSize: 44 }}>{card.emoji}</div>
          <div style={{ fontFamily: "'Noto Sans Oriya'", fontSize: 22, color: COLORS.ink, marginTop: 6 }}>{card.word}</div>
          <div style={{ fontFamily: "'Work Sans'", fontSize: 13, opacity: 0.7 }}>{card.wordT} — {card.meaning}</div>
          <button
            onClick={() => speak(card.word, "or")}
            style={{ marginTop: 12, border: "none", borderRadius: 999, padding: "10px 20px", background: COLORS.turmeric, fontSize: 15, cursor: "pointer" }}
          >
            🔊 Hear it
          </button>
        </Card>
        <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
          <button
            disabled={idx === 0}
            onClick={() => setIdx((i) => Math.max(0, i - 1))}
            style={{ flex: 1, padding: 12, borderRadius: 12, border: `1.5px solid ${COLORS.stoneDeep}`, background: "none", fontFamily: "'Work Sans'", cursor: "pointer" }}
          >
            ← Prev
          </button>
          <button
            disabled={idx === ODIA_ALPHABET.length - 1}
            onClick={() => setIdx((i) => Math.min(ODIA_ALPHABET.length - 1, i + 1))}
            style={{ flex: 1, padding: 12, borderRadius: 12, border: "none", background: COLORS.teal, color: COLORS.cream, fontFamily: "'Work Sans'", fontWeight: 700, cursor: "pointer" }}
          >
            Next →
          </button>
        </div>

        <div style={{ marginTop: 22 }}>
          <div style={{ fontFamily: "'Fraunces'", fontWeight: 600, fontSize: 15, color: COLORS.ink, marginBottom: 8 }}>✨ AI story time</div>
          <ErrorNote msg={error} />
          {!story && (
            <PrimaryBtn onClick={genStory} disabled={loadingStory} style={{ width: "100%" }}>
              {loadingStory ? "Writing a story…" : "Make me a tiny Odia story"}
            </PrimaryBtn>
          )}
          {story && (
            <Card style={{ padding: 14 }}>
              <div style={{ fontFamily: "'Fraunces'", fontWeight: 700, marginBottom: 8, color: COLORS.ink }}>{story.title}</div>
              {story.lines.map((l, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                  <SpeakerBtn text={l.odia} lang="or" />
                  <div>
                    <div style={{ fontFamily: "'Noto Sans Oriya'", fontSize: 17 }}>{l.odia}</div>
                    <div style={{ fontFamily: "'Work Sans'", fontSize: 11, opacity: 0.65 }}>{l.translit} — {l.english}</div>
                  </div>
                </div>
              ))}
              <button onClick={() => setStory(null)} style={{ background: "none", border: "none", color: COLORS.vermillion, fontFamily: "'Work Sans'", fontWeight: 700, cursor: "pointer" }}>
                Try another story
              </button>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   QUIZ
   ============================================================ */
function Quiz({ params, profile, setProfile, go, gate }) {
  const topic = (params && params.topic) || "everyday Odia words";
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [qIdx, setQIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const load = useCallback(async () => {
    if (!gate.checkAndConsume()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    setQIdx(0);
    setScore(0);
    setDone(false);
    setSelected(null);
    try {
      const raw = await askAI(
        `You are OdiaGuru creating a quiz. ${JSON_RULE} JSON shape: {"questions":[{"question":"","options":["","","",""],"correctIndex":0,"explanation":"one short sentence"}]} with exactly 5 questions about "${topic}", suited to a ${profile.level} learner.`,
        `Create a 5-question multiple choice Odia language quiz about: ${topic}.`
      );
      setQuiz(extractJSON(raw).questions);
    } catch (e) {
      setError("Couldn't build the quiz. Try again.");
    } finally {
      setLoading(false);
    }
  }, [topic, profile.level, gate]);

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, []);

  function choose(i) {
    if (selected !== null) return;
    setSelected(i);
    const correct = i === quiz[qIdx].correctIndex;
    if (correct) setScore((s) => s + 1);
  }

  function next() {
    if (qIdx < quiz.length - 1) {
      setQIdx(qIdx + 1);
      setSelected(null);
    } else {
      setDone(true);
      setProfile((p) => ({
        ...p,
        quizHistory: [...p.quizHistory, { date: todayStr(), topic, score, total: quiz.length }],
      }));
    }
  }

  return (
    <div>
      <Header title="Quiz" subtitle={topic} onBack={() => go("home")} />
      <ErrorNote msg={error} />
      {loading && <Spinner label="Setting your quiz…" />}
      {!loading && quiz && !done && (
        <div style={{ padding: 18 }}>
          <div style={{ fontFamily: "'Work Sans'", fontSize: 12, opacity: 0.6, marginBottom: 8 }}>
            Question {qIdx + 1} of {quiz.length}
          </div>
          <Card style={{ padding: 16 }}>
            <div style={{ fontFamily: "'Fraunces'", fontWeight: 600, fontSize: 16, color: COLORS.ink, marginBottom: 12 }}>
              {quiz[qIdx].question}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {quiz[qIdx].options.map((o, i) => {
                const isCorrect = i === quiz[qIdx].correctIndex;
                const isSelected = i === selected;
                let bg = COLORS.stone;
                if (selected !== null) {
                  if (isCorrect) bg = "#E6F3EF";
                  else if (isSelected) bg = "#FCE9E4";
                }
                return (
                  <button
                    key={i}
                    onClick={() => choose(i)}
                    style={{
                      textAlign: "left",
                      padding: 12,
                      borderRadius: 10,
                      border: `1.5px solid ${isSelected ? COLORS.vermillion : COLORS.stoneDeep}`,
                      background: bg,
                      fontFamily: "'Work Sans'",
                      fontSize: 13.5,
                      cursor: selected === null ? "pointer" : "default",
                    }}
                  >
                    {o}
                  </button>
                );
              })}
            </div>
            {selected !== null && (
              <div style={{ marginTop: 10, fontFamily: "'Work Sans'", fontSize: 12.5, color: COLORS.ink, opacity: 0.75 }}>
                {selected === quiz[qIdx].correctIndex ? "✓ Correct — " : "✗ Not quite — "}
                {quiz[qIdx].explanation}
              </div>
            )}
          </Card>
          <PrimaryBtn style={{ width: "100%", marginTop: 14 }} onClick={next} disabled={selected === null}>
            {qIdx < quiz.length - 1 ? "Next question →" : "See results"}
          </PrimaryBtn>
        </div>
      )}
      {done && (
        <div style={{ padding: 30, textAlign: "center" }}>
          <Chakra size={70} color={COLORS.turmeric} progress={score / quiz.length} />
          <div style={{ fontFamily: "'Fraunces'", fontSize: 22, fontWeight: 700, color: COLORS.ink, marginTop: 12 }}>
            {score} / {quiz.length}
          </div>
          <div style={{ fontFamily: "'Work Sans'", fontSize: 13, opacity: 0.65, margin: "6px 0 20px" }}>
            {score === quiz.length ? "Chaudhari! Perfect score." : score >= quiz.length / 2 ? "Bhala! Good progress." : "Keep practicing — every attempt helps."}
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <PrimaryBtn style={{ flex: 1 }} onClick={load}>Try again</PrimaryBtn>
            <button onClick={() => go("home")} style={{ flex: 1, background: "none", border: `1.5px solid ${COLORS.stoneDeep}`, borderRadius: 12, fontFamily: "'Work Sans'", cursor: "pointer" }}>
              Home
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   PREMIUM SCREEN
   ============================================================ */
function PremiumScreen({ profile, setProfile, go }) {
  return (
    <div>
      <Header title="OdiaGuru Premium" subtitle="Unlock the full experience" onBack={() => go("home")} />
      <div style={{ padding: 22, textAlign: "center" }}>
        <Chakra size={70} color={COLORS.turmeric} />
        <div style={{ fontFamily: "'Fraunces'", fontSize: 20, fontWeight: 700, color: COLORS.ink, margin: "14px 0 6px" }}>
          {profile.premium ? "You're a Premium learner ★" : "Learn Odia without limits"}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12, textAlign: "left", margin: "18px 0" }}>
          {[
            ["💬", "Unlimited AI conversations", "No daily cap on lessons, chats or corrections."],
            ["🎙️", "Voice pronunciation practice", "Unlimited listen & speak sessions."],
            ["🧒", "Kids learning mode", "Full alphabet, matching games & stories."],
            ["🧭", "Odisha travel guide", "Every scenario, not just today's pick."],
          ].map(([icon, title, desc]) => (
            <Card key={title} style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ fontSize: 22 }}>{icon}</div>
              <div>
                <div style={{ fontFamily: "'Work Sans'", fontWeight: 700, fontSize: 13.5, color: COLORS.ink }}>{title}</div>
                <div style={{ fontFamily: "'Work Sans'", fontSize: 11.5, opacity: 0.65 }}>{desc}</div>
              </div>
            </Card>
          ))}
        </div>
        {!profile.premium ? (
          <PrimaryBtn style={{ width: "100%" }} onClick={() => setProfile((p) => ({ ...p, premium: true }))}>
            Unlock Premium (demo)
          </PrimaryBtn>
        ) : (
          <button
            onClick={() => setProfile((p) => ({ ...p, premium: false }))}
            style={{ width: "100%", padding: 12, background: "none", border: `1.5px solid ${COLORS.stoneDeep}`, borderRadius: 12, fontFamily: "'Work Sans'", cursor: "pointer" }}
          >
            Turn off Premium (demo)
          </button>
        )}
        <div style={{ fontSize: 10.5, opacity: 0.5, marginTop: 10, fontFamily: "'Work Sans'" }}>
          Demo app — this toggles a local flag only, no payment is processed.
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   ROOT APP
   ============================================================ */
export default function App() {
  const [screen, setScreen] = useState("home");
  const [params, setParams] = useState({});
  const [profile, setProfileState] = useState({
    level: "Beginner",
    streak: 0,
    savedWords: [],
    quizHistory: [],
    premium: false,
    aiUsage: { date: todayStr(), count: 0 },
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const saved = await getJSON("profile", null);
      let p = saved || {
        level: "Beginner",
        streak: 0,
        savedWords: [],
        quizHistory: [],
        premium: false,
        aiUsage: { date: todayStr(), count: 0 },
        lastVisit: null,
      };
      const today = todayStr();
      if (p.lastVisit !== today) {
        const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        p.streak = p.lastVisit === yesterday ? (p.streak || 0) + 1 : 1;
        p.lastVisit = today;
      }
      setProfileState(p);
      setReady(true);
    })();
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => {};
    }
  }, []);

  const setProfile = useCallback((updater) => {
    setProfileState((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      setJSON("profile", next);
      return next;
    });
  }, []);

  const gate = usePremiumGate(profile, setProfile);

  function go(next, p) {
    setScreen(next);
    setParams(p || {});
    window.scrollTo(0, 0);
  }

  if (!ready) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: COLORS.stone }}>
        <Spinner label="Waking up OdiaGuru…" />
      </div>
    );
  }

  let content;
  if (screen === "home") content = <Home profile={profile} setProfile={setProfile} go={go} gate={gate} />;
  else if (screen === "words") content = <DailyWords profile={profile} setProfile={setProfile} go={go} gate={gate} />;
  else if (screen === "conversations") content = <ConversationList go={go} />;
  else if (screen === "conversationDetail") content = <ConversationDetail params={params} profile={profile} go={go} gate={gate} />;
  else if (screen === "voice") content = <VoicePractice profile={profile} go={go} gate={gate} />;
  else if (screen === "travel") content = <TravelPhrases profile={profile} go={go} gate={gate} />;
  else if (screen === "kids") content = <KidsMode profile={profile} go={go} gate={gate} />;
  else if (screen === "quiz") content = <Quiz params={params} profile={profile} setProfile={setProfile} go={go} gate={gate} />;
  else if (screen === "premium") content = <PremiumScreen profile={profile} setProfile={setProfile} go={go} />;
  else content = <Home profile={profile} setProfile={setProfile} go={go} gate={gate} />;

  return (
    <div style={{ background: COLORS.stone, minHeight: "100vh", fontFamily: "'Work Sans', sans-serif" }}>
      <style>{`
        @import url('${FONT_LINK}');
        * { box-sizing: border-box; }
        body { margin: 0; }
        input:focus, button:focus { outline: 2px solid ${COLORS.turmeric}; outline-offset: 1px; }
      `}</style>
      <div style={{ maxWidth: 460, margin: "0 auto", background: COLORS.stone, minHeight: "100vh", boxShadow: "0 0 30px rgba(0,0,0,0.06)" }}>
        {content}
      </div>
      {gate.showPaywall && <PaywallModal onClose={() => gate.setShowPaywall(false)} onUnlock={() => { setProfile((p) => ({ ...p, premium: true })); gate.setShowPaywall(false); }} />}
    </div>
  );
}
