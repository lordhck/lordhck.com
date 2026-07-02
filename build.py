from pathlib import Path
import os
import shutil
import subprocess
from datetime import datetime
from jinja2 import Environment, FileSystemLoader
from pygments.formatters import HtmlFormatter

from genpost import load_post, build_posts
from genfeed import build_feed
from genmap import build_sitemap

# Jinja setup
env = Environment(loader=FileSystemLoader("templates"))
index_template = env.get_template("index.j2")
post_template = env.get_template("post.j2")
tag_template = env.get_template("tag.j2")
notfound_template = env.get_template("404.j2")

# Paths
DIST = Path("dist")
POSTS_DIR = Path("content/posts")
STATIC_DIR = Path("static")

# Clean dist
if DIST.exists():
    shutil.rmtree(DIST)

(DIST / "post").mkdir(parents=True, exist_ok=True)
(DIST / "static").mkdir(parents=True, exist_ok=True)

# Resolve commit hash
try:
    commit_short = subprocess.check_output(["git", "rev-parse", "--short", "HEAD"], text=True).strip()
    commit_full = subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip()
except Exception:
    commit_short = os.environ.get("COMMIT", "unknown")
    commit_full = os.environ.get("COMMIT_FULL", commit_short)

# Load and build posts
posts = [load_post(f) for f in POSTS_DIR.glob("*.md")]
posts.sort(key=lambda x: x["date_raw"] or datetime.min, reverse=True)
build_posts(posts, DIST, post_template, commit_short, commit_full)

# Build index
tags = sorted({tag for post in posts for tag in post["tags"]})
index_html = index_template.render(posts=posts, tags=tags, commit_short=commit_short, commit_full=commit_full)
(DIST / "index.html").write_text(index_html)

# Build tag pages
for tag in tags:
    tag_posts = [p for p in posts if tag in p["tags"]]
    tag_dir = DIST / "tags" / tag
    tag_dir.mkdir(parents=True, exist_ok=True)
    print(f"Writing tag page: tags/{tag}")
    tag_html = tag_template.render(tag=tag, posts=tag_posts, commit_short=commit_short, commit_full=commit_full)
    (tag_dir / "index.html").write_text(tag_html)

# Build 404 page
(DIST / "404.html").write_text(notfound_template.render(commit_short=commit_short, commit_full=commit_full))

# Copy static files
shutil.copytree(STATIC_DIR, DIST / "static", dirs_exist_ok=True)

# Copy CNAME for GitHub Pages
if Path("CNAME").exists():
    shutil.copy("CNAME", DIST / "CNAME")

# robots.txt
(DIST / "robots.txt").write_text(
    "User-agent: *\n"
    "Sitemap: https://lordhck.com/sitemap.xml\n"
)

# Generate syntax highlight CSS (lightbulb for light, one-dark for dark)
light = HtmlFormatter(style="lightbulb").get_style_defs(".codehilite")
dark_media = HtmlFormatter(style="one-dark").get_style_defs("html:not([data-theme=light]) .codehilite")
dark_attr = HtmlFormatter(style="one-dark").get_style_defs("html[data-theme=dark] .codehilite")
(DIST / "static" / "highlight.css").write_text(
    f"{light}\n"
    f"@media (prefers-color-scheme:dark){{\n{dark_media}\n}}\n"
    f"{dark_attr}\n"
)

# Generate feed and sitemap
(DIST / "feed.xml").write_text(build_feed(posts))
(DIST / "sitemap.xml").write_text(build_sitemap(posts, tags))

print("Build complete.")
