/** Establish control explicitly so MSW startup cannot trigger a page reload. */
export async function activateWorker(url: string): Promise<void> {
  if (!('serviceWorker' in navigator)) throw new Error('Service Workers are unavailable. Match records require HTTPS or localhost; you can still play.')
  const registration = await navigator.serviceWorker.register(url)
  const candidate = registration.installing ?? registration.waiting ?? registration.active
  if (!candidate) throw new Error('The match-record worker could not be installed.')
  if (candidate.state !== 'activated') await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => finish(new Error('Worker activation timed out. Please retry.')), 5000)
    function finish(error?: Error) { clearTimeout(timeout); candidate!.removeEventListener('statechange', check); if (error) reject(error); else resolve() }
    function check() { if (candidate!.state === 'activated') finish(); else if (candidate!.state === 'redundant') finish(new Error('Worker activation failed. Please retry.')) }
    candidate.addEventListener('statechange', check); check()
  })
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => finish(new Error('Worker control timed out. Please retry.')), 5000)
    function finish(error?: Error) { clearTimeout(timeout); navigator.serviceWorker.removeEventListener('controllerchange', check); if (error) reject(error); else resolve() }
    function check() { if (navigator.serviceWorker.controller?.scriptURL === candidate!.scriptURL) finish() }
    navigator.serviceWorker.addEventListener('controllerchange', check)
    candidate.postMessage('pirate-battle:claim')
    check()
  })
}
