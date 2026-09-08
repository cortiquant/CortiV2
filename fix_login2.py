import re

with open('src/pages/auth/Login.tsx', 'r') as f:
    content = f.read()

# Replace states
content = content.replace('const [username, setUsername] = useState("")', 'const [employeeUsername, setEmployeeUsername] = useState("")\n  const [hrEmail, setHrEmail] = useState("")')

# Replace the input row
old_input = '''<InputRow
                  icon={mode === "employee" ? <PersonIcon focused={usernameFocused} /> : <EmailIcon focused={usernameFocused} />}
                  type={mode === "employee" ? "text" : "email"}
                  placeholder={mode === "employee" ? "Username" : "Email"}
                  value={username}
                  onChange={setUsername}
                  focused={usernameFocused}
                  onFocus={() => setUsernameFocused(true)}
                  onBlur={() => setUsernameFocused(false)}
                />'''

new_input = '''<InputRow
                  icon={mode === "employee" ? <PersonIcon focused={usernameFocused} /> : <EmailIcon focused={usernameFocused} />}
                  type={mode === "employee" ? "text" : "email"}
                  placeholder={mode === "employee" ? "Username" : "Enter your email"}
                  value={mode === "employee" ? employeeUsername : hrEmail}
                  onChange={mode === "employee" ? setEmployeeUsername : setHrEmail}
                  focused={usernameFocused}
                  onFocus={() => setUsernameFocused(true)}
                  onBlur={() => setUsernameFocused(false)}
                />'''
content = content.replace(old_input, new_input)

# Update payload references if any
# Let's check handleSignIn
old_handle_sign_in = '''function handleSignIn() {
    if (mode === "employee") onEmployeeSignIn()
    else onHR()
  }'''

new_handle_sign_in = '''function handleSignIn() {
    if (mode === "employee") {
      // API request payload would use { username: employeeUsername, password }
      onEmployeeSignIn()
    } else {
      // API request payload would use { email: hrEmail, password }
      onHR()
    }
  }'''
content = content.replace(old_handle_sign_in, new_handle_sign_in)

with open('src/pages/auth/Login.tsx', 'w') as f:
    f.write(content)

