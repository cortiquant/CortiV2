import { useState, useEffect, useMemo } from "react"
import { Routes, Route, useNavigate, Navigate, useLocation } from "react-router-dom"
import { apiRequest } from "@/lib/api"

// ── Shared UI & Badges ─────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    Active: "bg-green-100 text-green-700 border-green-200",
    Pending: "bg-yellow-100 text-yellow-700 border-yellow-200",
    "Invitation Pending": "bg-amber-100 text-amber-700 border-amber-200",
    Expired: "bg-orange-100 text-orange-700 border-orange-200",
    Revoked: "bg-red-100 text-red-700 border-red-200",
    Inactive: "bg-gray-100 text-gray-700 border-gray-200",
    Rejected: "bg-red-100 text-red-700 border-red-200",
    Completed: "bg-blue-100 text-blue-700 border-blue-200",
    Success: "bg-green-100 text-green-700 border-green-200",
  }
  const color = colors[status] || "bg-gray-100 text-gray-700 border-gray-200"
  return <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${color}`}>{status}</span>
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface OrganisationItem {
  _id: string
  organisationId: string
  name: string
  organisationCode: string
  code?: string
  hrName: string
  hrEmail: string
  employees: number
  employeeCount: number
  status: "Active" | "Pending" | "Inactive"
  createdAt: string
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconHome({ active }: { active?: boolean }) {
  return <svg className={`w-5 h-5 ${active ? "text-purple-core" : "text-gray-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
}
function IconOrg({ active }: { active?: boolean }) {
  return <svg className={`w-5 h-5 ${active ? "text-purple-core" : "text-gray-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
}
function IconUsers({ active }: { active?: boolean }) {
  return <svg className={`w-5 h-5 ${active ? "text-purple-core" : "text-gray-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
}
function IconAdmins({ active }: { active?: boolean }) {
  return <svg className={`w-5 h-5 ${active ? "text-purple-core" : "text-gray-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
}
function IconAssessments({ active }: { active?: boolean }) {
  return <svg className={`w-5 h-5 ${active ? "text-purple-core" : "text-gray-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
}
function IconLogs({ active }: { active?: boolean }) {
  return <svg className={`w-5 h-5 ${active ? "text-purple-core" : "text-gray-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
}
function IconSettings({ active }: { active?: boolean }) {
  return <svg className={`w-5 h-5 ${active ? "text-purple-core" : "text-gray-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
}
function IconListeners({ active }: { active?: boolean }) {
  return <svg className={`w-5 h-5 ${active ? "text-purple-core" : "text-gray-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" /></svg>
}

// ── Generic Table Page ────────────────────────────────────────────────────────

function TablePage({
  title,
  desc,
  columns,
  data,
  onAdd,
  onAddClick,
  renderRow,
  searchValue,
  onSearchChange,
  loading = false,
  emptyMessage = "No records found.",
}: {
  title: string
  desc?: string
  columns: string[]
  data: any[]
  onAdd?: string
  onAddClick?: () => void
  renderRow: (item: any, i: number) => React.ReactNode
  searchValue?: string
  onSearchChange?: (val: string) => void
  loading?: boolean
  emptyMessage?: React.ReactNode
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col h-full overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/30">
        <div>
          <h1 className="text-lg font-bold text-gray-900">{title}</h1>
          {desc && <p className="text-sm text-gray-500 mt-1">{desc}</p>}
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              type="text"
              placeholder="Search..."
              value={searchValue ?? ""}
              onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-core/20 focus:border-purple-core w-full sm:w-64"
            />
          </div>
          {onAdd && (
            <button
              onClick={onAddClick}
              data-on-add-btn="true"
              className="bg-purple-core hover:bg-purple-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-sm whitespace-nowrap cursor-pointer"
            >
              {onAdd}
            </button>
          )}
        </div>
      </div>
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-sm text-left whitespace-nowrap">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase sticky top-0 border-b border-gray-100">
            <tr>
              {columns.map((c: string) => <th key={c} className="px-6 py-3.5 font-medium tracking-wider">{c}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-gray-500 text-sm">
                  <div className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin text-purple-core" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Loading organisations...</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12 text-center text-gray-500 text-sm">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item: any, i: number) => (
                <tr key={item._id || item.id || i} className="hover:bg-gray-50/50 transition-colors group">
                  {renderRow(item, i)}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Modals: Add Organisation & Manage Organisation ────────────────────────────

function AddOrganisationModal({
  isOpen,
  onClose,
  onCreated,
}: {
  isOpen: boolean
  onClose: () => void
  onCreated: (newOrg: { organisationId: string; organisationCode: string; name: string; hrEmail: string }) => void
}) {
  const [orgName, setOrgName] = useState("")
  const [hrName, setHrName] = useState("")
  const [hrEmail, setHrEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!orgName.trim() || !hrName.trim() || !hrEmail.trim()) {
      setError("Please complete all required fields.")
      return
    }

    const emailRegex = /^\S+@\S+\.\S+$/
    if (!emailRegex.test(hrEmail.trim())) {
      setError("Please enter a valid HR email address.")
      return
    }

    setLoading(true)

    try {
      const res = await apiRequest("/api/admin/organisations", {
        method: "POST",
        body: JSON.stringify({
          name: orgName.trim(),
          hrName: hrName.trim(),
          hrEmail: hrEmail.trim(),
        }),
      })

      const data = res.data

      if (!res.ok || !data?.success) {
        setError(data?.message || "Unable to create organisation. Please try again.")
        setLoading(false)
        return
      }

      setLoading(false)
      onCreated({
        name: data.organisation.name,
        organisationId: data.organisation.organisationId,
        organisationCode: data.organisation.organisationCode,
        hrEmail: hrEmail.trim(),
      })
    } catch {
      setError("Unable to create organisation. Please try again.")
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Add Organisation</h2>
            <p className="text-xs text-gray-500 mt-0.5">Provision a new client workspace and send an HR Admin invitation.</p>
          </div>
          <button onClick={onClose} disabled={loading} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-3 rounded-lg flex items-start gap-2">
              <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Organisation Name *</label>
            <input
              type="text"
              placeholder="e.g. Meridian Group"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              disabled={loading}
              className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-core/20 focus:border-purple-core transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">HR Name *</label>
            <input
              type="text"
              placeholder="e.g. John Doe"
              value={hrName}
              onChange={(e) => setHrName(e.target.value)}
              disabled={loading}
              className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-core/20 focus:border-purple-core transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">HR Email *</label>
            <input
              type="email"
              placeholder="e.g. hr@company.com"
              value={hrEmail}
              onChange={(e) => setHrEmail(e.target.value)}
              disabled={loading}
              className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-core/20 focus:border-purple-core transition-all"
            />
            <p className="text-[11px] text-gray-400 mt-1">An invitation email will be sent to the HR Admin to set their own password.</p>
          </div>

          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-purple-core hover:bg-purple-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
            >
              {loading && (
                <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              )}
              <span>{loading ? "Creating..." : "Create & Send Invitation"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function SuccessModal({
  createdData,
  onClose,
}: {
  createdData: { name: string; organisationId: string; organisationCode: string; hrEmail?: string } | null
  onClose: () => void
}) {
  const [copiedId, setCopiedId] = useState(false)
  const [copiedCode, setCopiedCode] = useState(false)

  if (!createdData) return null

  const handleCopy = (text: string, type: "id" | "code") => {
    navigator.clipboard.writeText(text)
    if (type === "id") {
      setCopiedId(true)
      setTimeout(() => setCopiedId(false), 2000)
    } else {
      setCopiedCode(true)
      setTimeout(() => setCopiedCode(false), 2000)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100 p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
        </div>

        <h3 className="text-xl font-bold text-gray-900 mb-1">Organisation Created</h3>
        <p className="text-sm font-semibold text-purple-700 mb-4">{createdData.name}</p>

        {createdData.hrEmail && (
          <div className="bg-purple-50/70 border border-purple-100 rounded-xl p-3 mb-5 text-left flex items-start gap-2.5">
            <svg className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <div className="text-xs">
              <p className="font-semibold text-purple-900">HR Invitation Dispatched</p>
              <p className="text-purple-700 mt-0.5">An email invite was sent to <strong className="font-medium text-purple-900">{createdData.hrEmail}</strong> to set up their password.</p>
            </div>
          </div>
        )}

        <div className="space-y-3 text-left mb-6">
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-wider font-semibold text-gray-500">Organisation ID</p>
              <p className="font-mono text-base font-bold text-gray-900 tracking-wide mt-0.5">{createdData.organisationId}</p>
            </div>
            <button
              onClick={() => handleCopy(createdData.organisationId, "id")}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-gray-200 text-purple-700 hover:bg-purple-50 transition-colors flex items-center gap-1.5"
            >
              {copiedId ? "Copied ✓" : "Copy"}
            </button>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-wider font-semibold text-gray-500">Organisation Code</p>
              <p className="font-mono text-base font-bold text-purple-700 tracking-wide mt-0.5">{createdData.organisationCode}</p>
            </div>
            <button
              onClick={() => handleCopy(createdData.organisationCode, "code")}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white border border-gray-200 text-purple-700 hover:bg-purple-50 transition-colors flex items-center gap-1.5"
            >
              {copiedCode ? "Copied ✓" : "Copy"}
            </button>
          </div>
        </div>

        <p className="text-xs text-gray-400 mb-6">Share the Organisation Code with employees for their registration portal.</p>

        <button
          onClick={onClose}
          className="w-full bg-purple-core hover:bg-purple-700 text-white font-medium py-3 rounded-xl transition-colors shadow-sm text-sm"
        >
          Done
        </button>
      </div>
    </div>
  )
}

// ── Delete Confirmation Modal ────────────────────────────────────────────────
function DeleteOrganisationConfirmModal({
  org,
  isOpen,
  onClose,
  onDeleted,
}: {
  org: OrganisationItem | null
  isOpen: boolean
  onClose: () => void
  onDeleted: () => void
}) {
  const [confirmName, setConfirmName] = useState("")
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setConfirmName("")
      setError(null)
      setDeleting(false)
    }
  }, [isOpen])

  if (!isOpen || !org) return null

  const isMatch = confirmName.trim() === org.name.trim()

  const handleDelete = async () => {
    if (!isMatch || deleting) return

    setDeleting(true)
    setError(null)

    try {
      const res = await apiRequest(`/api/admin/organisations/${org.organisationId || org._id}`, {
        method: "DELETE",
      })

      const data = res.data
      if (!res.ok || !data?.success) {
        setError(data?.message || "Unable to delete organisation. Please try again.")
        setDeleting(false)
        return
      }

      setDeleting(false)
      onDeleted()
    } catch {
      setError("Unable to delete organisation. Please check your network and try again.")
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-red-100 flex flex-col">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-gray-100 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center flex-shrink-0 text-red-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </div>
          <div className="flex-1">
            <h2 className="text-base font-bold text-gray-900">Delete Organisation?</h2>
            <p className="text-xs text-gray-500 mt-0.5">This action cannot be undone.</p>
          </div>
          <button onClick={onClose} disabled={deleting} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-gray-600 leading-relaxed">
            This will permanently delete this organisation and all associated data,
            including HR administrators, employees, invitations, assessments,
            onboarding records, check-ins and related organisation data.
          </p>

          {/* Org details summary */}
          <div className="bg-red-50/50 border border-red-100 rounded-xl p-3.5 space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-gray-500 font-medium">Organisation Name</span>
              <span className="font-bold text-gray-900">{org.name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 font-medium">Organisation ID</span>
              <span className="font-mono font-semibold text-purple-700">{org.organisationId}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-500 font-medium">Organisation Code</span>
              <span className="font-mono font-semibold text-gray-700">{org.organisationCode || org.code}</span>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3.5 py-2.5 rounded-lg flex items-center gap-2">
              <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              Type <span className="font-mono text-red-600 font-bold select-all">&quot;{org.name}&quot;</span> to confirm deletion:
            </label>
            <input
              type="text"
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={org.name}
              disabled={deleting}
              className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 font-medium"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={!isMatch || deleting}
            className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {deleting ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
                <span>Deleting...</span>
              </>
            ) : (
              "Delete Organisation"
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

function ManageOrganisationModal({
  org,
  isOpen,
  onClose,
  onUpdated,
  onDeleted,
}: {
  org: OrganisationItem | null
  isOpen: boolean
  onClose: () => void
  onUpdated: () => void
  onDeleted: () => void
}) {
  const [name, setName] = useState("")
  const [status, setStatus] = useState<"Active" | "Pending" | "Inactive">("Active")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  useEffect(() => {
    if (org) {
      setName(org.name)
      setStatus(org.status)
      setIsEditing(false)
      setError(null)
      setIsDeleteOpen(false)
    }
  }, [org])

  if (!isOpen || !org) return null

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const res = await apiRequest(`/api/admin/organisations/${org._id || org.organisationId}`, {
        method: "PATCH",
        body: JSON.stringify({ name: name.trim(), status }),
      })

      const data = res.data
      if (!res.ok || !data?.success) {
        setError(data?.message || "Unable to update organisation.")
        setLoading(false)
        return
      }

      setLoading(false)
      setIsEditing(false)
      onUpdated()
    } catch {
      setError("Unable to update organisation. Please try again.")
      setLoading(false)
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-fade-in">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
          <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Manage Organisation</h2>
              <p className="font-mono text-xs text-purple-700 font-semibold mt-0.5">{org.organisationId}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          <div className="p-6 space-y-5 overflow-y-auto flex-1">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-3 rounded-lg">{error}</div>
            )}

            {!isEditing ? (
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <div>
                    <span className="text-xs text-gray-500 font-medium">Organisation Name</span>
                    <p className="font-semibold text-gray-900 mt-0.5">{org.name}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 font-medium">Status</span>
                    <div className="mt-1"><StatusBadge status={org.status} /></div>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 font-medium">Organisation Code</span>
                    <p className="font-mono font-bold text-purple-700 mt-0.5">{org.organisationCode || org.code}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 font-medium">Employee Count</span>
                    <p className="font-semibold text-gray-900 mt-0.5">{org.employees ?? org.employeeCount ?? 0}</p>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3">
                  <h4 className="text-xs uppercase tracking-wider font-semibold text-gray-500">HR Administrator</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-xs text-gray-500">Name</span>
                      <p className="font-medium text-gray-900">{org.hrName || "Unassigned"}</p>
                    </div>
                    <div>
                      <span className="text-xs text-gray-500">Email</span>
                      <p className="font-medium text-gray-900 truncate">{org.hrEmail || "—"}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-gray-400">Created on {new Date(org.createdAt).toLocaleDateString()}</span>
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="bg-purple-core hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-sm transition-colors"
                  >
                    Edit Organisation
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Organisation Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={loading}
                    className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-core/20 focus:border-purple-core"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as any)}
                    disabled={loading}
                    className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-core/20 focus:border-purple-core bg-white"
                  >
                    <option value="Active">Active</option>
                    <option value="Pending">Pending</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                  <p className="text-[11px] text-gray-400 mt-1">Setting to Inactive prevents HR and employee logins.</p>
                </div>

                <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    disabled={loading}
                    className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-purple-core hover:bg-purple-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                  >
                    {loading ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            )}

            {/* ── Danger Zone ────────────────────────────────────────────── */}
            <div className="pt-5 mt-2 border-t border-red-100">
              <div className="bg-red-50/50 border border-red-100 rounded-xl p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-red-700 uppercase tracking-wider">Danger Zone</h4>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Permanently delete this organisation and all associated data.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsDeleteOpen(true)}
                    className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors shadow-sm whitespace-nowrap self-start sm:self-auto cursor-pointer"
                  >
                    Delete Organisation
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteOrganisationConfirmModal
        org={org}
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onDeleted={() => {
          setIsDeleteOpen(false)
          onClose()
          onDeleted()
        }}
      />
    </>
  )
}

// ── Organisations Screen ──────────────────────────────────────────────────────

function OrganisationsScreen() {
  const [organisations, setOrganisations] = useState<OrganisationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [managingOrg, setManagingOrg] = useState<OrganisationItem | null>(null)
  const [createdData, setCreatedData] = useState<{ name: string; organisationId: string; organisationCode: string; hrEmail?: string } | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const [fetchError, setFetchError] = useState<string | null>(null)

  const fetchOrganisations = async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const res = await apiRequest("/api/admin/organisations")
      const data = res.data
      if (res.ok && data?.success && Array.isArray(data.data)) {
        setOrganisations(data.data)
      } else {
        setOrganisations([])
        if (data?.message) {
          setFetchError(data.message)
        }
      }
    } catch {
      setOrganisations([])
      setFetchError("Unable to load organisations. Please check your connection.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrganisations()
  }, [])

  // Filtered by Search
  const filteredOrganisations = useMemo(() => {
    if (!search.trim()) return organisations
    const q = search.trim().toLowerCase()
    return organisations.filter((org) => {
      const nameMatch = (org.name || "").toLowerCase().includes(q)
      const codeMatch = (org.organisationCode || org.code || "").toLowerCase().includes(q)
      const idMatch = (org.organisationId || "").toLowerCase().includes(q)
      const hrMatch = (org.hrName || "").toLowerCase().includes(q) || (org.hrEmail || "").toLowerCase().includes(q)
      return nameMatch || codeMatch || idMatch || hrMatch
    })
  }, [organisations, search])

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  return (
    <div className="h-full flex flex-col relative">
      {/* Success Toast */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-gray-900 text-white text-xs font-medium px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-fade-down">
          <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Table with functional Search & Add button */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col h-full overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/30">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Organisations</h1>
            <p className="text-sm text-gray-500 mt-1">Manage workspaces and corporate clients.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-core/20 focus:border-purple-core w-full sm:w-64"
              />
            </div>
            <button
              onClick={() => setIsAddOpen(true)}
              className="bg-purple-core hover:bg-purple-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-sm whitespace-nowrap"
            >
              Add Organisation
            </button>
          </div>
        </div>

        <div className="overflow-x-auto flex-1">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase sticky top-0 border-b border-gray-100">
              <tr>
                {["Organisation", "Code", "HR Admin", "Employees", "Status", "Created", "Actions"].map((c) => (
                  <th key={c} className="px-6 py-3.5 font-medium tracking-wider">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500 text-sm">
                    <div className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4 animate-spin text-purple-core" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      <span>Loading organisations...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredOrganisations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500 text-sm">
                    {fetchError ? (
                      <div className="text-red-600 space-y-2">
                        <p className="font-semibold">{fetchError}</p>
                        {fetchError.includes("Token") && (
                          <p className="text-xs text-gray-500">Please logout and log in again to refresh your session.</p>
                        )}
                      </div>
                    ) : (
                      "No organisations found."
                    )}
                  </td>
                </tr>
              ) : (
                filteredOrganisations.map((org) => (
                  <tr key={org._id || org.organisationId} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900">{org.name}</p>
                      <p className="font-mono text-xs text-gray-400 mt-0.5">{org.organisationId}</p>
                    </td>
                    <td className="px-6 py-4 font-mono text-gray-600 text-xs font-semibold">{org.organisationCode || org.code}</td>
                    <td className="px-6 py-4 text-gray-700">
                      <p className="font-medium text-gray-900">{org.hrName}</p>
                      {org.hrEmail && <p className="text-xs text-gray-400">{org.hrEmail}</p>}
                    </td>
                    <td className="px-6 py-4 text-gray-700 font-medium">{org.employees ?? org.employeeCount ?? 0}</td>
                    <td className="px-6 py-4"><StatusBadge status={org.status} /></td>
                    <td className="px-6 py-4 text-gray-500 text-xs">{new Date(org.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setManagingOrg(org)}
                        className="text-purple-600 hover:text-purple-800 font-medium text-xs bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-md transition-colors"
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Organisation Modal */}
      <AddOrganisationModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onCreated={(newOrg) => {
          setIsAddOpen(false)
          setCreatedData(newOrg)
          showToast("Organisation created successfully.")
          fetchOrganisations()
        }}
      />

      {/* Success Modal */}
      <SuccessModal
        createdData={createdData}
        onClose={() => setCreatedData(null)}
      />

      {/* Manage Organisation Modal */}
      <ManageOrganisationModal
        org={managingOrg}
        isOpen={!!managingOrg}
        onClose={() => setManagingOrg(null)}
        onUpdated={() => {
          showToast("Organisation updated successfully.")
          fetchOrganisations()
        }}
        onDeleted={() => {
          setManagingOrg(null)
          showToast("Organisation deleted successfully.")
          fetchOrganisations()
        }}
      />
    </div>
  )
}

// ── Other Founder Screens ──────────────────────────────────────────────────────

const HR_ADMINS = [
  { id: "1", name: "Mrunal Kulkarni", email: "mrunal@meridian.com", org: "Meridian Group", status: "Active", date: "12 May 2025", lastLogin: "2 hours ago" },
  { id: "2", name: "Sarah Jenkins", email: "s.jenkins@nexus.com", org: "Nexus Corp", status: "Active", date: "04 Jun 2025", lastLogin: "1 day ago" },
]

interface DashboardStats {
  totalOrganisations: number
  totalEmployees: number
  assessmentsCompleted: number
  activeOrganisations: number
}

function DashboardScreen() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [statsError, setStatsError] = useState<string | null>(null)
  const [recentOrgs, setRecentOrgs] = useState<OrganisationItem[]>([])
  const [orgsLoading, setOrgsLoading] = useState(true)
  const [recentLogs, setRecentLogs] = useState<any[]>([])
  const [logsLoading, setLogsLoading] = useState(true)

  const fetchDashboardData = () => {
    setStatsLoading(true)
    setStatsError(null)

    // 1. Fetch real aggregated dashboard KPI statistics
    apiRequest("/api/admin/dashboard/stats")
      .then((res) => {
        const data = res.data
        if (res.ok && data?.success && data.stats) {
          setStats(data.stats)
        } else {
          setStatsError(data?.message || "Unable to load dashboard statistics.")
        }
      })
      .catch(() => {
        setStatsError("Unable to load dashboard statistics. Please check your connection.")
      })
      .finally(() => {
        setStatsLoading(false)
      })

    // 2. Fetch real organisations overview
    setOrgsLoading(true)
    apiRequest("/api/admin/organisations")
      .then((res) => {
        const data = res.data
        if (res.ok && data?.success && Array.isArray(data.data)) {
          setRecentOrgs(data.data.slice(0, 5))
        }
      })
      .catch(() => {})
      .finally(() => {
        setOrgsLoading(false)
      })

    // 3. Fetch real recent activity logs
    setLogsLoading(true)
    apiRequest("/api/admin/activity-logs?limit=5")
      .then((res) => {
        const data = res.data
        if (res.ok && data?.success && Array.isArray(data.logs)) {
          setRecentLogs(data.logs)
        }
      })
      .catch(() => {})
      .finally(() => {
        setLogsLoading(false)
      })
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const kpis = [
    { label: "Total Organisations", value: stats?.totalOrganisations },
    { label: "Total Employees", value: stats?.totalEmployees },
    { label: "Assessments Completed", value: stats?.assessmentsCompleted },
    { label: "Active Organisations", value: stats?.activeOrganisations },
  ]

  return (
    <div className="space-y-6">
      {/* Error Banner with Retry */}
      {statsError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-3 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{statsError}</span>
          </div>
          <button
            onClick={fetchDashboardData}
            className="text-red-700 underline font-semibold hover:text-red-800 cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col justify-between">
            <p className="text-sm font-medium text-gray-500 mb-1">{kpi.label}</p>
            {statsLoading ? (
              <div className="my-2">
                <div className="h-8 w-16 bg-gray-200 animate-pulse rounded"></div>
              </div>
            ) : (
              <p className="text-3xl font-bold text-gray-900 mb-2">
                {kpi.value !== undefined && kpi.value !== null ? kpi.value.toLocaleString() : "0"}
              </p>
            )}
            <p className="text-xs text-purple-600 font-medium">Live data</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Organisation Overview */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h2 className="font-semibold text-gray-900">Organisation Overview</h2>
            <button onClick={() => navigate("/founder/organisations")} className="text-sm text-purple-600 font-medium hover:text-purple-700 cursor-pointer">View All</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-5 py-3 font-medium">Organisation</th>
                  <th className="px-5 py-3 font-medium">Employees</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orgsLoading ? (
                  <tr>
                    <td colSpan={3} className="px-5 py-6 text-center text-xs text-gray-400">Loading organisations...</td>
                  </tr>
                ) : recentOrgs.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-5 py-6 text-center text-xs text-gray-400">No organisations found.</td>
                  </tr>
                ) : (
                  recentOrgs.map((org) => (
                    <tr key={org._id} className="hover:bg-gray-50/50">
                      <td className="px-5 py-3 font-medium text-gray-900">{org.name}</td>
                      <td className="px-5 py-3 text-gray-600">{org.employees ?? org.employeeCount ?? 0}</td>
                      <td className="px-5 py-3"><StatusBadge status={org.status} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h2 className="font-semibold text-gray-900">Recent Activity</h2>
            <button onClick={() => navigate("/founder/activity-logs")} className="text-sm text-purple-600 font-medium hover:text-purple-700 cursor-pointer">View All</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-5 py-3 font-medium">User</th>
                  <th className="px-5 py-3 font-medium">Action</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logsLoading ? (
                  <tr>
                    <td colSpan={3} className="px-5 py-6 text-center text-xs text-gray-400">Loading activities...</td>
                  </tr>
                ) : recentLogs.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-5 py-6 text-center text-xs text-gray-400">No recent activity.</td>
                  </tr>
                ) : (
                  recentLogs.map((log) => (
                    <tr key={log._id} className="hover:bg-gray-50/50">
                      <td className="px-5 py-3 font-medium text-gray-900">{log.userName || "System"}</td>
                      <td className="px-5 py-3 text-gray-600">{log.action}</td>
                      <td className="px-5 py-3 text-gray-500 text-xs">
                        {log.timestamp ? new Date(log.timestamp).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── HR Admin Modals ─────────────────────────────────────────────────────────

function InviteHRModal({
  isOpen,
  onClose,
  organisations,
  onInvited,
}: {
  isOpen: boolean
  onClose: () => void
  organisations: OrganisationItem[]
  onInvited: () => void
}) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [organisationId, setOrganisationId] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setName("")
      setEmail("")
      setError(null)
      if (organisations.length > 0 && !organisationId) {
        setOrganisationId(organisations[0].organisationId || organisations[0]._id)
      }
    }
  }, [isOpen, organisations])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim() || !email.trim() || !organisationId) {
      setError("Please fill in all required fields.")
      return
    }

    const emailRegex = /^\S+@\S+\.\S+$/
    if (!emailRegex.test(email.trim())) {
      setError("Please enter a valid email address.")
      return
    }

    setLoading(true)

    try {
      const res = await apiRequest("/api/admin/hr-admins/invite", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          organisationId,
        }),
      })

      const data = res.data

      if (res.ok && data?.success) {
        onInvited()
        onClose()
      } else {
        setError(data?.message || "Unable to send invitation.")
      }
    } catch {
      setError("Unable to send invitation. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100 flex flex-col">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Invite HR Administrator</h2>
            <p className="text-xs text-gray-500 mt-0.5">Send an invitation email to set up an HR account.</p>
          </div>
          <button onClick={onClose} disabled={loading} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-3 rounded-lg flex items-start gap-2">
              <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Organisation *</label>
            <select
              value={organisationId}
              onChange={(e) => setOrganisationId(e.target.value)}
              disabled={loading}
              className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-core/20 focus:border-purple-core bg-white"
            >
              {organisations.map((org) => (
                <option key={org._id} value={org.organisationId || org._id}>
                  {org.name} ({org.organisationCode})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Full Name *</label>
            <input
              type="text"
              placeholder="e.g. Rachel Adams"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-core/20 focus:border-purple-core"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email Address *</label>
            <input
              type="email"
              placeholder="e.g. rachel@meridian.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-core/20 focus:border-purple-core"
            />
            <p className="text-[11px] text-gray-400 mt-1">An invitation link will be emailed to activate their account and set their password.</p>
          </div>

          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-purple-core hover:bg-purple-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
            >
              {loading && (
                <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              )}
              <span>{loading ? "Sending..." : "Send Invitation"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function EditHRModal({
  hr,
  isOpen,
  onClose,
  onUpdated,
}: {
  hr: any | null
  isOpen: boolean
  onClose: () => void
  onUpdated: () => void
}) {
  const [name, setName] = useState("")
  const [status, setStatus] = useState("Active")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (hr) {
      setName(hr.name || "")
      setStatus(hr.status === "Inactive" ? "Inactive" : "Active")
      setError(null)
    }
  }, [hr])

  if (!isOpen || !hr) return null

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError("Name is required.")
      return
    }

    setLoading(true)

    try {
      const res = await apiRequest(`/api/admin/hr-admins/${hr.id || hr._id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: name.trim(), status }),
      })

      const data = res.data

      if (res.ok && data?.success) {
        onUpdated()
        onClose()
      } else {
        setError(data?.message || "Failed to update HR administrator.")
      }
    } catch {
      setError("Unable to update. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100 flex flex-col">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Edit HR Administrator</h2>
            <p className="text-xs text-gray-500 mt-0.5">{hr.email}</p>
          </div>
          <button onClick={onClose} disabled={loading} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-3 rounded-lg flex items-start gap-2">
              <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Organisation</label>
            <p className="text-sm font-semibold text-gray-900 bg-gray-50 border border-gray-200 rounded-lg px-3.5 py-2.5">
              {hr.organisationName || hr.org} ({hr.organisationCode || "N/A"})
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-core/20 focus:border-purple-core"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Account Status *</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              disabled={loading}
              className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-core/20 focus:border-purple-core bg-white"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive (Deactivated)</option>
            </select>
          </div>

          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-purple-core hover:bg-purple-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Listeners Screen & Invite Modal ──────────────────────────────────────────

interface ListenerRow {
  _id: string
  id: string
  name: string
  email: string
  listenerId: string
  status: "Active" | "Inactive" | "Invitation Pending" | "Pending" | "Expired" | "Revoked"
  createdAt?: string
  invitedAt?: string
  acceptedAt?: string
  lastLoginAt?: string
  expiresAt?: string
  invitationId?: string
  isInvitation?: boolean
}

function InviteListenerModal({
  isOpen,
  onClose,
  onInvited,
}: {
  isOpen: boolean
  onClose: () => void
  onInvited: () => void
}) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setName("")
      setEmail("")
      setError(null)
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim() || !email.trim()) {
      setError("Please fill in both name and email.")
      return
    }

    const emailRegex = /^\S+@\S+\.\S+$/
    if (!emailRegex.test(email.trim())) {
      setError("Please enter a valid email address.")
      return
    }

    setLoading(true)

    try {
      const res = await apiRequest("/api/admin/listeners/invite", {
        method: "POST",
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
        }),
      })

      const data = res.data

      if (res.ok && data?.success) {
        onInvited()
        onClose()
      } else {
        setError(data?.message || "Failed to send listener invitation.")
      }
    } catch {
      setError("Unable to connect to server. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100 flex flex-col">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Invite Listener</h2>
            <p className="text-xs text-gray-500 mt-0.5">Invite a trained peer-support listener to join CortiQuant.</p>
          </div>
          <button onClick={onClose} disabled={loading} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 cursor-pointer">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-3 rounded-lg flex items-start gap-2">
              <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Listener Name *</label>
            <input
              type="text"
              placeholder="e.g. Jordan Miller"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-core/20 focus:border-purple-core"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Listener Email *</label>
            <input
              type="email"
              placeholder="e.g. jordan@cortiquant.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-core/20 focus:border-purple-core"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              An invitation email will be sent. The listener will create their password after accepting.
            </p>
          </div>

          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-purple-core hover:bg-purple-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Sending Invitation...
                </>
              ) : (
                "Send Invitation"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function DeleteListenerModal({
  isOpen,
  listener,
  onClose,
  onDeleted,
}: {
  isOpen: boolean
  listener: ListenerRow | null
  onClose: () => void
  onDeleted: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      setError(null)
      setLoading(false)
    }
  }, [isOpen])

  if (!isOpen || !listener) return null

  const handleDelete = async () => {
    setError(null)
    setLoading(true)

    try {
      const targetId = listener._id || listener.id || listener.invitationId
      const res = await apiRequest(`/api/admin/listeners/${targetId}`, {
        method: "DELETE",
      })

      const data = res.data

      if (res.ok && data?.success) {
        onDeleted()
        onClose()
      } else {
        setError(data?.message || "Failed to delete listener. Please try again.")
      }
    } catch {
      setError("Network error while deleting listener. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100 flex flex-col">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-red-50 border border-red-200 text-red-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-gray-900">Delete Listener?</h2>
          </div>
          <button onClick={onClose} disabled={loading} className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 cursor-pointer">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-3 rounded-lg flex items-start gap-2">
              <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span>{error}</span>
            </div>
          )}

          <p className="text-sm text-gray-700 leading-relaxed">
            Are you sure you want to permanently delete <strong className="text-gray-900">{listener.name}</strong>?
          </p>

          <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500 font-medium">Listener Name:</span>
              <span className="font-semibold text-gray-900">{listener.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 font-medium">Listener ID:</span>
              <span className="font-mono text-purple-700 font-medium">{listener.listenerId || "Pending Setup"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500 font-medium">Email:</span>
              <span className="text-gray-800 truncate max-w-[200px]" title={listener.email}>{listener.email}</span>
            </div>
          </div>

          <div className="p-3 bg-red-50/60 border border-red-100 rounded-xl text-xs text-red-700 leading-relaxed flex items-start gap-2">
            <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>
              This action cannot be undone. The listener account and its invitation/access record will be permanently removed.
            </span>
          </div>

          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Deleting...
                </>
              ) : (
                "Delete Listener"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ListenersScreen() {
  const [listeners, setListeners] = useState<ListenerRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [selectedListenerForDelete, setSelectedListenerForDelete] = useState<ListenerRow | null>(null)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const fetchListeners = async () => {
    setLoading(true)
    try {
      const res = await apiRequest("/api/admin/listeners")
      if (res.ok && res.data?.success) {
        setListeners(res.data.listeners || [])
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchListeners()
  }, [])

  const filteredListeners = useMemo(() => {
    if (!search.trim()) return listeners
    const q = search.toLowerCase()
    return listeners.filter(
      (l) =>
        (l.name && l.name.toLowerCase().includes(q)) ||
        (l.email && l.email.toLowerCase().includes(q)) ||
        (l.listenerId && l.listenerId.toLowerCase().includes(q)) ||
        (l.status && l.status.toLowerCase().includes(q))
    )
  }, [listeners, search])

  const handleToggleStatus = async (item: ListenerRow) => {
    const newStatus = item.status === "Active" ? "Inactive" : "Active"
    setActionLoadingId(item._id || item.id)
    setActionMessage(null)

    try {
      const res = await apiRequest(`/api/admin/listeners/${item._id || item.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: newStatus }),
      })

      if (res.ok && res.data?.success) {
        setActionMessage({ type: "success", text: `Listener status updated to ${newStatus}.` })
        fetchListeners()
      } else {
        setActionMessage({ type: "error", text: res.data?.message || "Failed to update listener status." })
      }
    } catch {
      setActionMessage({ type: "error", text: "Network error updating listener status." })
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleResendInvite = async (item: ListenerRow) => {
    const inviteId = item.invitationId || item._id
    if (!inviteId) return

    setActionLoadingId(item._id || item.id)
    setActionMessage(null)

    try {
      const res = await apiRequest(`/api/admin/listeners/invitations/${inviteId}/resend`, {
        method: "POST",
      })

      if (res.ok && res.data?.success) {
        setActionMessage({ type: "success", text: `Invitation re-sent successfully to ${item.email}.` })
        fetchListeners()
      } else {
        setActionMessage({ type: "error", text: res.data?.message || "Failed to re-send invitation." })
      }
    } catch {
      setActionMessage({ type: "error", text: "Network error re-sending invitation." })
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleRevokeInvite = async (item: ListenerRow) => {
    const inviteId = item.invitationId || item._id
    if (!inviteId) return

    if (!window.confirm(`Revoke invitation for ${item.name} (${item.email})?`)) {
      return
    }

    setActionLoadingId(item._id || item.id)
    setActionMessage(null)

    try {
      const res = await apiRequest(`/api/admin/listeners/invitations/${inviteId}/revoke`, {
        method: "POST",
      })

      if (res.ok && res.data?.success) {
        setActionMessage({ type: "success", text: `Invitation for ${item.email} revoked.` })
        fetchListeners()
      } else {
        setActionMessage({ type: "error", text: res.data?.message || "Failed to revoke invitation." })
      }
    } catch {
      setActionMessage({ type: "error", text: "Network error revoking invitation." })
    } finally {
      setActionLoadingId(null)
    }
  }

  // Consistent 6-column CSS grid definition
  const gridTemplate = "minmax(220px, 1.5fr) 120px minmax(250px, 2fr) 110px 130px 170px"

  const formatDate = (dateString?: string) => {
    if (!dateString) return null
    try {
      const d = new Date(dateString)
      if (isNaN(d.getTime())) return null
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    } catch {
      return null
    }
  }

  return (
    <div className="space-y-6">
      {actionMessage && (
        <div
          className={`px-4 py-3 rounded-xl text-xs font-medium flex items-center justify-between border animate-fade-in ${
            actionMessage.type === "success"
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          <span>{actionMessage.text}</span>
          <button onClick={() => setActionMessage(null)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
            &times;
          </button>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col h-full overflow-hidden">
        {/* Header section with Title, Description, Search, and + Invite Listener button */}
        <div className="px-6 py-5 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gray-50/30">
          <div>
            <h1 className="text-lg font-bold text-gray-900">Peer Support Listeners</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage trained listener accounts, send new invitations, and monitor peer support availability.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative">
              <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search listeners by name, email, ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-core/20 focus:border-purple-core w-full sm:w-72"
              />
            </div>
            <button
              onClick={() => setInviteModalOpen(true)}
              className="bg-purple-core hover:bg-purple-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-sm whitespace-nowrap cursor-pointer flex items-center justify-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Invite Listener
            </button>
          </div>
        </div>

        {/* Responsive Table Area using explicit CSS Grid for absolute alignment */}
        <div className="overflow-x-auto flex-1">
          <div className="min-w-[970px]">
            {/* Header Row */}
            <div
              className="grid items-center px-6 py-3.5 bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wider border-b border-gray-100 gap-4"
              style={{ gridTemplateColumns: gridTemplate }}
            >
              <div>Listener</div>
              <div>Listener ID</div>
              <div>Email</div>
              <div>Status</div>
              <div>Joined / Invited</div>
              <div className="text-right">Action</div>
            </div>

            {/* Table Body */}
            {loading ? (
              <div className="p-12 text-center text-gray-500 text-sm flex flex-col items-center justify-center gap-3">
                <svg className="w-6 h-6 animate-spin text-purple-core" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Loading listeners...</span>
              </div>
            ) : filteredListeners.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center mb-3">
                  <IconListeners active />
                </div>
                <h3 className="text-base font-semibold text-gray-900 mb-1">No listeners yet</h3>
                <p className="text-xs text-gray-500 max-w-sm mb-4">
                  {search.trim() ? "No listeners matching your search query." : "Invite your first peer-support listener to get started."}
                </p>
                {!search.trim() && (
                  <button
                    onClick={() => setInviteModalOpen(true)}
                    className="bg-purple-core hover:bg-purple-700 text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors shadow-sm cursor-pointer inline-flex items-center gap-1.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Invite Listener
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredListeners.map((l) => {
                  const isPending = l.status === "Invitation Pending" || l.status === "Pending"
                  const isRowLoading = actionLoadingId === (l._id || l.id)

                  // Joined / Invited meaningful dates
                  const joinedDate = formatDate(l.acceptedAt || l.createdAt)
                  const invitedDate = formatDate(l.invitedAt || l.createdAt)

                  // Normalized status for badge
                  const badgeStatus = isPending ? "Pending" : l.status

                  return (
                    <div
                      key={l._id || l.id}
                      className="grid items-center px-6 py-4 hover:bg-gray-50/70 transition-colors gap-4 text-sm"
                      style={{ gridTemplateColumns: gridTemplate }}
                    >
                      {/* 1. Listener column: [Avatar] Listener Name ONLY (clean, no duplicate ID) */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-700 font-semibold text-xs flex-shrink-0">
                          {(l.name ? l.name.slice(0, 2) : "LS").toUpperCase()}
                        </div>
                        <span className="font-semibold text-gray-900 truncate" title={l.name}>
                          {l.name}
                        </span>
                      </div>

                      {/* 2. Listener ID column: Dedicated fixed width */}
                      <div className="font-mono text-xs text-gray-700 font-medium truncate">
                        {l.listenerId || "—"}
                      </div>

                      {/* 3. Email column: Truncated with ellipsis and hover title */}
                      <div className="min-w-0">
                        <span
                          className="text-xs text-gray-600 block truncate"
                          title={l.email}
                        >
                          {l.email}
                        </span>
                      </div>

                      {/* 4. Status column: Compact badge */}
                      <div className="flex items-center">
                        <StatusBadge status={badgeStatus} />
                      </div>

                      {/* 5. Joined / Invited column: Meaningful date */}
                      <div className="text-xs text-gray-600 flex flex-col justify-center">
                        {isPending ? (
                          <>
                            <span className="text-[10px] uppercase font-semibold text-amber-600 tracking-wider">Invited</span>
                            <span className="text-gray-800">{invitedDate || "—"}</span>
                          </>
                        ) : l.status === "Active" ? (
                          <>
                            <span className="text-[10px] uppercase font-semibold text-green-600 tracking-wider">Joined</span>
                            <span className="text-gray-800">{joinedDate || invitedDate || "—"}</span>
                          </>
                        ) : (
                          <>
                            <span className="text-[10px] uppercase font-semibold text-gray-400 tracking-wider">Status</span>
                            <span className="text-gray-700">{joinedDate || invitedDate || "—"}</span>
                          </>
                        )}
                      </div>

                      {/* 6. Action column: Compact, non-overlapping buttons aligned right with Delete */}
                      <div className="flex items-center justify-end gap-1.5 text-right">
                        {isPending ? (
                          <>
                            <button
                              onClick={() => handleResendInvite(l)}
                              disabled={isRowLoading}
                              className="text-purple-600 hover:text-purple-800 px-2 py-1 rounded text-xs font-medium border border-purple-200 hover:bg-purple-50 transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
                              title="Resend invitation email"
                            >
                              Resend
                            </button>
                            <button
                              onClick={() => handleRevokeInvite(l)}
                              disabled={isRowLoading}
                              className="text-red-600 hover:text-red-800 px-2 py-1 rounded text-xs font-medium border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
                              title="Revoke invitation"
                            >
                              Revoke
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleToggleStatus(l)}
                            disabled={isRowLoading}
                            className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap ${
                              l.status === "Active"
                                ? "text-amber-700 border-amber-200 hover:bg-amber-50"
                                : "text-green-600 border-green-200 hover:bg-green-50"
                            }`}
                          >
                            {l.status === "Active" ? "Disable" : "Enable"}
                          </button>
                        )}

                        {/* Destructive Delete Button */}
                        <button
                          onClick={() => {
                            setSelectedListenerForDelete(l)
                            setDeleteModalOpen(true)
                          }}
                          disabled={isRowLoading}
                          className="text-red-600 hover:text-red-800 p-1 rounded border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-50 cursor-pointer flex items-center justify-center"
                          title={`Delete ${l.name}`}
                          aria-label={`Delete ${l.name}`}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <InviteListenerModal
        isOpen={inviteModalOpen}
        onClose={() => {
          setInviteModalOpen(false)
        }}
        onInvited={() => {
          setActionMessage({ type: "success", text: "Invitation sent successfully! The listener has been notified via email." })
          fetchListeners()
        }}
      />

      <DeleteListenerModal
        isOpen={deleteModalOpen}
        listener={selectedListenerForDelete}
        onClose={() => {
          setDeleteModalOpen(false)
          setSelectedListenerForDelete(null)
        }}
        onDeleted={() => {
          setActionMessage({ type: "success", text: "Listener deleted successfully." })
          fetchListeners()
        }}
      />
    </div>
  )
}

function HRAdminsScreen() {
  const [hrList, setHrList] = useState<any[]>([])
  const [organisations, setOrganisations] = useState<OrganisationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [editingHR, setEditingHR] = useState<any | null>(null)
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      const [hrRes, orgRes] = await Promise.all([
        apiRequest("/api/admin/hr-admins"),
        apiRequest("/api/admin/organisations"),
      ])

      const hrData = hrRes.data
      const orgData = orgRes.data

      if (hrRes.ok && hrData?.success && Array.isArray(hrData.hrAdmins)) {
        setHrList(hrData.hrAdmins)
      } else {
        setHrList([])
      }

      if (orgRes.ok && orgData?.success && Array.isArray(orgData.data)) {
        setOrganisations(orgData.data)
      }
    } catch {
      setHrList([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleResend = async (invitationId: string) => {
    setActionLoadingId(invitationId)
    try {
      const res = await apiRequest(`/api/admin/hr-admins/${invitationId}/resend`, { method: "POST" })
      if (res.ok && res.data?.success) {
        showToast("Invitation email resent successfully.")
        fetchData()
      } else {
        alert(res.data?.message || "Failed to resend invitation.")
      }
    } catch {
      alert("Failed to resend invitation.")
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleRevoke = async (invitationId: string) => {
    if (!window.confirm("Are you sure you want to revoke this invitation?")) return
    setActionLoadingId(invitationId)
    try {
      const res = await apiRequest(`/api/admin/hr-admins/${invitationId}/revoke`, { method: "POST" })
      if (res.ok && res.data?.success) {
        showToast("Invitation revoked.")
        fetchData()
      } else {
        alert(res.data?.message || "Failed to revoke invitation.")
      }
    } catch {
      alert("Failed to revoke invitation.")
    } finally {
      setActionLoadingId(null)
    }
  }

  const filteredData = useMemo(() => {
    if (!search.trim()) return hrList
    const q = search.toLowerCase()
    return hrList.filter((hr) => {
      const name = (hr.name || "").toLowerCase()
      const email = (hr.email || "").toLowerCase()
      const org = (hr.organisationName || hr.org || "").toLowerCase()
      const code = (hr.organisationCode || "").toLowerCase()
      return name.includes(q) || email.includes(q) || org.includes(q) || code.includes(q)
    })
  }, [hrList, search])

  return (
    <div className="h-full flex flex-col relative">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-6 right-6 z-50 bg-gray-900 text-white text-xs font-medium px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-fade-down">
          <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          <span>{toastMessage}</span>
        </div>
      )}

      <TablePage
        title="HR Administrators"
        desc="Manage active HR accounts and pending workspace invitations."
        columns={["Name", "Email", "Organisation", "Type / Status", "Last Login", "Actions"]}
        data={filteredData}
        loading={loading}
        emptyMessage="No HR administrators or invitations found."
        searchValue={search}
        onSearchChange={setSearch}
        onAdd="+ Invite HR"
        onAddClick={() => setIsInviteOpen(true)}
        renderRow={(hr: any) => (
          <>
            <td className="px-6 py-4">
              <p className="font-semibold text-gray-900">{hr.name}</p>
              {hr.organisationCode && (
                <span className="font-mono text-[11px] text-gray-400 block mt-0.5">{hr.organisationCode}</span>
              )}
            </td>
            <td className="px-6 py-4 text-gray-600 font-mono text-xs">{hr.email}</td>
            <td className="px-6 py-4">
              <span className="text-gray-900 font-medium block">{hr.organisationName || hr.org}</span>
            </td>
            <td className="px-6 py-4">
              <StatusBadge status={hr.status} />
            </td>
            <td className="px-6 py-4 text-gray-500 text-xs">
              {hr.type === "invitation" ? (
                <span className="text-amber-600 font-medium text-[11px]">Expires {new Date(hr.expiresAt).toLocaleDateString()}</span>
              ) : (
                hr.lastLogin || "Recent"
              )}
            </td>
            <td className="px-6 py-4 text-right">
              {hr.type === "invitation" ? (
                <div className="flex items-center justify-end gap-2.5">
                  {hr.status !== "Revoked" && (
                    <button
                      onClick={() => handleResend(hr.id)}
                      disabled={actionLoadingId === hr.id}
                      className="text-purple-600 hover:text-purple-800 font-semibold text-xs transition-colors disabled:opacity-50"
                    >
                      {actionLoadingId === hr.id ? "Resending..." : "Resend Invite"}
                    </button>
                  )}
                  {hr.status !== "Revoked" && (
                    <button
                      onClick={() => handleRevoke(hr.id)}
                      disabled={actionLoadingId === hr.id}
                      className="text-red-500 hover:text-red-700 font-medium text-xs transition-colors disabled:opacity-50"
                    >
                      Revoke
                    </button>
                  )}
                  {hr.status === "Revoked" && (
                    <span className="text-xs text-gray-400 italic">Revoked</span>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => setEditingHR(hr)}
                  className="text-purple-600 hover:text-purple-800 font-semibold text-xs px-2 py-1 rounded hover:bg-purple-50 transition-colors"
                >
                  Edit
                </button>
              )}
            </td>
          </>
        )}
      />

      {/* Invite HR Modal */}
      <InviteHRModal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        organisations={organisations}
        onInvited={() => {
          showToast("HR invitation sent successfully.")
          fetchData()
        }}
      />

      {/* Edit HR Modal */}
      <EditHRModal
        hr={editingHR}
        isOpen={!!editingHR}
        onClose={() => setEditingHR(null)}
        onUpdated={() => {
          showToast("HR administrator updated.")
          fetchData()
        }}
      />
    </div>
  )
}

// ── Employee Details Modal ───────────────────────────────────────────────────
interface EmployeeDetailData {
  _id: string
  employeeId: string
  name: string
  email: string
  organisation: {
    organisationId: string
    name: string
    organisationCode: string
  }
  department: {
    name: string
  }
  status: string
  onboarding: {
    status: string
    completedAt: string | null
  }
  latestAssessment: {
    msi: number | null
    moodScore: number | null
    psychometricScore: number | null
    physicalScore: number | null
    completedAt: string | null
  }
  archetype: {
    primary: string | null
    secondary: string | null
  } | null
  createdAt: string
  lastLogin: string
}

function EmployeeDetailsModal({
  employeeId,
  isOpen,
  onClose,
}: {
  employeeId: string | null
  isOpen: boolean
  onClose: () => void
}) {
  const [data, setData] = useState<EmployeeDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || !employeeId) {
      setData(null)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    apiRequest(`/api/admin/employees/${encodeURIComponent(employeeId)}`)
      .then((res) => {
        if (res.ok && res.data?.success && res.data.employee) {
          setData(res.data.employee)
        } else {
          setError(res.data?.message || "Unable to load employee details.")
        }
      })
      .catch(() => {
        setError("Unable to load employee details. Please check your network connection.")
      })
      .finally(() => {
        setLoading(false)
      })
  }, [isOpen, employeeId])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Employee Details</h2>
            <p className="font-mono text-xs text-purple-700 font-semibold mt-0.5">
              {data?.employeeId || employeeId}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-sm">
          {loading ? (
            <div className="py-12 text-center text-gray-500 text-sm flex items-center justify-center gap-2">
              <svg className="w-5 h-5 animate-spin text-purple-core" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span>Loading details...</span>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-3 rounded-xl flex items-center gap-2">
              <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          ) : data ? (
            <>
              {/* Profile Overview Card */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-gray-500 font-medium">Full Name</span>
                  <p className="font-semibold text-gray-900 mt-0.5">{data.name}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500 font-medium">Account Status</span>
                  <div className="mt-1">
                    <StatusBadge status={data.status} />
                  </div>
                </div>
                <div className="col-span-2">
                  <span className="text-xs text-gray-500 font-medium">Email Address</span>
                  <p className="font-medium text-gray-900 mt-0.5 truncate">{data.email}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500 font-medium">Department</span>
                  <p className="font-medium text-gray-900 mt-0.5">{data.department?.name || "Not assigned"}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500 font-medium">Joined Date</span>
                  <p className="font-medium text-gray-900 mt-0.5">
                    {data.createdAt ? new Date(data.createdAt).toLocaleDateString() : "—"}
                  </p>
                </div>
              </div>

              {/* Organisation Card */}
              <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100 space-y-2">
                <h4 className="text-xs uppercase tracking-wider font-semibold text-purple-700">Organisation</h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-gray-500">Name</span>
                    <p className="font-bold text-gray-900 mt-0.5">{data.organisation?.name || "—"}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Org ID</span>
                    <p className="font-mono font-semibold text-purple-700 mt-0.5">{data.organisation?.organisationId || "—"}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Org Code</span>
                    <p className="font-mono font-semibold text-gray-700 mt-0.5">{data.organisation?.organisationCode || "—"}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Last Login</span>
                    <p className="font-medium text-gray-700 mt-0.5">{data.lastLogin || "Never"}</p>
                  </div>
                </div>
              </div>

              {/* Corporate Onboarding & Baseline Assessment */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs uppercase tracking-wider font-semibold text-gray-500">Corporate Onboarding</h4>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                    data.onboarding?.status === "Complete"
                      ? "bg-green-100 text-green-700"
                      : data.onboarding?.status === "Pending"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-gray-100 text-gray-600"
                  }`}>
                    {data.onboarding?.status || "Not Started"}
                  </span>
                </div>

                {data.onboarding?.completedAt && (
                  <p className="text-xs text-gray-500">
                    Completed on {new Date(data.onboarding.completedAt).toLocaleDateString()}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200/60 text-xs">
                  <div>
                    <span className="text-gray-500">Latest MSI Score</span>
                    <p className="text-base font-bold text-gray-900 mt-0.5 font-mono">
                      {data.latestAssessment?.msi !== null && data.latestAssessment?.msi !== undefined
                        ? `${Math.round(data.latestAssessment.msi)} / 100`
                        : "No assessments yet"}
                    </p>
                  </div>
                  <div>
                    <span className="text-gray-500">Assigned Archetype</span>
                    <p className="font-semibold text-purple-800 mt-0.5">
                      {data.archetype?.primary || "Pending completion"}
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

function EmployeesScreen() {
  const [employees, setEmployees] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [selectedEmpId, setSelectedEmpId] = useState<string | null>(null)

  const fetchEmployees = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiRequest("/api/admin/employees")
      const data = res.data
      if (res.ok && data?.success && Array.isArray(data.employees)) {
        setEmployees(data.employees)
      } else {
        setEmployees([])
        setError(data?.message || "Unable to load employees. Please try again.")
      }
    } catch {
      setEmployees([])
      setError("Unable to load employees. Please check your network connection.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEmployees()
  }, [])

  // Functional search filtering
  const filteredEmployees = useMemo(() => {
    if (!search.trim()) return employees
    const q = search.trim().toLowerCase()
    return employees.filter((emp) => {
      const name = (emp.name || "").toLowerCase()
      const email = (emp.email || "").toLowerCase()
      const empId = (emp.employeeId || "").toLowerCase()
      const orgName = (emp.organisationName || "").toLowerCase()
      const orgCode = (emp.organisationCode || "").toLowerCase()
      const dept = (emp.department || "").toLowerCase()
      return (
        name.includes(q) ||
        email.includes(q) ||
        empId.includes(q) ||
        orgName.includes(q) ||
        orgCode.includes(q) ||
        dept.includes(q)
      )
    })
  }, [employees, search])

  return (
    <>
      <TablePage
        title="Employees"
        desc="Global view of all employees across organisations. Approval is managed by HR."
        columns={["Employee", "Email", "Organisation", "Department", "Status", "Onboarding", ""]}
        data={filteredEmployees}
        searchValue={search}
        onSearchChange={setSearch}
        loading={loading}
        emptyMessage={
          error ? (
            <div className="space-y-2">
              <p className="text-red-600 font-medium text-xs">{error}</p>
              <button
                onClick={fetchEmployees}
                className="text-xs text-purple-700 hover:text-purple-800 font-semibold underline"
              >
                Retry
              </button>
            </div>
          ) : (
            "No employees found."
          )
        }
        renderRow={(emp: any) => (
          <>
            <td className="px-6 py-4">
              <p className="font-semibold text-gray-900">{emp.name}</p>
              <p className="font-mono text-xs text-gray-400 mt-0.5">{emp.employeeId}</p>
            </td>
            <td className="px-6 py-4 text-gray-600">{emp.email}</td>
            <td className="px-6 py-4 text-gray-900">
              <p className="font-medium">{emp.organisationName}</p>
              {emp.organisationCode && (
                <p className="font-mono text-[11px] text-gray-400">{emp.organisationCode}</p>
              )}
            </td>
            <td className="px-6 py-4 text-gray-600">{emp.department}</td>
            <td className="px-6 py-4">
              <StatusBadge status={emp.status} />
            </td>
            <td className="px-6 py-4">
              <span
                className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  emp.onboardingStatus === "Complete"
                    ? "bg-green-50 text-green-700"
                    : emp.onboardingStatus === "Pending"
                    ? "bg-amber-50 text-amber-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {emp.onboardingStatus}
              </span>
            </td>
            <td className="px-6 py-4 text-right">
              <button
                type="button"
                onClick={() => setSelectedEmpId(emp.employeeId || emp._id)}
                className="text-purple-600 hover:text-purple-800 font-medium text-xs bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-md transition-colors cursor-pointer"
              >
                View
              </button>
            </td>
          </>
        )}
      />

      {/* Employee Details Modal */}
      <EmployeeDetailsModal
        employeeId={selectedEmpId}
        isOpen={!!selectedEmpId}
        onClose={() => setSelectedEmpId(null)}
      />
    </>
  )
}

// ── Assessment Details Modal ──────────────────────────────────────────────────
interface AssessmentDetailData {
  id: string
  recordId: string
  employee: {
    employeeId: string
    name: string
    email: string
  }
  organisation: {
    organisationId: string
    name: string
    organisationCode: string
  }
  type: string
  score: number | null
  scoreDisplay: string
  status: string
  completedAt: string | null
  createdAt: string
  updatedAt?: string
  archetype?: {
    primary: string
    secondary: string | null
  } | null
  scores?: {
    msi: number
    moodScore: number
    psychometricScore: number
    physicalScore: number
  } | null
}

function AssessmentDetailsModal({
  assessmentId,
  isOpen,
  onClose,
}: {
  assessmentId: string | null
  isOpen: boolean
  onClose: () => void
}) {
  const [data, setData] = useState<AssessmentDetailData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen || !assessmentId) {
      setData(null)
      setError(null)
      return
    }

    setLoading(true)
    setError(null)

    apiRequest(`/api/admin/assessments/${encodeURIComponent(assessmentId)}`)
      .then((res) => {
        if (res.ok && res.data?.success && res.data.assessment) {
          setData(res.data.assessment)
        } else {
          setError(res.data?.message || "Unable to load assessment details.")
        }
      })
      .catch(() => {
        setError("Unable to load assessment details. Please check your network.")
      })
      .finally(() => {
        setLoading(false)
      })
  }, [isOpen, assessmentId])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Assessment Details</h2>
            <p className="font-mono text-xs text-purple-700 font-semibold mt-0.5">
              {data?.type || "Assessment"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-sm">
          {loading ? (
            <div className="py-12 text-center text-gray-500 text-sm flex items-center justify-center gap-2">
              <svg className="w-5 h-5 animate-spin text-purple-core" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span>Loading assessment details...</span>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-3 rounded-xl flex items-center gap-2">
              <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          ) : data ? (
            <>
              {/* Employee Summary Card */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-gray-500 font-medium">Employee Name</span>
                  <p className="font-semibold text-gray-900 mt-0.5">{data.employee.name}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500 font-medium">Employee ID</span>
                  <p className="font-mono text-xs font-semibold text-purple-700 mt-0.5">{data.employee.employeeId}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-xs text-gray-500 font-medium">Email Address</span>
                  <p className="font-medium text-gray-900 mt-0.5 truncate">{data.employee.email}</p>
                </div>
              </div>

              {/* Organisation Card */}
              <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100 space-y-2">
                <h4 className="text-xs uppercase tracking-wider font-semibold text-purple-700">Organisation</h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-gray-500">Name</span>
                    <p className="font-bold text-gray-900 mt-0.5">{data.organisation.name}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Org ID</span>
                    <p className="font-mono font-semibold text-purple-700 mt-0.5">{data.organisation.organisationId}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Org Code</span>
                    <p className="font-mono font-semibold text-gray-700 mt-0.5">{data.organisation.organisationCode}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Completed Date</span>
                    <p className="font-medium text-gray-700 mt-0.5">
                      {data.completedAt ? new Date(data.completedAt).toLocaleDateString() : "—"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Assessment Results Overview */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs uppercase tracking-wider font-semibold text-gray-500">
                    {data.type} Result
                  </h4>
                  <StatusBadge status={data.status} />
                </div>

                {data.type === "Archetype" ? (
                  <div className="space-y-2 pt-1 text-xs">
                    <div>
                      <span className="text-gray-500">Primary Archetype</span>
                      <p className="text-base font-bold text-purple-800 mt-0.5">
                        {data.archetype?.primary || "N/A"}
                      </p>
                    </div>
                    {data.archetype?.secondary && (
                      <div>
                        <span className="text-gray-500">Secondary Archetype</span>
                        <p className="font-medium text-gray-700 mt-0.5">
                          {data.archetype.secondary}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3 pt-1 text-xs">
                    <div className="flex items-baseline justify-between border-b border-gray-200/60 pb-3">
                      <span className="text-gray-500 font-medium">Mental Stress Index (MSI)</span>
                      <span className="text-2xl font-bold font-mono text-gray-900">
                        {data.score !== null ? `${data.score} / 100` : "N/A"}
                      </span>
                    </div>

                    {data.scores && (
                      <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                        <div className="bg-white p-2.5 rounded-lg border border-gray-100">
                          <p className="text-[11px] text-gray-400">Mood</p>
                          <p className="font-bold text-gray-800 mt-0.5">{data.scores.moodScore} / 8</p>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-gray-100">
                          <p className="text-[11px] text-gray-400">Stress</p>
                          <p className="font-bold text-gray-800 mt-0.5">{data.scores.psychometricScore} / 24</p>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-gray-100">
                          <p className="text-[11px] text-gray-400">Physical</p>
                          <p className="font-bold text-gray-800 mt-0.5">{data.scores.physicalScore} / 4</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

function AssessmentsScreen() {
  const [assessments, setAssessments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null)

  const fetchAssessments = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiRequest("/api/admin/assessments")
      const data = res.data
      if (res.ok && data?.success && Array.isArray(data.assessments)) {
        setAssessments(data.assessments)
      } else {
        setAssessments([])
        setError(data?.message || "Unable to load assessments. Please try again.")
      }
    } catch {
      setAssessments([])
      setError("Unable to load assessments. Please check your network connection.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAssessments()
  }, [])

  // Functional search filtering
  const filteredAssessments = useMemo(() => {
    if (!search.trim()) return assessments
    const q = search.trim().toLowerCase()
    return assessments.filter((a) => {
      const name = (a.employeeName || "").toLowerCase()
      const email = (a.employeeEmail || "").toLowerCase()
      const empId = (a.employeeId || "").toLowerCase()
      const org = (a.organisationName || "").toLowerCase()
      const orgCode = (a.organisationCode || "").toLowerCase()
      const type = (a.type || "").toLowerCase()
      const status = (a.status || "").toLowerCase()
      return (
        name.includes(q) ||
        email.includes(q) ||
        empId.includes(q) ||
        org.includes(q) ||
        orgCode.includes(q) ||
        type.includes(q) ||
        status.includes(q)
      )
    })
  }, [assessments, search])

  return (
    <>
      <TablePage
        title="Assessments"
        desc="Global ledger of completed assessments across all organisations."
        columns={["Employee", "Organisation", "Type", "Score", "Date", "Status", ""]}
        data={filteredAssessments}
        searchValue={search}
        onSearchChange={setSearch}
        loading={loading}
        emptyMessage={
          error ? (
            <div className="space-y-2">
              <p className="text-red-600 font-medium text-xs">{error}</p>
              <button
                onClick={fetchAssessments}
                className="text-xs text-purple-700 hover:text-purple-800 font-semibold underline"
              >
                Retry
              </button>
            </div>
          ) : (
            "No assessments found."
          )
        }
        renderRow={(a: any) => (
          <>
            <td className="px-6 py-4">
              <p className="font-semibold text-gray-900">{a.employeeName}</p>
              <p className="font-mono text-xs text-gray-400 mt-0.5">{a.employeeId}</p>
            </td>
            <td className="px-6 py-4 text-gray-700">
              <p className="font-medium text-gray-900">{a.organisationName}</p>
              {a.organisationCode && (
                <p className="font-mono text-[11px] text-gray-400">{a.organisationCode}</p>
              )}
            </td>
            <td className="px-6 py-4 text-gray-900 font-medium">{a.type}</td>
            <td className="px-6 py-4 font-mono font-bold text-gray-800">
              {a.scoreDisplay ?? (a.score !== null ? a.score : "N/A")}
            </td>
            <td className="px-6 py-4 text-gray-500 text-xs">
              {a.date ? new Date(a.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
            </td>
            <td className="px-6 py-4">
              <StatusBadge status={a.status} />
            </td>
            <td className="px-6 py-4 text-right">
              <button
                type="button"
                onClick={() => setSelectedAssessmentId(a.id)}
                className="text-purple-600 hover:text-purple-800 font-medium text-xs bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-md transition-colors cursor-pointer"
              >
                View
              </button>
            </td>
          </>
        )}
      />

      {/* Assessment Details Modal */}
      <AssessmentDetailsModal
        assessmentId={selectedAssessmentId}
        isOpen={!!selectedAssessmentId}
        onClose={() => setSelectedAssessmentId(null)}
      />
    </>
  )
}

// ── Activity Log Details Modal ────────────────────────────────────────────────
interface ActivityLogItem {
  _id: string
  timestamp: string
  userName: string
  role: string
  organisationId: string | null
  organisationName: string | null
  action: string
  entityType?: string | null
  entityId?: string | null
  status: "Success" | "Failed"
  details: string | null
  ipAddress?: string | null
}

function LogDetailsModal({
  log,
  isOpen,
  onClose,
}: {
  log: ActivityLogItem | null
  isOpen: boolean
  onClose: () => void
}) {
  if (!isOpen || !log) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-gray-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Activity Log Details</h2>
            <p className="font-mono text-xs text-purple-700 font-semibold mt-0.5">
              {log.action}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1 text-sm">
          {/* Metadata Grid */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 grid grid-cols-2 gap-4">
            <div>
              <span className="text-xs text-gray-500 font-medium">User</span>
              <p className="font-semibold text-gray-900 mt-0.5">{log.userName}</p>
            </div>
            <div>
              <span className="text-xs text-gray-500 font-medium">Role</span>
              <p className="font-semibold text-purple-700 mt-0.5">{log.role}</p>
            </div>
            <div>
              <span className="text-xs text-gray-500 font-medium">Status</span>
              <div className="mt-1">
                <StatusBadge status={log.status} />
              </div>
            </div>
            <div>
              <span className="text-xs text-gray-500 font-medium">Date & Time</span>
              <p className="font-mono text-xs text-gray-700 mt-0.5">
                {new Date(log.timestamp).toLocaleString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>

          {/* Organisation info if available */}
          <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100 space-y-2">
            <h4 className="text-xs uppercase tracking-wider font-semibold text-purple-700">Organisation</h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-gray-500">Name</span>
                <p className="font-bold text-gray-900 mt-0.5">{log.organisationName || "—"}</p>
              </div>
              <div>
                <span className="text-gray-500">Org ID / Code</span>
                <p className="font-mono font-semibold text-purple-700 mt-0.5">{log.organisationId || "—"}</p>
              </div>
            </div>
          </div>

          {/* Action Details */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-2">
            <h4 className="text-xs uppercase tracking-wider font-semibold text-gray-500">Details</h4>
            <p className="text-gray-800 text-xs leading-relaxed">{log.details || "No additional details recorded."}</p>
            {log.ipAddress && (
              <div className="pt-2 border-t border-gray-200/60 flex items-center justify-between text-[11px] text-gray-400">
                <span>IP Address</span>
                <span className="font-mono">{log.ipAddress}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

function LogsScreen() {
  const [logs, setLogs] = useState<ActivityLogItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [selectedLog, setSelectedLog] = useState<ActivityLogItem | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchLogs = async (searchQuery = search, pageNum = page) => {
    setLoading(true)
    setError(null)
    try {
      const queryParams = new URLSearchParams()
      queryParams.set("page", String(pageNum))
      queryParams.set("limit", "25")
      if (searchQuery.trim()) {
        queryParams.set("search", searchQuery.trim())
      }

      const res = await apiRequest(`/api/admin/activity-logs?${queryParams.toString()}`)
      const data = res.data

      if (res.ok && data?.success && Array.isArray(data.logs)) {
        setLogs(data.logs)
        setTotalPages(data.pagination?.pages || 1)
      } else {
        setLogs([])
        setError(data?.message || "Unable to load activity logs. Please try again.")
      }
    } catch {
      setLogs([])
      setError("Unable to load activity logs. Please check your network connection.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs(search, page)
  }, [page])

  // Debounced search trigger to backend
  const handleSearchChange = (val: string) => {
    setSearch(val)
    setPage(1)
    fetchLogs(val, 1)
  }

  return (
    <>
      <TablePage
        title="Activity Logs"
        desc="System-wide audit trail of administrative, HR, and employee events."
        columns={["Date & Time", "User", "Role", "Organisation", "Action", "Status", ""]}
        data={logs}
        searchValue={search}
        onSearchChange={handleSearchChange}
        loading={loading}
        emptyMessage={
          error ? (
            <div className="space-y-2">
              <p className="text-red-600 font-medium text-xs">{error}</p>
              <button
                onClick={() => fetchLogs(search, page)}
                className="text-xs text-purple-700 hover:text-purple-800 font-semibold underline cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : (
            "No activity recorded yet."
          )
        }
        renderRow={(l: ActivityLogItem) => (
          <>
            <td className="px-6 py-4 font-mono text-xs text-gray-500">
              {l.timestamp ? (
                new Date(l.timestamp).toLocaleString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              ) : "—"}
            </td>
            <td className="px-6 py-4 font-semibold text-gray-900">{l.userName || "System"}</td>
            <td className="px-6 py-4 text-gray-600 text-xs font-medium">{l.role || "—"}</td>
            <td className="px-6 py-4 text-gray-700">
              <p className="font-medium text-gray-900">{l.organisationName || "—"}</p>
              {l.organisationId && (
                <p className="font-mono text-[11px] text-gray-400">{l.organisationId}</p>
              )}
            </td>
            <td className="px-6 py-4 text-gray-900">
              <p className="font-medium">{l.action}</p>
              {l.details && (
                <p className="text-xs text-gray-400 truncate max-w-xs">{l.details}</p>
              )}
            </td>
            <td className="px-6 py-4">
              <StatusBadge status={l.status} />
            </td>
            <td className="px-6 py-4 text-right">
              <button
                type="button"
                onClick={() => setSelectedLog(l)}
                className="text-purple-600 hover:text-purple-800 font-medium text-xs bg-purple-50 hover:bg-purple-100 px-3 py-1.5 rounded-md transition-colors cursor-pointer"
              >
                Details
              </button>
            </td>
          </>
        )}
      />

      {/* Pagination Bar if more than 1 page */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-3 bg-white border border-gray-200 border-t-0 rounded-b-xl text-xs text-gray-600">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1 border border-gray-200 rounded-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1 border border-gray-200 rounded-md disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Activity Log Details Modal */}
      <LogDetailsModal
        log={selectedLog}
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
      />
    </>
  )
}

// ── Change Password Modal ─────────────────────────────────────────────────────
function ChangePasswordModal({
  isOpen,
  onClose,
  onSuccess,
}: {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}) {
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("All fields are required.")
      return
    }

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters long.")
      return
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirm password do not match.")
      return
    }

    if (currentPassword === newPassword) {
      setError("New password must differ from current password.")
      return
    }

    setLoading(true)

    try {
      const res = await apiRequest("/api/admin/settings/password", {
        method: "PATCH",
        body: JSON.stringify({ currentPassword, newPassword }),
      })

      const data = res.data
      if (res.ok && data?.success) {
        setLoading(false)
        onSuccess()
        onClose()
      } else {
        setError(data?.message || "Failed to change password. Please verify current password.")
        setLoading(false)
      }
    } catch {
      setError("Unable to change password. Please check your connection.")
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100 flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Change Password</h2>
            <p className="text-xs text-gray-500 mt-0.5">Enter your current password and choose a secure new one.</p>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-3 rounded-lg flex items-start gap-2">
              <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Current Password *</label>
            <div className="relative">
              <input
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full border border-gray-200 rounded-lg pl-3 pr-14 py-2 text-sm focus:outline-none focus:border-purple-core focus:ring-2 focus:ring-purple-core/20 text-gray-900"
              />
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400 hover:text-gray-600"
              >
                {showCurrent ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">New Password *</label>
            <div className="relative">
              <input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters"
                required
                className="w-full border border-gray-200 rounded-lg pl-3 pr-14 py-2 text-sm focus:outline-none focus:border-purple-core focus:ring-2 focus:ring-purple-core/20 text-gray-900"
              />
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setShowNew(!showNew)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400 hover:text-gray-600"
              >
                {showNew ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Confirm New Password *</label>
            <div className="relative">
              <input
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                required
                className="w-full border border-gray-200 rounded-lg pl-3 pr-14 py-2 text-sm focus:outline-none focus:border-purple-core focus:ring-2 focus:ring-purple-core/20 text-gray-900"
              />
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400 hover:text-gray-600"
              >
                {showConfirm ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 rounded-lg border border-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-medium bg-purple-core hover:bg-purple-700 text-white rounded-lg shadow-sm disabled:opacity-50"
            >
              {loading ? "Updating..." : "Change Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function SettingsScreen() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState("Founder")
  const [initialName, setInitialName] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => {
      setToastMessage(null)
    }, 4000)
  }

  const fetchProfile = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await apiRequest("/api/admin/settings/profile")
      const data = res.data
      if (res.ok && data?.success && data.admin) {
        setName(data.admin.name || "")
        setInitialName(data.admin.name || "")
        setEmail(data.admin.email || "")
        setRole(data.admin.role || "Founder")
      } else {
        setError(data?.message || "Unable to load settings. Please try again.")
      }
    } catch {
      setError("Unable to load settings. Please check your connection.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProfile()
  }, [])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setSaving(true)
    setError(null)

    try {
      const res = await apiRequest("/api/admin/settings/profile", {
        method: "PATCH",
        body: JSON.stringify({ name: name.trim() }),
      })

      const data = res.data
      if (res.ok && data?.success && data.admin) {
        setName(data.admin.name)
        setInitialName(data.admin.name)
        localStorage.setItem("cq_user_name", data.admin.name)
        showToast("Profile updated successfully.")
      } else {
        setError(data?.message || "Unable to update profile. Please try again.")
      }
    } catch {
      setError("Unable to update profile. Please check your connection.")
    } finally {
      setSaving(false)
    }
  }

  const isNameChanged = name.trim() !== initialName.trim()

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-8 max-w-3xl relative">
      {/* Toast Banner */}
      {toastMessage && (
        <div className="mb-6 bg-green-50 border border-green-200 text-green-800 text-xs px-4 py-3 rounded-lg flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium">{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-green-600 hover:text-green-800">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      {/* Global Error Banner */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchProfile} className="text-red-700 underline font-semibold ml-2">Retry</button>
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <span className="px-2.5 py-1 bg-purple-50 text-purple-700 font-semibold text-xs rounded-full border border-purple-100">
          {role} Account
        </span>
      </div>

      {loading ? (
        <div className="py-12 flex items-center justify-center gap-2 text-sm text-gray-500">
          <svg className="w-5 h-5 animate-spin text-purple-core" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span>Loading settings...</span>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Profile Form */}
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <h2 className="text-sm font-semibold text-gray-900 border-b border-gray-100 pb-2">Admin Profile</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Admin Name"
                  required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-purple-core focus:ring-2 focus:ring-purple-core/20"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Email (Read-only)</label>
                <input
                  type="email"
                  value={email}
                  readOnly
                  disabled
                  className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-500 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={!isNameChanged || saving}
                className="bg-purple-core hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors shadow-sm cursor-pointer"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>

          {/* Security */}
          <div>
            <h2 className="text-sm font-semibold text-gray-900 mb-3 border-b border-gray-100 pb-2">Security</h2>
            <p className="text-xs text-gray-500 mb-3">Ensure your administrator account is using a strong password.</p>
            <button
              type="button"
              onClick={() => setPasswordModalOpen(true)}
              className="border border-gray-200 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              Change Password
            </button>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
        onSuccess={() => showToast("Password changed successfully.")}
      />
    </div>
  )
}

// ── Layout ────────────────────────────────────────────────────────────────────

export default function FounderApp() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  
  const currentPath = location.pathname.split('/').pop() || ""
  
  const navItems = [
    { id: "founder", path: "/founder", label: "Dashboard", icon: <IconHome active={currentPath === "founder" || currentPath === ""} /> },
    { id: "organisations", path: "/founder/organisations", label: "Organisations", icon: <IconOrg active={currentPath === "organisations"} /> },
    { id: "hr-admins", path: "/founder/hr-admins", label: "HR Admins", icon: <IconAdmins active={currentPath === "hr-admins"} /> },
    { id: "listeners", path: "/founder/listeners", label: "Listeners", icon: <IconListeners active={currentPath === "listeners"} /> },
    { id: "employees", path: "/founder/employees", label: "Employees", icon: <IconUsers active={currentPath === "employees"} /> },
    { id: "assessments", path: "/founder/assessments", label: "Assessments", icon: <IconAssessments active={currentPath === "assessments"} /> },
    { id: "activity-logs", path: "/founder/activity-logs", label: "Activity Logs", icon: <IconLogs active={currentPath === "activity-logs"} /> },
    { id: "settings", path: "/founder/settings", label: "Settings", icon: <IconSettings active={currentPath === "settings"} /> },
  ]

  const SidebarContent = () => (
    <>
      <div className="px-6 py-6 border-b border-gray-100 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-purple-core text-white flex items-center justify-center font-bold text-lg leading-none">C</div>
        <div>
          <p className="font-bold text-gray-900 leading-tight tracking-tight">CortiQuant</p>
          <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mt-0.5">Admin Platform</p>
        </div>
      </div>
      
      <div className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          const active = currentPath === item.id || (currentPath === "" && item.id === "founder")
          return (
            <button
              key={item.id}
              onClick={() => { navigate(item.path); setMobileMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active 
                  ? "bg-purple-50 text-purple-700" 
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          )
        })}
      </div>
      
      <div className="p-4 border-t border-gray-100">
        <button
          onClick={() => {
            localStorage.removeItem("cq_token")
            localStorage.removeItem("cq_role")
            localStorage.removeItem("cq_user_email")
            localStorage.removeItem("cq_user_name")
            navigate("/founder/login")
          }}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-50"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          Logout
        </button>
      </div>
    </>
  )

  return (
    <div className="flex w-full min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Mobile backdrop */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 transform lg:translate-x-0 lg:static ${mobileMenuOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"}`}>
        <SidebarContent />
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden h-screen">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 flex-shrink-0 z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileMenuOpen(true)} className="lg:hidden p-1.5 -ml-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <div className="hidden sm:block">
              <h2 className="text-sm font-semibold text-gray-900 capitalize">{currentPath === "" || currentPath === "founder" ? "Dashboard" : currentPath.replace("-", " ")}</h2>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center relative">
              <svg className="w-4 h-4 absolute left-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input type="text" placeholder="Global search..." className="pl-9 pr-4 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-core/20 focus:border-purple-core w-48 transition-all" />
            </div>
            
            <button onClick={() => alert("Notifications")} className="text-gray-400 hover:text-gray-600 transition-colors relative">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
            </button>
            
            <div title={localStorage.getItem("cq_user_email") || "Admin"} className="w-8 h-8 rounded-full bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700 text-xs font-bold cursor-pointer hover:bg-purple-200 transition-colors">
              {((localStorage.getItem("cq_user_name") || "SO").slice(0, 2)).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 w-full max-w-[1600px] mx-auto">
          <Routes>
            <Route path="/" element={<DashboardScreen />} />
            <Route path="organisations" element={<OrganisationsScreen />} />
            <Route path="hr-admins" element={<HRAdminsScreen />} />
            <Route path="listeners" element={<ListenersScreen />} />
            <Route path="employees" element={<EmployeesScreen />} />
            <Route path="assessments" element={<AssessmentsScreen />} />
            <Route path="activity-logs" element={<LogsScreen />} />
            <Route path="settings" element={<SettingsScreen />} />
            <Route path="*" element={<Navigate to="/founder" />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
