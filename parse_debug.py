import re
with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

divs = re.finditer(r'<div\b[^>]*>|</div>', html, re.IGNORECASE)
depth = 0
in_body = False
for match in divs:
    tag = match.group()
    if 'class="content-body"' in tag.lower():
        in_body = True
        depth = 0
        print(f"FOUND content-body at {match.start()}")
        continue
    
    if in_body:
        if '<div' in tag.lower() and not tag.strip().endswith('/>'):
            depth += 1
            print(f"   OPEN (depth {depth}): {tag}")
            if 'id="page-' in tag.lower():
                print(f"----> {tag}")
        elif '</div>' in tag.lower():
            depth -= 1
            print(f"   CLOSE(depth {depth}): {tag}")
            if depth < 0:
                print(f"EXITING content-body at {match.start()}")
                in_body = False
