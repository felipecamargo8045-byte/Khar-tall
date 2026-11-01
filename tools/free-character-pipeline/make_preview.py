"""Build a small inline preview with a genuine rendered-video fallback."""
import argparse
import base64
import gzip
import re
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--model', type=Path, required=True)
parser.add_argument('--video', type=Path, required=True)
parser.add_argument('--out', type=Path, required=True)
args = parser.parse_args()
template = Path(__file__).with_name('preview.template.html').read_text()
model_data = base64.b64encode(gzip.compress(args.model.read_bytes(), compresslevel=9, mtime=0)).decode()
video_data = base64.b64encode(args.video.read_bytes()).decode()
fragment = template.replace('__MODEL_DATA__', model_data).replace('__VIDEO_DATA__', video_data)
assert len(fragment.encode()) < 1_000_000, 'Preview exceeds the inline size limit'
assert not re.search(r'<(?:html|head|body)\b|<!doctype', fragment, re.I)
assert 'fetch(' not in fragment and 'XMLHttpRequest' not in fragment
args.out.write_text(fragment)
print(f'{args.out}: {len(fragment.encode())} bytes')
