import re

with open('src/components/employee/EmployeeApp.tsx', 'r') as f:
    content = f.read()

# Extract DumpBagScreen and DumpResponseScreen
match_dumpbag = re.search(r'function DumpBagScreen.*?return\s+\(\s*<Shell>.*?</Shell>\s*\)\s*}', content, flags=re.DOTALL)
match_dumpresponse = re.search(r'function DumpResponseScreen.*?return\s+\(\s*<Shell>.*?</Shell>\s*\)\s*}', content, flags=re.DOTALL)

dumpbag_code = match_dumpbag.group(0)
dumpresponse_code = match_dumpresponse.group(0)

# Replace them in EmployeeApp.tsx with nothing (they'll be imported)
content = content.replace(dumpbag_code, '')
content = content.replace(dumpresponse_code, '')

# Export Shell, BackBtn, Screen, etc.
content = content.replace('type Screen =', 'export type Screen =')
content = content.replace('function Shell(', 'export function Shell(')
content = content.replace('function BackBtn(', 'export function BackBtn(')

# Add import
content = content.replace('import GuidedReset from "./GuidedReset"', 'import GuidedReset from "./GuidedReset"\nimport { DumpBagScreen, DumpResponseScreen } from "../../features/dumpbag/DumpBag"')

with open('src/components/employee/EmployeeApp.tsx', 'w') as f:
    f.write(content)

dumpbag_file = "import React, { useState } from 'react';\n"
dumpbag_file += "import { Screen, Shell, BackBtn } from '../../components/employee/EmployeeApp';\n\n"
dumpbag_file += "export " + dumpbag_code + "\n\n"
dumpbag_file += "export " + dumpresponse_code + "\n"

with open('src/features/dumpbag/DumpBag.tsx', 'w') as f:
    f.write(dumpbag_file)

