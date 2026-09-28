---
description: Create a new blog post in content/posts with frontmatter metadata
---

Check the arguments provided after `/newpost`.

1. **If no filename is provided:**
   Ask the user: *"Please specify a filename for the post."* and stop until they provide one.

2. **If a filename is provided:**
   - Determine the current local date and time in YYYY-MM-DDTHH:mm:ssZ format (ISO 8601 with time zone offset).
   - Convert the filename into a clean, human-readable title (e.g., `new-blog-post.md` -> `New Blog Post`).
   - Create a new file at `content/posts/<filename>` with the following frontmatter template:

After creating the file, display a brief confirmation message.

