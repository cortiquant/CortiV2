import { useState, useEffect, useRef } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Types & Interfaces
// ─────────────────────────────────────────────────────────────────────────────

export interface TaskItem {
  id: string;
  text: string;
  estimatedMinutes?: number;
  reason?: string;
}

export interface PrioritizedTasksResult {
  firstTask: TaskItem | null;
  remainingTasks: TaskItem[];
}

type Step = "dump" | "organising" | "organised" | "focus" | "completed-one" | "all-done";

// ─────────────────────────────────────────────────────────────────────────────
// Task Prioritisation Logic
// Clean abstraction ready to be wired to backend AI recommendation service later
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Deterministically prioritises a list of raw string tasks using signals like:
 * - Urgency/deadline keywords (today, now, urgent, asap, deadline, meeting, reply, call)
 * - Blocking or time-sensitive work
 * - Concise, actionable tasks
 * 
 * Later, this function can call the backend AI endpoint without altering UI contracts.
 */
export function prioritizeTasks(rawTasks: string[]): PrioritizedTasksResult {
  const filtered = rawTasks
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  if (filtered.length === 0) {
    return { firstTask: null, remainingTasks: [] };
  }

  // Scoring factors
  const scored = filtered.map((text, originalIndex) => {
    let score = 0;
    const lower = text.toLowerCase();

    // High urgency signals
    if (/\b(urgent|asap|today|now|immediately|critical)\b/.test(lower)) score += 50;
    if (/\b(deadline|due|finish|submit)\b/.test(lower)) score += 35;
    if (/\b(meeting|call|client|manager|hr)\b/.test(lower)) score += 25;
    if (/\b(reply|send|email|review|check|update)\b/.test(lower)) score += 15;

    // Favor tasks with explicit times (e.g. 3pm, 2:00)
    if (/\b\d{1,2}(:\d{2})?\s*(am|pm)\b/.test(lower)) score += 30;

    // Small bonus for compact, actionable task length
    if (text.length >= 10 && text.length <= 60) score += 5;

    // Slight penalty for later original entries to preserve sensible natural order
    score -= originalIndex * 2;

    // Dynamic estimated minutes based on words
    const estimatedMinutes = lower.includes("presentation") || lower.includes("report")
      ? 20
      : lower.includes("meeting") || lower.includes("call")
      ? 15
      : lower.includes("reply") || lower.includes("email")
      ? 10
      : 15;

    return {
      id: `task_${Date.now()}_${originalIndex}_${Math.random().toString(36).slice(2, 6)}`,
      text,
      score,
      estimatedMinutes,
      originalIndex,
    };
  });

  // Sort descending by score
  scored.sort((a, b) => b.score - a.score);

  const first = scored[0];
  const remaining = scored.slice(1);

  const getWhyFirst = (t: string) => {
    const l = t.toLowerCase();
    if (l.includes("deadline") || l.includes("finish") || l.includes("submit")) {
      return "Completing this first removes immediate delivery pressure and unblocks other items.";
    }
    if (l.includes("reply") || l.includes("call") || l.includes("email")) {
      return "Taking care of this quick communication frees up mental bandwidth for deeper work.";
    }
    if (l.includes("meeting")) {
      return "Preparing for this now prevents last-minute rush and restores control over your schedule.";
    }
    return "Completing this first will unblock the rest of your list.";
  };

  const firstTaskItem: TaskItem = {
    id: first.id,
    text: first.text,
    estimatedMinutes: first.estimatedMinutes,
    reason: getWhyFirst(first.text),
  };

  const remainingTaskItems: TaskItem[] = remaining.map((r) => ({
    id: r.id,
    text: r.text,
    estimatedMinutes: r.estimatedMinutes,
  }));

  return {
    firstTask: firstTaskItem,
    remainingTasks: remainingTaskItems,
  };
}

/**
 * Service abstraction: getPriorityRecommendation
 * Currently runs local deterministic prioritisation.
 * Later, this can query a backend endpoint (e.g., POST /api/priority-reset/recommendation).
 */
export async function getPriorityRecommendation(rawTasks: string[]): Promise<PrioritizedTasksResult> {
  // Simulates brief asynchronous processing (ready for API integration)
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(prioritizeTasks(rawTasks));
    }, 1200);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PriorityReset Component
