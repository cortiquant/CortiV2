import logoSrc from "@/imports/image-2.png"

interface LandingProps {
  onGetStarted: () => void
}

const NAV_LINKS = [
  { label: "Platform", id: "platform" },
  { label: "For Employees", id: "employees" },
  { label: "For HR", id: "hr" },
  { label: "Privacy", id: "privacy" },
]

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })
}

function HeroIllustration() {
  return (
    <div className="relative w-full max-w-4xl mx-auto mt-16 px-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        {/* Employee preview */}
        <div className="animate-float" style={{ animationDelay: "0s" }}>
          <div className="card-base p-5 max-w-[280px] mx-auto glow-subtle">
            <div className="text-text-muted text-xs font-semibold uppercase tracking-widest mb-4">Employee · Check-in</div>
            <p className="font-display text-lg text-warm-white mb-4 leading-snug">How are you feeling<br />right now?</p>
            <div className="flex flex-col gap-2">
              {["Calm", "Okay", "Tense", "Stressed"].map((opt, i) => (
                <div
                  key={opt}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                    i === 2
                      ? "border-purple-core bg-purple-core/15 text-lavender-soft"
                      : "border-border-p text-text-secondary"
                  }`}
                >
                  <div className={`w-1.5 h-1.5 rounded-full ${i === 2 ? "bg-purple-core" : "bg-border-s"}`} />
                  {opt}
                </div>
              ))}
            </div>
            <div className="mt-4 h-px bg-border-p" />
            <div className="mt-3 flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-c-success/20 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-c-success" />
              </div>
              <span className="text-xs text-text-muted">Private to you · takes a few seconds</span>
            </div>
          </div>
        </div>

        {/* Connector */}
        <div className="hidden md:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
          <div className="w-16 h-px bg-gradient-to-r from-purple-core/40 to-lavender-bright/40" />
          <div className="w-2 h-2 rounded-full bg-purple-core mx-auto -mt-1 animate-pulse-dot" />
        </div>

        {/* HR preview */}
        <div className="animate-float" style={{ animationDelay: "1.5s" }}>
          <div className="card-base p-5 max-w-[320px] mx-auto glow-subtle">
            <div className="text-text-muted text-xs font-semibold uppercase tracking-widest mb-4">HR · Overview</div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-display text-2xl text-warm-white">62</p>
                <p className="text-xs text-text-muted mt-0.5">Workforce MSI</p>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center gap-1 bg-c-warning/10 border border-c-warning/25 text-c-warning rounded-full px-2 py-0.5 text-xs font-semibold">
                  ↑ 8%
                </span>
                <p className="text-xs text-text-muted mt-1">vs last week</p>
              </div>
            </div>
            <div className="space-y-2">
              {[
                { team: "Customer Support", val: 71, change: "+12%", color: "bg-c-warning" },
                { team: "Engineering", val: 58, change: "+4%", color: "bg-lavender-bright" },
                { team: "Sales", val: 53, change: "−2%", color: "bg-c-success" },
              ].map((t) => (
                <div key={t.team} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-text-secondary">{t.team}</span>
                      <span className="font-mono-data text-text-muted">{t.val}</span>
                    </div>
                    <div className="h-1 bg-border-p rounded-full overflow-hidden">
                      <div className={`h-full ${t.color} rounded-full opacity-70`} style={{ width: `${t.val}%` }} />
                    </div>
                  </div>
                  <span className="text-xs text-text-muted w-10 text-right font-mono-data">{t.change}</span>
                </div>
              ))}
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
      <p className="text-xs text-text-muted max-w-[120px]">{sub}</p>
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

export default function Landing({ onGetStarted }: LandingProps) {
  return (
    <div className="min-h-full bg-midnight text-warm-white overflow-y-auto">

      {/* Nav */}
      <nav className="sticky top-0 z-40 border-b border-border-p bg-midnight/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={() => scrollTo("hero")} className="focus:outline-none">
            <img src={logoSrc} alt="CortiQuant" className="h-8 object-contain" />
          </button>
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((l) => (
              <button
                key={l.id}
                onClick={() => scrollTo(l.id)}
                className="text-sm text-text-muted hover:text-text-secondary transition-colors font-medium"
              >
                {l.label}
              </button>
            ))}
          </div>
          <button className="btn-primary px-5 py-2 text-sm" onClick={onGetStarted}>
            Let's Get Started
          </button>
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
              alt="CortiQuant — Turning Invisible Stress into Actionable Insight"
              className="h-40 md:h-52 object-contain animate-float"
            />
          </div>
          <h1 className="font-display text-5xl md:text-7xl text-warm-white leading-[1.1] mb-6">
            Understand workforce<br />
            <span className="text-gradient">stress.</span>{" "}
            <span className="italic">Help people</span><br />
            recover.
          </h1>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto mb-10 font-light leading-relaxed">
            CortiQuant helps organizations measure workforce stress, identify emerging patterns,
            deliver targeted recovery experiences — and understand what actually helps.
          </p>
          <button
            className="btn-primary px-10 py-4 text-base"
            onClick={onGetStarted}
          >
            Let's Get Started
          </button>
        </div>
        <HeroIllustration />
      </section>

      {/* Problem */}
      <section className="py-24 border-t border-border-p">
        <div className="max-w-4xl mx-auto px-6">
          <SectionLabel text="The Problem" />
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="font-display text-4xl text-warm-white mb-5 leading-tight">
                Organizations recognize stress<br />
                <em>after</em> it becomes a problem.
              </h2>
              <p className="text-text-secondary leading-relaxed">
                By the time burnout or turnover becomes visible, the pattern has often been building for weeks or months.
                Traditional engagement surveys are infrequent and retrospective — not designed to catch emerging signals.
              </p>
            </div>
            <div className="space-y-4">
              {[
                { icon: "⏱", label: "Weeks of undetected stress before HR notices", color: "text-c-warning" },
                { icon: "📊", label: "Annual surveys miss real-time workforce patterns", color: "text-c-critical" },
                { icon: "🔒", label: "Employees fear sharing genuine wellbeing data", color: "text-lavender-soft" },
                { icon: "📉", label: "No way to measure whether interventions helped", color: "text-c-info" },
              ].map((item) => (
                <div key={item.label} className="card-base p-4 flex gap-4 items-start">
                  <span className="text-xl mt-0.5">{item.icon}</span>
                  <p className={`text-sm ${item.color} font-medium leading-snug`}>{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Product Loop */}
      <section id="platform" className="py-24 border-t border-border-p bg-deep-navy/40">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <SectionLabel text="How It Works" />
          <h2 className="font-display text-4xl text-warm-white mb-4">The Cortiquant loop</h2>
          <p className="text-text-muted mb-16 max-w-lg mx-auto">A continuous cycle from measurement to recovery to organizational learning.</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <LoopStep step="01" label="Measure" sub="Quick employee check-ins. MSI calculated from baseline." delay="0ms" />
            <LoopStep step="02" label="Understand" sub="Patterns, persistence, and what's driving stress signals." delay="80ms" />
            <LoopStep step="03" label="Intervene" sub="Personalized recovery experiences matched to the signal." delay="160ms" />
            <LoopStep step="04" label="Learn" sub="Pre/post measurement. HR sees what actually worked." delay="240ms" />
          </div>
          <div className="mt-12 flex items-center justify-center gap-3">
            <div className="h-px w-16 bg-border-s" />
            <span className="text-xs text-text-muted font-medium uppercase tracking-widest">Then repeat</span>
            <div className="h-px w-16 bg-border-s" />
          </div>
        </div>
      </section>

      {/* Employee experience */}
      <section id="employees" className="py-24 border-t border-border-p">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <SectionLabel text="Employee Experience" />
              <h2 className="font-display text-4xl text-warm-white mb-5 leading-tight">
                A few seconds.<br />
                <em>Immediate value.</em>
              </h2>
              <p className="text-text-secondary mb-8 leading-relaxed">
                Cortiquant doesn't ask employees to spend time in an app. A quick check-in reveals personal
                patterns and delivers a targeted recovery experience — then the employee moves on with their day.
              </p>
              <ul className="space-y-3">
                {[
                  "Check in with a few simple questions",
                  "See your personal MSI vs. your baseline",
                  "Receive a personalized reset suggestion",
                  "Use the Digital Dump Bag to clear your mind",
                  "Your data is private — never shared individually",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-sm text-text-secondary">
                    <div className="w-5 h-5 rounded-full bg-purple-core/15 border border-purple-core/30 flex items-center justify-center flex-shrink-0">
                      <svg className="w-2.5 h-2.5 text-purple-core" fill="none" viewBox="0 0 10 10">
                        <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative">
              <div className="absolute -inset-8 bg-purple-primary/5 rounded-3xl blur-2xl" />
              <div className="relative card-base p-6 glow-subtle max-w-xs mx-auto">
                <div className="text-xs text-text-muted font-semibold uppercase tracking-widest mb-5">Your stress today</div>
                <div className="flex items-end gap-4 mb-5">
                  <div>
                    <p className="font-mono-data text-5xl text-warm-white font-medium">68</p>
                    <p className="text-sm text-c-warning font-medium mt-1">Elevated today</p>
                  </div>
                  <div className="pb-1 text-right text-xs text-text-muted space-y-1">
                    <p>Baseline <span className="font-mono-data text-text-secondary">42</span></p>
                    <p>Change <span className="font-mono-data text-c-warning">+26</span></p>
                  </div>
                </div>
                <div className="text-sm text-text-secondary leading-relaxed mb-4">
                  Your stress is noticeably higher than your usual range of 38–48.
                </div>
                <div className="h-px bg-border-p mb-4" />
                <p className="text-xs text-text-muted font-semibold uppercase tracking-widest mb-3">What may help</p>
                <div className="space-y-2">
                  {["5-minute reset", "Digital Dump Bag", "Talk to someone"].map((a) => (
                    <div key={a} className="bg-elevated border border-border-p rounded-xl px-3 py-2.5 text-sm text-text-secondary font-medium flex justify-between items-center">
                      {a}
                      <svg className="w-4 h-4 text-text-muted" fill="none" viewBox="0 0 16 16">
                        <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HR Intelligence */}
      <section id="hr" className="py-24 border-t border-border-p bg-deep-navy/40">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div className="order-2 md:order-1">
              <div className="card-base p-5 glow-subtle">
                <div className="flex items-center justify-between mb-5">
                  <div className="text-xs text-text-muted font-semibold uppercase tracking-widest">Workforce Wellbeing</div>
                  <div className="flex gap-1">
                    {["7D", "30D", "90D"].map((t, i) => (
                      <button key={t} className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${i === 1 ? "bg-purple-core text-warm-white" : "text-text-muted"}`}>{t}</button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-5">
                  {[
                    { label: "Workforce MSI", val: "62", sub: "↑ 8% vs last period", color: "text-c-warning" },
                    { label: "Active Employees", val: "84%", sub: "Participation rate", color: "text-c-success" },
                    { label: "Recovery Engagement", val: "47%", sub: "Used a reset this week", color: "text-lavender-soft" },
                    { label: "Intervention Response", val: "+14%", sub: "Average improvement", color: "text-c-info" },
                  ].map((m) => (
                    <div key={m.label} className="card-elevated p-3 rounded-xl">
                      <p className="text-xs text-text-muted mb-1">{m.label}</p>
                      <p className={`font-mono-data text-xl font-medium ${m.color}`}>{m.val}</p>
                      <p className="text-xs text-text-muted mt-0.5">{m.sub}</p>
                    </div>
                  ))}
                </div>
                <div className="bg-elevated border border-border-p rounded-xl p-4">
                  <p className="text-xs text-text-muted font-semibold uppercase tracking-widest mb-2">What changed this week</p>
                  <p className="text-sm text-text-secondary leading-relaxed">
                    Stress increased moderately across the workforce, with the largest change in{" "}
                    <span className="text-lavender-soft font-medium">Customer Support</span>.
                    Three weeks of elevated signal detected.
                  </p>
                  <p className="mt-3 text-xs text-text-muted">Real-time. Aggregated. Privacy-first.</p>
                </div>
              </div>
            </div>
            <div className="order-1 md:order-2">
              <SectionLabel text="HR Intelligence" />
              <h2 className="font-display text-4xl text-warm-white mb-5 leading-tight">
                Finally understand<br />
                <em>your workforce.</em>
              </h2>
              <p className="text-text-secondary leading-relaxed">
                The HR experience gives you real-time visibility into workforce stress patterns — by team, by trend,
                by intervention. Not individual surveillance. Aggregated intelligence that drives better decisions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Privacy */}
      <section id="privacy" className="py-24 border-t border-border-p">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <SectionLabel text="Privacy" />
          <h2 className="font-display text-4xl text-warm-white mb-5">Your wellbeing data is yours.</h2>
          <p className="text-text-secondary max-w-2xl mx-auto mb-12 leading-relaxed">
            Individual responses are private to the employee. Your organization receives aggregated insights
            designed to understand workforce patterns — not to monitor individuals.
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { role: "Employee", sees: "Their own individual data, trends, and private responses", icon: "👤", color: "border-lavender-soft/30" },
              { role: "Manager", sees: "Aggregated team data only — no individual scores", icon: "👥", color: "border-c-info/30" },
              { role: "HR", sees: "Aggregated organization data — workforce patterns, not people", icon: "🏢", color: "border-purple-core/30" },
            ].map((item) => (
              <div key={item.role} className={`card-base p-5 border ${item.color}`}>
                <div className="text-2xl mb-3">{item.icon}</div>
                <p className="font-semibold text-warm-white mb-2">{item.role}</p>
                <p className="text-sm text-text-muted leading-relaxed">{item.sees}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Reset Labs */}
      <section className="py-24 border-t border-border-p bg-deep-navy/40">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <SectionLabel text="Reset Labs" />
            <h2 className="font-display text-4xl text-warm-white mb-4">Small experiences that help minds recover.</h2>
            <p className="text-text-muted max-w-lg mx-auto">Targeted group recovery sessions, matched to workforce patterns.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { name: "Acoustic Unwind", duration: "45 min", desc: "Structured sound designed to lower cognitive arousal.", gradient: "from-purple-primary/40 to-surface" },
              { name: "Guided Breathwork", duration: "30 min", desc: "Evidence-informed breathing for acute stress reduction.", gradient: "from-c-info/30 to-surface" },
              { name: "Mindful Movement", duration: "30 min", desc: "Gentle somatic movement for body-based recovery.", gradient: "from-c-success/20 to-surface" },
            ].map((lab) => (
              <div key={lab.name} className="card-base overflow-hidden">
                <div className={`h-28 bg-gradient-to-br ${lab.gradient} flex items-end p-4`}>
                  <div className="text-xs font-semibold text-text-muted uppercase tracking-widest">{lab.duration}</div>
                </div>
                <div className="p-4">
                  <p className="font-semibold text-warm-white mb-1">{lab.name}</p>
                  <p className="text-sm text-text-muted">{lab.desc}</p>
                  <button className="mt-3 text-xs text-purple-core font-semibold hover:text-lavender-bright transition-colors">RSVP →</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 border-t border-border-p">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="relative">
            <div className="absolute inset-0 bg-purple-primary/10 rounded-3xl blur-3xl" />
            <div className="relative card-base p-12 glow-purple">
              <h2 className="font-display text-5xl text-warm-white mb-4 leading-tight">
                Build a healthier workforce<br />
                <em>with measurable recovery.</em>
              </h2>
              <p className="text-text-secondary mb-8 text-lg">
                Join organizations using CortiQuant to move from guessing to knowing.
              </p>
              <button className="btn-primary px-10 py-4 text-base" onClick={onGetStarted}>
                Let's Get Started
              </button>
              <p className="text-xs text-text-muted mt-6">No long-term commitment required.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border-p py-12">
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <img src={logoSrc} alt="CortiQuant" className="h-7 object-contain" />
          <p className="text-xs text-text-muted italic">Turning Invisible Stress into Actionable Insight</p>
          <div className="flex gap-6">
            {["Privacy", "Terms", "Contact"].map((l) => (
              <button
                key={l}
                onClick={() => l === "Privacy" ? scrollTo("privacy") : undefined}
                className="text-xs text-text-muted hover:text-text-secondary transition-colors"
              >
                {l}
              </button>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
