import { useState } from "react"
import { useNavigate } from "react-router-dom"
import logoSrc from "@/imports/image-2.png"

export default function ContactScreen() {
  const navigate = useNavigate()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  function handleCopy(text: string, key: string) {
    navigator.clipboard?.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // Open default mail client or display success message
    const mailtoUrl = `mailto:cortiqsupport@gmail.com?subject=${encodeURIComponent(
      subject || `Contact from ${name}`
    )}&body=${encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`)}`
    
    // We display confirmation and offer the direct email trigger
    setSubmitted(true)
    window.location.href = mailtoUrl
  }

  return (
    <div className="min-h-screen bg-midnight text-text-primary px-4 sm:px-6 py-10 flex justify-center selection:bg-purple-core/30">
      <div className="max-w-3xl w-full">
        {/* Navigation & Header */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => {
              if (window.history.length > 1) {
                navigate(-1)
              } else {
                navigate("/")
              }
            }}
            className="btn-ghost px-4 py-2 text-xs inline-flex items-center gap-2 rounded-xl text-text-muted hover:text-warm-white transition-colors cursor-pointer"
          >
            ← Back
          </button>
          <span className="text-[11px] font-mono-data text-text-muted">
            CortiQuant Support & Inquiries
          </span>
        </div>

        <div className="card-base p-6 sm:p-10 space-y-8 rounded-3xl border border-white/[0.08] shadow-2xl">
          {/* Header */}
          <div className="border-b border-white/[0.08] pb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-core/10 border border-purple-core/25 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-core animate-pulse" />
              <span className="text-[10px] font-semibold text-lavender-bright uppercase tracking-wider">
                Get in Touch · We&apos;re Here to Help
              </span>
            </div>
            <div className="flex items-center gap-3 mb-2">
              <img src={logoSrc} alt="CortiQuant" className="h-8 object-contain" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-warm-white tracking-tight">
              Contact CortiQuant
            </h1>
            <p className="text-sm text-text-secondary leading-relaxed mt-3">
              Have questions about CortiQuant&apos;s workplace stress analytics, corporate partnerships, privacy practices, or technical support? Our team is dedicated to supporting your wellbeing journey.
            </p>
          </div>

          {/* Direct Contact Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="card-elevated p-5 rounded-2xl border border-white/5 space-y-3">
              <div className="w-9 h-9 rounded-xl bg-purple-core/15 border border-purple-core/30 flex items-center justify-center text-purple-core">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">General & User Support</p>
                <a
                  href="mailto:cortiqsupport@gmail.com"
                  className="text-sm font-semibold text-lavender-bright hover:text-warm-white transition-colors block mt-1"
                >
                  cortiqsupport@gmail.com
                </a>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-text-muted">Response within 24 hours</span>
                <button
                  onClick={() => handleCopy("cortiqsupport@gmail.com", "support")}
                  className="text-[11px] text-purple-core hover:text-lavender-soft transition-colors cursor-pointer font-medium"
                >
                  {copied === "support" ? "Copied!" : "Copy Email"}
                </button>
              </div>
            </div>

            <div className="card-elevated p-5 rounded-2xl border border-white/5 space-y-3">
              <div className="w-9 h-9 rounded-xl bg-lavender-bright/15 border border-lavender-bright/30 flex items-center justify-center text-lavender-bright">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Corporate & Partnerships</p>
                <a
                  href="mailto:cortiquant@gmail.com"
                  className="text-sm font-semibold text-lavender-bright hover:text-warm-white transition-colors block mt-1"
                >
                  cortiquant@gmail.com
                </a>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-text-muted">Enterprise & Pilots</span>
                <button
                  onClick={() => handleCopy("cortiquant121026@gmail.com", "corp")}
                  className="text-[11px] text-purple-core hover:text-lavender-soft transition-colors cursor-pointer font-medium"
                >
                  {copied === "corp" ? "Copied!" : "Copy Email"}
                </button>
              </div>
            </div>
          </div>

          {/* Contact & Message Form */}
          <div className="card-elevated p-6 rounded-2xl border border-white/5 space-y-4">
            <h2 className="text-base font-semibold text-warm-white flex items-center gap-2">
              Send us a Message
            </h2>
            <p className="text-xs text-text-muted">
              Fill out this form to connect with our support team directly. We typically reply within one business day.
            </p>

            {submitted ? (
              <div className="p-5 rounded-2xl bg-c-success/10 border border-c-success/30 text-center space-y-2">
                <div className="w-8 h-8 rounded-full bg-c-success/20 text-c-success mx-auto flex items-center justify-center font-bold">
                  ✓
                </div>
                <p className="text-sm font-semibold text-warm-white">Thank you for reaching out!</p>
                <p className="text-xs text-text-secondary">
                  Your mail client has been opened with your inquiry. You can also directly write to{" "}
                  <a href="mailto:cortiqsupport@gmail.com" className="text-lavender-bright underline">
                    cortiqsupport@gmail.com
                  </a>.
                </p>
                <button
                  onClick={() => {
                    setSubmitted(false)
                    setName("")
                    setEmail("")
                    setSubject("")
                    setMessage("")
                  }}
                  className="text-xs text-purple-core underline pt-2 cursor-pointer inline-block"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-text-muted">Your Name</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-midnight border border-border-p text-sm text-warm-white placeholder-text-muted/50 focus:outline-none focus:border-purple-core transition-colors"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-text-muted">Email Address</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="jane@company.com"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-midnight border border-border-p text-sm text-warm-white placeholder-text-muted/50 focus:outline-none focus:border-purple-core transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-text-muted">Subject</label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Inquiry regarding CortiQuant enterprise plan"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-midnight border border-border-p text-sm text-warm-white placeholder-text-muted/50 focus:outline-none focus:border-purple-core transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-text-muted">Message</label>
                  <textarea
                    required
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="How can we assist you?"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-midnight border border-border-p text-sm text-warm-white placeholder-text-muted/50 focus:outline-none focus:border-purple-core transition-colors resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="btn-primary w-full py-3 text-sm rounded-xl cursor-pointer"
                >
                  Send Message via Email →
                </button>
              </form>
            )}
          </div>

          {/* Leadership & Grievance Contacts */}
          <div className="border-t border-white/[0.08] pt-6 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
              Grievance & Platform Officers
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-surface/50 border border-white/5 space-y-0.5">
                <p className="text-xs font-medium text-warm-white">Soham Kadam</p>
                <p className="text-[11px] text-text-muted">Data Protection Officer & Co-Founder</p>
                <p className="text-[11px] text-lavender-bright">cortiqsupport@gmail.com</p>
              </div>
              <div className="p-3.5 rounded-xl bg-surface/50 border border-white/5 space-y-0.5">
                <p className="text-xs font-medium text-warm-white">Mrunal Kulkarni</p>
                <p className="text-[11px] text-text-muted">Founder, CortiQuant</p>
                <p className="text-[11px] text-lavender-bright">cortiqsupport@gmail.com</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
