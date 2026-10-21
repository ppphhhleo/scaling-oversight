"""Fingerprint local asset URLs so a deployment cannot mix old and new viewer code."""
import hashlib
import re
from pathlib import Path

SITE = Path(__file__).resolve().parents[1] / 'site'

def update(path):
    def version(match):
        asset = match.group(1)
        digest = hashlib.sha256((SITE / asset).read_bytes()).hexdigest()[:12]
        return f'{asset}?rev={digest}'
    text = path.read_text()
    path.write_text(re.sub(r'(assets/[a-z-]+\.(?:js|css))(?:\?rev=[a-zA-Z0-9-]+)?', version, text))

# The bootstrap imports other assets, so fingerprint it before its HTML entry point.
update(SITE / 'assets/bootstrap.js')
for page in SITE.glob('*.html'):
    update(page)
