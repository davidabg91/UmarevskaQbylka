"""Копие на снимките на продуктите в сайта.

Снимките се качват от админ панела в хранилището на базата. Ако всеки посетител ги тегли оттам,
месечният лимит за трафик на базата свършва за няколко дни. Затова този скрипт ги копира в img/p/ —
смалени и във формат WebP — и сайтът ги зарежда от собствения си адрес. Базата остава само резерва
за снимка, качена след последното пускане.

За всяка снимка от базата прави:
    img/p/<име>.webp   — за страниците (до 1000 px)
    img/p/<име>.jpg    — за споделяне във Facebook и за търсачките (до 1200 px)
Снимки, които вече не се ползват от никой продукт, се махат.

Пуска се сам от tools/build-products.js; може и отделно:
    python -I tools/build-images.py
Трябва му библиотеката Pillow (pip install pillow).
"""
import io
import json
import re
import sys
import urllib.request
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'img' / 'p'
MAX_BYTES = 25 * 1024 * 1024
NAME = re.compile(r'/storage/v1/object/public/[\w-]+/([\w.-]+)\.(?:jpe?g|png|webp)$', re.I)


def config():
    src = (ROOT / 'config.js').read_text(encoding='utf-8')
    url = re.search(r'supabaseUrl\s*:\s*[\'"]([^\'"]+)[\'"]', src)
    key = re.search(r'supabaseKey\s*:\s*[\'"]([^\'"]+)[\'"]', src)
    if not url or not key:
        raise SystemExit('config.js: няма връзка с базата')
    return url.group(1).rstrip('/'), key.group(1)


def get(url, headers=None):
    req = urllib.request.Request(url, headers=headers or {})
    with urllib.request.urlopen(req, timeout=60) as r:
        data = r.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise ValueError('файлът е твърде голям')
    return data


def save(img, path, side, **opts):
    im = img.copy()
    im.thumbnail((side, side), Image.LANCZOS)
    tmp = path.with_name(path.name + '.tmp')
    im.save(tmp, **opts)
    tmp.replace(path)
    return path.stat().st_size


def main():
    for s in (sys.stdout, sys.stderr):   # конзолата на Windows иначе не може да изпише кирилица
        s.reconfigure(encoding='utf-8', errors='replace')
    base, key = config()
    headers = {'apikey': key}
    if key.startswith('eyJ'):
        headers['Authorization'] = 'Bearer ' + key
    urls = []
    for table in ('products', 'plans'):
        rows = json.loads(get(base + '/rest/v1/' + table + '?select=image_url', headers))
        urls += [r.get('image_url') or '' for r in rows]

    OUT.mkdir(parents=True, exist_ok=True)
    wanted, made, failed = set(), 0, 0
    for u in sorted(set(urls)):
        m = NAME.search(u)
        if not m or not u.startswith(base + '/'):   # само снимки от нашето хранилище
            continue
        name = m.group(1)
        webp, jpg = OUT / (name + '.webp'), OUT / (name + '.jpg')
        wanted.update((webp.name, jpg.name))
        if webp.exists() and jpg.exists():
            continue
        try:
            raw = get(u)
            img = ImageOps.exif_transpose(Image.open(io.BytesIO(raw)))
            if img.mode != 'RGB':   # прозрачните части стават бели
                rgba = img.convert('RGBA')
                img = Image.new('RGB', rgba.size, (255, 255, 255))
                img.paste(rgba, mask=rgba.split()[3])
            a = save(img, webp, 1000, format='WEBP', quality=78, method=6)
            b = save(img, jpg, 1200, format='JPEG', quality=82, optimize=True, progressive=True)
            made += 1
            print('  %s: %d KB → webp %d KB, jpg %d KB' % (name, len(raw) // 1024, a // 1024, b // 1024))
        except Exception as e:   # една лоша снимка не спира останалите — за нея сайтът ползва базата
            failed += 1
            print('  ! %s: %s' % (name, e), file=sys.stderr)

    removed = 0
    for f in OUT.iterdir():
        if f.is_file() and f.suffix in ('.webp', '.jpg', '.tmp') and f.name not in wanted:
            f.unlink()
            removed += 1
    print('Снимки: %d нови, %d махнати, %d общо в img/p/.' % (made, removed, len(wanted) // 2))
    if failed:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
