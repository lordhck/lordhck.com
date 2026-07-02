from pathlib import Path
import markdown
import yaml
from datetime import datetime, date


def format_date(value):
    if not value:
        return "", "", None

    if isinstance(value, datetime):
        dt = value
        long = dt.strftime("%a, %d %b %Y, %H:%M")
    elif isinstance(value, date):
        dt = datetime(value.year, value.month, value.day)
        long = dt.strftime("%a, %d %b %Y")
    else:
        try:
            dt = datetime.strptime(value, "%Y-%m-%d %H:%M")
            long = dt.strftime("%a, %d %b %Y, %H:%M")
        except ValueError:
            d = datetime.strptime(value, "%Y-%m-%d").date()
            dt = datetime(d.year, d.month, d.day)
            long = dt.strftime("%a, %d %b %Y")

    return dt.strftime("%d %b %Y"), long, dt


def load_post(path: Path):
    text = path.read_text()

    meta = {}
    body = text

    if text.startswith("---"):
        _, fm, body = text.split("---", 2)
        meta = yaml.safe_load(fm) or {}

    html = markdown.markdown(body, extensions=["codehilite", "fenced_code"])

    formatted_date, formatted_date_long, raw_date = format_date(meta.get("date"))

    title = meta.get("title", path.stem)

    description = (meta.get("description") or "").strip()
    if not description:
        raise ValueError(f"{path.name}: missing required 'description' in frontmatter")

    return {
        "title": title,
        "description": description,
        "date": formatted_date,
        "date_long": formatted_date_long,
        "date_raw": raw_date,
        "tags": [t.strip() for t in str(meta.get("tag", "untagged")).split(",")],
        "slug": path.stem,
        "content": html,
        "url": f"/post/{path.stem}.html"
    }


def build_posts(posts, dist, template, commit_short, commit_full):
    for post in posts:
        print(f"Writing post: {post['slug']}.html")
        output = template.render(
            title=post["title"],
            description=post["description"],
            date=post["date_long"],
            date_iso=post["date_raw"].isoformat() if post["date_raw"] else "",
            tags=post["tags"],
            content=post["content"],
            url=post["url"],
            commit_short=commit_short,
            commit_full=commit_full
        )
        (dist / "post" / f"{post['slug']}.html").write_text(output)
