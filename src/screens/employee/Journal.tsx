import { useState, useEffect } from "react"

interface JournalEntry {
  id: string
  content: string
  emotion: string | null
  tags: string[]
  createdAt: string
}

const STORAGE_KEY = "cq_journal_entries"

const EMOTIONS = [
  { emoji: "😌", label: "Calm" },
  { emoji: "🙂", label: "Good" },
  { emoji: "😐", label: "Okay" },
  { emoji: "😕", label: "Low" },
  { emoji: "😣", label: "Stressed" },
  { emoji: "😤", label: "Frustrated" },
  { emoji: "😴", label: "Drained" },
  { emoji: "🤯", label: "Overwhelmed" },
]

const NUDGE_EMOTIONS = ["Stressed", "Frustrated", "Drained", "Overwhelmed"]

const TAGS = [
  "#work",
  "#family",
  "#relationships",
  "#goals",
  "#stress",
  "#gratitude",
  "#personal",
  "#other",
]

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function loadEntries(): JournalEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveEntries(entries: JournalEntry[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
}

export default function Journal({
  onBack,
  onNav,
}: {
  onBack: () => void
  onNav: (s: string) => void
}) {
  const [stage, setStage] = useState<"home" | "editor" | "view">("home")
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [search, setSearch] = useState("")

  // Editor state
  const [editorContent, setEditorContent] = useState("")
  const [editorEmotion, setEditorEmotion] = useState<string | null>(null)
  const [editorTags, setEditorTags] = useState<string[]>([])
  const [editorTimestamp, setEditorTimestamp] = useState<string>("")
  const [savedFlash, setSavedFlash] = useState(false)
  const [showNudge, setShowNudge] = useState(false)
  const [savedEmotion, setSavedEmotion] = useState<string | null>(null)

  // View state
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  useEffect(() => {
    setEntries(loadEntries())
  }, [])

  function openEditor() {
    setEditorContent("")
    setEditorEmotion(null)
    setEditorTags([])
    setEditorTimestamp(new Date().toISOString())
    setSavedFlash(false)
    setShowNudge(false)
    setSavedEmotion(null)
    setStage("editor")
  }

  function openView(id: string) {
    setSelectedId(id)
    setDeleteConfirm(false)
    setStage("view")
  }

  function backToHome() {
    setStage("home")
    setSelectedId(null)
    setDeleteConfirm(false)
    setShowNudge(false)
  }

  function toggleEditorTag(tag: string) {
    setEditorTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  function toggleEditorEmotion(label: string) {
    setEditorEmotion((prev) => (prev === label ? null : label))
  }

  function handleSave() {
    if (!editorContent.trim()) return

    const entry: JournalEntry = {
      id: Date.now().toString(),
      content: editorContent.trim(),
      emotion: editorEmotion,
      tags: editorTags,
      createdAt: editorTimestamp,
    }

    const updated = [entry, ...entries]
    setEntries(updated)
    saveEntries(updated)
    setSavedFlash(true)
    setSavedEmotion(editorEmotion)

    const isNudge = editorEmotion && NUDGE_EMOTIONS.includes(editorEmotion)
    if (isNudge) {
      setShowNudge(true)
    }

    setTimeout(() => {
      setSavedFlash(false)
      if (!isNudge) {
        backToHome()
      }
    }, 1500)
  }

  function handleDelete() {
    if (!selectedId) return
    const updated = entries.filter((e) => e.id !== selectedId)
    setEntries(updated)
    saveEntries(updated)
    backToHome()
  }

  const filteredEntries = entries.filter((e) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      e.content.toLowerCase().includes(q) ||
      e.tags.some((t) => t.toLowerCase().includes(q))
    )
  })

  const selectedEntry = entries.find((e) => e.id === selectedId) || null

  // ── HOME ─────────────────────────────────────────────────────────────────
  if (stage === "home") {
    return (
      <div className="flex flex-col px-5 py-5 overflow-y-auto pb-28 min-h-full">
        {/* Header */}
        <div className="flex items-center gap-3 mb-1">
          <button
            onClick={onBack}
            className="text-text-secondary hover:text-warm-white transition-colors p-1 -ml-1"
            aria-label="Back"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5l-5 5 5 5" />
            </svg>
          </button>
          <h1 className="text-warm-white text-lg font-semibold tracking-tight">
            My Journal
          </h1>
        </div>
        <p className="text-text-muted text-sm mb-6 ml-8">
          A private space for everything on your mind.
        </p>

        {/* New Entry */}
        <button onClick={openEditor} className="btn-primary w-full mb-5">
          + New Entry
        </button>

        {/* Search */}
        <div className="relative mb-6">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
            width="15"
            height="15"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="9" cy="9" r="6" />
            <path d="M13.5 13.5l3.5 3.5" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your journal…"
            className="w-full bg-surface border border-border-p rounded-xl pl-9 pr-4 py-2.5 text-sm text-warm-white placeholder:text-text-muted focus:outline-none focus:border-purple-core transition-colors"
          />
        </div>

        {/* Empty state */}
        {entries.length === 0 && (
          <div className="flex flex-col items-center justify-center flex-1 text-center py-16 gap-2">
            <span className="text-4xl mb-2">📖</span>
            <p className="text-warm-white text-base font-medium">
              Your journal is waiting.
            </p>
            <p className="text-text-muted text-sm max-w-xs">
              Write a sentence, a page, or just a few words.
            </p>
          </div>
        )}

        {/* Entry list */}
        {filteredEntries.length > 0 && (
          <div className="flex flex-col gap-3">
            {filteredEntries.map((entry) => {
              const emotionObj = EMOTIONS.find(
                (e) => e.label === entry.emotion
              )
              const preview = entry.content.slice(0, 80)
              const truncated = entry.content.length > 80
              return (
                <button
                  key={entry.id}
                  onClick={() => openView(entry.id)}
                  className="card-base text-left w-full flex flex-col gap-1.5 hover:bg-elevated transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-text-muted text-xs">
                      {formatDate(entry.createdAt)}
                    </span>
                    <span className="text-text-muted text-xs font-mono-data">
                      {formatTime(entry.createdAt)}
                    </span>
                  </div>
                  <p className="text-text-secondary text-sm leading-relaxed">
                    {emotionObj && (
                      <span className="mr-1">{emotionObj.emoji}</span>
                    )}
                    {preview}
                    {truncated && "…"}
                  </p>
                  {entry.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {entry.tags.map((tag) => (
                        <span
                          key={tag}
                          className="text-[10px] text-text-muted border border-border-s rounded-full px-2 py-0.5"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {search.trim() && filteredEntries.length === 0 && entries.length > 0 && (
          <div className="text-center py-10">
            <p className="text-text-muted text-sm">No entries match your search.</p>
          </div>
        )}
      </div>
    )
  }

  // ── EDITOR ───────────────────────────────────────────────────────────────
  if (stage === "editor") {
    return (
      <div className="flex flex-col px-5 py-5 overflow-y-auto pb-28 min-h-full">
        {/* Header */}
        <div className="flex items-center gap-3 mb-1">
          <button
            onClick={backToHome}
            className="text-text-secondary hover:text-warm-white transition-colors p-1 -ml-1"
            aria-label="Back"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5l-5 5 5 5" />
            </svg>
          </button>
          <h1 className="text-warm-white text-lg font-semibold tracking-tight">
            New Entry
          </h1>
        </div>

        {/* Timestamp */}
        <p className="text-text-muted text-xs mb-5 ml-8">
          {new Date(editorTimestamp).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}{" "}
          ·{" "}
          {new Date(editorTimestamp).toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>

        {/* Textarea */}
        <textarea
          autoFocus
          value={editorContent}
          onChange={(e) => setEditorContent(e.target.value)}
          placeholder="What's on your mind?"
          className="w-full bg-surface border border-border-p rounded-xl px-4 py-3 text-sm text-warm-white placeholder:text-text-muted focus:outline-none focus:border-purple-core transition-colors resize-none mb-6 leading-relaxed"
          style={{ minHeight: "200px" }}
        />

        {/* Emotion picker */}
        <div className="mb-5">
          <p className="text-text-secondary text-xs font-medium mb-2">
            How are you feeling?
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {EMOTIONS.map((em) => (
              <button
                key={em.label}
                onClick={() => toggleEditorEmotion(em.label)}
                className={[
                  "flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl border text-xs whitespace-nowrap transition-colors flex-shrink-0",
                  editorEmotion === em.label
                    ? "bg-purple-core/10 border-purple-core text-lavender-bright"
                    : "border-border-p text-text-muted hover:border-border-s hover:text-text-secondary",
                ].join(" ")}
              >
                <span className="text-lg leading-none">{em.emoji}</span>
                <span>{em.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div className="mb-6">
          <p className="text-text-secondary text-xs font-medium mb-2">
            Add tags
          </p>
          <div className="flex flex-wrap gap-2">
            {TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleEditorTag(tag)}
                className={[
                  "text-xs border rounded-full px-3 py-1 transition-colors",
                  editorTags.includes(tag)
                    ? "bg-purple-core/10 border-purple-core text-lavender-bright"
                    : "border-border-p text-text-muted hover:border-border-s hover:text-text-secondary",
                ].join(" ")}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={!editorContent.trim() || savedFlash}
          className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {savedFlash ? "Saved ✓" : "Save Entry"}
        </button>

        {/* Nudge card */}
        {showNudge && savedEmotion && NUDGE_EMOTIONS.includes(savedEmotion) && (
          <div className="mt-4 card-base animate-fade-up">
            <p className="text-text-secondary text-sm mb-3">
              Want to do something about how you feel?
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => onNav("dump-bag")}
                className="btn-primary text-sm py-2.5"
              >
                Open Dump Bag — talk it through
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => onNav("breathing-reset")}
                  className="btn-ghost text-sm flex-1"
                >
                  Breathing Reset
                </button>
                <button
                  onClick={() => onNav("priority-reset")}
                  className="btn-ghost text-sm flex-1"
                >
                  Priority Reset
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── VIEW ─────────────────────────────────────────────────────────────────
  if (stage === "view" && selectedEntry) {
    const emotionObj = EMOTIONS.find((e) => e.label === selectedEntry.emotion)

    return (
      <div className="flex flex-col px-5 py-5 overflow-y-auto pb-28 min-h-full">
        {/* Header */}
        <div className="flex items-center gap-3 mb-1">
          <button
            onClick={backToHome}
            className="text-text-secondary hover:text-warm-white transition-colors p-1 -ml-1"
            aria-label="Back"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 5l-5 5 5 5" />
            </svg>
          </button>
          <h1 className="text-warm-white text-lg font-semibold tracking-tight">
            {formatDate(selectedEntry.createdAt)}
          </h1>
        </div>
        <p className="text-text-muted text-xs mb-6 ml-8 font-mono-data">
          {formatTime(selectedEntry.createdAt)}
        </p>

        {/* Emotion */}
        {emotionObj && (
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">{emotionObj.emoji}</span>
            <span className="text-text-secondary text-sm">{emotionObj.label}</span>
          </div>
        )}

        {/* Tags */}
        {selectedEntry.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-5">
            {selectedEntry.tags.map((tag) => (
              <span
                key={tag}
                className="text-xs text-text-muted border border-border-s rounded-full px-3 py-1"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Content */}
        <p className="text-warm-white text-sm leading-relaxed whitespace-pre-wrap mb-8">
          {selectedEntry.content}
        </p>

        {/* Talk it through */}
        <div className="card-base p-4 mb-4">
          <p className="text-xs text-text-muted font-semibold uppercase tracking-widest mb-1">Want to talk this through?</p>
          <p className="text-xs text-text-muted mb-3 leading-relaxed">Open Dump Bag to get a different perspective on what you wrote.</p>
          <button
            onClick={() => onNav("dump-bag")}
            className="btn-ghost w-full py-2.5 text-sm font-medium"
          >
            Open Dump Bag →
          </button>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={backToHome} className="btn-ghost flex-1">
            Back
          </button>
          <button
            onClick={() => setDeleteConfirm(true)}
            className="btn-ghost flex-1 text-c-critical border-c-critical/30 hover:bg-c-critical/10"
          >
            Delete
          </button>
        </div>

        {/* Delete confirmation */}
        {deleteConfirm && (
          <div className="mt-4 card-base border border-c-critical/20 animate-fade-up">
            <p className="text-text-secondary text-sm mb-3">
              Are you sure? This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                className="btn-ghost text-sm text-c-critical border-c-critical/30 hover:bg-c-critical/10 flex-1"
              >
                Confirm Delete
              </button>
              <button
                onClick={() => setDeleteConfirm(false)}
                className="btn-ghost text-sm flex-1"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return null
}
