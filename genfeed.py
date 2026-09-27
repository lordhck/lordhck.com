#!/usr/bin/env python3
import re
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import format_datetime

from build import DIST, ROOT, SITE, absolute_url, load_posts

ATOM = "http://www.w3.org/2005/Atom"
CONTENT = "http://purl.org/rss/1.0/modules/content/"
ET.register_namespace("atom", ATOM)
ET.register_namespace("content", CONTENT)

FEED_PATH = "/feed.xml"
LINK_ATTR = re.compile(r'\b(href|src)="([^"]*)"')


def absolutize(html, page_path):
    # Feed readers need absolute URLs
    return LINK_ATTR.sub(lambda m: f'{m[1]}="{absolute_url(m[2], page_path)}"', html)


def add(parent, tag, text=None, **attrs):
    el = ET.SubElement(parent, tag, attrs)
    if text is not None:
        el.text = text
    return el


def write_feed(posts):
    rss = ET.Element("rss", version="2.0")
    channel = add(rss, "channel")
    add(channel, "title", SITE["name"])
    add(channel, "link", absolute_url("/"))
    add(channel, "description", SITE["description"])
    add(channel, "language", SITE["language"])
    add(channel, "managingEditor", f"{SITE['email']} ({SITE['author']})")
    add(channel, f"{{{ATOM}}}link", href=absolute_url(FEED_PATH), rel="self", type="application/rss+xml")
    # Stable output until a new post is added
    updated = posts[0]["date"] if posts else datetime.now(timezone.utc)
    add(channel, "lastBuildDate", format_datetime(updated))

    for post in posts:
        url = absolute_url(post["url"])
        item = add(channel, "item")
        add(item, "title", post["title"])
        add(item, "link", url)
        add(item, "guid", url, isPermaLink="true")
        add(item, "pubDate", format_datetime(post["date"]))
        add(item, "author", f"{SITE['email']} ({SITE['author']})")
        add(item, "description", post["description"])
        add(item, f"{{{CONTENT}}}encoded", absolutize(post["html"], post["url"]))
        for tag in post["tags"]:
            add(item, "category", tag)

    ET.indent(rss)
    out = DIST / FEED_PATH.lstrip("/")
    DIST.mkdir(exist_ok=True)
    ET.ElementTree(rss).write(out, encoding="utf-8", xml_declaration=True)


if __name__ == "__main__":
    write_feed(load_posts())
