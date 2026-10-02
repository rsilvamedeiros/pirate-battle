// Keep the generated MSW worker intact; this wrapper allows explicit client
// claiming after a hard refresh without MSW navigating an active game page.
importScripts('./mockServiceWorker.js')
self.addEventListener('message', (event) => {
  if (event.data === 'pirate-battle:claim') event.waitUntil(self.clients.claim())
})
