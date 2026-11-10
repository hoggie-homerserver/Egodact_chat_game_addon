// ============================================================
// EGODACT ADDON CLIENT SDK (v2)
// ============================================================
(function () {
    'use strict';

    let hostReady = (typeof window !== 'undefined' && window.__egodactHostReady === true);
    const queue = [];

    function flush() {
        while (queue.length) {
            const item = queue.shift();
            try {
                document.dispatchEvent(new CustomEvent('egodact:addon:register', {
                    detail: { type: item.type, meta: item.meta }
                }));
            } catch (err) {
                console.error('Egodact addon dispatch mislukt:', err);
            }
        }
    }

    document.addEventListener('egodact:host:ready', function () {
        hostReady = true;
        window.__egodactHostReady = true;
        flush();
    });

    // Fallback: als de host er niet is, toch proberen na 1s.
    setTimeout(function () {
        if (!hostReady) {
            hostReady = true;
            flush();
        }
    }, 1000);

    // Verwijdert functies/DOM-nodes uit meta. Chromium laat zulke waarden
    // niet door CustomEvent-detail tussen extensies heen (het hele event
    // wordt dan stilletjes gedropt).
    function sanitizeMeta(value, depth) {
        depth = depth || 0;
        if (value === null || typeof value === 'undefined') return value;
        const t = typeof value;
        if (t === 'function' || t === 'symbol') return undefined;
        if (t !== 'object') return value;
        if (depth > 5) return undefined;
        if (Array.isArray(value)) {
            const arr = [];
            value.forEach(function (v) {
                const c = sanitizeMeta(v, depth + 1);
                if (typeof c !== 'undefined') arr.push(c);
            });
            return arr;
        }
        try {
            if (typeof Node !== 'undefined' && value instanceof Node) return undefined;
        } catch (err) {}
        const out = {};
        Object.keys(value).forEach(function (k) {
            let v;
            try { v = value[k]; } catch (err) { return; }
            const c = sanitizeMeta(v, depth + 1);
            if (typeof c !== 'undefined') out[k] = c;
        });
        return out;
    }

    function dispatch(type, meta) {
        meta = sanitizeMeta(meta || {});
        if (hostReady) {
            try {
                document.dispatchEvent(new CustomEvent('egodact:addon:register', {
                    detail: { type: type, meta: meta }
                }));
            } catch (err) {
                console.error('Egodact addon dispatch mislukt:', err);
            }
        } else {
            queue.push({ type: type, meta: meta });
        }
    }

    const listeners = Object.create(null);
    const shortcutListeners = Object.create(null);

    document.addEventListener('egodact:addon:open', function (event) {
        const id = (event && event.detail && event.detail.id) || null;
        const cbs = listeners[id] || [];
        cbs.forEach(function (cb) {
            try { cb(event.detail); } catch (err) { console.error(err); }
        });
    });

    document.addEventListener('egodact:addon:shortcut', function (event) {
        const id = (event && event.detail && event.detail.id) || null;
        const cbs = shortcutListeners[id] || [];
        cbs.forEach(function (cb) {
            try { cb(event.detail); } catch (err) { console.error(err); }
        });
    });

    const EgodactAddonClient = {
        registerAddon: function (meta) { dispatch('addon', meta || {}); },
        registerMenu: function (meta) { dispatch('menu', meta || {}); },
        registerButton: function (meta) { dispatch('button', meta || {}); },
        registerGame: function (meta) { dispatch('game', meta || {}); },
        registerSidebarPanel: function (meta) { dispatch('sidebar-panel', meta || {}); },
        registerShortcut: function (meta) { dispatch('shortcut', meta || {}); },
        unregisterShortcut: function (id) { dispatch('unregister-shortcut', { id: id }); },
        setLearningMode: function (v) { dispatch('learning-mode', { enabled: !!v }); },
        setHamburgerHidden: function (ids) { dispatch('hamburger-hide', { hidden: Array.isArray(ids) ? ids : [] }); },
        schedule: function (meta) { dispatch('schedule', meta || {}); },
        cancelSchedule: function (id) { dispatch('cancel-schedule', { id: id }); },
        setButtonEnabled: function (addonId, id, enabled) {
            enabled = !!enabled;
            try {
                const key = (addonId || '') + ':' + (id || '');
                const raw = localStorage.getItem('egodact_disabled_addon_buttons');
                const list = raw ? JSON.parse(raw) : [];
                const arr = Array.isArray(list) ? list : [];
                const idx = arr.indexOf(key);
                if (enabled) { if (idx !== -1) arr.splice(idx, 1); }
                else { if (idx === -1) arr.push(key); }
                localStorage.setItem('egodact_disabled_addon_buttons', JSON.stringify(arr));
            } catch (err) {}
            dispatch('button-toggle', { addonId: addonId, id: id, enabled: enabled });
        },
        isButtonEnabled: function (addonId, id) {
            try {
                const key = (addonId || '') + ':' + (id || '');
                const raw = localStorage.getItem('egodact_disabled_addon_buttons');
                const list = raw ? JSON.parse(raw) : [];
                return !(Array.isArray(list) && list.indexOf(key) !== -1);
            } catch (err) { return true; }
        },
        onOpen: function (id, cb) {
            if (!listeners[id]) listeners[id] = [];
            listeners[id].push(cb);
        },
        onShortcut: function (id, cb) {
            if (!shortcutListeners[id]) shortcutListeners[id] = [];
            shortcutListeners[id].push(cb);
        },
        openModal: function (titel, bodyHtml) {
            const bestaand = document.getElementById('egodact-custom-modal-backdrop');
            if (bestaand) bestaand.remove();
            const backdrop = document.createElement('div');
            backdrop.id = 'egodact-custom-modal-backdrop';
            Object.assign(backdrop.style, {
                position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
                backgroundColor: 'var(--egd-backdrop, rgba(0,0,0,0.65))', zIndex: '9999999',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Arial, sans-serif'
            });
            const modal = document.createElement('div');
            Object.assign(modal.style, {
                backgroundColor: 'var(--egd-modal, #424242)', color: 'var(--egd-tekst, #fff)',
                width: 'min(520px, calc(100vw - 32px))', maxHeight: 'calc(100vh - 32px)',
                boxSizing: 'border-box', overflow: 'hidden', borderRadius: '6px', padding: '24px',
                display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: 'var(--egd-schaduw, 0 4px 12px rgba(0,0,0,.3))'
            });
            modal.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid var(--egd-rand,#555);padding-bottom:10px;margin-bottom:5px;"><h2 style="margin:0;font-size:22px;font-weight:500;">' + titel + '</h2><button id="egodact-modal-sluiten" type="button" style="background:var(--egd-accent,#90caf9);border:none;color:var(--egd-accent-tekst,#0d47a1);cursor:pointer;padding:8px 14px;font-weight:bold;font-size:13px;border-radius:4px;">Sluiten</button></div><div style="overflow-y:auto;min-height:0;max-height:calc(100vh - 190px);padding-right:4px;display:flex;flex-direction:column;gap:10px;">' + bodyHtml + '</div>';
            backdrop.appendChild(modal);
            document.body.appendChild(backdrop);
            const sluit = function () { backdrop.remove(); };
            modal.querySelector('#egodact-modal-sluiten').addEventListener('click', sluit);
            backdrop.addEventListener('click', function (e) { if (e.target === backdrop) sluit(); });
            return backdrop;
        },
        escapeHtml: function (t) {
            return String(t == null ? '' : t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
        }
    };

    window.EgodactAddonClient = EgodactAddonClient;
})();
