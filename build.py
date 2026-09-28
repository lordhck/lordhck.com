#!/usr/bin/env python3
import json
import re
import shutil
import subprocess
import tomllib
from datetime import date, datetime
from pathlib import Path
from urllib.parse import urljoin

import frontmatter
import markdown
from jinja2 import Environment, FileSystemLoader, StrictUndefined
from markupsafe import Markup

ROOT = Path(__file__).parent
TEMPLATES = ROOT / "templates"
STATIC = ROOT / "static"
POSTS_DIR = ROOT / "content" / "posts"
DIST = ROOT / "dist"

with open(ROOT / "config.toml", "rb") as f:
    CONFIG = tomllib.load(f)
SITE = CONFIG["site"]
PAGES = CONFIG.get("pages", {})

IMG_SRC = re.compile(r'<img\b[^>]*?\bsrc="([^"]+)"', re.IGNORECASE)
LOCAL_IMG = re.compile(
    r'(<img\b[^>]*?\bsrc="(?:[^"]*/)?static/imgs/[^"]+?)\.(?:jpe?g|png)"',
    re.IGNORECASE,
)

# Extended or included, never rendered alone
LAYOUTS = {"base.j2", "post.j2"}

# Not moved into <name>/index.html
FLAT_PAGES = {"index", "404"}


def load_post_meta(path, meta):
    def fail(msg):
        raise SystemExit(f"error: {path.relative_to(ROOT)}: {msg}")

    for key in ("title", "date", "description", "tags"):
        if key not in meta:
            fail(f"missing '{key}' in front matter")

    # YAML parses ISO timestamps into datetimes
    posted = meta["date"]
    if not isinstance(posted, datetime):
        fail("'date' needs a time and UTC offset, e.g. 2026-06-02T14:30:00+02:00")
    if posted.tzinfo is None:
        fail("'date' needs a UTC offset, e.g. 2026-06-02T14:30:00+02:00")

    tags = meta["tags"]
    if not isinstance(tags, list) or not all(isinstance(t, str) for t in tags):
        fail("'tags' must be a list of strings, e.g. [linux, python]")

    return meta


def absolute_url(path, base="/"):
    return urljoin(SITE["url"] + base, path)


def first_image(html, page_path):
    match = IMG_SRC.search(html)
    return absolute_url(match.group(1), page_path) if match else None


def load_posts():
    posts = []
    for path in POSTS_DIR.glob("*.md"):
        doc = frontmatter.load(path)
        slug = path.stem
        url = f"/post/{slug}.html"
        html = markdown.markdown(doc.content, extensions=["fenced_code", "tables"])
        # scripts/imgconvert turns these into .webp
        html = LOCAL_IMG.sub(r'\1.webp"', html)
        posts.append({
            **load_post_meta(path, doc.metadata),
            "slug": slug,
            "url": url,
            "html": html,
            "image": first_image(html, url),
        })
    return sorted(posts, key=lambda p: p["date"], reverse=True)


def json_ld(data):
    text = json.dumps({"@context": "https://schema.org", **data}, ensure_ascii=False, indent=2)
    # "</" would close the <script> tag early
    return Markup(text.replace("</", "<\\/"))


def person():
    return {"@type": "Person", "name": SITE["author"], "url": absolute_url("/")}


def page_json_ld(page, is_home):
    website = {
        "@type": "WebSite",
        "@id": absolute_url("/#website"),
        "name": SITE["name"],
        "url": absolute_url("/"),
        "description": SITE["description"],
        "inLanguage": SITE["language"],
        "author": person(),
    }
    if is_home:
        return json_ld(website)
    return json_ld({
        "@type": "WebPage",
        "name": page["title"],
        "url": page["url"],
        "description": page["description"],
        "inLanguage": SITE["language"],
        "isPartOf": {"@id": website["@id"]},
    })


