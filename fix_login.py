import re

with open('src/pages/auth/Login.tsx', 'r') as f:
    content = f.read()

# Create EmailIcon
email_icon = '''function EmailIcon({ focused }: { focused: boolean }) {
  return (
    <svg className={`w-4 h-4 flex-shrink-0 transition-colors ${focused ? "text-purple-core" : "text-text-muted"}`} fill="none" viewBox="0 0 20 20">
      <path d="M3 5h14a2 2 0 012 2v6a2 2 0 01-2 2H3a2 2 0 01-2-2V7a2 2 0 012-2z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2.5 6l7.5 5 7.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
'''
if "function EmailIcon" not in content:
    content = content.replace('function LockIcon', email_icon + '\nfunction LockIcon')

# Replace username input logic to switch based on mode
username_input_old = '''<InputRow
                  icon={<PersonIcon focused={usernameFocused} />}
                  placeholder="Username"
                  value={username}
                  onChange={setUsername}
                  focused={usernameFocused}
                  onFocus={() => setUsernameFocused(true)}
                  onBlur={() => setUsernameFocused(false)}
                />'''

username_input_new = '''<InputRow
                  icon={mode === "employee" ? <PersonIcon focused={usernameFocused} /> : <EmailIcon focused={usernameFocused} />}
                  type={mode === "employee" ? "text" : "email"}
                  placeholder={mode === "employee" ? "Username" : "Email"}
                  value={username}
                  onChange={setUsername}
                  focused={usernameFocused}
                  onFocus={() => setUsernameFocused(true)}
                  onBlur={() => setUsernameFocused(false)}
                />'''
content = content.replace(username_input_old, username_input_new)

# Replace "Sign in with your" \n "username"
sign_in_text_old = '''<h1 className="text-3xl font-bold text-warm-white mb-1">Sign in with your</h1>
              <h1 className="font-display text-3xl italic text-gradient mb-3">username</h1>'''

sign_in_text_new = '''<h1 className="text-3xl font-bold text-warm-white mb-1">Sign in with your</h1>
              <h1 className="font-display text-3xl italic text-gradient mb-3">{mode === "employee" ? "username" : "email"}</h1>'''
content = content.replace(sign_in_text_old, sign_in_text_new)

# Remove "Join with Org Code" when mode === "hr"
join_old = '''<p className="text-center text-sm text-text-muted">
                {"Don't have an account? "}
                <button onClick={() => setScreen("join")} className="text-lavender-bright font-semibold hover:text-lavender-soft transition-colors">
                  Join with Org Code
                </button>
              </p>'''

join_new = '''{mode === "employee" && (
                <p className="text-center text-sm text-text-muted">
                  {"Don't have an account? "}
                  <button onClick={() => setScreen("join")} className="text-lavender-bright font-semibold hover:text-lavender-soft transition-colors">
                    Join with Org Code
                  </button>
                </p>
              )}'''
content = content.replace(join_old, join_new)

with open('src/pages/auth/Login.tsx', 'w') as f:
    f.write(content)

