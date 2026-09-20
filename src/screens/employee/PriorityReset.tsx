import { useState, useEffect, useRef } from "react";
import { apiRequest } from "@/lib/api";

// ─────────────────────────────────────────────────────────────────────────────
// Types & Interfaces
// ─────────────────────────────────────────────────────────────────────────────

export interface TaskItem {
  id: string;
  text: string;
  estimatedMinutes: number;
  reason?: string;
  stressRelief?: string;
  nextAction?: string;
  order?: number;
  role?: string;
}

export interface PriorityPathResult {
  overview: string;
  clarificationQuestion?: string | null;
  firstFocus: TaskItem | null;
  nextStep: TaskItem | null;
  laterTasks: TaskItem[];
  quickWin: TaskItem | null;
  sequence?: TaskItem[];
  recoverySuggestion: {
    title: string;
    activity: string;
    durationMinutes: number;
    navTarget?: string;
  };
}

export interface PriorityLearningProfile {
  completedTasks: string[];
  totalCompletedCount: number;
  lastUpdated: string;
}

type Step = "dump" | "organising" | "organised" | "focus" | "completed-one" | "all-done";

// ─────────────────────────────────────────────────────────────────────────────
// Learning System Helpers (localStorage persisted)
// ─────────────────────────────────────────────────────────────────────────────

const LEARNING_STORAGE_KEY = "cq_priority_history";

export function getPriorityLearningProfile(): PriorityLearningProfile {
  try {
    const raw = localStorage.getItem(LEARNING_STORAGE_KEY);
    if (!raw) {
      return { completedTasks: [], totalCompletedCount: 0, lastUpdated: new Date().toISOString() };
    }
    return JSON.parse(raw);
  } catch {
    return { completedTasks: [], totalCompletedCount: 0, lastUpdated: new Date().toISOString() };
  }
}

export function recordCompletedTaskInProfile(taskText: string) {
  try {
    const profile = getPriorityLearningProfile();
    profile.completedTasks = [taskText, ...profile.completedTasks.filter((t) => t !== taskText)].slice(0, 20);
    profile.totalCompletedCount = (profile.totalCompletedCount || 0) + 1;
    profile.lastUpdated = new Date().toISOString();
    localStorage.setItem(LEARNING_STORAGE_KEY, JSON.stringify(profile));
  } catch (err) {
    console.warn("[PRIORITY-LEARNING] Failed to update profile:", err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Client-side Intelligent Task Extractor & Multi-factor Fallback
// ─────────────────────────────────────────────────────────────────────────────

export function extractClientTasks(input: string): string[] {
  if (!input || !input.trim()) return [];
  const raw = input.trim();

  // Multi-line
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length > 1) {
    return lines.map((l) => l.replace(/^(\d+[\.\)]\s*|[-*•]\s*)/, "").trim()).filter(Boolean);
  }

  // Numbered list
  if (/\b\d+[\.\)]\s+/.test(raw)) {
    const parts = raw.split(/\b\d+[\.\)]\s+/).map((p) => p.trim()).filter(Boolean);
    if (parts.length > 1) return parts;
  }

  // Semicolons or bullets
  if (raw.includes(";") || raw.includes("•")) {
    const parts = raw.split(/[;•]+/).map((p) => p.trim()).filter(Boolean);
    if (parts.length > 1) return parts;
  }

  // Natural sequencing phrases
  if (/\b(and\s+then|after\s+that|followed\s+by)\b/i.test(raw)) {
    const parts = raw.split(/\b(?:and\s+then|after\s+that|followed\s+by)\b/i).map((p) => p.trim()).filter(Boolean);
    if (parts.length > 1) return parts;
  }

  // Commas if 2+ distinct phrases
  if (raw.includes(",")) {
    const commaParts = raw.split(",").map((p) => p.replace(/^\s*(and\s+)/i, "").trim()).filter(Boolean);
    if (commaParts.length >= 2 && commaParts.every((p) => p.length >= 3 && p.length <= 150)) {
      return commaParts;
    }
  }

  return [raw];
}

