// Service Worker registration & PWA update notification banner.
// Automatically asks new worker or falls back to VERSION file for release label.

const VERSION_RE = /^\d+\.\d+\.\d+$/;

export function getNewVersion(worker) {
  const fromFile = fetch('VERSION?_=' + Date.now(), { cache: 'no-store' })
    .then(r => (r.ok ? r.text() : ''))
    .then(t => {
      t = (t || '').trim();
      return VERSION_RE.test(t) ? t : null;
    })
    .catch(() => null);

  const fromWorker = new Promise(resolve => {
    if (!worker || typeof MessageChannel === 'undefined') return resolve(null);
    const channel = new MessageChannel();
    const timer = setTimeout(() => resolve(null), 600);
    channel.port1.onmessage = e => {
      clearTimeout(timer);
      resolve(e.data && VERSION_RE.test(e.data.version) ? e.data.version : null);
    };
    try {
      worker.postMessage({ type: 'GET_VERSION' }, [channel.port2]);
    } catch {
      clearTimeout(timer);
      resolve(null);
    }
  });

  return fromWorker.then(v => v || fromFile);
}

export function getCurrentVersion() {
  if (typeof window !== 'undefined' && window.APP_VERSION && VERSION_RE.test(window.APP_VERSION)) {
    return window.APP_VERSION;
  }
  const badge = typeof document !== 'undefined' ? document.querySelector('.footer-version') : null;
  const v = badge ? badge.textContent.trim().replace(/^v/, '') : '';
  return VERSION_RE.test(v) ? v : null;
}

export function syncAppVersionFromFile() {
  if (typeof fetch !== 'function') return;
  fetch('VERSION?_=' + Date.now(), { cache: 'no-store' })
    .then(r => (r.ok ? r.text() : ''))
    .then(t => {
      t = (t || '').trim();
      if (VERSION_RE.test(t)) {
        if (typeof window !== 'undefined') window.APP_VERSION = t;
        if (typeof document !== 'undefined') {
          document.querySelectorAll('.footer-version').forEach(el => {
            el.textContent = 'v' + t;
          });
        }
      }
    })
    .catch(() => {});
}

export function showUpdateNotification(worker) {
  if (typeof document === 'undefined') return;
  if (document.getElementById('pwaUpdateBanner')) return;

  const banner = document.createElement('div');
  banner.id = 'pwaUpdateBanner';
  banner.setAttribute('role', 'status');
  banner.setAttribute('aria-live', 'polite');
  banner.style.cssText =
    'position:fixed;bottom:18px;left:50%;transform:translateX(-50%);z-index:99999;background:var(--card-bg, #1e293b);color:var(--text-primary, #fff);padding:10px 18px;border-radius:12px;border:1px solid var(--accent, #c05638);box-shadow:0 6px 24px rgba(0,0,0,0.28);display:flex;align-items:center;gap:12px;font-size:13px;font-weight:600;max-width:90vw;animation:welcomeToastIn 0.25s ease;';

  banner.innerHTML =
    '<span id="pwaUpdateText">🚀 Có phiên bản 汉字思维 mới!</span>' +
    '<button type="button" id="pwaReloadBtn" style="background:var(--accent, #c05638);color:#fff;border:none;padding:5px 12px;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;">Tải lại ngay</button>' +
    '<button type="button" id="pwaDismissBtn" aria-label="Đóng" style="background:none;border:none;color:var(--text-secondary, #94a3b8);font-size:16px;cursor:pointer;padding:0 4px;">✕</button>';

  document.body.appendChild(banner);

  const reloadBtn = document.getElementById('pwaReloadBtn');
  if (reloadBtn) {
    reloadBtn.onclick = () => window.location.reload();
  }
  const dismissBtn = document.getElementById('pwaDismissBtn');
  if (dismissBtn) {
    dismissBtn.onclick = () => banner.remove();
  }

  getNewVersion(worker).then(newVersion => {
    const text = document.getElementById('pwaUpdateText');
    if (!text || !newVersion) return;
    const current = getCurrentVersion();
    if (current === newVersion) return;
    text.textContent =
      '🚀 Đã có phiên bản 汉字思维 mới v' +
      newVersion +
      (current ? ' (bạn đang dùng v' + current + ')' : '');
  });
}

export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  syncAppVersionFromFile();

  const handleRegistration = reg => {
    if (reg.waiting) {
      showUpdateNotification(reg.waiting);
    }
    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdateNotification(newWorker);
          }
        });
      }
    });
    reg.update();
  };

  if (document.readyState === 'complete') {
    navigator.serviceWorker.register('sw.js').then(handleRegistration);
  } else {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').then(handleRegistration);
    });
  }

  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      refreshing = true;
      window.location.reload();
    }
  });
}

if (typeof window !== 'undefined') {
  window.getNewVersion = getNewVersion;
  window.getCurrentVersion = getCurrentVersion;
  window.showUpdateNotification = showUpdateNotification;
  window.registerServiceWorker = registerServiceWorker;
}
