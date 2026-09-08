import re

with open('src/pages/admin/hr/HRApp.tsx', 'r') as f:
    hr_app = f.read()

# Replace <div className="flex size-full bg-midnight"> with <div className="flex w-full min-h-screen bg-midnight text-warm-white">
hr_app = hr_app.replace('<div className="flex size-full bg-midnight">', '<div className="flex w-full min-h-screen bg-midnight text-warm-white">')

# Make sidebar 256px fixed width
hr_app = hr_app.replace('<div className="w-56 flex-shrink-0 bg-deep-navy border-r border-border-p flex flex-col py-6">', '<div className="w-64 flex-shrink-0 bg-deep-navy border-r border-border-p flex flex-col py-6">')

# Modify inner content containers for max width without overflow
hr_app = hr_app.replace('<div className="flex-1 overflow-y-auto p-8 max-w-2xl">', '<div className="flex-1 overflow-y-auto p-8 w-full max-w-[1400px] mx-auto">')
hr_app = hr_app.replace('<div className="flex-1 overflow-y-auto p-8">', '<div className="flex-1 overflow-y-auto p-8 w-full max-w-[1400px] mx-auto">')

# Fix tables (add overflow-x-auto to the table containers)
# The tables are currently div based. We'll find card-base containing lists and ensure they aren't compressed.
hr_app = hr_app.replace('grid-cols-4', 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4')
hr_app = hr_app.replace('grid-cols-3', 'grid-cols-1 md:grid-cols-3')
hr_app = hr_app.replace('grid-cols-2', 'grid-cols-1 md:grid-cols-2')

# In OverviewScreen, change `col-span-1` and `col-span-2` structure if needed
hr_app = hr_app.replace('col-span-2', 'col-span-1 md:col-span-2')

# Fix header title
hr_app = hr_app.replace('<h1 className="font-display text-3xl', '<h1 className="font-display text-3xl md:text-4xl')

with open('src/pages/admin/hr/HRApp.tsx', 'w') as f:
    f.write(hr_app)

