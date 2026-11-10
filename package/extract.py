from html.parser import HTMLParser
from urllib.parse import urljoin, urlparse
from urllib.request import Request, urlopen
from pathlib import Path

BASE = "https://poki.com/"
ALLOWED = {
    "a.poki-cdn.com",
    "img.poki-cdn.com",
    "v.poki-cdn.com",
}
ROOT = Path("extracted")
HTML = Path("homepage.html")

class Parser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.urls = set()

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)

        if tag == "script" and a.get("src"):
            self.urls.add(a["src"])

        if tag == "link" and a.get("href"):
            if a.get("rel") in ("stylesheet", "manifest", "icon"):
                self.urls.add(a["href"])

        if tag == "img" and a.get("src"):
            self.urls.add(a["src"])

parser = Parser()
parser.feed(HTML.read_text(errors="replace"))

def download(url):
    full = urljoin(BASE, url)
    parsed = urlparse(full)

    if parsed.hostname not in ALLOWED:
        return

    if not parsed.path.startswith(("/assets/", "/icons/", "/img/")):
        return

    path = ROOT / parsed.hostname / parsed.path.lstrip("/")
    path.parent.mkdir(parents=True, exist_ok=True)

    try:
        req = Request(full, headers={"User-Agent": "Mozilla/5.0"})
        with urlopen(req, timeout=20) as response:
            data = response.read(20 * 1024 * 1024 + 1)

            if len(data) > 20 * 1024 * 1024:
                print("SKIPPED (size limit):", full)
                return

            path.write_bytes(data)
            print("SAVED:", path, len(data), "bytes")

    except Exception as e:
        print("FAILED:", full, str(e))

for url in sorted(parser.urls):
    download(url)

print("\nExtraction completed.")
