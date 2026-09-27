#!/usr/bin/env python3
import xml.etree.ElementTree as ET

from build import DIST, absolute_url, load_posts, template_pages

NS = "http://www.sitemaps.org/schemas/sitemap/0.9"
ET.register_namespace("", NS)

# These change whenever a post is added
POST_LISTS = {"/", "/posts/"}


def add_url(urlset, loc, lastmod=None):
    url = ET.SubElement(urlset, f"{{{NS}}}url")
    ET.SubElement(url, f"{{{NS}}}loc").text = loc
    if lastmod is not None:
        ET.SubElement(url, f"{{{NS}}}lastmod").text = lastmod.isoformat()


def write_sitemap(posts):
    urlset = ET.Element(f"{{{NS}}}urlset")
    newest = posts[0]["date"] if posts else None

    for _name, _out, url, meta in template_pages():
        if meta.get("noindex"):
            continue
        add_url(urlset, absolute_url(url), newest if url in POST_LISTS else None)

    for post in posts:
        add_url(urlset, absolute_url(post["url"]), post["date"])

    ET.indent(urlset)
    DIST.mkdir(exist_ok=True)
    ET.ElementTree(urlset).write(DIST / "sitemap.xml", encoding="utf-8", xml_declaration=True)


if __name__ == "__main__":
    write_sitemap(load_posts())
