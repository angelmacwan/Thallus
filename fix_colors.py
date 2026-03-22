#!/usr/bin/env python3
import sys

filepath = '/Users/angel/Documents/mv2/frontend/src/views/Session.jsx'

with open(filepath, 'r') as f:
    content = f.read()

original = content

# Check tab count on each target line
lines = content.split('\n')
target_lines = {i+1: lines[i] for i in range(len(lines)) if '#fdf7f2' in lines[i] or '#1a1208' in lines[i] or '#faf7f4' in lines[i] or "#fff'" in lines[i]}
print("Target lines found:")
for lineno, line in sorted(target_lines.items()):
    tabs = len(line) - len(line.lstrip('\t'))
    print(f"  Line {lineno}: {tabs} tabs | {line.strip()!r}")

# Simple single-line replacements for the clearly isolated cases
replacements = [
    # Agent row background
    ("background: '#fdf7f2',\n\t\t\t\t\t\t\t\t\t\t\t\tborderRadius: '8px',\n\t\t\t\t\t\t\t\t\t\t\t\tborder: '1px solid var(--border-color)',",
     "background: 'var(--surface-container-low)',\n\t\t\t\t\t\t\t\t\t\t\t\tborderRadius: '8px',\n\t\t\t\t\t\t\t\t\t\t\t\tborder: '1px solid var(--outline-variant)',"),
    # Relation row background
    ("background: '#fdf7f2',\n\t\t\t\t\t\t\t\t\t\t\t\tborderRadius: '6px',\n\t\t\t\t\t\t\t\t\t\t\t\tborder: '1px solid var(--border-color)',",
     "background: 'var(--surface-container-low)',\n\t\t\t\t\t\t\t\t\t\t\t\tborderRadius: '6px',\n\t\t\t\t\t\t\t\t\t\t\t\tborder: '1px solid var(--outline-variant)',"),
    # Info metadata block
    ("background: '#fdf7f2',\n\t\t\t\t\t\t\t\t\t\t\tborder: '1px solid var(--border-color)',",
     "background: 'var(--surface-container-low)',\n\t\t\t\t\t\t\t\t\t\t\tborder: '1px solid var(--outline-variant)',"),
    # Chat container
    ("background: '#faf7f4',\n\t\t\t\t\t\tborder: '1.5px solid var(--border-color)',\n\t\t\t\t\t\tborderRadius: '12px',",
     "background: 'var(--surface-container-lowest)',\n\t\t\t\t\t\tborder: '1px solid var(--outline-variant)',\n\t\t\t\t\t\tborderRadius: '12px',"),
]

for old, new in replacements:
    if old in content:
        content = content.replace(old, new)
        print(f"✓ Replaced: {old[:60]!r}")
    else:
        print(f"✗ NOT FOUND: checking tab counts for: {old[:60]!r}")
        # Debug: show what we'd expect
        first_line = old.split('\n')[0]
        for lineno, line in target_lines.items():
            if first_line.strip() in line:
                print(f"  Found similar at line {lineno}: {line!r}")

# Now let's count exact tabs and do targeted line-by-line replacements
print("\n--- Now doing line-by-line targeted replacements ---")
lines = content.split('\n')
changed = 0
i = 0
while i < len(lines):
    line = lines[i]
    stripped = line.lstrip('\t')
    tabs = len(line) - len(stripped)
    tab = '\t' * tabs
    
    # Replace #fdf7f2 background lines
    if stripped == "background: '#fdf7f2',":
        lines[i] = tab + "background: 'var(--surface-container-low)',"
        changed += 1
        print(f"  Line {i+1}: #fdf7f2 → surface-container-low")
    
    # Replace border-color with outline-variant (only targeting non-canvas lines)
    elif stripped == "border: '1px solid var(--border-color)',":
        lines[i] = tab + "border: '1px solid var(--outline-variant)',"
        changed += 1
        print(f"  Line {i+1}: border-color → outline-variant")
    
    # Replace #faf7f4 chat container
    elif stripped == "background: '#faf7f4',":
        lines[i] = tab + "background: 'var(--surface-container-lowest)',"
        changed += 1
        print(f"  Line {i+1}: #faf7f4 → surface-container-lowest")
    
    # Replace 1.5px border with outline-variant
    elif stripped == "border: '1.5px solid var(--border-color)',":
        lines[i] = tab + "border: '1px solid var(--outline-variant)',"
        changed += 1
        print(f"  Line {i+1}: 1.5px border-color → outline-variant")
    
    # Replace #fff chat form background
    elif stripped == "background: '#fff',":
        lines[i] = tab + "background: 'var(--surface-container-low)',"
        changed += 1
        print(f"  Line {i+1}: #fff → surface-container-low")
    
    i += 1

content = '\n'.join(lines)

# Now handle the #1a1208 log blocks - they have unique surrounding structure
# Running log: 9 tabs (lines ~832-841)
# Info event log: 8 tabs (lines ~1241-1250)
# Use different tab counts to distinguish them

lines = content.split('\n')
i = 0
while i < len(lines):
    line = lines[i]
    stripped = line.lstrip('\t')
    tabs = len(line) - len(stripped)
    tab = '\t' * tabs
    
    if stripped == "background: '#1a1208',":
        lines[i] = tab + "background: 'var(--primary)',"
        changed += 1
        print(f"  Line {i+1}: #1a1208 ({tabs} tabs) → var(--primary)")
    elif stripped == "border: '2px solid rgba(232,114,10,0.2)',":
        lines[i] = tab + "border: '1px solid var(--primary-container)',"
        changed += 1
        print(f"  Line {i+1}: rgba border ({tabs} tabs) → primary-container")
    
    i += 1

# Handle borderTop multi-line case
content = '\n'.join(lines)
content = content.replace(
    "borderTop:\n\t\t\t\t\t\t\t\t\t\t'1.5px solid var(--border-color)',",
    "borderTop: '1px solid var(--outline-variant)',"
)
if "'1.5px solid var(--border-color)'" in content:
    print("✗ borderTop replacement may have failed - searching...")
else:
    print("✓ borderTop multi-line replaced")

# Handle color: '#d4c8bc' in the log blocks (but not canvas)
lines = content.split('\n')
# We need to only replace the ones in the log div context
# Let's track context
in_log_div = False
for i, line in enumerate(lines):
    stripped = line.lstrip('\t')
    if "background: 'var(--primary)'," in stripped:
        in_log_div = True
    elif "}}>" in stripped or stripped.startswith('<') and in_log_div:
        in_log_div = False
    
    if in_log_div and stripped == "color: '#d4c8bc',":
        tabs = len(line) - len(line.lstrip('\t'))
        lines[i] = '\t' * tabs + "color: 'var(--primary-fixed)',"
        changed += 1
        print(f"  Line {i+1}: #d4c8bc ({tabs} tabs) → primary-fixed")

content = '\n'.join(lines)

print(f"\nTotal changes: {changed}")

with open(filepath, 'w') as f:
    f.write(content)

print("Session.jsx written successfully.")

# Verify no targets remain
remaining = []
for check in ["#fdf7f2", "#1a1208", "#faf7f4", "1.5px solid var(--border-color)", "border: '1px solid var(--border-color)"]:
    if check in content:
        remaining.append(check)
        
if remaining:
    print(f"\n⚠ Still contains: {remaining}")
else:
    print("\n✓ All targeted colors replaced!")
