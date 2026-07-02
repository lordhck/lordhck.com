from xml.sax.saxutils import escape


def build_feed(posts):
    items = []

    for post in posts:
        if not post["date_raw"]:
            continue

        items.append(f"""
        <item>
            <title>{escape(post['title'])}</title>
            <link>https://lordhck.com{post['url']}</link>
            <description>{escape(post['description'])}</description>
            <pubDate>{post['date_raw'].strftime('%a, %d %b %Y %H:%M:%S +0000')}</pubDate>
            <guid>https://lordhck.com{post['url']}</guid>
        </item>
        """)

    return f"""<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
<channel>
    <title>Lordhck</title>
    <link>https://lordhck.com</link>
    <description>Personal website</description>
    {''.join(items)}
</channel>
</rss>
"""
