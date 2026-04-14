import re
with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

divs = re.finditer(r'<div\b[^>]*>|</div>', html, re.IGNORECASE)
depth = 0
for match in divs:
    tag = match.group()
    if '<div' in tag.lower() and not tag.strip().endswith('/>'):
        depth += 1
    elif '</div>' in tag.lower():
        depth -= 1
        if depth < 0:
            print(f"Negative depth at offset {match.start()}!")
            break

print("Final depth:", depth)
