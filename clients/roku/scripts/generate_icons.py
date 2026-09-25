import os
from PIL import Image, ImageDraw, ImageFont

img_dir = os.path.join(os.path.dirname(__file__), "..", "images")
os.makedirs(img_dir, exist_ok=True)

def create_bolt():
    im = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    # Bright yellow/emerald bolt
    poly = [(18, 2), (6, 17), (15, 17), (13, 30), (26, 13), (17, 13)]
    d.polygon(poly, fill="#34D399")
    im.save(os.path.join(img_dir, "icon_bolt.png"), "PNG")

def create_fire():
    im = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    # Orange flame
    d.polygon([(16, 2), (24, 12), (28, 22), (22, 30), (10, 30), (4, 22), (8, 12)], fill="#F97316")
    # Inner yellow core
    d.polygon([(16, 12), (21, 18), (19, 28), (13, 28), (11, 18)], fill="#FDE047")
    im.save(os.path.join(img_dir, "icon_fire.png"), "PNG")

def create_think():
    im = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    # Blue/purple think cloud
    d.ellipse([(4, 4), (28, 24)], fill="#818CF8")
    d.ellipse([(6, 22), (12, 28)], fill="#818CF8")
    d.ellipse([(4, 27), (8, 31)], fill="#818CF8")
    im.save(os.path.join(img_dir, "icon_think.png"), "PNG")

def create_idea():
    im = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    # Yellow lightbulb
    d.ellipse([(7, 3), (25, 21)], fill="#FBBF24")
    d.rectangle([(12, 20), (20, 26)], fill="#94A3B8")
    d.rectangle([(13, 26), (19, 29)], fill="#64748B")
    im.save(os.path.join(img_dir, "icon_idea.png"), "PNG")

def create_100():
    im = Image.new("RGBA", (36, 32), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    # Red 100 badge
    d.rectangle([(2, 4), (34, 28)], fill="#EF4444")
    d.text((4, 6), "100", fill="#FFFFFF")
    im.save(os.path.join(img_dir, "icon_100.png"), "PNG")

def create_down():
    im = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    # Thumbs down / down arrow in subtle red/slate
    d.polygon([(6, 8), (26, 8), (16, 26)], fill="#94A3B8")
    im.save(os.path.join(img_dir, "icon_down.png"), "PNG")

create_bolt()
create_fire()
create_think()
create_idea()
create_100()
create_down()
print("Generated 6 custom 32x32 icons successfully!")