export function getFallbackPriorityPath(rawInput: string | string[], msiScore: number = 50): PriorityPathResult {
  const tasks = Array.isArray(rawInput) ? rawInput : extractClientTasks(rawInput);
  const clean = tasks.map((t) => t.trim()).filter((t) => t.length > 0);

  if (clean.length === 0) {
    return {
      overview: "No tasks to prioritize. Share what is on your plate to map your Priority Path.",
      clarificationQuestion: null,
      firstFocus: null,
      nextStep: null,
      laterTasks: [],
      quickWin: null,
      sequence: [],
      recoverySuggestion: {
        title: "2-Minute Breathing Reset",
        activity: "Take 4 slow breaths to down-regulate before continuing.",
        durationMinutes: 2,
        navTarget: "breathing-reset",
      },
    };
  }

  const analyzed = clean.map((text, idx) => {
    const l = text.toLowerCase();
    let urgencyScore = 0;
    let cognitiveLoad = 2; // 1: light/quick, 2: medium, 3: heavy
    let isQuick = false;
    let dependencyWeight = 0;

    if (/\b(today|urgent|asap|now|critical|deadline|due|meeting|call|by\s+\d+|am\b|pm\b)\b/.test(l)) urgencyScore += 50;
    if (/\b(client|submit|deliver|present|boss|manager|payroll|invoice|exam)\b/.test(l)) urgencyScore += 30;
    if (/\b(finish|send|reply|review|check|email|ping|approve)\b/.test(l)) urgencyScore += 15;

    if (/\b(reply|email|call|text|ping|check|quick|pay|bill|print|trash|dishes|groceries)\b/.test(l)) {
      cognitiveLoad = 1;
      isQuick = true;
    } else if (/\b(strategy|presentation|report|deck|analysis|architecture|budget|review pr|draft|write)\b/.test(l)) {
      cognitiveLoad = 3;
    }

    if (/\b(review|prep|draft|read|gather|outline)\b/.test(l)) {
      dependencyWeight += 20;
    }

    const totalPriorityScore = urgencyScore + dependencyWeight + (isQuick && msiScore >= 60 ? 30 : 0) + (clean.length - idx) * 0.1;
    const estimatedMinutes = isQuick ? 10 : cognitiveLoad === 3 ? 35 : 20;

    return {
      id: `task_${Date.now()}_${idx}`,
      text,
      urgencyScore,
      cognitiveLoad,
      isQuick,
      dependencyWeight,
      totalPriorityScore,
      estimatedMinutes,
      originalIndex: idx,
    };
  });

  const sorted = [...analyzed].sort((a, b) => b.totalPriorityScore - a.totalPriorityScore);

  let first = sorted[0];
  if (msiScore >= 60) {
    const quickHigh = sorted.find((s) => s.isQuick && s.urgencyScore > 0) || sorted.find((s) => s.isQuick);
    if (quickHigh) first = quickHigh;
  }

  const remaining = sorted.filter((s) => s.id !== first.id);
  const next = remaining.length > 0 ? remaining[0] : null;
  const later = remaining.length > 1 ? remaining.slice(1) : [];
  const quickWinCandidate = sorted.find((s) => s.isQuick && s.id !== first.id);

  const overview =
    msiScore >= 60
      ? `You have ${clean.length} pending items with elevated stress detected (${msiScore}%). Starting with "${first.text}" eliminates immediate friction and restores control without cognitive exhaustion.`
      : `Evaluating your ${clean.length} open responsibilities, tackling "${first.text}" first gives you the highest leverage, resolving the critical path and removing the main blocker from your schedule.`;

  const firstFocus: TaskItem = {
    id: first.id,
    text: first.text,
    estimatedMinutes: first.estimatedMinutes,
    reason: first.isQuick
      ? "Clears immediate uncertainty with minimal mental effort, unblocking your working memory."
      : "Carries the most critical timeline impact and unblocks the subsequent steps on your agenda.",
    stressRelief: "Clears working memory overload and gives you immediate agency over your timeline.",
    nextAction: `Spend the first 2 minutes opening the draft or workspace for "${first.text}".`,
    order: 1,
    role: "First Focus",
  };

  const nextStep: TaskItem | null = next
    ? {
        id: next.id,
        text: next.text,
        estimatedMinutes: next.estimatedMinutes,
        reason: "Builds directly on your momentum once your primary focus is complete.",
        order: 2,
        role: "Next Step",
      }
    : null;

  const laterTasks: TaskItem[] = later.map((l, idx) => ({
    id: l.id,
    text: l.text,
    estimatedMinutes: l.estimatedMinutes,
    reason: "Can be held without penalty until higher leverage items are cleared.",
    order: 3 + idx,
    role: "Later",
  }));

  const sequence: TaskItem[] = [
    firstFocus,
    ...(nextStep ? [nextStep] : []),
    ...laterTasks,
  ];

  return {
    overview,
    clarificationQuestion: clean.length > 1 && sorted.every((s) => s.urgencyScore === 0)
      ? "Assuming tasks have equal deadlines; adjust if any item is due sooner."
      : null,
    firstFocus,
    nextStep,
    laterTasks,
    quickWin: quickWinCandidate
      ? {
          id: quickWinCandidate.id,
          text: quickWinCandidate.text,
          estimatedMinutes: quickWinCandidate.estimatedMinutes,
          reason: "A lightweight task you can knock out in 10 minutes for an effortless dopamine boost.",
          order: 99,
          role: "Quick Win",
        }
      : null,
    sequence,
    recoverySuggestion: {
      title: msiScore >= 60 ? "3-Minute Autonomic Reset" : "Mindful Screen Pause",
      activity:
        msiScore >= 60
          ? "Step away and take 4 slow physiological sighs to settle your nervous system."
          : "Rest your eyes, hydrate, and stretch your shoulders before beginning.",
      durationMinutes: msiScore >= 60 ? 3 : 2,
      navTarget: "breathing-reset",
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Service Function: Fetch AI Priority Path from Backend
// ─────────────────────────────────────────────────────────────────────────────

export async function fetchAIPriorityPath(rawInputText: string, userMsi: number): Promise<PriorityPathResult> {
  const history = getPriorityLearningProfile();
  const extracted = extractClientTasks(rawInputText);

  try {
    const res = await apiRequest<any>("/api/ai/priority-reset", {
      method: "POST",
      body: JSON.stringify({
        rawInput: rawInputText,
        tasks: extracted,
        msi: userMsi,
        history,
      }),
    });

    if (res.ok && res.data && res.data.success && res.data.data) {
      const d = res.data.data;
      return {
        overview: d.overview,
        clarificationQuestion: d.clarificationQuestion || null,
        firstFocus: d.firstFocus
          ? {
              id: `task_focus_${Date.now()}`,
              text: d.firstFocus.task,
              estimatedMinutes: d.firstFocus.estimatedMinutes || 15,
              reason: d.firstFocus.reason,
              stressRelief: d.firstFocus.stressRelief,
              nextAction: d.firstFocus.nextAction,
              order: 1,
              role: "First Focus",
            }
          : null,
        nextStep: d.nextStep
          ? {
              id: `task_next_${Date.now()}`,
              text: d.nextStep.task,
              estimatedMinutes: d.nextStep.estimatedMinutes || 20,
              reason: d.nextStep.reason,
              order: 2,
              role: "Next Step",
            }
          : null,
        laterTasks: Array.isArray(d.laterTasks)
          ? d.laterTasks.map((t: any, i: number) => ({
              id: `task_later_${Date.now()}_${i}`,
              text: t.task,
              estimatedMinutes: t.estimatedMinutes || 30,
              reason: t.reason,
              order: 3 + i,
              role: "Later",
            }))
          : [],
        quickWin: d.quickWin
          ? {
              id: `task_quick_${Date.now()}`,
              text: d.quickWin.task,
              estimatedMinutes: d.quickWin.estimatedMinutes || 10,
              reason: d.quickWin.reason,
              order: 99,
              role: "Quick Win",
            }
          : null,
        sequence: Array.isArray(d.sequence)
          ? d.sequence.map((s: any, i: number) => ({
              id: `task_seq_${Date.now()}_${i}`,
              text: s.task,
              estimatedMinutes: s.estimatedMinutes || 20,
              reason: s.reason,
              nextAction: s.nextAction,
              order: s.order || i + 1,
              role: s.role,
            }))
          : [],
        recoverySuggestion: d.recoverySuggestion || {
          title: "Quick Breathing Reset",
          activity: "Take a quiet moment to breathe and clear your thoughts.",
          durationMinutes: 2,
          navTarget: "breathing-reset",
        },
      };
    }
  } catch (err) {
    console.warn("[PRIORITY-RESET-AI] API request failed, using intelligent client-side fallback:", err);
  }

  // Safe fallback if API unconfigured or unreachable
  return getFallbackPriorityPath(rawInputText, userMsi);
}

// ─────────────────────────────────────────────────────────────────────────────
// PriorityReset Component
// ─────────────────────────────────────────────────────────────────────────────

interface PriorityResetProps {
  onBack: () => void;
  onNav: (s: string) => void;
}

export default function PriorityReset({ onBack, onNav }: PriorityResetProps) {
  const [currentStep, setCurrentStep] = useState<Step>("dump");
  const [taskInput, setTaskInput] = useState("");
  const [analyzingMessage, setAnalyzingMessage] = useState("Analyzing cognitive load & urgency...");

  // AI Priority Path State
  const [priorityPath, setPriorityPath] = useState<PriorityPathResult | null>(null);
  const [activeTask, setActiveTask] = useState<TaskItem | null>(null);
  const [activeTaskCategory, setActiveTaskCategory] = useState<"First Focus" | "Quick Win" | "Next Step">("First Focus");

  // Timer states for Focus Mode
  const [timerSeconds, setTimerSeconds] = useState(15 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Resolved user MSI from storage
  const [userMsi, setUserMsi] = useState<number>(50);
  useEffect(() => {
    try {
      const storedMsi = localStorage.getItem("cq_current_msi") || localStorage.getItem("cq_baseline_msi");
      if (storedMsi) {
        setUserMsi(parseInt(storedMsi, 10));
      }
    } catch {
      // ignore
    }
  }, []);

  // Timer runner for Focus mode
  useEffect(() => {
    if (currentStep === "focus" && isTimerRunning) {
      timerRef.current = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentStep, isTimerRunning]);

  function formatTime(s: number) {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  // Handle AI analysis triggering
  async function handleAnalyzePriorities() {
    const trimmedInput = taskInput.trim();
    if (!trimmedInput) return;

    setCurrentStep("organising");

    // Dynamic empathetic loading messages
    const msgs = [
      "Analyzing complete input & extracting tasks...",
      "Evaluating deadlines, importance & blockers...",
      "Detecting dependencies & cognitive load...",
      `Matching energy requirements with current MSI (${userMsi}%)...`,
      "Synthesizing your personalized Priority Path...",
    ];
    let msgIdx = 0;
    const msgInterval = setInterval(() => {
      msgIdx = (msgIdx + 1) % msgs.length;
      setAnalyzingMessage(msgs[msgIdx]);
    }, 700);

    try {
      const result = await fetchAIPriorityPath(trimmedInput, userMsi);
      clearInterval(msgInterval);
      setPriorityPath(result);
      if (result.firstFocus) {
        setActiveTask(result.firstFocus);
        setActiveTaskCategory("First Focus");
      }
      setCurrentStep("organised");
    } catch (err) {
      clearInterval(msgInterval);
      const fallback = getFallbackPriorityPath(trimmedInput, userMsi);
      setPriorityPath(fallback);
      if (fallback.firstFocus) {
        setActiveTask(fallback.firstFocus);
        setActiveTaskCategory("First Focus");
      }
      setCurrentStep("organised");
    }
  }

  // Start selected task in Focus mode
  function handleStartTask(task: TaskItem, category: "First Focus" | "Quick Win" | "Next Step" = "First Focus") {
    setActiveTask(task);
    setActiveTaskCategory(category);
    setTimerSeconds((task.estimatedMinutes || 15) * 60);
    setIsTimerRunning(true);
    setCurrentStep("focus");
  }

  // Complete active task
  function handleCompleteTask() {
    if (timerRef.current) clearInterval(timerRef.current);

    if (activeTask) {
      // Persist in learning system
      recordCompletedTaskInProfile(activeTask.text);
    }

    // Record intervention in backend analytics
    const token = localStorage.getItem("cq_token");
    if (token) {
      fetch("/api/interventions/record", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          interventionName: "Priority Reset",
          type: "RESET_LAB",
          category: "Mindset",
          duration: (activeTask?.estimatedMinutes || 15) * 60 - timerSeconds,
          postFeeling: "Relieved",
          status: "Completed",
          metadata: { completedTask: activeTask?.text || "Task", msi: userMsi },
        }),
      }).catch((e) => console.warn("[INTERVENTION-RECORD] Failed to record priority reset:", e.message));
    }

    // Check if next step or later tasks remain
    if (priorityPath?.nextStep && activeTaskCategory === "First Focus") {
      setCurrentStep("completed-one");
    } else {
      setCurrentStep("all-done");
    }
  }

  // Advance to Next Step from completion screen
  function handleContinueToNextStep() {
    if (priorityPath?.nextStep) {
      handleStartTask(priorityPath.nextStep, "Next Step");
    } else {
      setCurrentStep("all-done");
    }
  }

  function handleStepBack() {
    if (currentStep === "focus") {
      setCurrentStep("organised");
    } else if (currentStep === "organised") {
      setCurrentStep("dump");
    } else if (currentStep === "completed-one") {
      setCurrentStep("organised");
    } else {
      onBack();
    }
  }

  const detectedTaskCount = extractClientTasks(taskInput).length;

  return (
    <div className="flex flex-col px-5 py-5 overflow-y-auto pb-28 min-h-full bg-midnight text-warm-white">
      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* STEP 1: Flexible Task Input                                          */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      {currentStep === "dump" && (
        <div className="flex flex-col gap-6 animate-fade-up">
          {/* Top Bar */}
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-surface text-text-secondary hover:text-warm-white transition-colors cursor-pointer"
              aria-label="Back"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <span className="text-[10px] font-bold uppercase tracking-widest text-lavender-soft">
              Priority Reset · AI Coach
            </span>
          </div>

          {/* Heading */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">✨</span>
              <h1 className="text-2xl font-bold text-warm-white leading-tight">What is on your plate?</h1>
            </div>
            <p className="text-sm text-text-secondary leading-relaxed">
              Write naturally in any format — bullet points, comma-separated lists, a single sentence, or random order. The AI analyzes the whole picture.
            </p>
          </div>

          {/* MSI Energy Context Banner */}
          <div className="rounded-2xl bg-white/[0.03] border border-white/8 p-3.5 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-core/15 border border-purple-core/30 flex items-center justify-center flex-shrink-0 text-sm">
              🧠
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-warm-white font-medium">
                Current Stress Index: <span className="font-mono-data text-lavender-bright font-bold">{userMsi}%</span>
              </p>
              <p className="text-[11px] text-text-muted mt-0.5">
                {userMsi >= 60
                  ? "Elevated strain detected: Priority Path will ease cognitive paralysis with high-relief clarity wins."
                  : "Balanced energy: Priority Path will optimize for highest impact and clearing critical blockers."}
              </p>
            </div>
          </div>

          {/* Large Flexible Multiline Input */}
          <div className="flex flex-col gap-2">
            <textarea
              className="w-full rounded-2xl bg-surface border border-border-p text-warm-white placeholder-text-muted/50 text-sm p-4 resize-none focus:outline-none focus:border-purple-core transition-colors leading-relaxed font-mono-data"
              rows={8}
              placeholder={`Example:\n"Finish client presentation for 4pm meeting, reply to Slack ping about lunch, review the architecture doc, and pick up groceries."\n\nOr enter line by line in any order.`}
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
            />
            <div className="flex justify-between items-center px-1">
              <span className="text-xs text-text-muted">Paragraph, commas, or line breaks supported</span>
              <span className="text-xs text-text-muted font-mono-data">
                {detectedTaskCount} {detectedTaskCount === 1 ? "task detected" : "tasks detected"}
              </span>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={handleAnalyzePriorities}
            disabled={taskInput.trim().length === 0}
            className={`w-full py-4 rounded-2xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
              taskInput.trim().length > 0
                ? "btn-primary shadow-lg shadow-purple-core/25 cursor-pointer hover:brightness-110 active:scale-[0.99]"
                : "bg-surface border border-border-p text-text-muted cursor-not-allowed opacity-60"
            }`}
          >
            <span>Analyze My Priority Path</span>
            <span>→</span>
          </button>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* STEP 2: AI Analyzing Loading State                                   */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      {currentStep === "organising" && (
        <div className="flex flex-col items-center justify-center gap-6 min-h-[60vh] animate-fade-up text-center">
          <div className="relative flex items-center justify-center">
            <div
              className="w-24 h-24 rounded-full bg-purple-core/20 border border-purple-core/40 animate-ping absolute"
              style={{ animationDuration: "1.6s" }}
            />
            <div
              className="w-16 h-16 rounded-full bg-purple-core/30 border border-purple-core/60 animate-ping absolute"
              style={{ animationDuration: "1.2s", animationDelay: "0.3s" }}
            />
            <div className="w-12 h-12 rounded-full bg-purple-core border border-lavender-bright/60 flex items-center justify-center z-10 shadow-lg shadow-purple-core/50">
              <span className="text-lg">✨</span>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2 max-w-xs">
            <p className="text-base font-semibold text-warm-white">Mapping Your Priority Path…</p>
            <p className="text-xs text-lavender-soft/80 font-mono-data transition-all duration-300">
              {analyzingMessage}
            </p>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* STEP 3: "Your Priority Path" Structured Output                        */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      {currentStep === "organised" && priorityPath && (
        <div className="flex flex-col gap-6 animate-fade-up">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={handleStepBack}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-surface text-text-secondary hover:text-warm-white transition-colors cursor-pointer"
                aria-label="Back to task input"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <span className="text-[10px] font-bold uppercase tracking-widest text-lavender-soft">
                Priority Path
              </span>
            </div>

            <button
              onClick={() => setCurrentStep("dump")}
              className="text-xs text-lavender-soft hover:text-warm-white transition-colors cursor-pointer font-medium"
            >
              Refine Tasks ✏️
            </button>
          </div>

          {/* Title */}
          <div>
            <h1 className="text-2xl font-bold text-warm-white tracking-tight">Your Priority Path</h1>
            <p className="text-xs text-text-muted mt-1">
              Personalized sequence optimized for cognitive relief, deadlines, and momentum.
            </p>
          </div>

          {/* Clarification / Stated Assumption Banner if present */}
          {priorityPath.clarificationQuestion && (
            <div className="rounded-2xl bg-amber-500/[0.08] border border-amber-500/25 p-3.5 flex items-start gap-3">
              <span className="text-sm">💡</span>
              <div className="flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-0.5">
                  Coach Note & Assumption
                </p>
                <p className="text-xs text-warm-white/90 leading-relaxed">
                  {priorityPath.clarificationQuestion}
                </p>
              </div>
            </div>
          )}

          {/* Conversational AI Reasoning Overview */}
          <div className="rounded-2xl bg-purple-core/10 border border-purple-core/25 p-4.5 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm">💭</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-lavender-bright">
                Coach Assessment & Trade-Offs
              </span>
            </div>
            <p className="text-xs text-warm-white/90 leading-relaxed font-sans">
              {priorityPath.overview}
            </p>
          </div>

          {/* 1. FIRST FOCUS CARD */}
          {priorityPath.firstFocus && (
            <div className="rounded-2xl border border-purple-core bg-purple-core/[0.12] p-5 flex flex-col gap-4 shadow-xl shadow-purple-core/10 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-core/10 rounded-full blur-2xl pointer-events-none" />

              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-core/30 border border-purple-core/40 text-[10px] font-bold uppercase tracking-wider text-lavender-bright">
                  <span className="w-1.5 h-1.5 rounded-full bg-lavender-bright animate-pulse" />
                  1. Recommended First Priority
                </span>
                <span className="text-xs text-lavender-soft font-mono-data">
                  ~{priorityPath.firstFocus.estimatedMinutes} min
                </span>
              </div>

              <div>
                <h2 className="text-lg font-bold text-warm-white leading-snug">
                  {priorityPath.firstFocus.text}
                </h2>
              </div>

              {/* In-depth reasoning and stress relief */}
              <div className="rounded-xl bg-surface/70 border border-border-p/60 p-3.5 space-y-2 text-xs">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-0.5">
                    Why this comes first
                  </p>
                  <p className="text-text-secondary leading-relaxed">
                    {priorityPath.firstFocus.reason}
                  </p>
                </div>

                {priorityPath.firstFocus.nextAction && (
                  <div className="pt-2 border-t border-white/5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-lavender-bright mb-0.5">
                      Small Next Step To Begin
                    </p>
                    <p className="text-warm-white/90 leading-relaxed font-medium">
                      {priorityPath.firstFocus.nextAction}
                    </p>
                  </div>
                )}

                {priorityPath.firstFocus.stressRelief && (
                  <div className="pt-2 border-t border-white/5">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-c-success mb-0.5">
                      Expected Relief
                    </p>
                    <p className="text-text-secondary leading-relaxed">
                      {priorityPath.firstFocus.stressRelief}
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={() => handleStartTask(priorityPath.firstFocus!, "First Focus")}
                className="w-full btn-primary py-3.5 rounded-xl font-semibold text-sm shadow-md cursor-pointer hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2"
              >
                <span>Focus On This Now</span>
                <span>→</span>
              </button>
            </div>
          )}

          {/* 2. NEXT STEP */}
          {priorityPath.nextStep && (
            <div className="rounded-2xl border border-border-p bg-surface/60 p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-lavender-soft">
                  2. Next Step
                </span>
                <span className="text-[11px] font-mono-data text-text-muted">
                  ~{priorityPath.nextStep.estimatedMinutes} min
                </span>
              </div>
              <p className="text-sm font-semibold text-warm-white leading-snug">
                {priorityPath.nextStep.text}
              </p>
              <p className="text-xs text-text-muted leading-relaxed">
                {priorityPath.nextStep.reason}
              </p>
            </div>
          )}

          {/* 3. LATER (TASKS THAT CAN WAIT) */}
          {priorityPath.laterTasks && priorityPath.laterTasks.length > 0 && (
            <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs">⏳</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted">
                    3. Later · Safe to wait
                  </span>
                </div>
                <span className="text-[10px] font-mono-data text-text-muted px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
                  {priorityPath.laterTasks.length} tasks
                </span>
              </div>
              <div className="space-y-2">
                {priorityPath.laterTasks.map((t, idx) => (
                  <div
                    key={t.id || idx}
                    className="p-3 rounded-xl bg-surface/40 border border-border-p/40 text-xs flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between font-medium text-text-secondary">
                      <span className="truncate pr-2">{t.text}</span>
                      <span className="text-[10px] font-mono-data text-text-muted flex-shrink-0">
                        {t.estimatedMinutes}m
                      </span>
                    </div>
                    <p className="text-[11px] text-text-muted/80">{t.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. QUICK WIN (MOMENTUM BUILDER) */}
          {priorityPath.quickWin && (
            <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-400">
                  <span>⚡</span>
                  <span>4. Quick Win · Momentum</span>
                </span>
                <span className="text-[11px] font-mono-data text-amber-400/80">
                  ~{priorityPath.quickWin.estimatedMinutes} min
                </span>
              </div>
              <p className="text-sm font-semibold text-warm-white">
                {priorityPath.quickWin.text}
              </p>
              <p className="text-xs text-text-muted leading-relaxed">
                {priorityPath.quickWin.reason}
              </p>
              <button
                onClick={() => handleStartTask(priorityPath.quickWin!, "Quick Win")}
                className="text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer inline-flex items-center gap-1 pt-1"
              >
                <span>Knock this out first instead</span>
                <span>→</span>
              </button>
            </div>
          )}

          {/* 5. RECOVERY SUGGESTION */}
          {priorityPath.recoverySuggestion && (
            <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.06] p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                  <span>🌿</span>
                  <span>5. Recommended Reset</span>
                </span>
                <span className="text-[11px] font-mono-data text-emerald-400/80">
                  {priorityPath.recoverySuggestion.durationMinutes} min
                </span>
              </div>
              <h3 className="text-sm font-semibold text-warm-white">
                {priorityPath.recoverySuggestion.title}
              </h3>
              <p className="text-xs text-text-muted leading-relaxed">
                {priorityPath.recoverySuggestion.activity}
              </p>
              {priorityPath.recoverySuggestion.navTarget && (
                <button
                  onClick={() => onNav(priorityPath.recoverySuggestion.navTarget!)}
                  className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer inline-flex items-center gap-1 pt-1"
                >
                  <span>Take reset pause now</span>
                  <span>→</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* STEP 4: Focus Mode Screen                                             */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      {currentStep === "focus" && activeTask && (
        <div className="flex flex-col gap-6 animate-fade-up">
          {/* Header */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleStepBack}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-surface text-text-secondary hover:text-warm-white transition-colors cursor-pointer"
              aria-label="Back to priority path"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <span className="text-[10px] font-bold uppercase tracking-widest text-lavender-soft">
              Focus Mode · {activeTaskCategory}
            </span>
          </div>

          {/* Prompt */}
          <div className="flex flex-col gap-2 mt-2">
            <span className="text-xs font-bold uppercase tracking-widest text-lavender-bright">
              Only this one thing right now.
            </span>
            <h1 className="text-2xl font-bold text-warm-white leading-tight">{activeTask.text}</h1>
            {activeTask.reason && (
              <p className="text-xs text-text-muted leading-relaxed">{activeTask.reason}</p>
            )}
          </div>

          {/* Simple Isolated Timer */}
          <div className="card-base rounded-2xl p-6 flex flex-col items-center justify-center gap-3 border-purple-core/30 bg-purple-core/5 my-2">
            <span className="text-4xl font-mono-data font-bold text-warm-white tracking-wider">
              {formatTime(timerSeconds)}
            </span>
            <p className="text-[11px] text-text-muted font-medium">
              {isTimerRunning ? "Focused block running" : "Paused"}
            </p>
          </div>

          {/* Buttons: Complete Task / Pause */}
          <div className="flex flex-col gap-3">
            <button
              onClick={handleCompleteTask}
              className="w-full btn-primary py-4 rounded-2xl font-semibold text-sm shadow-lg shadow-purple-core/20 cursor-pointer"
            >
              Mark Task Complete
            </button>
            <button
              onClick={() => setIsTimerRunning((v) => !v)}
              className="w-full btn-ghost py-3.5 rounded-2xl text-sm font-medium cursor-pointer"
            >
              {isTimerRunning ? "Pause Timer" : "Resume Timer"}
            </button>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* STEP 5: Completed One Task Screen                                     */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      {currentStep === "completed-one" && (
        <div className="flex flex-col gap-6 animate-fade-up">
          <div className="flex flex-col items-center gap-3 mt-8">
            <div className="w-16 h-16 rounded-full bg-c-success/15 border border-c-success/40 flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-c-success">
                <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>

          <div className="flex flex-col gap-2 text-center">
            <h1 className="text-2xl font-bold text-warm-white">One thing completed.</h1>
            <p className="text-sm text-text-secondary leading-relaxed">
              You cleared your first focus and unblocked your mental space.
            </p>
          </div>

          {priorityPath?.nextStep && (
            <div className="card-base rounded-2xl p-4.5 border-purple-core/30 bg-purple-core/[0.06] flex flex-col gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-lavender-bright">
                Ready for what is next?
              </span>
              <p className="text-sm font-semibold text-warm-white">
                {priorityPath.nextStep.text}
              </p>
              <p className="text-xs text-text-muted leading-relaxed">
                {priorityPath.nextStep.reason}
              </p>
            </div>
          )}

          <div className="flex flex-col gap-3 mt-4">
            {priorityPath?.nextStep ? (
              <button
                onClick={handleContinueToNextStep}
                className="w-full btn-primary py-4 rounded-2xl font-semibold text-sm shadow-lg shadow-purple-core/20 cursor-pointer"
              >
                Continue to Next Step →
              </button>
            ) : (
              <button
                onClick={() => setCurrentStep("all-done")}
                className="w-full btn-primary py-4 rounded-2xl font-semibold text-sm shadow-lg shadow-purple-core/20 cursor-pointer"
              >
                Review Remaining Tasks →
              </button>
            )}

            <button
              onClick={() => setCurrentStep("organised")}
              className="w-full btn-ghost py-3.5 rounded-2xl text-sm font-medium cursor-pointer"
            >
              Back to Priority Path
            </button>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* STEP 6: All Done State                                                */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      {currentStep === "all-done" && (
        <div className="flex flex-col gap-6 animate-fade-up">
          <div className="flex flex-col items-center gap-3 mt-8">
            <div className="w-16 h-16 rounded-full bg-c-success/20 border border-c-success/50 flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-c-success">
                <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>

          <div className="flex flex-col gap-2 text-center">
            <h1 className="text-2xl font-bold text-warm-white">Mental space restored.</h1>
            <p className="text-sm text-text-secondary leading-relaxed">
              Your primary priorities are handled. Take a pause to recharge your energy.
            </p>
          </div>

          <div className="flex flex-col gap-3 mt-6">
            <button
              onClick={() => onNav("home")}
              className="w-full btn-primary py-4 rounded-2xl font-semibold text-sm shadow-lg shadow-purple-core/20 cursor-pointer"
            >
              Back to Home
            </button>
            <button
              onClick={() => {
                setTaskInput("");
                setCurrentStep("dump");
              }}
              className="w-full btn-ghost py-3.5 rounded-2xl text-sm font-medium cursor-pointer"
            >
              Plan Another Session
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

