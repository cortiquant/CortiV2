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
}

export interface PriorityPathResult {
  overview: string;
  firstFocus: TaskItem | null;
  nextStep: TaskItem | null;
  laterTasks: TaskItem[];
  quickWin: TaskItem | null;
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
// Client-side AI Fallback prioritisation logic (Intelligent Heuristics)
// ─────────────────────────────────────────────────────────────────────────────

export function getFallbackPriorityPath(rawTasks: string[], msiScore: number = 50): PriorityPathResult {
  const clean = rawTasks.map((t) => t.trim()).filter((t) => t.length > 0);
  if (clean.length === 0) {
    return {
      overview: "No tasks to prioritize. Add what is on your mind to create your Priority Path.",
      firstFocus: null,
      nextStep: null,
      laterTasks: [],
      quickWin: null,
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
    let urgency = 0;
    let cognitive = 2; // 1: light/quick, 2: medium, 3: heavy
    let isQuick = false;

    if (/\b(today|urgent|asap|now|critical|deadline|due|meeting|call)\b/.test(l)) urgency += 40;
    if (/\b(submit|finish|send|reply|review|check|email|ping)\b/.test(l)) urgency += 20;

    if (/\b(reply|email|call|text|ping|check|quick|pay|bill|print)\b/.test(l)) {
      cognitive = 1;
      isQuick = true;
    } else if (/\b(strategy|presentation|report|deck|analysis|architecture|budget|review pr)\b/.test(l)) {
      cognitive = 3;
    }

    const estimatedMinutes = isQuick ? 10 : cognitive === 3 ? 35 : 20;
    return {
      id: `task_${Date.now()}_${idx}`,
      text,
      urgency,
      cognitive,
      isQuick,
      estimatedMinutes,
      originalIndex: idx,
    };
  });

  // Energy & MSI Matching:
  // High MSI (>= 60): Start with quick wins or low cognitive load tasks first to restore momentum
  // Low/Moderate MSI (< 60): Deep work or high urgency tasks first
  let firstIdx = 0;
  if (msiScore >= 60) {
    const quickMatch = analyzed.findIndex((a) => a.isQuick);
    firstIdx = quickMatch !== -1 ? quickMatch : 0;
  } else {
    let topUrgency = -1;
    analyzed.forEach((a, i) => {
      if (a.urgency > topUrgency) {
        topUrgency = a.urgency;
        firstIdx = i;
      }
    });
  }

  const firstItem = analyzed[firstIdx];
  const rest = analyzed.filter((_, i) => i !== firstIdx);

  const quickWinItem = rest.find((r) => r.isQuick) || (firstItem.isQuick && rest.length > 0 ? rest[0] : null);
  const remainingNonQuick = rest.filter((r) => r !== quickWinItem);

  const nextItem = remainingNonQuick.length > 0 ? remainingNonQuick[0] : rest.length > 0 ? rest[0] : null;
  const laterItems = rest.filter((r) => r !== nextItem && r !== quickWinItem);

  const overview =
    msiScore >= 60
      ? `You have ${clean.length} pending items and your stress signals are elevated. Starting with "${firstItem.text}" clears uncertainty and unblocks your momentum without cognitive exhaustion.`
      : `You have ${clean.length} open responsibilities. Knocking out "${firstItem.text}" first will unlock immediate momentum and remove the largest obstacle on your schedule.`;

  return {
    overview,
    firstFocus: {
      id: firstItem.id,
      text: firstItem.text,
      estimatedMinutes: firstItem.estimatedMinutes,
      reason: firstItem.isQuick
        ? "Quick communication reduces uncertainty and eliminates background anxiety with minimal effort."
        : "Resolves immediate delivery pressure and unblocks subsequent steps on your agenda.",
      stressRelief: "Clears working memory overload and gives you immediate agency over your timeline.",
    },
    nextStep: nextItem
      ? {
          id: nextItem.id,
          text: nextItem.text,
          estimatedMinutes: nextItem.estimatedMinutes,
          reason: "Builds directly on your momentum once your primary focus is complete.",
        }
      : null,
    laterTasks: laterItems.map((l) => ({
      id: l.id,
      text: l.text,
      estimatedMinutes: l.estimatedMinutes,
      reason: "Can be held without penalty until higher leverage items are cleared.",
    })),
    quickWin: quickWinItem
      ? {
          id: quickWinItem.id,
          text: quickWinItem.text,
          estimatedMinutes: quickWinItem.estimatedMinutes,
          reason: "A lightweight task you can knock out in 10 minutes for an effortless dopamine boost.",
        }
      : null,
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

export async function fetchAIPriorityPath(tasks: string[], userMsi: number): Promise<PriorityPathResult> {
  const history = getPriorityLearningProfile();

  try {
    const res = await apiRequest<any>("/api/ai/priority-reset", {
      method: "POST",
      body: JSON.stringify({
        tasks,
        msi: userMsi,
        history,
      }),
    });

    if (res.ok && res.data && res.data.success && res.data.data) {
      const d = res.data.data;
      return {
        overview: d.overview,
        firstFocus: d.firstFocus ? {
          id: `task_focus_${Date.now()}`,
          text: d.firstFocus.task,
          estimatedMinutes: d.firstFocus.estimatedMinutes || 15,
          reason: d.firstFocus.reason,
          stressRelief: d.firstFocus.stressRelief,
        } : null,
        nextStep: d.nextStep ? {
          id: `task_next_${Date.now()}`,
          text: d.nextStep.task,
          estimatedMinutes: d.nextStep.estimatedMinutes || 20,
          reason: d.nextStep.reason,
        } : null,
        laterTasks: Array.isArray(d.laterTasks) ? d.laterTasks.map((t: any, i: number) => ({
          id: `task_later_${Date.now()}_${i}`,
          text: t.task,
          estimatedMinutes: t.estimatedMinutes || 30,
          reason: t.reason,
        })) : [],
        quickWin: d.quickWin ? {
          id: `task_quick_${Date.now()}`,
          text: d.quickWin.task,
          estimatedMinutes: d.quickWin.estimatedMinutes || 10,
          reason: d.quickWin.reason,
        } : null,
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
  return getFallbackPriorityPath(tasks, userMsi);
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
    const rawLines = taskInput
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (rawLines.length === 0) return;

    setCurrentStep("organising");

    // Dynamic empathetic loading messages
    const msgs = [
      "Analyzing cognitive load & deadlines...",
      "Evaluating stress impact & quick wins...",
      `Matching energy requirements with current MSI (${userMsi}%)...`,
      "Synthesizing your personalized Priority Path...",
    ];
    let msgIdx = 0;
    const msgInterval = setInterval(() => {
      msgIdx = (msgIdx + 1) % msgs.length;
      setAnalyzingMessage(msgs[msgIdx]);
    }, 800);

    try {
      const result = await fetchAIPriorityPath(rawLines, userMsi);
      clearInterval(msgInterval);
      setPriorityPath(result);
      if (result.firstFocus) {
        setActiveTask(result.firstFocus);
        setActiveTaskCategory("First Focus");
      }
      setCurrentStep("organised");
    } catch (err) {
      clearInterval(msgInterval);
      const fallback = getFallbackPriorityPath(rawLines, userMsi);
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
              Priority Rest · AI Coach
            </span>
          </div>

          {/* Heading */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xl">✨</span>
              <h1 className="text-2xl font-bold text-warm-white leading-tight">What is on your plate?</h1>
            </div>
            <p className="text-sm text-text-secondary leading-relaxed">
              Don't worry about order or sequence. Enter work, personal tasks, deadlines, meetings, or chores all in one place.
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
                  ? "Elevated strain detected: Priority Path will match your cognitive load with early low-friction wins."
                  : "Balanced energy: Priority Path will optimize for high impact and clearing major blockers."}
              </p>
            </div>
          </div>

          {/* Large Flexible Multiline Input */}
          <div className="flex flex-col gap-2">
            <textarea
              className="w-full rounded-2xl bg-surface border border-border-p text-warm-white placeholder-text-muted/50 text-sm p-4 resize-none focus:outline-none focus:border-purple-core transition-colors leading-relaxed font-mono-data"
              rows={8}
              placeholder={`Finish presentation for 4pm\nReply to client email\nSubmit expense report\nPrepare 1:1 notes\nCall insurance provider\nReview PRs\nPick up groceries`}
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
            />
            <div className="flex justify-between items-center px-1">
              <span className="text-xs text-text-muted">Enter one task per line in any order</span>
              <span className="text-xs text-text-muted font-mono-data">
                {taskInput.split("\n").filter((l) => l.trim().length > 0).length} tasks
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
              className="text-xs text-text-muted hover:text-warm-white transition-colors cursor-pointer"
            >
              Edit Tasks
            </button>
          </div>

          {/* Title */}
          <div>
            <h1 className="text-2xl font-bold text-warm-white tracking-tight">Your Priority Path</h1>
            <p className="text-xs text-text-muted mt-1">
              Personalized sequence optimized for cognitive relief and momentum.
            </p>
          </div>

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
                  1. First Focus
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

