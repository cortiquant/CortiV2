import { Link } from "react-router-dom"
import logoSrc from "@/imports/image-2.png"

interface LandingProps {
  onGetStarted: () => void
  onHRLogin?: () => void
}

const NAV_LINKS = [
  { label: "Platform", id: "platform" },
  { label: "How It Works", id: "how-it-works" },
  { label: "For You", id: "for-you" },
  { label: "Privacy", id: "privacy" },
]

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
}

function HeroIllustration() {
  return (
    <div className="relative w-full max-w-4xl mx-auto mt-16 px-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        {/* Individual check-in preview */}
        <div className="animate-float" style={{ animationDelay: "0s" }}>
          <div className="card-base p-6 max-w-[320px] mx-auto glow-subtle">
            <div className="flex items-center justify-between mb-4">
              <span className="text-text-muted text-xs font-semibold uppercase tracking-widest">Personal Check-in</span>
              <span className="text-[10px] text-purple-300 font-mono-data bg-purple-core/15 px-2 py-0.5 rounded-full border border-purple-core/25">60 sec</span>
            </div>
            <p className="font-display text-lg text-warm-white mb-4 leading-snug">How is stress showing up for you right now?</p>
            <div className="flex flex-col gap-2">
              {[
                { label: "Calm & Grounded", color: "border-border-p text-text-secondary" },
                { label: "Mild Headspace Load", color: "border-border-p text-text-secondary" },
                { label: "Cognitive Pressure", color: "border-purple-core bg-purple-core/15 text-lavender-soft" },
                { label: "Need Recovery Time", color: "border-border-p text-text-secondary" },
              ].map((opt, i) => (
                <div
                  key={opt.label}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl border text-xs font-medium transition-all ${opt.color}`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${i === 2 ? "bg-purple-core" : "bg-border-s"}`} />
                  {opt.label}
                </div>
              ))}
            </div>
            <div className="mt-4 h-px bg-border-p" />
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                </div>
                <span className="text-[11px] text-text-muted">100% Private to you</span>
              </div>
              <span className="text-[11px] text-lavender-soft font-mono-data">MSI: 37</span>
            </div>
          </div>
        </div>

        {/* Connector */}
        <div className="hidden md:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none">
          <div className="w-16 h-px bg-gradient-to-r from-purple-core/40 to-lavender-bright/40" />
          <div className="w-2 h-2 rounded-full bg-purple-core mx-auto -mt-1 animate-pulse-dot" />
        </div>

        {/* Personal MSI & Archetype preview */}
        <div className="animate-float" style={{ animationDelay: "1.2s" }}>
          <div className="card-base p-6 max-w-[320px] mx-auto glow-subtle">
            <div className="flex items-center justify-between mb-4">
              <span className="text-text-muted text-xs font-semibold uppercase tracking-widest">Your Stress Pattern</span>
              <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20">Optimal Range</span>
            </div>
            <div className="flex items-end justify-between mb-4">
              <div>
                <p className="font-mono-data text-4xl text-warm-white font-bold">37<span className="text-lg text-purple-core font-normal">/100</span></p>
                <p className="text-xs text-text-muted mt-1">Current Mind Stress Index (MSI)</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-text-muted">Archetype</p>
                <p className="text-xs font-semibold text-lavender-soft">The Deep Thinker</p>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-border-p">
              <div className="bg-elevated/70 rounded-xl p-3 border border-border-p/80">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-text-secondary font-medium">Recommended Reset</span>
                  <span className="text-[10px] text-purple-core font-mono-data">3 mins</span>
                </div>
                <p className="text-[11px] text-text-muted leading-relaxed">
                  Box Breathing + Cognitive Dump Bag to release lingering work loops.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function LoopStep({ step, label, sub, delay }: { step: string; label: string; sub: string; delay: string }) {
  return (
    <div className="flex flex-col items-center text-center animate-fade-up" style={{ animationDelay: delay }}>
      <div className="w-10 h-10 rounded-xl bg-surface border border-border-p flex items-center justify-center mb-3 glow-subtle">
        <span className="font-mono-data text-xs text-purple-core font-medium">{step}</span>
      </div>
      <p className="font-semibold text-warm-white text-sm mb-1">{label}</p>
      <p className="text-xs text-text-muted max-w-[140px] leading-relaxed">{sub}</p>
    </div>
  )
}

function SectionLabel({ text }: { text: string }) {
  return (
    <div className="inline-flex items-center gap-2 bg-purple-core/10 border border-purple-core/25 rounded-full px-4 py-1.5 mb-6">
      <div className="w-1.5 h-1.5 rounded-full bg-purple-core animate-pulse-dot" />
      <span className="text-xs font-semibold text-lavender-bright uppercase tracking-widest">{text}</span>
    </div>
  )
}

export default function Landing({ onGetStarted, onHRLogin }: LandingProps) {
  return (
    <div className="min-h-full bg-midnight text-warm-white overflow-y-auto">

      {/* Nav */}
      <nav className="sticky top-0 z-40 border-b border-border-p bg-midnight/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={() => scrollTo("hero")} className="focus:outline-none cursor-pointer">
            <img src={logoSrc} alt="CortiQuant" className="h-8 object-contain" />
          </button>

          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((l) => (
              <button
                key={l.id}
                onClick={() => scrollTo(l.id)}
                className="text-sm text-text-muted hover:text-text-secondary transition-colors font-medium cursor-pointer"
              >
                {l.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            {/* Subtle secondary HR entry */}
            <button
              onClick={onHRLogin}
              className="text-xs text-text-muted hover:text-lavender-soft transition-colors font-medium hidden sm:inline-block cursor-pointer px-2 py-1"
            >
              HR / Organisation Login
            </button>

            {/* Primary B2C Call to Action */}
            <button className="btn-primary px-5 py-2 text-sm shadow-md cursor-pointer" onClick={onGetStarted}>
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section id="hero" className="relative overflow-hidden pb-24 pt-20">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-purple-primary/8 blur-3xl" />
          <div className="absolute top-1/3 right-1/4 w-80 h-80 rounded-full bg-lavender-bright/6 blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <div className="flex justify-center mb-8">
            <img
              src={logoSrc}
              alt="CortiQuant — Personal Stress & Wellbeing"
              className="h-36 md:h-48 object-contain animate-float"
            />
          </div>

          <h1 className="font-display text-4xl sm:text-5xl md:text-7xl text-warm-white leading-[1.15] mb-6">
            Understand your stress.<br />
            <span className="text-gradient">Feel more like</span>{" "}
            <span className="italic">yourself.</span>
          </h1>

          <p className="text-base sm:text-lg text-text-secondary max-w-2xl mx-auto mb-10 font-light leading-relaxed">
            CortiQuant helps you understand how stress shows up in your everyday life,
            track your stress patterns over time, and discover personalized ways to reset and recover.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              className="btn-primary px-10 py-4 text-base shadow-lg hover:shadow-purple-500/20 transition-all cursor-pointer w-full sm:w-auto"
              onClick={onGetStarted}
            >
              Get Started
            </button>

            <button
              onClick={() => scrollTo("for-you")}
              className="px-6 py-4 rounded-xl border border-border-p bg-surface/40 hover:bg-elevated text-sm text-text-muted hover:text-text-secondary transition-all cursor-pointer w-full sm:w-auto"
            >
              Explore Features ↓
            </button>
          </div>

          {/* Subtext reassurance */}
          <p className="text-xs text-text-muted/80 mt-6">
            Private & confidential · Simple 60-second weekly check-in · Free to get started
          </p>
        </div>

        <HeroIllustration />
      </section>

      {/* For You / Value Pillars */}
      <section id="for-you" className="py-24 border-t border-border-p">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <SectionLabel text="For You" />
            <h2 className="font-display text-3xl sm:text-4xl text-warm-white mb-4">
              Everything you need to navigate stress with clarity
            </h2>
            <p className="text-text-secondary max-w-2xl mx-auto text-sm sm:text-base leading-relaxed font-light">
              Stress is personal. CortiQuant gives you actionable tools to measure, understand, and ease mental tension on your own terms.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="card-base p-6 glow-subtle flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-purple-core/10 border border-purple-core/25 flex items-center justify-center mb-4 text-xl">
                  📈
                </div>
                <h3 className="font-semibold text-lg text-warm-white mb-2">Track Your MSI Over Time</h3>
                <p className="text-sm text-text-muted leading-relaxed mb-4">
                  Establish your personal Mind Stress Index (MSI) baseline and observe how work, rest, and life shift your stress score across 7D, 30D, 3M, and 1Y.
                </p>
              </div>
              <div className="text-xs text-purple-core font-medium pt-3 border-t border-border-p">
                Real data · No synthetic points
              </div>
            </div>

            {/* Card 2 */}
            <div className="card-base p-6 glow-subtle flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-purple-core/10 border border-purple-core/25 flex items-center justify-center mb-4 text-xl">
                  🧬
                </div>
                <h3 className="font-semibold text-lg text-warm-white mb-2">Discover Your Stress Archetype</h3>
                <p className="text-sm text-text-muted leading-relaxed mb-4">
                  Learn how your nervous system uniquely responds to pressure. Identify your stress personality archetype and uncover triggers before feeling overloaded.
                </p>
              </div>
              <div className="text-xs text-purple-core font-medium pt-3 border-t border-border-p">
                Personalized resonance & insights
              </div>
            </div>

            {/* Card 3 */}
            <div className="card-base p-6 glow-subtle flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-purple-core/10 border border-purple-core/25 flex items-center justify-center mb-4 text-xl">
                  🫧
                </div>
                <h3 className="font-semibold text-lg text-warm-white mb-2">Personalized Reset Labs</h3>
                <p className="text-sm text-text-muted leading-relaxed mb-4">
                  Experience quick 2-to-5-minute micro-interventions: from guided somatic breathwork and musical unwinds to the cognitive Digital Dump Bag.
                </p>
              </div>
              <div className="text-xs text-purple-core font-medium pt-3 border-t border-border-p">
                Evidence-informed micro-resets
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Human Support */}
      <section className="py-20 border-t border-border-p bg-deep-navy/30">
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/25 rounded-full px-3 py-1 mb-4">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-xs font-semibold text-emerald-300 uppercase tracking-widest">Confidential Care</span>
              </div>
              <h2 className="font-display text-3xl sm:text-4xl text-warm-white mb-4 leading-snug">
                Connect with human & professional support
              </h2>
              <p className="text-text-secondary text-sm leading-relaxed mb-6">
                When stress feels too heavy to process alone, schedule 1-on-1 confidential chats with trained Peer Listeners or certified mental wellbeing professionals.
              </p>
              <div className="space-y-2.5">
                {[
                  "Safe, non-judgmental listening spaces",
                  "10-minute focused reset sessions",
                  "Verified professional consultations where available",
                  "Never shared with your employer or anyone else",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-2.5 text-xs text-text-secondary">
                    <div className="w-4 h-4 rounded-full bg-purple-core/15 flex items-center justify-center text-[10px] text-purple-300">✓</div>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card-base p-6 border-purple-core/20 bg-elevated/40">
              <div className="text-xs text-text-muted uppercase tracking-wider mb-3">Support Preview</div>
              <p className="text-warm-white font-medium text-base mb-2">"You don't have to carry this alone."</p>
              <p className="text-xs text-text-muted leading-relaxed mb-4">
                Whether you need a listening ear after a tough day or targeted coping strategies, CortiQuant connects you directly when you need it most.
              </p>
              <button onClick={onGetStarted} className="btn-secondary w-full py-2.5 text-xs font-semibold cursor-pointer">
                Explore Support Options →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works / Loop */}
      <section id="how-it-works" className="py-24 border-t border-border-p">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <SectionLabel text="How It Works" />
          <h2 className="font-display text-4xl text-warm-white mb-4">The CortiQuant Personal Loop</h2>
          <p className="text-text-muted mb-16 max-w-lg mx-auto">
            A simple, non-intrusive routine that builds long-term self-awareness and recovery habits.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <LoopStep step="01" label="Check In" sub="Takes 60 seconds. Reflect on energy, mental load, and body." delay="0ms" />
            <LoopStep step="02" label="Understand" sub="See your current MSI and what may be driving mental pressure." delay="80ms" />
            <LoopStep step="03" label="Reset" sub="Get personalized recovery suggestions tailored to your score." delay="160ms" />
            <LoopStep step="04" label="Restore" sub="Track shifts over time and feel more balanced in everyday life." delay="240ms" />
          </div>
        </div>
      </section>

      {/* Privacy Guarantee */}
      <section id="privacy" className="py-24 border-t border-border-p bg-deep-navy/40">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <SectionLabel text="Your Privacy" />
          <h2 className="font-display text-4xl text-warm-white mb-5">Your wellbeing data belongs to you.</h2>
          <p className="text-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed font-light">
            Your individual responses, journal notes, check-ins, and scores are strictly confidential. We believe true self-reflection only happens when you know your data is secure.
          </p>

          <div className="grid md:grid-cols-3 gap-4 text-left">
            <div className="card-base p-5 border border-lavender-soft/20">
              <div className="text-2xl mb-3">🔒</div>
              <p className="font-semibold text-warm-white mb-1.5">Strictly Private</p>
              <p className="text-xs text-text-muted leading-relaxed">
                Your assessments, Dump Bag reflections, and personal MSI scores are visible only to you.
              </p>
            </div>
            <div className="card-base p-5 border border-purple-core/25">
              <div className="text-2xl mb-3">🛡️</div>
              <p className="font-semibold text-warm-white mb-1.5">No Surveillance</p>
              <p className="text-xs text-text-muted leading-relaxed">
                We never sell your data or share individual records with employers, managers, or third parties.
              </p>
            </div>
            <div className="card-base p-5 border border-c-info/20">
              <div className="text-2xl mb-3">✨</div>
              <p className="font-semibold text-warm-white mb-1.5">Built For Recovery</p>
              <p className="text-xs text-text-muted leading-relaxed">
                Designed to nurture healthy routines and genuine self-care, free from anxiety or judgment.
              </p>
            </div>
          </div>

          <div className="mt-8 text-center">
            <Link
              to="/privacy-policy"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-core hover:text-lavender-bright transition-colors"
            >
              Read full Privacy Policy →
            </Link>
          </div>
        </div>
      </section>

      {/* Secondary B2B / Organisation Section */}
      <section id="platform" className="py-20 border-t border-border-p bg-surface/20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="card-base p-8 border border-border-p/60 bg-elevated/30 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="max-w-xl">
              <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">For Organisations & Teams</div>
              <h3 className="font-display text-2xl text-warm-white mb-3">
                Looking to support wellbeing across your team?
              </h3>
              <p className="text-sm text-text-muted leading-relaxed font-light">
                CortiQuant also helps organisations understand aggregated workplace wellbeing patterns while keeping all individual responses 100% private.
              </p>
            </div>
            <button
              onClick={onHRLogin}
              className="px-6 py-3 rounded-xl border border-purple-core/30 bg-purple-core/10 hover:bg-purple-core/20 text-xs font-semibold text-lavender-soft hover:text-warm-white transition-all whitespace-nowrap cursor-pointer"
            >
              HR / Organisation Login →
            </button>
          </div>
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="py-28 border-t border-border-p">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="relative">
            <div className="absolute inset-0 bg-purple-primary/10 rounded-3xl blur-3xl" />
            <div className="relative card-base p-10 sm:p-14 glow-purple">
              <h2 className="font-display text-4xl sm:text-5xl text-warm-white mb-4 leading-tight">
                Take the first step toward<br />
                <em>calmer, clearer days.</em>
              </h2>
              <p className="text-text-secondary mb-8 text-base font-light max-w-lg mx-auto">
                Begin with a quick check-in to establish your baseline and uncover how stress really affects your life.
              </p>
              <button className="btn-primary px-10 py-4 text-base shadow-xl cursor-pointer" onClick={onGetStarted}>
                Get Started
              </button>
              <p className="text-xs text-text-muted mt-5">No credit card or company code required to begin.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border-p py-12">
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <img src={logoSrc} alt="CortiQuant" className="h-7 object-contain" />
            <span className="text-xs text-text-muted">| Personal Stress & Wellbeing</span>
          </div>

          <div className="flex flex-wrap gap-6 items-center justify-center">
            <button
              onClick={onHRLogin}
              className="text-xs text-text-muted hover:text-lavender-soft transition-colors cursor-pointer"
            >
              Organisation Portal
            </button>
            <Link
              to="/privacy-policy"
              className="text-xs text-text-muted hover:text-warm-white transition-colors cursor-pointer"
            >
              Privacy
            </Link>
            <Link
              to="/terms"
              className="text-xs text-text-muted hover:text-warm-white transition-colors cursor-pointer"
            >
              Terms
            </Link>
            <Link
              to="/contact"
              className="text-xs text-text-muted hover:text-warm-white transition-colors cursor-pointer"
            >
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

