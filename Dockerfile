FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS build

RUN apt-get update \
    && apt-get install -y --no-install-recommends git webp \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
ENV UV_LINK_MODE=copy

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen

COPY . .
RUN scripts/minifycss static/style.css \
    && rm static/style.css \
    && mv static/style.min.css static/style.css
RUN scripts/imgconvert \
    && find static/imgs -type f \( -iname '*.jpg' -o -iname '*.jpeg' -o -iname '*.png' \) -delete
RUN uv run --frozen build.py

FROM scratch AS export
COPY --from=build /app/dist /