// ─────────────────────────────────────────────────────────────────────────────

interface PriorityResetProps {
  onBack: () => void;
  onNav: (s: string) => void;
}

export default function PriorityReset({ onBack, onNav }: PriorityResetProps) {
  // Step navigation: dump -> organising -> organised -> focus -> completed-one -> all-done
  const [currentStep, setCurrentStep] = useState<Step>("dump");

  // Task list states
  const [taskInput, setTaskInput] = useState("");
  const [currentTask, setCurrentTask] = useState<TaskItem | null>(null);
  const [remainingTasks, setRemainingTasks] = useState<TaskItem[]>([]);
  const [doNextOpen, setDoNextOpen] = useState(true);

  // Timer states in Focus Task step
  const DEFAULT_TIMER_SECONDS = 15 * 60; // 15 minutes default
  const [timerSeconds, setTimerSeconds] = useState(DEFAULT_TIMER_SECONDS);
  const [isTimerRunning, setIsTimerRunning] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Focus step timer effect
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

  // Format mm:ss
  function formatTime(s: number) {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }

  // Handle "Organise This For Me →"
  async function handleOrganise() {
    const rawLines = taskInput
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (rawLines.length === 0) return;

    setCurrentStep("organising");

    try {
      const result = await getPriorityRecommendation(rawLines);
      setCurrentTask(result.firstTask);
      setRemainingTasks(result.remainingTasks);
      setCurrentStep("organised");
    } catch {
      // Fallback
      const fallback = prioritizeTasks(rawLines);
      setCurrentTask(fallback.firstTask);
      setRemainingTasks(fallback.remainingTasks);
      setCurrentStep("organised");
    }
  }

  // Handle "Start Task →"
  function handleStartTask() {
    setTimerSeconds((currentTask?.estimatedMinutes || 15) * 60);
    setIsTimerRunning(true);
    setCurrentStep("focus");
  }

  // Handle "Complete Task"
  function handleCompleteTask() {
    if (timerRef.current) clearInterval(timerRef.current);

    // Record usage in MongoDB backend for HR intervention analytics
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
          duration: 300,
          postFeeling: "Better",
          status: "Completed",
          metadata: { completedTask: currentTask?.text || "Task" },
        }),
      }).catch((e) => console.warn("[INTERVENTION-RECORD] Failed to record priority reset:", e.message));
    }

    // If more tasks remain, go to completed-one
    if (remainingTasks.length > 0) {
      setCurrentStep("completed-one");
    } else {
      // If no tasks remain, go straight to all-done
      setCurrentStep("all-done");
    }
  }

  // Handle "Continue →" from completed-one
  function handleContinue() {
    if (remainingTasks.length > 0) {
      const nextFirst = remainingTasks[0];
      const rest = remainingTasks.slice(1);

      // Give the newly elevated task an updated context reason
      const updatedNextFirst: TaskItem = {
        ...nextFirst,
        reason: nextFirst.reason || "Now that your previous task is clear, this is your next most impactful focus.",
      };

      setCurrentTask(updatedNextFirst);
      setRemainingTasks(rest);
      setCurrentStep("organised");
    } else {
      setCurrentStep("all-done");
    }
  }

  // Handle back navigation according to spec:
  // Task -> Organisation screen
  // Organisation -> What's on your plate
  // Priority Reset -> Overwhelmed detail (onBack)
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
    <div className="flex flex-col px-5 py-5 overflow-y-auto pb-28 min-h-screen bg-midnight text-warm-white">
      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* STEP 1: What's on your plate? (DUMP)                                 */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      {currentStep === "dump" && (
        <div className="flex flex-col gap-6 animate-fade-up">
          {/* Top Bar */}
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-surface text-text-secondary hover:text-warm-white transition-colors"
              aria-label="Back to Overwhelmed"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Priority Reset</span>
          </div>

          {/* Heading + Subheading */}
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold text-warm-white leading-tight">What's on your plate?</h1>
            <p className="text-sm text-text-secondary leading-relaxed">
              Don't worry about order. Just list everything that's on your mind.
            </p>
          </div>

          {/* Large multiline text input */}
          <div className="flex flex-col gap-2">
            <textarea
              className="w-full rounded-2xl bg-surface border border-border-p text-warm-white placeholder-text-muted/60 text-sm p-4 resize-none focus:outline-none focus:border-purple-core transition-colors leading-relaxed font-mono-data"
              rows={8}
              placeholder={`Finish presentation\nReply to HR\nSubmit expense report\nReview PRs\nCall insurance provider\nPrepare for 3pm meeting\nUpdate project tracker`}
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
            />
            <div className="flex justify-between items-center px-1">
              <span className="text-xs text-text-muted">Enter one task per line</span>
              <span className="text-xs text-text-muted font-mono-data">
                {taskInput.split("\n").filter((l) => l.trim().length > 0).length} tasks
              </span>
            </div>
          </div>

          {/* Button: Organise This For Me → */}
          <button
            onClick={handleOrganise}
            disabled={taskInput.trim().length === 0}
            className={`w-full py-4 rounded-2xl font-semibold text-sm transition-all ${
              taskInput.trim().length > 0
                ? "btn-primary shadow-lg shadow-purple-core/20"
                : "bg-surface border border-border-p text-text-muted cursor-not-allowed"
            }`}
          >
            Organise This For Me →
          </button>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* TRANSITION: Organising                                               */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      {currentStep === "organising" && (
        <div className="flex flex-col items-center justify-center gap-6 min-h-[60vh] animate-fade-up">
          <div className="relative flex items-center justify-center">
            <div
              className="w-20 h-20 rounded-full bg-purple-core/20 border border-purple-core/40 animate-ping absolute"
              style={{ animationDuration: "1.4s" }}
            />
            <div
              className="w-14 h-14 rounded-full bg-purple-core/30 border border-purple-core/60 animate-ping absolute"
              style={{ animationDuration: "1.1s", animationDelay: "0.2s" }}
            />
            <div className="w-10 h-10 rounded-full bg-purple-core/60 border border-purple-core flex items-center justify-center z-10">
              <div className="w-3 h-3 rounded-full bg-lavender-bright" />
            </div>
          </div>

          <div className="flex flex-col items-center gap-2 text-center">
            <p className="text-base font-semibold text-warm-white">Organising your list…</p>
            <p className="text-xs text-text-muted">Finding what needs your attention first.</p>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* STEP 2: Organisation Step (START HERE + DO NEXT)                     */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      {currentStep === "organised" && (
        <div className="flex flex-col gap-5 animate-fade-up">
          {/* Header */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleStepBack}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-surface text-text-secondary hover:text-warm-white transition-colors"
              aria-label="Back to task input"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Priority Reset</span>
          </div>

          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-bold text-warm-white">Start here</h2>
            <p className="text-xs text-text-muted">
              We identified the single task that will create the most momentum right now.
            </p>
          </div>

          {/* START HERE CARD */}
          {currentTask && (
            <div className="rounded-2xl border border-purple-core bg-purple-core/10 p-5 flex flex-col gap-4 shadow-lg shadow-purple-core/10">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-lavender-bright">
                  START HERE
                </span>
                <h3 className="text-lg font-bold text-warm-white leading-snug">{currentTask.text}</h3>
                <p className="text-xs text-lavender-soft font-mono-data">
                  {currentTask.estimatedMinutes || 15} min · Estimated
                </p>
              </div>

              {/* WHY THIS FIRST? */}
              <div className="rounded-xl bg-surface/60 border border-border-p/50 px-4 py-3 flex flex-col gap-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted">WHY THIS FIRST?</p>
                <p className="text-xs text-text-secondary leading-relaxed">
                  {currentTask.reason || "Completing this first will unblock the rest of your list."}
                </p>
              </div>

              <button
                onClick={handleStartTask}
                className="w-full btn-primary py-3.5 rounded-xl font-semibold text-sm shadow-md"
              >
                Start Task →
              </button>
            </div>
          )}

          {/* DO NEXT COLLAPSIBLE SECTION */}
          {remainingTasks.length > 0 && (
            <div className="flex flex-col gap-2 mt-2">
              <button
                className="flex items-center justify-between w-full px-1 py-1 text-left"
                onClick={() => setDoNextOpen((v) => !v)}
              >
                <span className="text-[11px] font-bold uppercase tracking-widest text-text-muted flex items-center gap-2">
                  DO NEXT
                  <span className="text-[10px] font-mono-data bg-surface border border-border-p px-2 py-0.5 rounded-full text-text-muted">
                    {remainingTasks.length}
                  </span>
                </span>
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 14 14"
                  fill="none"
                  className={`text-text-muted transition-transform duration-200 ${doNextOpen ? "rotate-180" : ""}`}
                >
                  <path d="M3 5l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {doNextOpen && (
                <div className="flex flex-col gap-2 animate-fade-up">
                  {remainingTasks.map((task, i) => (
                    <div
                      key={task.id || i}
                      className="card-base rounded-xl px-4 py-3 text-sm text-text-secondary flex items-center justify-between border-border-p"
                    >
                      <span className="truncate pr-2">{task.text}</span>
                      <span className="text-[10px] font-mono-data text-text-muted flex-shrink-0">
                        {task.estimatedMinutes || 15}m
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* STEP 3: Focused Task Screen                                          */}
      {/* ───────────────────────────────────────────────────────────────────── */}
      {currentStep === "focus" && currentTask && (
        <div className="flex flex-col gap-6 animate-fade-up">
          {/* Header */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleStepBack}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-surface text-text-secondary hover:text-warm-white transition-colors"
              aria-label="Back to organised list"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Focus Mode</span>
          </div>

          {/* Prompt */}
          <div className="flex flex-col gap-2 mt-2">
            <span className="text-xs font-bold uppercase tracking-widest text-lavender-bright">Focus on this.</span>
            <h1 className="text-2xl font-bold text-warm-white leading-tight">{currentTask.text}</h1>
            <p className="text-sm text-text-secondary leading-relaxed">
              Give this one thing your attention for now.
            </p>
          </div>

          {/* Simple Isolated Timer */}
          <div className="card-base rounded-2xl p-6 flex flex-col items-center justify-center gap-3 border-purple-core/30 bg-purple-core/5 my-2">
            <span className="text-3xl font-mono-data font-bold text-warm-white tracking-wider">
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
              className="w-full btn-primary py-4 rounded-2xl font-semibold text-sm shadow-lg shadow-purple-core/20"
            >
              Complete Task
            </button>
            <button
              onClick={() => setIsTimerRunning((v) => !v)}
              className="w-full btn-ghost py-3.5 rounded-2xl text-sm font-medium"
            >
              {isTimerRunning ? "Pause" : "Resume"}
            </button>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* STEP 4: Completion State (One thing done)                             */}
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
            <h1 className="text-2xl font-bold text-warm-white">Nice work.</h1>
            <p className="text-sm text-text-secondary leading-relaxed">
              You made space by finishing one thing.
            </p>
          </div>

          <div className="card-base rounded-2xl p-4 border-border-p flex flex-col gap-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">What's next?</span>
            <p className="text-sm text-text-secondary">
              You have <span className="font-semibold text-warm-white">{remainingTasks.length}</span> more{" "}
              {remainingTasks.length === 1 ? "task" : "tasks"} on your list. Ready to tackle the next one?
            </p>
          </div>

          <div className="flex flex-col gap-3 mt-4">
            <button
              onClick={handleContinue}
              className="w-full btn-primary py-4 rounded-2xl font-semibold text-sm shadow-lg shadow-purple-core/20"
            >
              Continue →
            </button>
            <button
              onClick={onBack}
              className="w-full btn-ghost py-3.5 rounded-2xl text-sm font-medium"
            >
              Back to Reset
            </button>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────── */}
      {/* STEP 5: All Done Completion                                          */}
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
            <h1 className="text-2xl font-bold text-warm-white">You're done.</h1>
            <p className="text-sm text-text-secondary leading-relaxed">
              You've cleared your list for now.
            </p>
          </div>

          <div className="flex flex-col gap-3 mt-6">
            <button
              onClick={onBack}
              className="w-full btn-primary py-4 rounded-2xl font-semibold text-sm shadow-lg shadow-purple-core/20"
            >
              Back to Reset
            </button>
            <button
              onClick={() => onNav("home")}
              className="w-full btn-ghost py-3.5 rounded-2xl text-sm font-medium"
            >
              Go to Home Screen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
