import re

with open('src/App.tsx', 'r') as f:
    app = f.read()

# Replace View state with React Router
app = app.replace('import { useState } from "react"', 'import { useState } from "react"\nimport { BrowserRouter, Routes, Route, Navigate, useNavigate } from "react-router-dom"')
app = app.replace('export default function App() {', '''
function AppRoutes() {
  const navigate = useNavigate();
  // We keep localStorage helpers as they are.
  // Instead of setView, we use navigate.

  function handleEmployeeSignIn() {
    const approval = getApprovalStatus()
    const onboarding = getOnboardingStatus()

    if (approval === "approved") {
      navigate("/app")
    } else if (approval === "rejected") {
      navigate("/auth/rejected")
    } else if (onboarding === "complete") {
      navigate("/auth/pending")
    } else {
      navigate("/auth/onboarding")
    }
  }

  function handleCreateAccount(name: string, username: string) {
    localStorage.setItem("cq_user_name", name)
    localStorage.setItem("cq_username", username)
    localStorage.setItem("cq_onboarding_status", "incomplete")
    localStorage.setItem("cq_approval_status", "none")
    localStorage.removeItem("cq_onboarding_answers")
    localStorage.removeItem("cq_onboarding_step")
    navigate("/auth/onboarding")
  }

  function handleOnboardingComplete(answers: (string | null)[]) {
    localStorage.setItem("cq_onboarding_status", "complete")
    localStorage.setItem("cq_approval_status", "pending")
    localStorage.setItem("cq_onboarding_answers", JSON.stringify(answers))
    localStorage.setItem("cq_approval_requested_at", new Date().toISOString())
    navigate("/auth/pending")
  }

  return (
    <div className="size-full bg-midnight">
      <div className="fixed top-3 right-4 z-50 flex items-center gap-2">
        <img src={logoSrc} alt="CortiQuant" className="h-7 object-contain opacity-80 pointer-events-none select-none" />
        <div className="flex gap-1 bg-surface/90 backdrop-blur-md border border-border-p rounded-xl p-1">
          <button onClick={() => navigate("/")} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-text-muted hover:text-text-secondary">Landing</button>
          <button onClick={() => navigate("/auth/login")} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-text-muted hover:text-text-secondary">Login</button>
          <button onClick={() => navigate("/auth/onboarding")} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-text-muted hover:text-text-secondary">Onboard</button>
          <button onClick={() => navigate("/app")} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-text-muted hover:text-text-secondary">Employee</button>
          <button onClick={() => navigate("/admin")} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-text-muted hover:text-text-secondary">HR</button>
        </div>
      </div>

      <Routes>
        <Route path="/" element={<Landing onGetStarted={() => navigate("/auth/login")} />} />
        <Route path="/auth/login" element={<Login onEmployeeSignIn={handleEmployeeSignIn} onCreateAccount={handleCreateAccount} onHR={() => navigate("/admin")} onBack={() => navigate("/")} />} />
        <Route path="/auth/onboarding" element={<Onboarding initialStep={getResumeStep()} initialAnswers={getResumeAnswers()} onComplete={handleOnboardingComplete} />} />
        <Route path="/auth/pending" element={<ApprovalPendingScreen onBack={() => navigate("/auth/login")} />} />
        <Route path="/auth/rejected" element={<ApprovalRejectedScreen onBack={() => navigate("/auth/login")} />} />
        <Route path="/app/*" element={<EmployeeApp />} />
        <Route path="/admin/*" element={<HRApp />} />
      </Routes>
    </div>
  )
}

export default function App() {
  return <BrowserRouter><AppRoutes /></BrowserRouter>
}
''')
app = re.sub(r'export default function App\(\) \{.*', '', app, flags=re.DOTALL)

with open('src/App.tsx', 'w') as f:
    f.write(app)

with open('src/components/employee/EmployeeApp.tsx', 'r') as f:
    emp = f.read()

emp = emp.replace('import { useState, useEffect } from "react"', 'import { useState, useEffect } from "react"\nimport { Routes, Route, useNavigate, Navigate } from "react-router-dom"')