def breadcrumbs(*crumbs):
    return {
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": i, "name": name, "item": url}
            for i, (name, url) in enumerate(crumbs, start=1)
        ],
    }


def post_json_ld(post, page):
    published = post["date"].isoformat()
    return json_ld({"@graph": [{
        "@type": "BlogPosting",
        "headline": post["title"],
        "description": post["description"],
        "url": page["url"],
        "mainEntityOfPage": {"@type": "WebPage", "@id": page["url"]},
        "image": [page["image"]],
        "datePublished": published,
        "dateModified": published,
        "author": person(),
        "publisher": person(),
        "keywords": post["tags"],
        "inLanguage": SITE["language"],
    }, breadcrumbs(
        ("Home", absolute_url("/")),
        ("Posts", absolute_url("/posts/")),
        (post["title"], page["url"]),
    )]})


def git_version():
    try:
        result = subprocess.run(
            ["git", "rev-parse", "--short", "HEAD"],
            cwd=ROOT, capture_output=True, text=True, check=True,
        )
    except (OSError, subprocess.CalledProcessError):
        return "unknown"
    return result.stdout.strip()


def template_pages():
    pages = []
    for path in sorted(TEMPLATES.rglob("*.j2")):
        name = path.relative_to(TEMPLATES).as_posix()
        if name in LAYOUTS or path.name.startswith("_"):
            continue
        # posts.j2 -> posts/index.html
        stem = Path(name).with_suffix("")
        if stem.name in FLAT_PAGES:
            out = DIST / stem.with_suffix(".html")
        else:
            out = DIST / stem / "index.html"
        url = "/" + out.relative_to(DIST).as_posix().removesuffix("index.html")
        pages.append((name, out, url, PAGES.get(stem.as_posix(), {})))
    return pages


def write_robots():
    robots = f"User-agent: *\nAllow: /\n\nSitemap: {absolute_url('/sitemap.xml')}\n"
    (DIST / "robots.txt").write_text(robots, encoding="utf-8")


def build():
    if DIST.exists():
        shutil.rmtree(DIST)
    DIST.mkdir()

    env = Environment(
        loader=FileSystemLoader(TEMPLATES),
        autoescape=True,
        undefined=StrictUndefined,
        trim_blocks=True,
        lstrip_blocks=True,
        keep_trailing_newline=True,
    )
    posts = load_posts()
    context = {
        "site": SITE,
        "year": date.today().year,
        "version": git_version(),
        "posts": posts,
    }

    for name, out, url, meta in template_pages():
        page = {
            "title": meta.get("title", SITE["name"]),
            "description": meta.get("description", SITE["description"]),
            "url": absolute_url(url),
            "type": "website",
            "image": absolute_url(meta.get("image", SITE["image"])),
            "noindex": meta.get("noindex", False),
        }
        page["json_ld"] = page_json_ld(page, is_home=url == "/")
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(env.get_template(name).render(context, page=page), encoding="utf-8")

    post_template = env.get_template("post.j2")
    for post in posts:
        out = DIST / post["url"].lstrip("/")
        page = {
            "title": post["title"],
            "description": post["description"],
            "url": absolute_url(post["url"]),
            "type": "article",
            "image": post["image"] or absolute_url(SITE["image"]),
            "noindex": False,
        }
        page["json_ld"] = post_json_ld(post, page)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(post_template.render(context, post=post, page=page), encoding="utf-8")
        print(f"  content/posts/{post['slug']}.md -> {out.relative_to(ROOT)}")

    if STATIC.exists():
        shutil.copytree(STATIC, DIST / "static")

    # Custom domain for GitHub Pages
    if (ROOT / "CNAME").exists():
        shutil.copy(ROOT / "CNAME", DIST / "CNAME")

    write_robots()

    from genfeed import write_feed
    write_feed(posts)

    from sitemap import write_sitemap
    write_sitemap(posts)


if __name__ == "__main__":
    build()
