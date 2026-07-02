def build_sitemap(posts, tags):
    # (loc, lastmod) — lastmod is a "YYYY-MM-DD" string or None
    entries = []

    dated = [p for p in posts if p["date_raw"]]
    home_lastmod = max(p["date_raw"] for p in dated).strftime("%Y-%m-%d") if dated else None
    entries.append(("https://lordhck.com/", home_lastmod))

    for post in posts:
        lastmod = post["date_raw"].strftime("%Y-%m-%d") if post["date_raw"] else None
        entries.append((f"https://lordhck.com{post['url']}", lastmod))

    for tag in tags:
        entries.append((f"https://lordhck.com/tags/{tag}", None))

    def render(loc, lastmod):
        if lastmod:
            return f"  <url><loc>{loc}</loc><lastmod>{lastmod}</lastmod></url>"
        return f"  <url><loc>{loc}</loc></url>"

    items = "\n".join(render(loc, lastmod) for loc, lastmod in entries)
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
{items}
</urlset>
"""