# Now replace the screen switcher
# Find the EmployeeApp function
emp_func = '''
export default function EmployeeApp() {
  const navigate = useNavigate()
  const [checkInData, setCheckInData] = useState<CheckInData>({ feeling: "", stressor: "", physical: "", driver: "" })

  const isFullscreen = window.location.pathname.includes("reset-active")

  // Wrapper for internal setScreen
  const setScreen = (s: Screen | string) => {
    if (s === "home") navigate("/app")
    else navigate(`/app/${s}`)
  }

  return (
    <div className="flex justify-center items-start min-h-full bg-midnight sm:py-8">
      <div className="relative w-full h-[100dvh] sm:max-w-[390px] sm:h-[812px] bg-midnight sm:rounded-[32px] sm:border border-border-p overflow-hidden sm:shadow-2xl flex flex-col">
        {!isFullscreen && (
          <div className="flex items-center justify-between px-5 pt-4 pb-2 flex-shrink-0">
            <img src={logoSrc} alt="CortiQuant" className="h-6 object-contain" />
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5 items-end">
                {[1, 2, 3, 4].map((b) => (
                  <div key={b} className="w-0.5 rounded-full bg-text-muted" style={{ height: `${b * 3}px`, opacity: b <= 3 ? 1 : 0.3 }} />
                ))}
              </div>
              <span className="text-xs text-text-muted font-mono-data">87%</span>
            </div>
          </div>
        )}

        <div className="flex-1 min-h-0 flex flex-col overflow-hidden relative">
          <Routes>
            <Route path="/" element={<HomeScreen onNav={setScreen} />} />
            <Route path="/baseline-msi" element={<BaselineMSI onComplete={() => setScreen("home")} onBack={() => setScreen("home")} />} />
            <Route path="/stress-cause" element={<StressDriverFlow onBack={() => setScreen("home")} onNav={(s) => setScreen(s as Screen)} />} />
            <Route path="/msi-meaning" element={<MSIMeaningScreen msi={67} onBack={() => setScreen("home")} onNav={setScreen} />} />
            <Route path="/checkin-1" element={<CheckIn1 onNext={() => setScreen("checkin-2")} onBack={() => setScreen("home")} data={checkInData} setData={setCheckInData} />} />
            <Route path="/checkin-2" element={<CheckIn2 onNext={() => setScreen("checkin-3")} onBack={() => setScreen("checkin-1")} data={checkInData} setData={setCheckInData} />} />
            <Route path="/checkin-3" element={<CheckIn3 onNext={() => setScreen("driver")} onBack={() => setScreen("checkin-2")} data={checkInData} setData={setCheckInData} />} />
            <Route path="/driver" element={<DriverScreen onNext={() => setScreen("result")} onBack={() => setScreen("checkin-3")} data={checkInData} setData={setCheckInData} />} />
            <Route path="/result" element={<ResultScreen onNav={setScreen} data={checkInData} />} />
            <Route path="/recommended" element={<RecommendedScreen onNav={setScreen} />} />
            <Route path="/dump-bag" element={<DumpBagScreen onNav={setScreen} />} />
            <Route path="/dump-response" element={<DumpResponseScreen onNav={setScreen} />} />
            <Route path="/reset-list" element={<ResetListScreen onNav={setScreen} />} />
            <Route path="/reset-active" element={<ActiveResetScreen onNav={setScreen} />} />
            <Route path="/priority-reset" element={<PriorityReset onBack={() => setScreen("reset-list")} onNav={(s) => setScreen(s as Screen)} />} />
            <Route path="/breathing-reset" element={<BreathingReset onBack={() => setScreen("reset-list")} onNav={(s) => setScreen(s as Screen)} />} />
            <Route path="/journal" element={<Journal onBack={() => setScreen("reset-list")} onNav={(s) => setScreen(s as Screen)} />} />
            <Route path="/music-reset" element={<MusicalReset onBack={() => setScreen("reset-list")} onNav={(s) => setScreen(s as Screen)} />} />
            <Route path="/movement-reset" element={<MovementReset onBack={() => setScreen("reset-list")} onNav={(s) => setScreen(s as Screen)} />} />
            <Route path="/energy-reset" element={<GuidedReset module="energy_reset" onBack={() => setScreen("reset-list")} onNav={(s) => setScreen(s as Screen)} />} />
            <Route path="/relaxation" element={<GuidedReset module="relaxation" onBack={() => setScreen("reset-list")} onNav={(s) => setScreen(s as Screen)} />} />
            <Route path="/sleep-winddown" element={<GuidedReset module="sleep_wind_down" onBack={() => setScreen("reset-list")} onNav={(s) => setScreen(s as Screen)} />} />
            <Route path="/my-stress" element={<MyStressScreen onNav={setScreen} />} />
            <Route path="/support" element={<SupportScreen onNav={setScreen} />} />
            <Route path="/professional-support" element={<ProfessionalSupportScreen onBack={() => setScreen("support")} />} />
            <Route path="/emergency-support" element={<EmergencySupportScreen onBack={() => setScreen("support")} />} />
            <Route path="/listener-connect" element={<ListenerConnectScreen onBack={() => setScreen("support")} onNav={setScreen} />} />
            <Route path="/listener-schedule" element={<ListenerScheduleScreen onBack={() => setScreen("listener-connect")} />} />
            <Route path="/notifications" element={<NotificationsScreen onBack={() => setScreen("home")} />} />
            <Route path="/reset-labs" element={<ResetLabsScreen onNav={setScreen} />} />
            <Route path="/archetype" element={<ArchetypeScreen onNav={setScreen} />} />
            <Route path="/profile" element={<ProfileScreen onBack={() => setScreen("home")} onNav={setScreen} />} />
            <Route path="/settings" element={<SettingsScreen onBack={() => setScreen("profile")} />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>

        {!isFullscreen && <BottomNav active={window.location.pathname.split('/').pop() || "home"} onNav={setScreen} />}
      </div>
    </div>
  )
}
'''
emp = re.sub(r'export default function EmployeeApp\(\) \{.*', emp_func, emp, flags=re.DOTALL)

with open('src/components/employee/EmployeeApp.tsx', 'w') as f:
    f.write(emp)
