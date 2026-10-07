const CACHE = "site-db9ab125dca0";
const PRECACHE = ["/404.html", "/about/", "/", "/manifest.webmanifest", "/offline/", "/post/hello-world.html", "/post/terminal-email.html", "/posts/", "/static/app.js", "/static/code.js", "/static/favicon.svg", "/static/icons/apple-touch-icon.png", "/static/icons/icon-192.png", "/static/icons/icon-512.png", "/static/icons/maskable-192.png", "/static/icons/maskable-512.png", "/static/offline.js", "/static/style.css"];
const OFFLINE = "/offline/";

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
        if (request.mode === "navigate") return caches.match(OFFLINE);
        throw error;
    }
}

self.addEventListener("fetch", event => {
    const {request} = event;
    if (request.method !== "GET" || new URL(request.url).origin !== location.origin) return;
    event.respondWith(respond(request));
});
