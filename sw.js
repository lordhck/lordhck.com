const CACHE = "site-38d227246a00";
const PRECACHE = ["/404.html", "/about/", "/", "/manifest.webmanifest", "/post/hello-world.html", "/post/optical-transfer.html", "/post/terminal-email.html", "/posts/", "/static/app.js", "/static/code.js", "/static/favicon.svg", "/static/icons/apple-touch-icon.png", "/static/icons/icon-192.png", "/static/icons/icon-512.png", "/static/icons/maskable-192.png", "/static/icons/maskable-512.png", "/static/style.css"];

self.addEventListener("install", event => {
    // Bypass the HTTP cache so a deploy is fresh
    const requests = PRECACHE.map(url => new Request(url, {cache: "reload"}));
    event.waitUntil(
        caches.open(CACHE)
            .then(cache => cache.addAll(requests))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
            .then(() => self.clients.claim())
    );
});

// Network first, cache as offline fallback
async function respond(request) {
    try {
        const response = await fetch(request);
        // open() revives caches a newer SW deleted
        if (response.ok && await caches.has(CACHE)) {
            const cache = await caches.open(CACHE);
            await cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        const cached = await caches.match(request, {ignoreSearch: request.mode === "navigate"});
        if (cached) return cached;
        throw error;
    }
}

self.addEventListener("fetch", event => {
    const {request} = event;
    if (request.method !== "GET" || new URL(request.url).origin !== location.origin) return;
    event.respondWith(respond(request));
});
