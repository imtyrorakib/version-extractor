(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtN = n => Number(n || 0).toLocaleString();

  /* ============================== ICONS (Material, inline SVG) ============================== */
  const P = {
    menu: 'M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z',
    close: 'M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
    search: 'M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z',
    add: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z',
    delete: 'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z',
    delete_forever: 'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zm2.46-7.12 1.41-1.41L12 12.59l2.12-2.12 1.41 1.41L13.41 14l2.12 2.12-1.41 1.41L12 15.41l-2.12 2.12-1.41-1.41L10.59 14l-2.13-2.12zM15.5 4l-1-1h-5l-1 1H5v2h14V4z',
    edit: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z',
    play: 'M8 5v14l11-7z',
    download: 'M5 20h14v-2H5v2zM19 9h-4V3H9v6H5l7 7 7-7z',
    upload: 'M5 20h14v-2H5v2zm0-10h4v6h6v-6h4l-7-7-7 7z',
    light: 'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zM2 13h2a1 1 0 0 0 0-2H2a1 1 0 0 0 0 2zm18 0h2a1 1 0 0 0 0-2h-2a1 1 0 0 0 0 2zM11 2v2a1 1 0 0 0 2 0V2a1 1 0 0 0-2 0zm0 18v2a1 1 0 0 0 2 0v-2a1 1 0 0 0-2 0zM5.99 4.58a1 1 0 0 0-1.41 1.41l1.06 1.06a1 1 0 0 0 1.41-1.41L5.99 4.58zm12.37 12.37a1 1 0 0 0-1.41 1.41l1.06 1.06a1 1 0 0 0 1.41-1.41l-1.06-1.06zm1.06-10.96a1 1 0 0 0-1.41-1.41l-1.06 1.06a1 1 0 0 0 1.41 1.41l1.06-1.06zM7.05 18.36a1 1 0 0 0-1.41-1.41l-1.06 1.06a1 1 0 0 0 1.41 1.41l1.06-1.06z',
    dark: 'M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.39 5.39 0 0 1-4.4 2.26 5.4 5.4 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z',
    arrow_up: 'M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z',
    inventory: 'M20 2H4c-1 0-2 .9-2 2v3.01c0 .72.43 1.34 1 1.69V20c0 1.1 1.1 2 2 2h14c.9 0 2-.9 2-2V8.7c.57-.35 1-.97 1-1.69V4c0-1.1-1-2-2-2zm-5 12H9v-2h6v2zm5-7H4V4h16v3z',
    settings: 'M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.48.48 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z',
    schedule: 'M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z',
    logout: 'M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z',
    refresh: 'M17.65 6.35A7.96 7.96 0 0 0 12 4a8 8 0 1 0 7.73 10h-2.08A6 6 0 1 1 12 6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z',
    sparkle: 'M19 9l1.25-2.75L23 5l-2.75-1.25L19 1l-1.25 2.75L15 5l2.75 1.25L19 9zm-7.5.5L9 4 6.5 9.5 1 12l5.5 2.5L9 20l2.5-5.5L17 12l-5.5-2.5zM19 15l-1.25 2.75L15 19l2.75 1.25L19 23l1.25-2.75L23 19l-2.75-1.25L19 15z',
    article: 'M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z',
    link: 'M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7a5 5 0 0 0 0 10h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4a5 5 0 0 0 0-10z',
    done_all: 'M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41 6 19l1.41-1.41L1.83 12 .41 13.41z',
    check: 'M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
    chevron_left: 'M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z',
    chevron_right: 'M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z',
    first: 'M18.41 16.59 13.82 12l4.59-4.59L17 6l-6 6 6 6zM6 6h2v12H6z',
    last: 'M5.59 7.41 10.18 12l-4.59 4.59L7 18l6-6-6-6zM16 6h2v12h-2z',
    expand: 'M16.59 8.59 12 13.17 7.41 8.59 6 10l6 6 6-6z',
    lock: 'M18 8h-1V6A5 5 0 0 0 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6a3.1 3.1 0 0 1 6.2 0v2z',
    visibility: 'M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17a5 5 0 1 1 0-10 5 5 0 0 1 0 10zm0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
    visibility_off: 'M12 7a5 5 0 0 1 5 5c0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46A11.8 11.8 0 0 0 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65a3 3 0 0 0 3 3c.22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53a5 5 0 0 1-5-5c0-.79.2-1.53.53-2.2zm4.31-.78 3.15 3.15.02-.16a3 3 0 0 0-3-3l-.17.01z',
    open: 'M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z',
    storage: 'M2 20h20v-4H2v4zm2-3h2v2H4v-2zM2 4v4h20V4H2zm4 3H4V5h2v2zm-4 7h20v-4H2v4zm2-3h2v2H4v-2z',
    clear_all: 'M5 13h14v-2H5v2zm-2 4h14v-2H3v2zM7 7v2h14V7H7z',
    warning: 'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z',
    history: 'M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7a6.99 6.99 0 0 1-4.94-2.06l-1.42 1.42A8.95 8.95 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z',
    sitemap: 'M22 11V3h-7v3H9V3H2v8h7V8h2v10h4v3h7v-8h-7v3h-2V8h2v3h7zM7 9H4V5h3v4zm10 6h3v4h-3v-4zm0-10h3v4h-3V5z',
    tune: 'M3 17v2h6v-2H3zM3 5v2h10V5H3zm10 16v-2h8v-2h-8v-2h-2v6h2zM7 9v2H3v2h4v2h2V9H7zm14 4v-2H11v2h10zm-6-4h2V7h4V5h-4V3h-2v6z',
    clean: 'M16 11h-1V3c0-1.1-.9-2-2-2h-2c-1.1 0-2 .9-2 2v8H8c-2.76 0-5 2.24-5 5v7h18v-7c0-2.76-2.24-5-5-5zm3 10h-2v-3c0-.55-.45-1-1-1s-1 .45-1 1v3h-2v-3c0-.55-.45-1-1-1s-1 .45-1 1v3H9v-3c0-.55-.45-1-1-1s-1 .45-1 1v3H5v-5c0-1.65 1.35-3 3-3h8c1.65 0 3 1.35 3 3v5z',
    pin: 'M20 10V8h-4V4h-2v4h-4V4H8v4H4v2h4v4H4v2h4v4h2v-4h4v4h2v-4h4v-2h-4v-4h4zm-6 4h-4v-4h4v4z',
    title: 'M5 4v3h5.5v12h3V7H19V4z',
    swap: 'M6.99 11 3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z',
    today: 'M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-2 .9-2 2v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z',
    menu_open: 'M3 18h13v-2H3v2zm0-5h10v-2H3v2zm0-7v2h13V6H3zm18 9.59L17.42 12 21 8.41 19.59 7l-5 5 5 5L21 15.59z',
    hand: 'M13 24c-3.26 0-6.19-1.99-7.4-5.02l-3.03-7.61a1 1 0 0 1 1.27-1.3l.79.26c.56.18 1.02.61 1.24 1.16L7.25 15H8V3.25a1.25 1.25 0 0 1 2.5 0V12h1V1.25a1.25 1.25 0 0 1 2.5 0V12h1V2.75a1.25 1.25 0 0 1 2.5 0V12h1V5.75a1.25 1.25 0 0 1 2.5 0V16c0 4.42-3.58 8-8 8z',
  };
  const icon = (name, cls = '') => P[name] ? `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${P[name]}"/></svg>` : '';
  const hydrateIcons = (root = document) => $$('[data-icon]', root).forEach(el => {
    if (el.dataset.iconDone === el.dataset.icon) return;
    const svg = icon(el.dataset.icon);
    if (el.tagName === 'SPAN' && !el.childElementCount && !el.textContent.trim()) el.innerHTML = svg;
    else { const old = el.querySelector(':scope > svg.i'); if (old) old.remove(); el.insertAdjacentHTML('afterbegin', svg); }
    el.dataset.iconDone = el.dataset.icon;
  });

  /* ============================== UI helpers ============================== */
  let snackTimer;
  function snack(msg, { error = false, ms = 3500 } = {}) {
    const s = $('#snackbar');
    s.textContent = msg; s.classList.toggle('error', error); s.classList.add('show');
    clearTimeout(snackTimer); snackTimer = setTimeout(() => s.classList.remove('show'), ms);
  }
  let busyCount = 0;
  const busy = on => { busyCount = Math.max(0, busyCount + (on ? 1 : -1)); $('#progress').classList.toggle('on', busyCount > 0); };

  async function api(path, opts = {}) {
    const isForm = opts.body instanceof FormData;
    busy(true);
    try {
      const res = await fetch(path.startsWith('/auth') ? path : '/api' + path, {
        method: opts.method || 'GET', credentials: 'same-origin',
        headers: opts.body && !isForm ? { 'Content-Type': 'application/json' } : {},
        body: opts.body ? (isForm ? opts.body : JSON.stringify(opts.body)) : undefined,
      });
      if (res.status === 401 && !path.startsWith('/auth')) { showLogin(); throw new Error('Session expired — please sign in again'); }
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || res.statusText); }
      return (res.headers.get('content-type') || '').includes('json') ? res.json() : res.blob();
    } finally { busy(false); }
  }
  const download = (blob, name) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 3000); };
  const toCsv = rows => { if (!rows.length) return ''; const cols = Object.keys(rows[0]); const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`; return [cols.join(','), ...rows.map(r => cols.map(c => q(r[c])).join(','))].join('\n'); };
  async function withLoading(btn, fn) { btn.classList.add('loading'); btn.disabled = true; try { return await fn(); } finally { btn.classList.remove('loading'); btn.disabled = false; } }

  /** In-page confirm / prompt (replaces window.confirm / prompt / alert) */
  function confirmDialog({ title, message, ok = 'OK', danger = false, iconName = '', requireText = '' }) {
    const d = $('#dlgConfirm');
    $('#cfTitle').textContent = title; $('#cfMsg').innerHTML = message || '';
    $('#cfIcon').innerHTML = iconName ? icon(iconName) : ''; $('#cfIcon').classList.toggle('danger', danger);
    const okBtn = $('#cfOk'); okBtn.textContent = ok; okBtn.className = 'btn ' + (danger ? 'danger' : 'filled');
    const wrap = $('#cfFieldWrap'), input = $('#cfInput');
    wrap.hidden = !requireText; input.value = '';
    $('#cfLabel').textContent = requireText ? `Type ${requireText} to confirm` : '';
    okBtn.disabled = !!requireText;
    input.oninput = () => { okBtn.disabled = input.value.trim() !== requireText; };
    return new Promise(resolve => {
      const done = v => { d.removeEventListener('close', onClose); $('#confirmForm').onsubmit = null; resolve(v); };
      const onClose = () => done(d.returnValue === 'ok');
      $('#confirmForm').onsubmit = e => { e.preventDefault(); if (okBtn.disabled) return; d.close('ok'); };
      d.addEventListener('close', onClose);
      d.returnValue = ''; d.showModal();
      (requireText ? input : okBtn).focus();
    });
  }
  $$('dialog [data-close]').forEach(b => b.addEventListener('click', () => b.closest('dialog').close('cancel')));
  $$('dialog').forEach(d => d.addEventListener('click', e => { if (e.target === d) d.close('cancel'); })); // click backdrop

  /* ============================== THEME ============================== */
  const themeBtn = $('#themeBtn');
  function applyTheme(t) {
    document.documentElement.dataset.theme = t;
    themeBtn.innerHTML = icon(t === 'dark' ? 'light' : 'dark');
    themeBtn.setAttribute('aria-label', t === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    themeBtn.title = themeBtn.getAttribute('aria-label');
  }
  applyTheme(document.documentElement.dataset.theme || 'light');
  themeBtn.addEventListener('click', () => {
    const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('ve-theme', t); applyTheme(t);
  });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => { if (!localStorage.getItem('ve-theme')) applyTheme(e.matches ? 'dark' : 'light'); });

  /* ============================== DRAWER (mobile: slides left → right) ============================== */
  const openDrawer = () => { document.body.classList.add('drawer-open'); $('#menuBtn').setAttribute('aria-expanded', 'true'); $('#drawer .nav-item.active, #drawer .nav-item')?.focus(); };
  const closeDrawer = () => { document.body.classList.remove('drawer-open'); $('#menuBtn').setAttribute('aria-expanded', 'false'); };
  $('#menuBtn').addEventListener('click', openDrawer);

  /* ---------- Desktop sidebar hide / show (remembered, Ctrl+B) ---------- */
  const sideBtn = $('#sideToggle');
  function setSidebar(hidden, save = true) {
    document.body.classList.toggle('sidebar-hidden', hidden);
    const label = hidden ? 'Show sidebar' : 'Hide sidebar';
    sideBtn.dataset.icon = hidden ? 'menu' : 'menu_open';
    sideBtn.innerHTML = icon(sideBtn.dataset.icon);
    sideBtn.setAttribute('aria-label', label); sideBtn.title = `${label} (Ctrl+B)`;
    sideBtn.setAttribute('aria-expanded', String(!hidden));
    $('#drawer').toggleAttribute('inert', hidden && innerWidth > 960);
    if (save) { try { localStorage.setItem('ve-sidebar', hidden ? 'hidden' : 'shown'); } catch (_) { /* ignore */ } }
  }
  setSidebar(localStorage.getItem('ve-sidebar') === 'hidden', false);
  requestAnimationFrame(() => document.body.classList.add('sidebar-anim')); // no slide animation on first paint
  sideBtn.addEventListener('click', () => setSidebar(!document.body.classList.contains('sidebar-hidden')));
  document.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && !e.altKey && e.key.toLowerCase() === 'b' && innerWidth > 960 && !$$('dialog[open]').length) {
      e.preventDefault(); setSidebar(!document.body.classList.contains('sidebar-hidden'));
    }
  });
  addEventListener('resize', () => $('#drawer').toggleAttribute('inert', document.body.classList.contains('sidebar-hidden') && innerWidth > 960));
  $('#drawerClose').addEventListener('click', closeDrawer);
  $('#scrim').addEventListener('click', closeDrawer);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeDrawer(); closeMenu(); } });
  // swipe from left edge to open, swipe left to close
  let touchX = null;
  document.addEventListener('touchstart', e => { touchX = e.touches[0].clientX; }, { passive: true });
  document.addEventListener('touchend', e => {
    if (touchX === null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (touchX < 24 && dx > 60 && innerWidth <= 960) openDrawer();
    if (document.body.classList.contains('drawer-open') && dx < -60) closeDrawer();
    touchX = null;
  }, { passive: true });

  /* ============================== SCROLL: app bar + back-to-top ============================== */
  const toTop = $('#toTop');
  addEventListener('scroll', () => {
    $('#topBar').classList.toggle('scrolled', scrollY > 4);
    toTop.classList.toggle('show', scrollY > 320);
  }, { passive: true });
  toTop.addEventListener('click', () => scrollTo({ top: 0, behavior: 'smooth' }));

  /* ============================== AUTH (in-page login) ============================== */
  let started = false;
  function showLogin() {
    $('#app').hidden = true; $('#loginView').hidden = false;
    $$('dialog[open]').forEach(d => d.close());
    setTimeout(() => $('#lgUser').focus(), 50);
  }
  function showApp(me) {
    $('#loginView').hidden = true; $('#app').hidden = false;
    $('#whoami').textContent = me.authDisabled ? 'Login disabled (no ADMIN_USER set)' : me.user;
    $('#logoutBtn').hidden = !!me.authDisabled;
    api('/system').then(renderDb).catch(() => {});
    if (!started) { started = true; route(); startPolling(); }
    else route();
  }
  $('#lgShow').addEventListener('click', () => togglePass($('#lgPass'), $('#lgShow')));
  function togglePass(input, btn) {
    const show = input.type === 'password'; input.type = show ? 'text' : 'password';
    btn.dataset.icon = show ? 'visibility_off' : 'visibility'; btn.innerHTML = icon(btn.dataset.icon);
  }
  $('#loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target; $('#lgError').textContent = '';
    if (!f.username.value || !f.password.value) { $('#lgError').textContent = 'Enter username and password'; return; }
    await withLoading($('#lgBtn'), async () => {
      try {
        const me = await api('/auth/login', { method: 'POST', body: { username: f.username.value, password: f.password.value, remember: f.remember.checked } });
        f.password.value = ''; showApp(me);
      } catch (err) { $('#lgError').textContent = err.message; f.password.select(); }
    });
  });
  $('#logoutBtn').addEventListener('click', async () => {
    if (!await confirmDialog({ title: 'Sign out?', message: 'You will need to sign in again to manage products.', ok: 'Sign out', iconName: 'logout' })) return;
    await api('/auth/logout', { method: 'POST' }).catch(() => {});
    showLogin();
  });

  /* ============================== ROUTER ============================== */
  let view = 'products';
  function route() {
    const v = (location.hash.match(/^#\/(\w+)/) || [])[1];
    view = ['products', 'import', 'sitemap', 'jobs', 'settings'].includes(v) ? v : 'products';
    $$('.view').forEach(s => s.classList.toggle('active', s.dataset.view === view));
    $$('.nav-item').forEach(a => a.classList.toggle('active', a.dataset.view === view));
    closeDrawer();
    if (view === 'products') loadProducts();
    if (view === 'jobs') loadJobs();
    if (view === 'sitemap') loadSm();
    if (view === 'settings') loadSettings();
    scrollTo({ top: 0 });
  }
  addEventListener('hashchange', () => { if (started) route(); });

  /* ============================== PRODUCTS ============================== */
  const st = { page: 1, limit: 25, sort: 'id', dir: 'desc', total: 0, rows: [], selected: new Set(), all: false, excluded: new Set() };
  const filter = () => {
    const f = { q: $('#q').value.trim(), status: $('#fStatus').value, source: $('#fSource').value, changed: $('#fChanged').value, has_previous: $('#fPrev').value };
    if (f.changed === 'custom') { f.changed_from = $('#fFrom').value; f.changed_to = $('#fTo').value; }
    return f;
  };
  const localDay = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const isToday = ts => !!ts && String(ts).replace('T', ' ').slice(0, 10) === localDay();
  const selBody = () => st.all ? { all: true, filter: filter(), exclude: [...st.excluded] } : { ids: [...st.selected] };
  const selCount = () => st.all ? Math.max(0, st.total - st.excluded.size) : st.selected.size;
  const isSel = id => st.all ? !st.excluded.has(id) : st.selected.has(id);
  const pages = () => Math.max(1, Math.ceil(st.total / st.limit));

  async function loadProducts() {
    const qs = new URLSearchParams({ ...filter(), page: st.page, limit: st.limit, sort: st.sort, dir: st.dir });
    try {
      const d = await api('/products?' + qs);
      st.rows = d.rows; st.total = d.total;
      if (st.page > pages()) { st.page = pages(); return loadProducts(); }
      renderProducts();
    } catch (e) { snack(e.message, { error: true }); }
    loadStats();
  }

  const fmtDate = s => s ? esc(String(s).replace('T', ' ').slice(0, 16)) : '<span class="dash">—</span>';
  const srcBadge = s => !s ? '<span class="dash">—</span>' : `<span class="src ${esc(s)}">${icon(s === 'ai' ? 'sparkle' : s === 'changelog' ? 'article' : 'edit')}${esc(s)}</span>`;
  const statusPill = s => `<span class="pill ${esc(s)}">${esc(String(s).replace('_', ' '))}</span>`;

  function renderProducts() {
    const tb = $('#tbl tbody');
    if (!st.rows.length) {
      const filtered = Object.values(filter()).some(Boolean);
      tb.innerHTML = `<tr><td colspan="13" class="empty">${icon('inventory')}<div class="title-s">${filtered ? 'No products match your filters' : 'No products yet'}</div><div class="body-s">${filtered ? 'Try clearing the search or filters.' : 'Add a product or import a CSV to get started.'}</div></td></tr>`;
    } else {
      tb.innerHTML = st.rows.map(r => {
        const sel = isSel(r.id);
        const today = isToday(r.version_changed_at);
        return `<tr class="${sel ? 'sel' : ''} ${today ? 'is-today' : ''}" data-id="${r.id}">
          <td class="cell-check"><input type="checkbox" class="rowchk" ${sel ? 'checked' : ''} aria-label="Select ${esc(r.name)}"></td>
          <td class="cell-id" data-label="#">${r.id}</td>
          <td class="nw" data-label="Product ID">${esc(r.product_id) || '<span class="dash">—</span>'}</td>
          <td class="nw" data-label="SKU">${esc(r.sku) || '<span class="dash">—</span>'}</td>
          <td class="name-cell">${r.product_url ? `<a href="${esc(r.product_url)}" target="_blank" rel="noopener" style="color:inherit;text-decoration:none" title="${esc(r.product_url)}">${esc(r.name)}</a>` : esc(r.name)}${r.notes ? `<div class="sub" title="${esc(r.notes)}">${esc(r.notes).slice(0, 70)}</div>` : ''}</td>
          <td class="url-cell" data-label="Changelog">${r.changelog_url ? `<a href="${esc(r.changelog_url)}" target="_blank" rel="noopener" title="${esc(r.changelog_url)}"><span>${esc(r.changelog_url.replace(/^https?:\/\/(www\.)?/, ''))}</span>${icon('open')}</a>` : '<span class="dash">—</span>'}</td>
          <td class="nw" data-label="Version">${r.version ? `<span class="ver">${esc(r.version)}</span>${r.source_url && r.version_source === 'ai' ? `<a class="ver-link" href="${esc(r.source_url)}" target="_blank" rel="noopener" title="AI source">${icon('open')}</a>` : ''}` : '<span class="dash">—</span>'}</td>
          <td data-label="Previous">${r.previous_version ? `<span class="ver prev">${esc(r.previous_version)}</span>` : '<span class="dash">—</span>'}</td>
          <td data-label="Updated">${r.version_changed_at ? `<span class="upd">${today ? `<span class="today-badge">${icon('today')}Today</span>` : ''}<span class="date">${fmtDate(r.version_changed_at)}</span></span>` : '<span class="dash">—</span>'}</td>
          <td data-label="Source">${srcBadge(r.version_source)}</td>
          <td class="status-cell" data-label="Status">${statusPill(r.status)}${r.last_error ? `<div class="err" title="${esc(r.last_error)}">${esc(r.last_error)}</div>` : ''}</td>
          <td data-label="Checked"><span class="date">${fmtDate(r.checked_at)}</span></td>
          <td class="actions">
            <button class="icon-btn sm primary" data-act="extract" title="Extract now" aria-label="Extract ${esc(r.name)}">${icon('play')}</button>
            <button class="icon-btn sm" data-act="edit" title="Edit" aria-label="Edit ${esc(r.name)}">${icon('edit')}</button>
            <button class="icon-btn sm danger" data-act="del" title="Delete" aria-label="Delete ${esc(r.name)}">${icon('delete')}</button>
          </td>
        </tr>`;
      }).join('');
    }
    const from = st.total ? (st.page - 1) * st.limit + 1 : 0, to = Math.min(st.total, st.page * st.limit);
    $('#pageInfo').textContent = `${fmtN(from)}–${fmtN(to)} of ${fmtN(st.total)} · Page ${st.page} / ${pages()}`;
    $('#first').disabled = $('#prev').disabled = st.page <= 1;
    $('#next').disabled = $('#last').disabled = st.page >= pages();
    $$('#tbl th[data-sort]').forEach(th => {
      th.querySelector('.sort-ind')?.remove();
      if (th.dataset.sort === st.sort) th.insertAdjacentHTML('beforeend', `<span class="sort-ind">${st.dir === 'asc' ? '▲' : '▼'}</span>`);
      th.setAttribute('aria-sort', th.dataset.sort === st.sort ? (st.dir === 'asc' ? 'ascending' : 'descending') : 'none');
    });
    renderSelection();
  }

  function renderSelection() {
    const n = selCount();
    const pageChk = $('#chkPage');
    const onPage = st.rows.filter(r => isSel(r.id)).length;
    pageChk.checked = st.rows.length > 0 && onPage === st.rows.length;
    pageChk.indeterminate = onPage > 0 && onPage < st.rows.length;
    $('#selAllCount').textContent = `(${fmtN(st.total)})`;
    $('#btnSelectAll').hidden = st.all && st.excluded.size === 0 || st.total === 0;
    $('#btnClearSel').hidden = n === 0;
    $('#selText').textContent = n ? (st.all && !st.excluded.size ? `All ${fmtN(n)} selected` : `${fmtN(n)} selected`) : '';
    $('.view[data-view="products"] .action-bar').classList.toggle('has-sel', n > 0);
    ['#btnExportSel', '#btnDelSel', '#btnExtractMenu'].forEach(s => { $(s).disabled = n === 0; });
  }

  function toggleRow(id, on) {
    if (st.all) on ? st.excluded.delete(id) : st.excluded.add(id);
    else on ? st.selected.add(id) : st.selected.delete(id);
  }
  function clearSelection() { st.all = false; st.selected.clear(); st.excluded.clear(); }

  $('#btnSelectAll').addEventListener('click', () => { st.all = true; st.excluded.clear(); st.selected.clear(); renderProducts(); snack(`Selected all ${fmtN(st.total)} products across every page`); });
  $('#btnClearSel').addEventListener('click', () => { clearSelection(); renderProducts(); });
  $('#chkPage').addEventListener('change', e => { st.rows.forEach(r => toggleRow(r.id, e.target.checked)); renderProducts(); });

  $('#tbl tbody').addEventListener('click', async e => {
    const tr = e.target.closest('tr[data-id]'); if (!tr) return;
    const id = Number(tr.dataset.id), row = st.rows.find(r => r.id === id);
    if (e.target.classList.contains('rowchk')) { toggleRow(id, e.target.checked); tr.classList.toggle('sel', e.target.checked); renderSelection(); return; }
    const btn = e.target.closest('[data-act]'); if (!btn) return;
    if (btn.dataset.act === 'edit') openProduct(row);
    if (btn.dataset.act === 'del') {
      if (!await confirmDialog({ title: 'Delete product?', message: `<b>${esc(row.name)}</b> will be permanently deleted.`, ok: 'Delete', danger: true, iconName: 'delete' })) return;
      try { await api('/products/' + id, { method: 'DELETE' }); st.selected.delete(id); snack('Product deleted'); loadProducts(); } catch (err) { snack(err.message, { error: true }); }
    }
    if (btn.dataset.act === 'extract') {
      await withLoading(btn, async () => { try { const r = await api('/products/extract', { method: 'POST', body: { ids: [id], type: 'auto' } }); snack(r.queued ? `“${row.name}” queued for extraction` : 'Skipped — no changelog URL'); loadProducts(); } catch (err) { snack(err.message, { error: true }); } });
    }
  });

  $$('#tbl th[data-sort]').forEach(th => th.addEventListener('click', () => {
    st.dir = st.sort === th.dataset.sort && st.dir === 'desc' ? 'asc' : 'desc'; st.sort = th.dataset.sort; loadProducts();
  }));
  let qTimer; $('#q').addEventListener('input', () => { clearTimeout(qTimer); qTimer = setTimeout(resetAndLoad, 350); });
  $('#fStatus').addEventListener('change', resetAndLoad);
  $('#fSource').addEventListener('change', resetAndLoad);
  $('#fPrev').addEventListener('change', resetAndLoad);
  $('#fChanged').addEventListener('change', () => {
    $('#dateRange').hidden = $('#fChanged').value !== 'custom';
    if ($('#fChanged').value === 'custom' && !$('#fFrom').value) { $('#fFrom').value = localDay(); $('#fTo').value = localDay(); }
    resetAndLoad();
  });
  ['#fFrom', '#fTo'].forEach(id => $(id).addEventListener('change', resetAndLoad));
  $('#fRangeClear').addEventListener('click', () => {
    ['#q', '#fStatus', '#fSource', '#fChanged', '#fPrev', '#fFrom', '#fTo'].forEach(id => { $(id).value = ''; });
    $('#dateRange').hidden = true; resetAndLoad();
  });
  $('#limit').addEventListener('change', e => { st.limit = Number(e.target.value); st.page = 1; loadProducts(); });
  $('#first').addEventListener('click', () => { st.page = 1; loadProducts(); });
  $('#prev').addEventListener('click', () => { st.page--; loadProducts(); });
  $('#next').addEventListener('click', () => { st.page++; loadProducts(); });
  $('#last').addEventListener('click', () => { st.page = pages(); loadProducts(); });
  function resetAndLoad() { st.page = 1; clearSelection(); loadProducts(); }

  // Extract menu
  const menu = $('#extractMenu');
  function closeMenu() { menu.hidden = true; $('#btnExtractMenu').setAttribute('aria-expanded', 'false'); }
  $('#btnExtractMenu').addEventListener('click', e => { e.stopPropagation(); menu.hidden = !menu.hidden; $('#btnExtractMenu').setAttribute('aria-expanded', String(!menu.hidden)); });
  document.addEventListener('click', e => { if (!e.target.closest('.menu-wrap')) closeMenu(); });
  $$('[data-extract]').forEach(b => b.addEventListener('click', async () => {
    closeMenu();
    if (!selCount()) return snack('Select at least one product');
    try {
      const r = await api('/products/extract', { method: 'POST', body: { ...selBody(), type: b.dataset.extract } });
      snack(`Queued ${fmtN(r.queued)} job(s)${r.skipped ? ` · ${fmtN(r.skipped)} skipped (no changelog URL)` : ''}`);
      loadProducts();
    } catch (e) { snack(e.message, { error: true }); }
  }));

  /* ---------- Export dialog (scope + columns) ---------- */
  const EX_COLS = [
    ['product_id', 'Product ID'], ['sku', 'SKU'], ['name', 'Name'], ['version', 'Version'], ['previous_version', 'Previous version'],
    ['version_changed_at', 'Updated on'], ['version_source', 'Source'], ['changelog_url', 'Changelog URL'], ['product_url', 'Product URL'],
    ['source_url', 'AI source URL'], ['status', 'Status'], ['checked_at', 'Last checked'], ['notes', 'Notes'], ['last_error', 'Error'], ['id', 'Internal #'], ['created_at', 'Created'],
  ];
  const PRESETS = { version: ['product_id', 'sku', 'name', 'previous_version', 'version', 'version_changed_at'], all: EX_COLS.map(c => c[0]), none: [] };
  const exDlg = $('#dlgExport'), exForm = $('#exportForm');
  $('#exCols').innerHTML = EX_COLS.map(([k, l]) => `<label class="chip"><input type="checkbox" name="col" value="${k}"><span><span class="chip-check">${icon('check')}</span>${l}</span></label>`).join('');
  const setPreset = name => {
    const want = new Set(PRESETS[name]);
    $$('#exCols [name=col]').forEach(c => { c.checked = want.has(c.value); });
    try { localStorage.setItem('ve-export-cols', JSON.stringify([...want])); } catch (_) { /* ignore */ }
    exHint();
  };
  const exScope = () => exForm.querySelector('[name=scope]:checked')?.value;
  function exHint() {
    const n = $$('#exCols [name=col]:checked').length;
    $('#exHint').textContent = n ? `${n} column(s) · order follows the list above` : 'Choose at least one column';
    $('#exGo').disabled = !n || !exScope();
    $('#exRange').hidden = exScope() !== 'range';
  }
  $$('[data-preset]').forEach(b => b.addEventListener('click', () => setPreset(b.dataset.preset)));
  exForm.addEventListener('change', e => {
    if (e.target.name === 'col') { try { localStorage.setItem('ve-export-cols', JSON.stringify($$('#exCols [name=col]:checked').map(c => c.value))); } catch (_) { /* ignore */ } }
    exHint();
  });

  async function openExport(scope, preset) {
    const sel = selCount();
    $('#exSelN').textContent = sel ? `${fmtN(sel)} product(s)` : 'Nothing selected';
    exForm.querySelector('[value=selected]').disabled = !sel;
    $('#exFiltN').textContent = `${fmtN(st.total)} product(s) with the filters on the Products page`;
    $('#exTodayN').textContent = 'Counting…';
    api('/jobs/stats').then(s => { $('#exTodayN').textContent = `${fmtN(s.updated_today)} product(s) got a new version today`; }).catch(() => {});
    if (!$('#exFrom').value) { $('#exFrom').value = localDay(); $('#exTo').value = localDay(); }
    exForm.querySelector(`[name=scope][value=${scope === 'selected' && !sel ? 'filtered' : scope}]`).checked = true;
    if (preset) setPreset(preset);
    else {
      let saved = null; try { saved = JSON.parse(localStorage.getItem('ve-export-cols')); } catch (_) { /* ignore */ }
      if (Array.isArray(saved) && saved.length) { const w = new Set(saved); $$('#exCols [name=col]').forEach(c => { c.checked = w.has(c.value); }); }
      else setPreset('all');
    }
    exHint();
    exDlg.showModal();
  }
  exForm.addEventListener('submit', async e => {
    e.preventDefault();
    const columns = $$('#exCols [name=col]:checked').map(c => c.value);
    const scope = exScope();
    let body, fname;
    if (scope === 'selected') { body = selBody(); fname = 'products-selected'; }
    else if (scope === 'filtered') { body = { all: true, filter: filter() }; fname = 'products'; }
    else if (scope === 'today') { body = { all: true, filter: { changed: 'today' } }; fname = 'version-updates-today'; }
    else {
      if (!$('#exFrom').value && !$('#exTo').value) return snack('Pick a date range', { error: true });
      body = { all: true, filter: { changed: 'custom', changed_from: $('#exFrom').value, changed_to: $('#exTo').value } };
      fname = `version-updates-${$('#exFrom').value || 'start'}-to-${$('#exTo').value || 'today'}`;
    }
    await withLoading($('#exGo'), async () => {
      try {
        const blob = await api('/products/export', { method: 'POST', body: { ...body, columns, filename: fname } });
        if (blob.size < 10) snack('No products match — the CSV only has headers');
        download(blob, `${fname}-${localDay()}.csv`);
        exDlg.close();
      } catch (err) { snack(err.message, { error: true }); }
    });
  });
  $('#btnExportSel').addEventListener('click', () => openExport('selected'));
  $('#btnExportAll').addEventListener('click', () => openExport('filtered'));
  $('#btnExportToday').addEventListener('click', () => openExport('today', 'version'));

  $('#btnDelSel').addEventListener('click', async () => {
    const n = selCount(); if (!n) return;
    if (!await confirmDialog({ title: `Delete ${fmtN(n)} product${n > 1 ? 's' : ''}?`, message: 'Selected products and their queued jobs will be permanently deleted. This cannot be undone.', ok: 'Delete', danger: true, iconName: 'delete' })) return;
    try { const r = await api('/products/bulk-delete', { method: 'POST', body: selBody() }); snack(`Deleted ${fmtN(r.deleted)} product(s)`); resetAndLoad(); } catch (e) { snack(e.message, { error: true }); }
  });
  $('#btnDelAll').addEventListener('click', async () => {
    if (!await confirmDialog({ title: 'Delete ALL products?', message: `This permanently deletes <b>every</b> product (${fmtN(st.total)}+) and every job.`, ok: 'Delete everything', danger: true, iconName: 'warning', requireText: 'DELETE' })) return;
    try { const r = await api('/products/delete-all', { method: 'POST', body: { confirm: 'DELETE' } }); snack(`Deleted ${fmtN(r.deleted)} product(s)`); resetAndLoad(); } catch (e) { snack(e.message, { error: true }); }
  });

  /* ---------- Add / Edit product dialog ---------- */
  const dlg = $('#dlgProduct'), pf = $('#prodForm');
  const FIELDS = ['id', 'product_id', 'sku', 'name', 'product_url', 'changelog_url', 'version', 'previous_version'];
  function openProduct(row) {
    pf.reset();
    $('#dlgTitle').textContent = row ? 'Edit product' : 'Add product';
    FIELDS.forEach(k => { pf.elements[k].value = row ? (row[k] ?? '') : ''; });
    pf.elements.extract.checked = !row;
    dlg.showModal();
    setTimeout(() => pf.elements.name.focus(), 50);
  }
  $('#btnAdd').addEventListener('click', () => openProduct(null));
  pf.addEventListener('submit', async e => {
    e.preventDefault();
    if (!pf.elements.name.value.trim()) { pf.elements.name.focus(); return snack('Name is required', { error: true }); }
    const body = Object.fromEntries(FIELDS.slice(1).map(k => [k, pf.elements[k].value]));
    body.extract = pf.elements.extract.checked;
    const id = pf.elements.id.value;
    await withLoading(pf.querySelector('[type=submit]'), async () => {
      try {
        await api(id ? '/products/' + id : '/products', { method: id ? 'PUT' : 'POST', body });
        dlg.close(); snack(id ? 'Product updated' : 'Product added'); loadProducts();
      } catch (err) { snack(err.message, { error: true }); }
    });
  });

  /* ============================== STATS ============================== */
  async function loadStats() {
    try {
      const s = await api('/jobs/stats');
      const p = Object.fromEntries(s.products.map(x => [x.status, Number(x.c)]));
      const queue = s.jobs.filter(j => j.status === 'pending' || j.status === 'running').reduce((a, j) => a + Number(j.c), 0);
      $('#navCount').textContent = s.total_products ? fmtN(s.total_products) : '';
      $('#navQueue').textContent = queue ? fmtN(queue) : '';
      const cur = $('#fChanged').value === 'today' ? '__today' : $('#fStatus').value;
      $('#todayBadge').textContent = s.updated_today ? fmtN(s.updated_today) : '';
      const card = (key, label, val, color) => `<button type="button" class="stat clickable ${cur === key ? 'on' : ''}" data-status="${key}">
        <span class="lbl"><span class="dot" style="background:${color}"></span>${label}</span><span class="num">${fmtN(val)}</span></button>`;
      $('#statGrid').innerHTML =
        `<button type="button" class="stat clickable hero ${!cur ? 'on' : ''}" data-status=""><span class="lbl">${icon('inventory')}Total</span><span class="num">${fmtN(s.total_products)}</span></button>` +
        card('found', 'Found', p.found, 'var(--success)') +
        card('not_found', 'Not found', p.not_found, 'var(--warning)') +
        card('error', 'Errors', p.error, 'var(--error)') +
        card('queued', 'Queued', (p.queued || 0) + (p.processing || 0), 'var(--primary)') +
        card('new', 'New', p.new, 'var(--outline)') +
        `<button type="button" class="stat clickable today ${cur === '__today' ? 'on' : ''}" data-status="__today"><span class="lbl">${icon('today')}Today</span><span class="num">${fmtN(s.updated_today)}</span></button>`;
    } catch (_) { /* ignore */ }
  }
  $('#statGrid').addEventListener('click', e => {
    const c = e.target.closest('[data-status]'); if (!c) return;
    if (c.dataset.status === '__today') { $('#fChanged').value = 'today'; $('#fStatus').value = ''; }
    else { $('#fStatus').value = c.dataset.status; if (!c.dataset.status) $('#fChanged').value = ''; }
    $('#dateRange').hidden = $('#fChanged').value !== 'custom';
    resetAndLoad();
  });

  /* ============================== IMPORT ============================== */
  const dz = $('#dropzone'), fileInput = $('#fileInput');
  const setFileLabel = () => {
    const f = fileInput.files[0];
    dz.classList.toggle('has-file', !!f);
    $('#dzText').innerHTML = f ? `${esc(f.name)} · ${(f.size / 1024).toFixed(1)} KB` : 'Drop CSV here or <u>browse</u>';
  };
  fileInput.addEventListener('change', setFileLabel);
  ['dragenter', 'dragover'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('drag'); }));
  ['dragleave', 'drop'].forEach(ev => dz.addEventListener(ev, () => dz.classList.remove('drag')));
  dz.addEventListener('drop', e => { e.preventDefault(); if (e.dataTransfer.files.length) { fileInput.files = e.dataTransfer.files; setFileLabel(); } });

  const DEDUPE_HELP = {
    regex: 'Exact match on ID / SKU and normalised name (case, symbols, “(Lifetime)”, version numbers ignored).',
    ai: 'Regex first, then OpenAI groups products that are the same even when names differ. Slower, uses API credits.',
    none: 'Every row is imported as-is, including duplicates.',
  };
  $$('[name=dedupe_method]').forEach(r => r.addEventListener('change', () => { $('#dedupeHelp').textContent = DEDUPE_HELP[r.value]; }));

  let lastImport = null;
  $('#importForm').addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target, fd = new FormData();
    if (fileInput.files[0]) fd.append('file', fileInput.files[0]);
    else if (f.text.value.trim()) fd.append('text', f.text.value);
    else return snack('Choose a CSV file or paste CSV text', { error: true });
    const keys = $$('#importForm [name=k]:checked').map(x => x.value);
    if (!keys.length && f.querySelector('[name=dedupe_method]:checked').value !== 'none') return snack('Pick at least one match field', { error: true });
    fd.append('dedupe_method', f.querySelector('[name=dedupe_method]:checked').value);
    fd.append('match_keys', keys.join(','));
    fd.append('skip_existing', f.skip_existing.checked ? '1' : '0');
    fd.append('extract_after', f.extract_after.checked ? '1' : '0');
    await withLoading($('#btnImport'), async () => {
      try {
        const r = lastImport = await api('/import', { method: 'POST', body: fd });
        const box = $('#importResult'); box.hidden = false;
        box.innerHTML = `<h2 class="title-m">${icon('check')}Import complete</h2>
          <div class="stat-grid">
            <div class="stat"><span class="lbl">Rows read</span><span class="num">${fmtN(r.total_rows)}</span></div>
            <div class="stat hero"><span class="lbl">Imported</span><span class="num">${fmtN(r.inserted)}</span></div>
            <div class="stat"><span class="lbl"><span class="dot" style="background:var(--warning)"></span>Duplicates (${esc(r.method)})</span><span class="num">${fmtN(r.duplicates_count)}</span></div>
            <div class="stat"><span class="lbl"><span class="dot" style="background:var(--error)"></span>Invalid</span><span class="num">${fmtN(r.invalid_count)}</span></div>
            <div class="stat"><span class="lbl"><span class="dot" style="background:var(--primary)"></span>Queued</span><span class="num">${fmtN(r.queued)}</span></div>
          </div>
          <div class="row-gap">
            <a class="btn filled" href="#/products">${icon('inventory')}View products</a>
            ${r.duplicates.length ? `<button type="button" class="btn outlined" id="dlDup">${icon('download')}Duplicates report CSV</button>` : ''}
          </div>
          ${r.duplicates.length ? `<div class="result-table"><table class="data-table"><thead><tr><th>Row</th><th>Product ID</th><th>SKU</th><th>Name</th><th>Reason</th></tr></thead><tbody>
            ${r.duplicates.slice(0, 300).map(d => `<tr><td data-label="Row">${d.row}</td><td data-label="Product ID">${esc(d.product_id)}</td><td data-label="SKU">${esc(d.sku)}</td><td data-label="Name">${esc(d.name)}</td><td data-label="Reason">${esc(d.reason)}</td></tr>`).join('')}
          </tbody></table></div>` : ''}`;
        snack(`Imported ${fmtN(r.inserted)} product(s)`);
        f.reset(); setFileLabel(); $('#dedupeHelp').textContent = DEDUPE_HELP.regex;
        box.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } catch (err) { snack('Import failed: ' + err.message, { error: true, ms: 6000 }); }
    });
  });
  $('#importResult').addEventListener('click', e => {
    if (e.target.closest('#dlDup') && lastImport) download(new Blob(['\ufeff' + toCsv(lastImport.duplicates)], { type: 'text/csv' }), 'duplicates-removed.csv');
  });

  /* ============================== JOBS ============================== */
  const TYPE_LABEL = { changelog: 'Changelog', ai_changelog: 'AI · find changelog', ai_version: 'AI · version' };
  async function loadJobs() {
    try {
      const [s, list] = await Promise.all([api('/jobs/stats'), api('/jobs?' + new URLSearchParams({ status: $('#jobFilter').value }))]);
      const agg = {}; s.jobs.forEach(j => { agg[j.status] = (agg[j.status] || 0) + Number(j.c); });
      const pend = {}; s.jobs.filter(j => j.status === 'pending').forEach(j => { pend[j.type] = Number(j.c); });
      const c = (label, n, color) => `<div class="stat"><span class="lbl"><span class="dot" style="background:${color}"></span>${label}</span><span class="num">${fmtN(n)}</span></div>`;
      $('#jobStats').innerHTML = c('Pending', agg.pending, 'var(--primary)') + c('Running', agg.running, 'var(--tertiary)') + c('Done', agg.done, 'var(--success)') + c('Failed', agg.failed, 'var(--error)') +
        c('1 · Changelog', pend.changelog, 'var(--primary)') + c('2 · AI changelog', pend.ai_changelog, 'var(--tertiary)') + c('3 · AI version', pend.ai_version, 'var(--tertiary)');
      $('#jobTbl tbody').innerHTML = list.rows.map(j => `<tr>
          <td data-label="#">${j.id}</td>
          <td class="job-name" data-label="Product">${esc(j.product_name || '(deleted)')}</td>
          <td data-label="Type"><span class="src ${j.type === 'changelog' ? 'changelog' : 'ai'}">${icon(j.type === 'changelog' ? 'article' : 'sparkle')}${esc(TYPE_LABEL[j.type] || j.type)}</span></td>
          <td data-label="Priority">${j.priority}</td>
          <td class="job-status" data-label="Status">${statusPill(j.status)}</td>
          <td data-label="Attempts">${j.attempts}/${j.max_attempts}</td>
          <td data-label="Error">${j.last_error ? `<span class="err" title="${esc(j.last_error)}">${esc(j.last_error)}</span>` : '<span class="dash">—</span>'}</td>
          <td data-label="Updated"><span class="date">${fmtDate(j.updated_at)}</span></td>
        </tr>`).join('') || `<tr><td colspan="8" class="empty">${icon('schedule')}<div class="title-s">Queue is empty</div><div class="body-s">Select products and click Extract to add jobs.</div></td></tr>`;
    } catch (e) { snack(e.message, { error: true }); }
    loadStats();
  }
  $('#jobFilter').addEventListener('change', loadJobs);
  /* ============================== SITEMAP ============================== */
  const ss = { page: 1, limit: 25, sort: 'id', dir: 'asc', total: 0, rows: [], selected: new Set(), all: false, excluded: new Set(), stats: null };
  const smFilter = () => ({ q: $('#smQ').value.trim(), has_number: $('#smFNum').value, has_special: $('#smFSpec').value, status: $('#smFStatus').value });
  const smSelBody = () => ss.all ? { all: true, filter: smFilter(), exclude: [...ss.excluded] } : { ids: [...ss.selected] };
  const smSelCount = () => ss.all ? Math.max(0, ss.total - ss.excluded.size) : ss.selected.size;
  const smIsSel = id => ss.all ? !ss.excluded.has(id) : ss.selected.has(id);
  const smPages = () => Math.max(1, Math.ceil(ss.total / ss.limit));
  const smClear = () => { ss.all = false; ss.selected.clear(); ss.excluded.clear(); };
  const smToggle = (id, on) => { if (ss.all) on ? ss.excluded.delete(id) : ss.excluded.add(id); else on ? ss.selected.add(id) : ss.selected.delete(id); };
  const nameOpts = () => { const f = $('#smForm'); return { name_from: f.name_from.value, remove_words: f.remove_words.value, strip_trailing_id: f.strip_trailing_id.checked }; };

  async function loadSm(statsOnly = false) {
    try {
      const st2 = await api('/sitemap/stats');
      ss.stats = st2; renderSmStats();
      if (statsOnly) return;
      const d = await api('/sitemap/urls?' + new URLSearchParams({ ...smFilter(), page: ss.page, limit: ss.limit, sort: ss.sort, dir: ss.dir }));
      ss.rows = d.rows; ss.total = d.total;
      if (ss.page > smPages()) { ss.page = smPages(); return loadSm(); }
      renderSm();
    } catch (e) { snack(e.message, { error: true }); }
  }

  function renderSmStats() {
    const s = ss.stats; if (!s) return;
    $('#navSitemap').textContent = s.total ? fmtN(s.total) : '';
    const f = smFilter();
    const key = f.has_number === '1' ? 'num' : f.has_special === '1' ? 'spec' : (f.has_number === '0' && f.has_special === '0') ? 'clean' : f.status === 'imported' ? 'imp' : f.status === 'skipped' ? 'skip' : (!f.has_number && !f.has_special && !f.status ? 'all' : '');
    const card = (k, label, val, color, hero) => `<button type="button" class="stat clickable ${hero ? 'hero' : ''} ${key === k ? 'on' : ''}" data-smstat="${k}">
      <span class="lbl">${color ? `<span class="dot" style="background:${color}"></span>` : icon('sitemap')}${label}</span><span class="num">${fmtN(val)}</span></button>`;
    $('#smStats').innerHTML = card('all', 'Total URLs', s.total, '', true) + card('num', 'With numbers', s.with_number, 'var(--warning)') +
      card('spec', 'Special chars', s.with_special, 'var(--tertiary)') + card('clean', 'Clean names', s.clean, 'var(--success)') +
      card('imp', 'Imported', s.imported, 'var(--primary)') + card('skip', 'Skipped', s.skipped, 'var(--outline)');
    $('#qNum').textContent = `${fmtN(s.with_number)} URL(s) match`;
    $('#qSpec').textContent = `${fmtN(s.with_special)} URL(s) match`;
    $('[data-quick=delete_number]').disabled = $('[data-quick=strip_numbers]').disabled = !s.with_number;
    $('[data-quick=delete_special]').disabled = $('[data-quick=strip_special]').disabled = !s.with_special;
  }
  $('#smStats').addEventListener('click', e => {
    const c = e.target.closest('[data-smstat]'); if (!c) return;
    const map = { all: ['', '', ''], num: ['1', '', ''], spec: ['', '1', ''], clean: ['0', '0', ''], imp: ['', '', 'imported'], skip: ['', '', 'skipped'] }[c.dataset.smstat];
    [$('#smFNum').value, $('#smFSpec').value, $('#smFStatus').value] = map; smReset();
  });

  // highlight digits / special chars inside the name
  const hlName = n => String(n || '').split(/(\d+|[^\p{L}\p{N}\s]+)/u).map((p, i) => (i % 2 ? `<mark class="name-hl">${esc(p)}</mark>` : esc(p))).join('');

  function renderSm() {
    const tb = $('#smTbl tbody');
    if (!ss.rows.length) {
      const filtered = Object.values(smFilter()).some(Boolean);
      tb.innerHTML = `<tr><td colspan="8" class="empty">${icon('sitemap')}<div class="title-s">${filtered ? 'No URLs match your filters' : 'No URLs yet'}</div><div class="body-s">${filtered ? 'Clear the filters to see everything.' : 'Paste a sitemap URL above and click “Extract URLs”.'}</div></td></tr>`;
    } else {
      tb.innerHTML = ss.rows.map(r => {
        const sel = smIsSel(r.id);
        const flags = (r.has_number ? `<span class="flag num">123 number</span>` : '') + (r.has_special ? `<span class="flag spec">#@ special</span>` : '') + (!r.has_number && !r.has_special ? `<span class="flag ok">clean</span>` : '');
        return `<tr class="${sel ? 'sel' : ''}" data-id="${r.id}">
          <td class="cell-check"><input type="checkbox" class="smchk" ${sel ? 'checked' : ''} aria-label="Select ${esc(r.name)}"></td>
          <td class="cell-id" data-label="#">${r.id}</td>
          <td class="sm-name-cell"><div class="sm-name">${hlName(r.name)}</div><div class="sm-slug">${esc(r.slug)}</div></td>
          <td class="url-cell" data-label="URL"><a href="${esc(r.url)}" target="_blank" rel="noopener" title="${esc(r.url)}"><span>${esc(r.url.replace(/^https?:\/\/(www\.)?/, ''))}</span>${icon('open')}</a></td>
          <td data-label="Flags">${flags}</td>
          <td data-label="Status">${statusPill(r.status)}</td>
          <td data-label="Modified"><span class="date">${r.lastmod ? esc(String(r.lastmod).slice(0, 10)) : '<span class="dash">—</span>'}</span></td>
          <td class="actions">
            <button class="icon-btn sm" data-smact="edit" title="Rename" aria-label="Rename ${esc(r.name)}">${icon('edit')}</button>
            <button class="icon-btn sm danger" data-smact="del" title="Delete" aria-label="Delete ${esc(r.name)}">${icon('delete')}</button>
          </td></tr>`;
      }).join('');
    }
    const from = ss.total ? (ss.page - 1) * ss.limit + 1 : 0, to = Math.min(ss.total, ss.page * ss.limit);
    $('#smPageInfo').textContent = `${fmtN(from)}–${fmtN(to)} of ${fmtN(ss.total)} · Page ${ss.page} / ${smPages()}`;
    $('#smFirst').disabled = $('#smPrev').disabled = ss.page <= 1;
    $('#smNext').disabled = $('#smLast').disabled = ss.page >= smPages();
    $$('#smTbl th[data-sort]').forEach(th => {
      th.querySelector('.sort-ind')?.remove();
      if (th.dataset.sort === ss.sort) th.insertAdjacentHTML('beforeend', `<span class="sort-ind">${ss.dir === 'asc' ? '▲' : '▼'}</span>`);
    });
    renderSmSel();
  }

  function renderSmSel() {
    const n = smSelCount(), onPage = ss.rows.filter(r => smIsSel(r.id)).length;
    $('#smChkPage').checked = ss.rows.length > 0 && onPage === ss.rows.length;
    $('#smChkPage').indeterminate = onPage > 0 && onPage < ss.rows.length;
    $('#smSelAllCount').textContent = `(${fmtN(ss.total)})`;
    $('#smSelectAll').hidden = (ss.all && !ss.excluded.size) || !ss.total;
    $('#smClearSel').hidden = !n;
    $('#smSelText').textContent = n ? (ss.all && !ss.excluded.size ? `All ${fmtN(n)} selected` : `${fmtN(n)} selected`) : '';
    $('#smBar').classList.toggle('has-sel', n > 0);
    ['#smImportBtn', '#smActMenuBtn', '#smExportSel', '#smDelSel'].forEach(s => { $(s).disabled = !n; });
  }

  function smReset() { ss.page = 1; smClear(); loadSm(); }
  let smQT; $('#smQ').addEventListener('input', () => { clearTimeout(smQT); smQT = setTimeout(smReset, 350); });
  ['#smFNum', '#smFSpec', '#smFStatus'].forEach(s => $(s).addEventListener('change', smReset));
  $('#smLimit').addEventListener('change', e => { ss.limit = Number(e.target.value); ss.page = 1; loadSm(); });
  $('#smFirst').addEventListener('click', () => { ss.page = 1; loadSm(); });
  $('#smPrev').addEventListener('click', () => { ss.page--; loadSm(); });
  $('#smNext').addEventListener('click', () => { ss.page++; loadSm(); });
  $('#smLast').addEventListener('click', () => { ss.page = smPages(); loadSm(); });
  $$('#smTbl th[data-sort]').forEach(th => th.addEventListener('click', () => {
    ss.dir = ss.sort === th.dataset.sort && ss.dir === 'asc' ? 'desc' : 'asc'; ss.sort = th.dataset.sort; loadSm();
  }));
  $('#smSelectAll').addEventListener('click', () => { ss.all = true; ss.excluded.clear(); ss.selected.clear(); renderSm(); snack(`Selected all ${fmtN(ss.total)} URLs across every page`); });
  $('#smClearSel').addEventListener('click', () => { smClear(); renderSm(); });
  $('#smChkPage').addEventListener('change', e => { ss.rows.forEach(r => smToggle(r.id, e.target.checked)); renderSm(); });

  /** In-page single-value prompt */
  function promptDialog({ title, message = '', label, value = '', ok = 'Save' }) {
    const d = $('#dlgPrompt');
    $('#pmTitle').textContent = title; $('#pmMsg').innerHTML = message; $('#pmMsg').hidden = !message;
    $('#pmLabel').textContent = label; $('#pmOk').textContent = ok;
    const input = $('#pmInput'); input.value = value;
    return new Promise(resolve => {
      const onClose = () => { d.removeEventListener('close', onClose); resolve(d.returnValue === 'ok' ? input.value : null); };
      $('#promptForm').onsubmit = e => { e.preventDefault(); if (!input.value.trim()) { input.focus(); return; } d.close('ok'); };
      d.addEventListener('close', onClose); d.returnValue = ''; d.showModal(); input.focus(); input.select();
    });
  }

  $('#smTbl tbody').addEventListener('click', async e => {
    const tr = e.target.closest('tr[data-id]'); if (!tr) return;
    const id = Number(tr.dataset.id), row = ss.rows.find(r => r.id === id);
    if (e.target.classList.contains('smchk')) { smToggle(id, e.target.checked); tr.classList.toggle('sel', e.target.checked); renderSmSel(); return; }
    const b = e.target.closest('[data-smact]'); if (!b) return;
    if (b.dataset.smact === 'edit') {
      const name = await promptDialog({ title: 'Rename', message: `<span class="sm-slug">${esc(row.url)}</span>`, label: 'Product name', value: row.name });
      if (name === null) return;
      try { await api('/sitemap/urls/' + id, { method: 'PUT', body: { name } }); snack('Name updated'); loadSm(); } catch (err) { snack(err.message, { error: true }); }
    }
    if (b.dataset.smact === 'del') {
      if (!await confirmDialog({ title: 'Delete URL?', message: `<b>${esc(row.name)}</b> will be removed from the list.`, ok: 'Delete', danger: true, iconName: 'delete' })) return;
      try { await api('/sitemap/urls/' + id, { method: 'DELETE' }); smToggle(id, false); snack('URL deleted'); loadSm(); } catch (err) { snack(err.message, { error: true }); }
    }
  });

  /* ---- fetch sitemap ---- */
  /* ---- source mode: sitemap URL | paste text ---- */
  const smMode = () => $('#smForm').querySelector('[name=mode]:checked').value;
  function setSmMode(m) {
    $('#smForm').querySelector(`[name=mode][value=${m}]`).checked = true;
    $('#smUrlPane').hidden = m !== 'url'; $('#smTextPane').hidden = m !== 'text';
    try { localStorage.setItem('ve-sm-mode', m); } catch (_) { /* ignore */ }
  }
  $$('#smForm [name=mode]').forEach(r => r.addEventListener('change', () => { setSmMode(r.value); (r.value === 'text' ? $('#smText') : $('#smUrl')).focus(); }));
  setSmMode(localStorage.getItem('ve-sm-mode') === 'text' ? 'text' : 'url');

  // live "N URLs detected" counter (same rules as the server)
  const detectUrls = t => {
    const set = new Set(); const re = /https?:\/\/[^\s"'<>()\[\]{}|\\^`,]+/gi; let m;
    const s = String(t).replace(/&amp;/g, '&');
    while ((m = re.exec(s)) !== null) set.add(m[0].replace(/[.,;:!?*)\]}>'"]+$/, ''));
    return [...set];
  };
  const isMapLink = u => /(\.xml(\.gz)?|\/robots\.txt)(\?.*)?$/i.test(u) || /sitemap[^/]*$/i.test(u.split('?')[0]);
  let detT;
  function updateDetect() {
    clearTimeout(detT);
    detT = setTimeout(() => {
      const t = $('#smText').value, chip = $('#smDetect');
      if (/<(urlset|sitemapindex)[\s>]/i.test(t)) { const n = (t.match(/<loc[\s>]/gi) || []).length; chip.textContent = `Sitemap XML · ${fmtN(n)} <loc> entr${n === 1 ? 'y' : 'ies'}`; chip.classList.toggle('has', n > 0); return; }
      const urls = detectUrls(t), maps = urls.filter(isMapLink).length, follow = $('#smForm').elements.follow_sitemaps.checked;
      chip.textContent = urls.length ? `${fmtN(urls.length)} unique URL(s) detected${maps ? ` · ${fmtN(maps)} sitemap link(s)${follow ? ' will be followed' : ''}` : ''}` : 'No URLs detected yet';
      chip.classList.toggle('has', urls.length > 0);
    }, 200);
  }
  $('#smText').addEventListener('input', updateDetect);
  $('#smForm').elements.follow_sitemaps.addEventListener('change', updateDetect);
  $('#smTextClear').addEventListener('click', () => { $('#smText').value = ''; updateDetect(); $('#smText').focus(); });
  $('#smTextFile').addEventListener('change', async e => {
    const file = e.target.files[0]; if (!file) return;
    if (file.size > 8 * 1024 * 1024) { e.target.value = ''; return snack('File is larger than 8 MB — split it or use a sitemap URL', { error: true }); }
    $('#smText').value = await file.text(); e.target.value = ''; updateDetect();
    snack(`Loaded ${file.name}`);
  });

  $('#smForm').addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target, mode = smMode(), url = f.url.value.trim(), text = f.text.value;
    if (mode === 'url' && !/^https?:\/\//i.test(url)) { f.url.focus(); return snack('Enter a sitemap URL starting with https://', { error: true }); }
    if (mode === 'text' && !text.trim()) { f.text.focus(); return snack('Paste some text that contains URLs', { error: true }); }
    const body = { mode, include: f.include.value, exclude: f.exclude.value, child_filter: f.child_filter.value, max_urls: f.max_urls.value, ...nameOpts() };
    if (mode === 'url') body.url = url; else { body.text = text; body.follow_sitemaps = f.follow_sitemaps.checked; }
    const box = $('#smFetchResult');
    await withLoading(mode === 'url' ? $('#smFetchBtn') : $('#smTextBtn'), async () => {
      try {
        const r = await api('/sitemap/fetch', { method: 'POST', body });
        const warn = r.errors.length || r.truncated || !r.found;
        const head = r.mode === 'text'
          ? `<b>${fmtN(r.found)} URL(s) found</b> · ${fmtN(r.from_text)} from pasted text${r.sitemaps.length ? ` · ${fmtN(r.found - r.from_text)} from ${fmtN(r.sitemaps.length)} linked sitemap(s)` : ''}`
          : `<b>${fmtN(r.found)} URL(s) found in ${fmtN(r.sitemaps.length)} sitemap(s)</b>`;
        box.hidden = false;
        box.innerHTML = `<div class="fetch-result ${warn ? 'warn' : ''}">${icon(warn ? 'warning' : 'check')}<div>
          ${head} · ${fmtN(r.inserted)} new · ${fmtN(r.already_present)} already in list${r.filtered_out ? ` · ${fmtN(r.filtered_out)} filtered out` : ''}
          ${r.truncated ? '<div class="body-s">Stopped at the Max URLs / sitemap limit — raise “Max URLs” to get more.</div>' : ''}
          ${r.errors.length ? `<ul>${r.errors.slice(0, 5).map(x => `<li>${esc(x.sitemap)} — ${esc(x.error)}</li>`).join('')}</ul>` : ''}
        </div></div>`;
        snack(`Added ${fmtN(r.inserted)} new URL(s)`);
        smReset();
      } catch (err) { box.hidden = true; snack(err.message, { error: true, ms: 6000 }); }
    });
  });

  /* ---- live name preview ---- */
  let pvT;
  const preview = () => {
    clearTimeout(pvT);
    pvT = setTimeout(async () => {
      const url = $('#smTestUrl').value.trim();
      if (!url) { $('#smPreview').innerHTML = '<span class="muted body-s">Name preview appears here</span>'; return; }
      try {
        const r = await api('/sitemap/preview-name', { method: 'POST', body: { url, ...nameOpts() } });
        $('#smPreview').innerHTML = `<span class="sm-slug">${esc(r.slug)}</span> → <span class="preview-name">${esc(r.name) || '—'}</span>${r.has_number ? '<span class="flag num">123</span>' : ''}${r.has_special ? '<span class="flag spec">#@</span>' : ''}`;
      } catch (_) { /* ignore */ }
    }, 300);
  };
  $('#smTestUrl').addEventListener('input', preview);
  ['name_from', 'remove_words', 'strip_trailing_id'].forEach(n => $('#smForm').elements[n].addEventListener('input', preview));
  $('#smForm').elements.strip_trailing_id.addEventListener('change', preview);

  /* ---- bulk actions ---- */
  async function smBulk(action, selection, arg, label) {
    try {
      const r = await api('/sitemap/bulk', { method: 'POST', body: { ...selection, action, arg } });
      snack(r.message || `${label}: ${fmtN(r.affected)}`, { ms: 5000 });
      if (action === 'delete') smClear();
      loadSm();
      return r;
    } catch (e) { snack(e.message, { error: true, ms: 6000 }); }
  }
  const smScope = () => { const n = smSelCount(); return `${fmtN(n)} selected URL${n === 1 ? '' : 's'}`; };

  // quick clean-up: always operates on every URL that has the flag
  $$('[data-quick]').forEach(b => b.addEventListener('click', async () => {
    const q = b.dataset.quick, s = ss.stats || {};
    const numSel = { all: true, filter: { has_number: '1' } }, specSel = { all: true, filter: { has_special: '1' } };
    const cfg = {
      delete_number: { sel: numSel, action: 'delete', title: `Delete ${fmtN(s.with_number)} URLs with numbers?`, msg: 'Every URL whose name contains a digit will be removed from the list.', ok: 'Delete', danger: true, icon: 'delete' },
      delete_special: { sel: specSel, action: 'delete', title: `Delete ${fmtN(s.with_special)} URLs with special characters?`, msg: 'Every URL whose name contains a symbol (&amp; + . \' ( ) ! etc.) will be removed.', ok: 'Delete', danger: true, icon: 'delete' },
      strip_numbers: { sel: numSel, action: 'strip_numbers', title: `Remove numbers from ${fmtN(s.with_number)} names?`, msg: '“Adobe Photoshop 2026” → “Adobe Photoshop”. URLs are kept. Names that would become empty are skipped.', ok: 'Remove numbers', icon: 'pin' },
      strip_special: { sel: specSel, action: 'strip_special', title: `Remove special characters from ${fmtN(s.with_special)} names?`, msg: '“C++ Builder (Pro)!” → “C Builder Pro”. URLs are kept.', ok: 'Remove characters', icon: 'clean' },
    }[q];
    if (!await confirmDialog({ title: cfg.title, message: cfg.msg, ok: cfg.ok, danger: !!cfg.danger, iconName: cfg.icon })) return;
    await withLoading(b, () => smBulk(cfg.action, cfg.sel, null, cfg.ok));
  }));

  // actions menu
  const smMenu = $('#smActMenu');
  const closeSmMenu = () => { smMenu.hidden = true; };
  $('#smActMenuBtn').addEventListener('click', e => { e.stopPropagation(); smMenu.hidden = !smMenu.hidden; });
  document.addEventListener('click', e => { if (!e.target.closest('#smActMenu') && !e.target.closest('#smActMenuBtn')) closeSmMenu(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeSmMenu(); });
  $$('[data-sm]').forEach(b => b.addEventListener('click', async () => {
    closeSmMenu();
    if (!smSelCount()) return snack('Select at least one URL');
    const action = b.dataset.sm, sel = smSelBody();
    if (action === 'trim_words') {
      const words = await promptDialog({ title: 'Remove words from names', message: `Applies to ${smScope()}.`, label: 'Words, comma separated (e.g. download, free, review)', ok: 'Remove' });
      if (words !== null) smBulk(action, sel, words, 'Updated');
      return;
    }
    if (action === 'find_replace') {
      const d = $('#dlgReplace'); $('#rpScope').textContent = `Applies to ${smScope()}.`; $('#rpFind').value = ''; $('#rpReplace').value = ''; $('#rpRegex').checked = false;
      $('#replaceForm').onsubmit = ev => { ev.preventDefault(); if (!$('#rpFind').value) return $('#rpFind').focus(); d.close('ok'); smBulk(action, sel, { find: $('#rpFind').value, replace: $('#rpReplace').value, regex: $('#rpRegex').checked }, 'Replaced'); };
      d.showModal(); $('#rpFind').focus();
      return;
    }
    if (action === 'regenerate') {
      if (!await confirmDialog({ title: 'Regenerate names from URL?', message: `Manual edits on ${smScope()} will be replaced using the current naming options.`, ok: 'Regenerate', iconName: 'refresh' })) return;
      return smBulk(action, sel, nameOpts(), 'Regenerated');
    }
    if (action === 'ai_beautify') {
      if (!await confirmDialog({ title: 'AI beautify names?', message: `OpenAI will rewrite names for ${smScope()} (max 2,000 per run). This uses API credits.`, ok: 'Beautify', iconName: 'sparkle' })) return;
      snack('AI is renaming… this can take a minute', { ms: 60000 });
      return smBulk(action, sel, null, 'Renamed');
    }
    smBulk(action, sel, null, 'Updated');
  }));

  $('#smImportBtn').addEventListener('click', () => {
    if (!smSelCount()) return;
    const d = $('#dlgSmImport'), f = $('#smImportForm');
    $('#siScope').textContent = `${smScope()} will be added to Products (already-imported ones are skipped).`;
    f.onsubmit = async ev => {
      ev.preventDefault(); d.close('ok');
      const arg = { skip_duplicates: f.skip_duplicates.checked, dedupe_method: f.querySelector('[name=dedupe_method]:checked').value, extract_after: f.extract_after.checked };
      const r = await smBulk('import', smSelBody(), arg, 'Imported');
      if (r) { smClear(); loadStats(); }
    };
    d.showModal();
  });

  $('#smExportSel').addEventListener('click', e => withLoading(e.currentTarget, async () => {
    download(await api('/sitemap/export', { method: 'POST', body: smSelBody() }), 'sitemap-urls-selected.csv');
  }).catch(err => snack(err.message, { error: true })));
  $('#smExportAll').addEventListener('click', e => withLoading(e.currentTarget, async () => {
    download(await api('/sitemap/export', { method: 'POST', body: { all: true, filter: smFilter() } }), 'sitemap-urls.csv');
  }).catch(err => snack(err.message, { error: true })));
  $('#smDelSel').addEventListener('click', async () => {
    const n = smSelCount(); if (!n) return;
    if (!await confirmDialog({ title: `Delete ${fmtN(n)} URL${n > 1 ? 's' : ''}?`, message: 'They are removed from the sitemap list. Already-imported products are not affected.', ok: 'Delete', danger: true, iconName: 'delete' })) return;
    smBulk('delete', smSelBody(), null, 'Deleted');
  });

  const jobAction = (sel, path, msg, confirmOpts) => $(sel).addEventListener('click', async e => {
    const btn = e.currentTarget;
    if (confirmOpts && !await confirmDialog(confirmOpts)) return;
    await withLoading(btn, async () => {
      try { snack(msg(await api(path, { method: 'POST' }))); } catch (err) { snack(err.message, { error: true }); }
      loadJobs();
    });
  });
  jobAction('#jobRun', '/jobs/run-now', r => `Processed ${fmtN(r.processed)} job(s)`);
  jobAction('#jobRetry', '/jobs/retry-failed', r => `Re-queued ${fmtN(r.retried)} failed job(s)`);
  jobAction('#jobClear', '/jobs/clear-finished', r => `Removed ${fmtN(r.deleted)} finished job(s)`);
  jobAction('#jobCancel', '/jobs/cancel-pending', r => `Cancelled ${fmtN(r.cancelled)} pending job(s)`,
    { title: 'Cancel all pending jobs?', message: 'Queued products go back to “new”. Running jobs finish normally.', ok: 'Cancel jobs', danger: true, iconName: 'warning' });

  /* ============================== SETTINGS ============================== */
  const sf = $('#settingsForm');
  async function loadSettings() {
    try {
      const [s, sys] = await Promise.all([api('/settings'), api('/system')]);
      for (const [k, v] of Object.entries(s)) {
        const els = sf.querySelectorAll(`[name="${k}"]`); if (!els.length) continue;
        els.forEach(el => {
          if (el.type === 'checkbox') el.checked = v === '1';
          else if (el.type === 'radio') el.checked = el.value === v;
          else el.value = v;
        });
      }
      renderDb(sys);
    } catch (e) { snack(e.message, { error: true }); }
  }
  function renderDb(d) {
    $('#dbChip').innerHTML = d.client ? `${icon('storage')}${d.client === 'mysql' ? 'MySQL' : 'SQLite'}` : '';
    $('#dbInfo').innerHTML = `<h2 class="title-m">${icon('storage')}Database</h2>` + (d.client === 'mysql'
      ? `<p><span class="pill found">MySQL connected</span></p><p class="body-s muted">Data is stored in your MySQL database.</p>`
      : `<p><span class="pill queued">SQLite · ${esc(d.driver)}</span></p><div class="label-m muted" style="margin-top:12px">File location</div><p><code>${esc(d.sqlite_path)}</code></p>
         <p class="body-s muted">${d.mysql_configured ? '⚠ MySQL is configured but could not be reached — check DB_* variables and restart.' : 'Fill in DB_HOST / DB_USER / DB_PASSWORD / DB_NAME and restart to switch to MySQL automatically. Run <code>npm run sqlite-to-mysql</code> to copy data.'}</p>`);
  }
  sf.addEventListener('submit', async e => {
    e.preventDefault();
    const body = {};
    [...sf.elements].forEach(el => {
      if (!el.name) return;
      if (el.type === 'radio') { if (el.checked) body[el.name] = el.value; }
      else body[el.name] = el.type === 'checkbox' ? (el.checked ? '1' : '0') : el.value;
    });
    await withLoading(sf.querySelector('[type=submit]'), async () => {
      try { await api('/settings', { method: 'PUT', body }); snack('Settings saved'); loadSettings(); } catch (err) { snack(err.message, { error: true }); }
    });
  });
  $$('[data-toggle-pass]').forEach(b => b.addEventListener('click', () => togglePass($('#' + b.dataset.togglePass), b)));
  $('#btnTestAI').addEventListener('click', e => withLoading(e.currentTarget, async () => {
    $('#aiTest').textContent = '';
    const r = await api('/settings/test-openai', { method: 'POST' });
    $('#aiTest').innerHTML = r.ok ? `<span class="pill found">Connected · ${esc(r.reply)}</span>` : `<span class="pill error">${esc(r.error)}</span>`;
  }).catch(err => snack(err.message, { error: true })));

  /* ============================== POLLING ============================== */
  function startPolling() {
    setInterval(() => {
      if (document.hidden || $('#app').hidden || $$('dialog[open]').length) return;
      if (view === 'jobs') loadJobs();
      else if (view === 'products') loadProducts();
      else if (view === 'sitemap') loadSm(true);
    }, 8000);
  }

  /* ============================== BOOT ============================== */
  hydrateIcons();
  api('/auth/me').then(showApp).catch(showLogin);
})();
