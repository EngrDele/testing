"""Draws the Site Life app icons (a yellow hard hat on a dark green shield) with the Python
standard library only. Run from safety-game/:  python3 icons/make-icons.py
Writes icons/icon-192.png, icons/icon-512.png (also used as maskable: the art stays inside the
central 80% safe zone) and icons/apple-touch-icon.png (180 px)."""
import math, os, struct, zlib

HERE = os.path.dirname(os.path.abspath(__file__))
BG = (18, 28, 34)          # dark slate, fills the whole square (maskable)
SHIELD = (15, 122, 79)     # brand green (--brand in the games)
RIM = (10, 84, 54)
HAT = (255, 200, 0)        # safety yellow
HAT_DARK = (214, 158, 0)
WHITE = (255, 255, 255)


def png(path, w, h, rows):
    raw = b''.join(b'\x00' + bytes(r) for r in rows)
    def chunk(t, d):
        c = struct.pack('>I', len(d)) + t + d
        return c + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    data = (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0))
            + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b''))
    open(path, 'wb').write(data)


def colour(u, v):
    """Colour at unit coordinates (0..1, y down)."""
    x, y = u - .5, v - .5
    # shield: flat top with rounded corners, pointed bottom (inside the 80% safe zone)
    def in_shield(s):
        top, half = -.30 * s, .27 * s
        if y < top or abs(x) > half: return False
        if y < .02 * s: return True
        bottom = .34 * s           # point of the shield
        if y > bottom: return False
        return abs(x) <= half * (1 - (y - .02 * s) / (bottom - .02 * s)) ** .8
    c = BG
    if in_shield(1.0): c = RIM
    if in_shield(.9): c = SHIELD
    # hard hat: dome + brim + ridge, sitting in the upper middle of the shield
    hx, hy = x, y + .02
    dome = (hx / .17) ** 2 + (hy / .15) ** 2 <= 1 and hy <= 0
    brim = -.215 <= hx <= .215 and 0 <= hy <= .04
    ridge = abs(hx) <= .025 and -.155 <= hy <= 0 and (hx / .17) ** 2 + (hy / .155) ** 2 <= 1.02
    if dome: c = HAT
    if ridge: c = HAT_DARK
    if brim: c = HAT_DARK if hy > .028 else HAT
    # tick under the hat (white check mark)
    def seg(px, py, ax, ay, bx, by, wdt):
        dx, dy = bx - ax, by - ay
        t = max(0, min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
        return math.hypot(px - (ax + t * dx), py - (ay + t * dy)) <= wdt
    if seg(x, y, -.085, .115, -.025, .175, .026) or seg(x, y, -.025, .175, .095, .065, .026): c = WHITE
    return c


def draw(size, ss=3):
    rows = []
    for j in range(size):
        row = []
        for i in range(size):
            acc = [0, 0, 0]
            for a in range(ss):
                for b in range(ss):
                    c = colour((i + (a + .5) / ss) / size, (j + (b + .5) / ss) / size)
                    acc[0] += c[0]; acc[1] += c[1]; acc[2] += c[2]
            row += [round(v / (ss * ss)) for v in acc]
        rows.append(row)
    return rows


if __name__ == '__main__':
    for n, name in ((192, 'icon-192.png'), (512, 'icon-512.png'), (180, 'apple-touch-icon.png')):
        png(os.path.join(HERE, name), n, n, draw(n))
        print('wrote icons/' + name)
