---
title: Hello World
date: 2026-09-28T01:10:22+02:00
description: The second, first post on my website.
tags: [meta, intro]
---

This is the second "first" post on my site. I've taken some time to rewrite the whole SSG.

It's still a static site generator written in Python. It takes Markdown files, reads the YAML frontmatter, and turns them into static HTML pages.

I've also added two new scripts written in Bash and Perl: `scripts/minifycss` and `scripts/imgconvert`.

You can probably figure out what they do just by looking at their names:

- One is a CSS minifier.
- The other converts images to WebP.

The site still uses a workflow to run the build script inside a Docker container, mainly to keep builds consistent. GitHub doesn't usually allow you to just run arbitrary Python scripts inside a repository, so the workflow handles the build and deploys the generated files.

The repository itself acts as the free hosting platform.

Markdown in, static site out.

Simple idea, slightly more complex build pipeline.
