"""Download self-hosted Cyrillic Golos Text fonts and the OFL licence from upstream."""
from pathlib import Path
from urllib.request import urlopen

root = Path(__file__).resolve().parent.parent / 'site' / 'assets' / 'fonts'
root.mkdir(parents=True, exist_ok=True)
fonts = {
    'golos-regular.ttf': 'https://fonts.gstatic.com/s/golostext/v7/q5uXsoe9Lv5t7Meb31EcOR9UdVTNs822plVRRQ5c.ttf',
    'golos-bold.ttf': 'https://fonts.gstatic.com/s/golostext/v7/q5uXsoe9Lv5t7Meb31EcOR9UdVTNs822plW2Qg5c.ttf',
    'golos-extra-bold.ttf': 'https://fonts.gstatic.com/s/golostext/v7/q5uXsoe9Lv5t7Meb31EcOR9UdVTNs822plXRQg5c.ttf',
    'OFL.txt': 'https://raw.githubusercontent.com/google/fonts/main/ofl/golostext/OFL.txt',
}
for filename, url in fonts.items():
    with urlopen(url, timeout=30) as response:
        (root / filename).write_bytes(response.read())
    print(filename, (root / filename).stat().st_size)
