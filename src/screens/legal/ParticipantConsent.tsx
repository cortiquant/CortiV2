import { useNavigate } from "react-router-dom"

export default function ParticipantConsentScreen() {
  const navigate = useNavigate()

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
                navigate("/company-login")
              }
            }}
            className="btn-ghost px-4 py-2 text-xs inline-flex items-center gap-2 rounded-xl text-text-muted hover:text-warm-white transition-colors cursor-pointer"
          >
            ← Back
          </button>
          <span className="text-[11px] font-mono-data text-text-muted">
            Pilot Testing Program · Official Consent
          </span>
        </div>

        <div className="card-base p-6 sm:p-10 space-y-8 rounded-3xl border border-white/[0.08] shadow-2xl">
          {/* Header */}
          <div className="border-b border-white/[0.08] pb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-core/10 border border-purple-core/25 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-core animate-pulse" />
              <span className="text-[10px] font-semibold text-lavender-bright uppercase tracking-wider">
                CortiQuant · Stress Diagnostics. Reimagined.
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-warm-white tracking-tight">
              PARTICIPANT CONSENT & DATA DISCLAIMER
            </h1>
            <p className="text-xs text-lavender-soft/90 font-medium mt-1 uppercase tracking-wide">
              Pilot Testing Program | Please read carefully before proceeding
            </p>
          </div>

          {/* Section: What this form is about */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-warm-white">
              What this form is about
            </h2>
            <p className="text-sm text-text-secondary leading-relaxed">
              You are about to sign up as a participant in Cortiquant's pilot testing program. As part of this program, the Cortiquant app will collect stress-related data through your responses and (where applicable) diagnostic inputs. A portion of this data will be used for research and scientific validation of our platform.
            </p>
          </section>

          {/* 3 Core pillars: What data is collected / How it is used / Your privacy protections */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Column 1 */}
            <div className="card-elevated p-5 rounded-2xl border border-white/5 space-y-3">
              <div className="w-8 h-8 rounded-xl bg-purple-core/15 border border-purple-core/30 flex items-center justify-center text-sm">
                📋
              </div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-warm-white">
                WHAT DATA IS COLLECTED
              </h3>
              <ul className="text-xs text-text-secondary space-y-2 leading-relaxed">
                <li>• Stress scores and responses from the Mind Stress Index (MSI) questionnaire</li>
                <li>• Stress category classification based on MSI composite score</li>
                <li>• Usage patterns within the Cortiquant application</li>
              </ul>
            </div>

            {/* Column 2 */}
            <div className="card-elevated p-5 rounded-2xl border border-white/5 space-y-3">
              <div className="w-8 h-8 rounded-xl bg-purple-core/15 border border-purple-core/30 flex items-center justify-center text-sm">
                🔬
              </div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-warm-white">
                HOW IT IS USED
              </h3>
              <ul className="text-xs text-text-secondary space-y-2 leading-relaxed">
                <li>• Research validation and scientific accuracy testing of the Cortiquant platform</li>
                <li>• Improving algorithm performance and stress classification models</li>
                <li>• Internal product development — not for commercial sale or third-party sharing</li>
              </ul>
            </div>

            {/* Column 3 */}
            <div className="card-elevated p-5 rounded-2xl border border-white/5 space-y-3">
              <div className="w-8 h-8 rounded-xl bg-purple-core/15 border border-purple-core/30 flex items-center justify-center text-sm">
                🛡️
              </div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-warm-white">
                YOUR PRIVACY PROTECTIONS
              </h3>
              <ul className="text-xs text-text-secondary space-y-2 leading-relaxed">
                <li>• All data is de-identified — your name, contact, and employer details are removed before any research use</li>
                <li>• No personally identifiable information (PII) will appear in any research output or report</li>
                <li>• Data is stored securely and accessible only to the Cortiquant research team</li>
              </ul>
            </div>
          </div>

          {/* Section: Your Rights as a Participant */}
          <section className="space-y-3 p-5 rounded-2xl bg-white/[0.02] border border-white/5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-warm-white flex items-center gap-2">
              <span>⚖️</span> Your Rights as a Participant
            </h2>
            <p className="text-sm text-text-secondary leading-relaxed">
              You may withdraw your participation at any time. Withdrawal will not affect your employment or standing with your organization. To withdraw or request deletion of your data, contact us at:{" "}
              <a href="mailto:contact@cortiquant.com" className="text-lavender-bright underline underline-offset-2">
                contact@cortiquant.com
              </a>
            </p>
          </section>

          {/* Section: YOUR CONSENT */}
          <section className="space-y-4 border-t border-white/[0.08] pt-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-lavender-bright">
              YOUR CONSENT ACKNOWLEDGEMENT
            </h2>
            <p className="text-xs text-text-muted">
              By checking the consent box during registration and proceeding, you confirm and acknowledge that:
            </p>

            <div className="space-y-2.5">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5 text-xs text-text-secondary">
                <span className="text-emerald-400 font-bold mt-0.5">☑</span>
                <span>I have read and understood this Consent & Data Disclaimer.</span>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5 text-xs text-text-secondary">
                <span className="text-emerald-400 font-bold mt-0.5">☑</span>
                <span>I voluntarily agree to participate in Cortiquant's pilot testing program.</span>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5 text-xs text-text-secondary">
                <span className="text-emerald-400 font-bold mt-0.5">☑</span>
                <span>I consent to the collection and de-identified use of my stress data for research and validation purposes.</span>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/5 text-xs text-text-secondary">
                <span className="text-emerald-400 font-bold mt-0.5">☑</span>
                <span>I understand I may withdraw at any time without consequence.</span>
              </div>
            </div>
          </section>

          {/* Document Footer */}
          <div className="border-t border-white/[0.08] pt-5 text-center text-xs text-text-muted leading-relaxed font-mono-data">
            Cortiquant | contact@cortiquant.com | This form is valid for pilot participants only and does not constitute an employment or commercial agreement.
          </div>
        </div>
      </div>
    </div>
  )
}
