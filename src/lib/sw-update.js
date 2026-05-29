// Reload-once guard for service-worker auto-update (fix/sw-auto-update).
//
// When a new SW activates it fires `controllerchange`; we reload so the page
// runs the fresh assets — but exactly ONCE, and never on the very first SW
// taking control of a previously-uncontrolled page (that's not an update,
// and reloading then would loop / be jarring). Pure decision so it's
// testable without a SW.
//
//   shouldReloadForController({ alreadyReloaded, hadController })
//     alreadyReloaded — have we already triggered a reload this session?
//     hadController    — did navigator.serviceWorker.controller exist BEFORE
//                        this change? (false = first install, don't reload)

export function shouldReloadForController({ alreadyReloaded, hadController }) {
  return !alreadyReloaded && !!hadController;
}
