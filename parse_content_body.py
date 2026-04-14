import re
with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

divs = re.finditer(r'<div\b[^>]*class="content-body"[^>]*>|<div\b[^>]*id="page-[^>]*>|</div>', html, re.IGNORECASE)
depth = 0
in_body = False
for match in divs:
    tag = match.group()
    if 'class="content-body"' in tag.lower():
        in_body = True
        depth = 0
    elif in_body:
        if '<div' in tag.lower():
            depth += 1
            if 'id="page-' in tag.lower():
                print(f"{tag.strip()} - IN CONTENT BODY")
        elif '</div>' in tag.lower():
            depth -= 1
            if depth < 0:
                in_body = False
