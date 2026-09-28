import os
from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "public")
GOLD = (198, 161, 91, 255)
TOP = (43, 74, 115)
BOT = (14, 27, 46)


def gradient(size, rounded):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    grad = Image.new("RGB", (1, size))
    px = grad.load()
    for y in range(size):
        t = y / max(1, size - 1)
        px[0, y] = tuple(int(TOP[i] + (BOT[i] - TOP[i]) * t) for i in range(3))
    grad = grad.resize((size, size))
    mask = Image.new("L", (size, size), 0)
    md = ImageDraw.Draw(mask)
    if rounded:
        r = int(size * 0.22)
        md.rounded_rectangle([0, 0, size - 1, size - 1], radius=r, fill=255)
    else:
        md.rectangle([0, 0, size - 1, size - 1], fill=255)
    img.paste(grad, (0, 0), mask)
    return img


def draw_scale(size, inset=0.20):
    img = gradient(size, rounded=(inset > 0))
    d = ImageDraw.Draw(img)
    s = size
    cx = s / 2
    top = s * inset
    bottom = s * (1 - inset)
    lw = max(2, int(s * 0.030))
    # pole
    d.line([(cx, top), (cx, bottom)], fill=GOLD, width=lw)
    # base
    d.line([(cx - s * 0.16, bottom), (cx + s * 0.16, bottom)], fill=GOLD, width=lw)
    # beam
    beam_y = top + s * 0.085
    d.line([(cx - s * 0.28, beam_y), (cx + s * 0.28, beam_y)], fill=GOLD, width=lw)
    # top knob
    k = s * 0.022
    d.ellipse([cx - k, top - k, cx + k, top + k], fill=GOLD)
    # pans
    pan_w = s * 0.15
    drop = s * 0.19
    for side in (-1, 1):
        x = cx + side * s * 0.28
        d.line([(x, beam_y), (x, beam_y + drop - s * 0.04)], fill=GOLD, width=lw)
        y = beam_y + drop
        d.polygon([(x - pan_w, y), (x + pan_w, y), (x, y + s * 0.075)], fill=GOLD)
    return img


def main():
    os.makedirs(OUT, exist_ok=True)
    for size in (192, 512):
        draw_scale(size).save(os.path.join(OUT, f"pwa-{size}.png"))
    draw_scale(180).save(os.path.join(OUT, "apple-touch-icon.png"))
    # maskable: full-bleed background, icon in safe zone
    mask = draw_scale(512, inset=0.30)
    bg = gradient(512, rounded=False)
    bg.alpha_composite(mask)
    bg.save(os.path.join(OUT, "pwa-maskable-512.png"))
    draw_scale(32).save(os.path.join(OUT, "favicon-32.png"))
    print("icons written:", sorted(os.listdir(OUT)))


if __name__ == "__main__":
    main()
