from PIL import Image, ImageDraw
import os

ROOT = "assets/images"
S = 1024
os.makedirs(ROOT, exist_ok=True)

GREEN = (12, 79, 55, 255)
GREEN_2 = (54, 145, 76, 255)
GOLD = (244, 180, 52, 255)
CREAM = (248, 250, 245, 255)


def draw_mark(size=1024, transparent=False, monochrome=False):
    im = Image.new("RGBA", (size, size), (0, 0, 0, 0) if transparent else CREAM)
    d = ImageDraw.Draw(im)
    cx, sy = size // 2, int(size * 0.255)
    primary = GREEN if not monochrome else (20, 60, 45, 255)
    secondary = GREEN_2 if not monochrome else primary
    accent = GOLD if not monochrome else primary
    u = size / 1024
    d.ellipse((cx - 70*u, sy - 70*u, cx + 70*u, sy + 70*u), fill=accent)
    d.ellipse((cx - 32*u, sy + 120*u, cx + 32*u, sy + 184*u), fill=primary)
    d.polygon([(cx, sy + 205*u), (cx - 300*u, sy + 520*u), (cx - 170*u, sy + 600*u), (cx - 10*u, sy + 380*u)], fill=primary)
    d.polygon([(cx + 5*u, sy + 205*u), (cx + 300*u, sy + 500*u), (cx + 165*u, sy + 600*u), (cx + 20*u, sy + 380*u)], fill=secondary)
    return im


def save_icon(path):
    size = 1024
    im = Image.new("RGBA", (size * 4, size * 4), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((0, 0, size * 4, size * 4), radius=120 * 4, fill=CREAM)
    mark = draw_mark(size * 4, transparent=True)
    im.alpha_composite(mark)
    im.resize((size, size), Image.Resampling.LANCZOS).save(path, optimize=True)


save_icon(os.path.join(ROOT, "icon.png"))
save_icon(os.path.join(ROOT, "splash-icon.png"))
draw_mark(1024, transparent=True, monochrome=True).save(os.path.join(ROOT, "android-icon-monochrome.png"), optimize=True)
draw_mark(1024, transparent=True).save(os.path.join(ROOT, "android-icon-foreground.png"), optimize=True)
Image.new("RGBA", (1024, 1024), CREAM).save(os.path.join(ROOT, "android-icon-background.png"), optimize=True)

# Small web favicon derived from the same mark.
mark = draw_mark(512, transparent=False)
mark.resize((192, 192), Image.Resampling.LANCZOS).save(os.path.join(ROOT, "favicon.png"), optimize=True)
print("Jeevya brand assets created")
