import re
with open('index.html', 'r', encoding='utf-8') as f:
    html = f.read()

divs = re.finditer(r'<main\b[^>]*>|</main>|<div\b[^>]*id="page-[^>]*>|</div>', html, re.IGNORECASE)
in_main = False
for match in divs:
    tag = match.group()
    if '<main' in tag.lower():
        in_main = True
    elif '</main>' in tag.lower():
        in_main = False
    elif 'id="page-' in tag.lower():
        print(f"{tag.strip()} - IN MAIN: {in_main}")

