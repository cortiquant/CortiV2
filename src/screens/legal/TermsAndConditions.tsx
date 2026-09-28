import { useNavigate, Link } from "react-router-dom"

export default function TermsAndConditionsScreen() {
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
                navigate("/")
              }
            }}
            className="btn-ghost px-4 py-2 text-xs inline-flex items-center gap-2 rounded-xl text-text-muted hover:text-warm-white transition-colors cursor-pointer"
          >
            ← Back
          </button>
          <span className="text-[11px] font-mono-data text-text-muted">
            Version 1.0 · June 2026
          </span>
        </div>

        <div className="card-base p-6 sm:p-10 space-y-8 rounded-3xl border border-white/[0.08] shadow-2xl">
          {/* Document Header */}
          <div className="border-b border-white/[0.08] pb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-core/10 border border-purple-core/25 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-purple-core animate-pulse" />
              <span className="text-[10px] font-semibold text-lavender-bright uppercase tracking-wider">
                Legal Documentation · Official Terms
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-warm-white tracking-tight">
              CORTIQUANT TERMS AND CONDITIONS OF USE
            </h1>
            <p className="text-xs text-text-muted mt-2 font-mono-data">
              Effective Date: June 2026 | Version 1.0 | Applies to: Cortiquant Mobile & Web Application
            </p>
            <p className="text-sm text-text-secondary leading-relaxed mt-4">
              By creating an account, downloading the application, or using any part of the Cortiquant platform, you agree to be bound by these Terms and Conditions. If you do not agree, do not use the platform.
            </p>
          </div>

          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-warm-white flex items-center gap-2">
              <span className="text-purple-core font-mono-data">1.</span> ACCEPTANCE OF TERMS
            </h2>
            <p className="text-sm text-text-secondary leading-relaxed">
              These Terms and Conditions (&quot;Terms&quot;) constitute a legally binding agreement between you (&quot;User&quot;) and Cortiquant (&quot;Company&quot;, &quot;we&quot;, &quot;us&quot;, &quot;our&quot;) governing your access to and use of the Cortiquant mobile and web application, platform, services, and all associated features (collectively, the &quot;Platform&quot;). By registering, accessing, or using the Platform, you confirm that you are at least 18 years of age, have read and understood these Terms, and agree to comply with them.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-warm-white flex items-center gap-2">
              <span className="text-purple-core font-mono-data">2.</span> DESCRIPTION OF THE PLATFORM & SERVICES
            </h2>
            <p className="text-sm text-text-secondary leading-relaxed">
              Cortiquant is an AI-powered workplace stress analytics platform that generates a Mind-Body Stress Index by combining:
            </p>
            <ul className="list-disc list-inside text-sm text-text-secondary space-y-1.5 pl-2">
              <li>Standardised psychometric assessments (Perceived Stress Scale PSS-10, mood inventories)</li>
              <li>A proprietary machine learning model that generates a personalised stress score and burnout risk rating</li>
            </ul>
            <p className="text-sm text-text-secondary leading-relaxed pt-1">
              The Platform provides individual stress dashboards, longitudinal tracking, wellness recommendations, and an aggregated HR analytics dashboard for authorised employer representatives.
            </p>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-warm-white flex items-center gap-2">
              <span className="text-purple-core font-mono-data">3.</span> USER ACCOUNTS & SECURITY
            </h2>
            <ul className="list-disc list-inside text-sm text-text-secondary space-y-1.5 pl-2">
              <li>You must provide accurate, complete, and current information at registration and keep it updated.</li>
              <li>You are responsible for maintaining the confidentiality of your login credentials. You agree to notify Cortiquant immediately at{" "}
                <a href="mailto:cortiqsupport@gmail.com" className="text-lavender-bright underline underline-offset-2 hover:text-warm-white transition-colors">
                  cortiqsupport@gmail.com
                </a>{" "}
                if you suspect unauthorised access to your account.
              </li>
              <li>Cortiquant reserves the right to suspend or terminate accounts that are found to be providing false information.</li>
              <li>You may not create more than one account per individual or share your account credentials with any other person.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-4">
            <h2 className="text-base font-semibold text-warm-white flex items-center gap-2">
              <span className="text-purple-core font-mono-data">4.</span> HEALTH DATA & MEDICAL DISCLAIMER
            </h2>
            <div className="card-elevated p-4 rounded-2xl border border-c-warning/30 bg-c-warning/5 space-y-2">
              <p className="text-xs font-semibold text-c-warning uppercase tracking-wider">
                Important Medical Notice
              </p>
              <p className="text-sm text-text-secondary leading-relaxed">
                The Cortiquant platform is a wellness monitoring tool. It is <strong>NOT</strong> a medical device, clinical diagnostic service, or healthcare provider. The Mind-Body Stress Index is <strong>NOT</strong> a medical diagnosis.
              </p>
            </div>
            <ul className="list-disc list-inside text-sm text-text-secondary space-y-1.5 pl-2">
              <li>All stress scores, burnout risk ratings, biomarker interpretations, and recommendations provided by the Platform are for informational and wellness purposes only.</li>
              <li>Platform outputs do not constitute medical advice, diagnosis, prescription, or treatment and must not be used as a substitute for consultation with a qualified medical or mental health professional.</li>
              <li>If you are experiencing a mental health crisis, severe anxiety, depression, or any acute health concern, please seek immediate professional medical help or contact a crisis helpline.</li>
              <li>Cortiquant does not establish a physician-patient relationship or any therapeutic relationship with any User.</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-warm-white flex items-center gap-2">
              <span className="text-purple-core font-mono-data">5.</span> PRIVACY & INFORMED DATA CONSENT
            </h2>
            <p className="text-sm text-text-secondary leading-relaxed">
              By using the Platform, you provide informed consent to the collection and processing of your personal and health data in strict accordance with our{" "}
              <Link to="/privacy-policy" className="text-lavender-bright underline underline-offset-2 hover:text-warm-white transition-colors">
                Privacy Policy
              </Link>
              , administration of psychometric assessments, and sharing of anonymised, aggregated data with employer dashboards where applicable.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-warm-white flex items-center gap-2">
              <span className="text-purple-core font-mono-data">6.</span> EMPLOYER ACCESS & INDIVIDUAL PRIVACY
            </h2>
            <p className="text-sm text-text-secondary leading-relaxed">
              If you access Cortiquant through your employer&apos;s corporate subscription:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="card-elevated p-4 rounded-2xl border border-white/5 space-y-1.5">
                <p className="text-xs font-semibold text-c-success uppercase tracking-wider">What Employers CAN See</p>
                <ul className="list-disc list-inside text-xs text-text-secondary space-y-1">
                  <li>Anonymised, aggregated departmental or organisation stress trends</li>
                  <li>Workforce-level insights with a minimum threshold of 5 individuals per cohort</li>
                </ul>
              </div>
              <div className="card-elevated p-4 rounded-2xl border border-white/5 space-y-1.5">
                <p className="text-xs font-semibold text-c-critical uppercase tracking-wider">What Employers CANNOT See</p>
                <ul className="list-disc list-inside text-xs text-text-secondary space-y-1">
                  <li>Your individual Mind-Body Stress Index score</li>
                  <li>Your individual psychometric responses</li>
                  <li>Your identity linked to any health or stress data point</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 7 */}
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-warm-white flex items-center gap-2">
              <span className="text-purple-core font-mono-data">7.</span> PROFESSIONAL & LISTENER SERVICES
            </h2>
            <p className="text-sm text-text-secondary leading-relaxed">
              Cortiquant offers peer support via Active Listeners and connects users to professional wellbeing specialists. The Active Listener service is designed for empathetic conversational peer support and is <strong>not</strong> clinical therapy or psychiatric treatment.
            </p>
            <div className="card-elevated p-4 rounded-2xl border border-purple-core/20 bg-purple-core/5 space-y-2">
              <p className="text-xs font-semibold text-lavender-bright uppercase tracking-wider">
                Emergency Crisis Disclaimer
              </p>
              <p className="text-xs text-text-secondary leading-relaxed">
                If you are experiencing suicidal ideation, self-harm impulses, or acute distress, contact emergency helplines immediately: <strong>iCall (9152987821)</strong>, <strong>Vandrevala Foundation (9999 666 555 / 1860-2662-345)</strong>, or emergency services (112).
              </p>
            </div>
          </section>

          {/* Section 8 */}
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-warm-white flex items-center gap-2">
              <span className="text-purple-core font-mono-data">8.</span> USER RESPONSIBILITIES & ACCEPTABLE USE
            </h2>
            <p className="text-sm text-text-secondary leading-relaxed">
              You agree to use the Platform only for lawful, personal wellness monitoring purposes and agree NOT to:
            </p>
            <ul className="list-disc list-inside text-sm text-text-secondary space-y-1.5 pl-2">
              <li>Provide false health data, fabricate biomarker results, or manipulate responses</li>
              <li>Attempt to access another user&apos;s account, health data, or stress scores</li>
              <li>Reverse engineer, decompile, or attempt to extract source code or AI model weights</li>
              <li>Use the Platform for any unauthorised commercial purpose or to develop competing products</li>
              <li>Post, upload, or transmit any harmful, offensive, or infringing content</li>
            </ul>
          </section>

          {/* Section 9 */}
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-warm-white flex items-center gap-2">
              <span className="text-purple-core font-mono-data">9.</span> INTELLECTUAL PROPERTY
            </h2>
            <p className="text-sm text-text-secondary leading-relaxed">
              All content, features, proprietary algorithms, the Mind-Body Stress Index methodology, software, visual design, and trademarks (including CortiQuant trademarks and logos) are the exclusive property of Cortiquant. You are granted a limited, personal, non-exclusive, non-transferable licence for wellness monitoring use only.
            </p>
          </section>

          {/* Section 10 */}
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-warm-white flex items-center gap-2">
              <span className="text-purple-core font-mono-data">10.</span> LIMITATIONS OF SERVICE & LIABILITY
            </h2>
            <p className="text-sm text-text-secondary leading-relaxed">
              To the maximum extent permitted by applicable Indian law:
            </p>
            <ul className="list-disc list-inside text-sm text-text-secondary space-y-1.5 pl-2">
              <li>Cortiquant is not liable for indirect, incidental, consequential, punitive, or special damages.</li>
              <li>Cortiquant is not responsible for any clinical consequences or personnel decisions made by users or employers based on Platform outputs.</li>
              <li>Cortiquant is not liable for interruptions caused by force majeure events or third-party infrastructure failures.</li>
            </ul>
          </section>

          {/* Section 11 */}
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-warm-white flex items-center gap-2">
              <span className="text-purple-core font-mono-data">11.</span> CHANGES TO THESE TERMS
            </h2>
            <p className="text-sm text-text-secondary leading-relaxed">
              Cortiquant reserves the right to modify these Terms at any time. We will notify you of material changes via email or in-app notification at least 14 days before the effective date. Continued use of the Platform after the effective date constitutes acceptance of the revised Terms.
            </p>
          </section>

          {/* Section 12 */}
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-warm-white flex items-center gap-2">
              <span className="text-purple-core font-mono-data">12.</span> GOVERNING LAW & DISPUTES
            </h2>
            <p className="text-sm text-text-secondary leading-relaxed">
              These Terms are governed by the laws of India. Any disputes arising hereunder shall be subject to a 30-day good-faith negotiation, followed if necessary by binding arbitration under the Arbitration and Conciliation Act, 1996 seated in Pune, Maharashtra, India.
            </p>
          </section>

          {/* Section 13 */}
          <section className="space-y-4 border-t border-white/[0.08] pt-6">
            <h2 className="text-base font-semibold text-warm-white flex items-center gap-2">
              <span className="text-purple-core font-mono-data">13.</span> CONTACT INFORMATION
            </h2>
            <p className="text-sm text-text-secondary">
              For any questions, legal feedback, or clarification regarding these Terms and Conditions:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="card-elevated p-4 rounded-2xl space-y-1">
                <p className="text-sm font-semibold text-warm-white">CortiQuant Support</p>
                <p className="text-xs text-text-muted">User Inquiries & Account Services</p>
                <p className="text-xs text-lavender-bright pt-1">
                  Email: <a href="mailto:cortiqsupport@gmail.com" className="underline hover:text-warm-white transition-colors">cortiqsupport@gmail.com</a>
                </p>
              </div>

              <div className="card-elevated p-4 rounded-2xl space-y-1">
                <p className="text-sm font-semibold text-warm-white">CortiQuant Corporate</p>
                <p className="text-xs text-text-muted">Legal & Partnerships</p>
                <p className="text-xs text-lavender-bright pt-1">
                  Email: <a href="mailto:cortiquant@gmail.com" className="underline hover:text-warm-white transition-colors">cortiquant@gmail.com</a>
                </p>
              </div>
            </div>
            <p className="text-xs text-text-muted pt-2 font-mono-data">
              By using CortiQuant, you acknowledge that you have read and agreed to these Terms.
            </p>
          </section>
        </div>
      </div>
    </div>
  )
}
