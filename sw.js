// Minimal service worker — just enough to make the app installable (required for PWABuilder / Play Store packaging).
self.addEventListener("install", (e) => self.skipWaiting());
self.addEventListener("activate", (e) => self.clients.claim());
self.addEventListener("fetch", (e) => {
  // Network-first, no offline caching yet — fine for launch, improve later if you want offline support.
});
