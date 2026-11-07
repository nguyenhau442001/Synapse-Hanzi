// Run `fn` on DOMContentLoaded, after the legacy scripts' own DOMContentLoaded handlers.
// Deferred module scripts execute while readyState is already 'interactive' but before
// DOMContentLoaded fires, so readyState alone cannot tell whether the event is still to come.
export function onDomReady(fn) {
  let done = false;
  const once = () => { if (!done) { done = true; fn(); } };
  if (document.readyState === 'complete') once();
  else {
    document.addEventListener('DOMContentLoaded', once, { once: true });
    window.addEventListener('load', once, { once: true });
  }
}
