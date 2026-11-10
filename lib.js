/**
 * Egodact Addon Library (v1)
 * Lightweight, dependency-free helpers for building GUIs and games in Egodact addons.
 *
 * Usage in an addon content script:
 *   const L = window.EgodactAddonLib;
 *   const { ui, game, data, layout, theme, el } = L;
 *
 * The library is theme-aware: it reads the CSS variables that the Egodact host
 * injects (--egd-*), so widgets automatically match dark/light mode.
 */
(function (global) {
    'use strict';

    const VERSION = '1.0.0';

    function client() {
        return (typeof global !== 'undefined' && global.EgodactAddonClient) || null;
    }

    // ============================================================
    // THEME
    // ============================================================
    function cssVar(name, fallback) {
        try {
            const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
            return v || fallback;
        } catch (err) {
            return fallback;
        }
    }

    function theme() {
        return {
            modal: cssVar('--egd-modal', '#424242'),
            veld: cssVar('--egd-veld', '#2e2e2e'),
            paneel: cssVar('--egd-paneel', '#333333'),
            info: cssVar('--egd-info', '#2b2b2b'),
            rand: cssVar('--egd-rand', '#555555'),
            lijn: cssVar('--egd-lijn', '#444444'),
            tekst: cssVar('--egd-tekst', '#ffffff'),
            tekstZacht: cssVar('--egd-tekst-zacht', '#b0b0b0'),
            uit: cssVar('--egd-uit', '#777777'),
            accent: cssVar('--egd-accent', '#90caf9'),
            accentTekst: cssVar('--egd-accent-tekst', '#0d47a1'),
            gevaar: cssVar('--egd-gevaar', '#ef5350'),
            backdrop: cssVar('--egd-backdrop', 'rgba(0,0,0,0.65)'),
            headerIcoon: cssVar('--egd-header-icoon', '#ffffff'),
            donker: document.documentElement.getAttribute('data-egodact-thema') !== 'licht'
        };
    }

    // ============================================================
    // CORE DOM HELPER
    // ============================================================
    function el(tag, props, ...children) {
        const node = document.createElement(tag || 'div');
        props = props || {};
        Object.keys(props).forEach(function (key) {
            const val = props[key];
            if (key === 'style' && val && typeof val === 'object') {
                Object.assign(node.style, val);
            } else if (key === 'class' || key === 'className') {
                node.className = val;
            } else if (key === 'html') {
                node.innerHTML = val;
            } else if (key === 'text') {
                node.textContent = val;
            } else if (key.startsWith('on') && typeof val === 'function') {
                node.addEventListener(key.slice(2).toLowerCase(), val);
            } else if (val !== null && val !== undefined) {
                node.setAttribute(key, val);
            }
        });
        children.flat(Infinity).forEach(function (child) {
            if (child === null || child === undefined || child === false) return;
            if (typeof child === 'string' || typeof child === 'number') {
                node.appendChild(document.createTextNode(String(child)));
            } else if (child instanceof Node) {
                node.appendChild(child);
            }
        });
        return node;
    }

    function applyBaseStyle(node, opts) {
        opts = opts || {};
        const t = theme();
        Object.assign(node.style, {
            fontFamily: 'Arial, sans-serif',
            boxSizing: 'border-box'
        }, opts.style || {});
        return node;
    }

    // ============================================================
    // UI WIDGETS
    // ============================================================
    const ui = {};

    ui.panel = function (opts) {
        opts = opts || {};
        const t = theme();
        const node = el('div', {
            style: {
                backgroundColor: opts.background || t.paneel,
                border: '1px solid ' + (opts.border || t.rand),
                borderRadius: (opts.radius || 6) + 'px',
                padding: opts.padding || '12px',
                color: opts.color || t.tekst
            }
        });
        if (opts.children) opts.children.forEach(function (c) { node.appendChild(c); });
        if (opts.html) node.innerHTML = opts.html;
        return node;
    };

    // iframe helper voor sidebar-panelen (of andere plekken waar je
    // externe/lokale inhoud wilt embedden). Let op: de host-pagina CSP en
    // de web_accessible_resources van de addon bepalen wat er geladen mag.
    ui.iframe = function (opts) {
        opts = opts || {};
        const t = theme();
        const props = {
            src: opts.src || 'about:blank',
            title: opts.title || '',
            style: {
                width: opts.width || '100%',
                height: opts.height || '200px',
                border: '1px solid ' + (opts.border || t.rand),
                borderRadius: (opts.radius || 6) + 'px',
                background: opts.background || t.paneel,
                display: 'block'
            }
        };
        if (opts.sandbox) props.sandbox = opts.sandbox;
        if (opts.allow) props.allow = opts.allow;
        const node = el('iframe', props);
        if (opts.onload && typeof opts.onload === 'function') {
            node.addEventListener('load', opts.onload);
        }
        return node;
    };

    // YouTube helper: zet een gewone of Shorts-URL om naar een embed-URL.
    // Voorbeeld: L.ui.youtube({ url: 'https://www.youtube.com/shorts/ABC123', height: '320px' })
    ui.youtube = function (opts) {
        opts = opts || {};
        const url = String(opts.url || opts.src || '');
        let id = '';
        const patterns = [
            /youtube\.com\/shorts\/([A-Za-z0-9_-]{6,})/,
            /youtube\.com\/watch\?[^#]*v=([A-Za-z0-9_-]{6,})/,
            /youtu\.be\/([A-Za-z0-9_-]{6,})/,
            /youtube\.com\/embed\/([A-Za-z0-9_-]{6,})/
        ];
        for (let i = 0; i < patterns.length; i++) {
            const m = url.match(patterns[i]);
            if (m) { id = m[1]; break; }
        }
        if (!id && /^[A-Za-z0-9_-]{6,}$/.test(url)) id = url;
        const params = [];
        if (opts.autoplay) params.push('autoplay=1');
        if (opts.mute !== false && opts.autoplay) params.push('mute=1');
        if (opts.controls === false) params.push('controls=0');
        if (opts.loop) { params.push('loop=1'); params.push('playlist=' + encodeURIComponent(id)); }
        if (opts.start) params.push('start=' + encodeURIComponent(opts.start));
        const src = id
            ? 'https://www.youtube.com/embed/' + id + (params.length ? '?' + params.join('&') : '')
            : (url || 'about:blank');
        const node = ui.iframe(Object.assign({}, opts, {
            src: src,
            title: opts.title || 'YouTube',
            height: opts.height || '320px',
            allow: opts.allow || 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share',
            sandbox: opts.sandbox || 'allow-scripts allow-same-origin allow-presentation'
        }));
        return node;
    };

    // Scrollbare Shorts-feed: stapelt meerdere Shorts onder elkaar in een
    // container met scroll-snap, zodat je door Shorts kunt scrollen.
    ui.shortsFeed = function (opts) {
        opts = opts || {};
        const t = theme();
        const toId = function (x) {
            if (typeof x !== "string") return "";
            let id = "";
            const patterns = [
                /youtube\.com\/shorts\/([A-Za-z0-9_-]{6,})/,
                /youtube\.com\/watch\?[^#]*v=([A-Za-z0-9_-]{6,})/,
                /youtu\.be\/([A-Za-z0-9_-]{6,})/,
                /youtube\.com\/embed\/([A-Za-z0-9_-]{6,})/
            ];
            for (let i = 0; i < patterns.length; i++) {
                const m = x.match(patterns[i]);
                if (m) { id = m[1]; break; }
            }
            if (!id && /^[A-Za-z0-9_-]{6,}$/.test(x)) id = x;
            return id;
        };
        const normalize = function (arr) { return (arr || []).map(toId).filter(Boolean); };
        const height = opts.height || "400px";
        const container = el("div", {
            style: {
                height: height,
                overflowY: "auto",
                scrollSnapType: "y mandatory",
                border: "1px solid " + (opts.border || t.rand),
                borderRadius: (opts.radius || 8) + "px",
                background: opts.background || t.paneel,
                position: "relative"
            }
        });
        const itemsWrap = el("div", { style: { position: "relative" } });
        const sentinel = el("div", { style: { height: "1px" } });
        container.appendChild(itemsWrap);
        container.appendChild(sentinel);
        let ids = normalize(opts.ids || []);
        let loading = false;
        let exhausted = false;
        let itemIndex = 0;
        const maxItems = opts.maxItems || 200;
        function makeItem(id) {
            const item = el("div", { style: {
                height: "100%", scrollSnapAlign: "start", scrollSnapStop: "always",
                position: "relative", background: "#000", flex: "0 0 100%"
            } });
            const iframe = ui.youtube({
                url: "https://www.youtube.com/shorts/" + id,
                height: "100%", width: "100%",
                autoplay: opts.autoplay === true,
                mute: opts.mute !== false,
                loop: opts.loop !== false,
                controls: opts.controls !== false
            });
            iframe.style.position = "absolute";
            iframe.style.inset = "0";
            iframe.style.width = "100%";
            iframe.style.height = "100%";
            iframe.style.border = "0";
            item.appendChild(iframe);
            const badge = el("div", { text: (itemIndex + 1) + "", style: {
                position: "absolute", top: "8px", right: "8px",
                background: "rgba(0,0,0,.55)", color: "#fff",
                fontSize: "11px", padding: "2px 6px", borderRadius: "999px", zIndex: "2"
            } });
            item.appendChild(badge);
            return item;
        }
        function appendIds(list) {
            list.forEach(function (id) {
                if (itemsWrap.children.length >= maxItems) return;
                itemsWrap.appendChild(makeItem(id));
                itemIndex++;
            });
        }
        if (!ids.length && !opts.loadMore) {
            itemsWrap.appendChild(el("div", { text: opts.emptyText || "Geen Shorts opgegeven.", style: { padding: "16px", color: t.tekstZacht } }));
            return container;
        }
        appendIds(ids);
        async function loadMore() {
            if (loading || exhausted) return;
            loading = true;
            try {
                let more = [];
                if (typeof opts.loadMore === "function") {
                    more = normalize(await opts.loadMore());
                } else if (opts.infinite && ids.length) {
                    more = ids.slice();
                }
                if (!more.length) { exhausted = true; }
                else { appendIds(more); }
            } catch (err) { console.error(err); exhausted = true; }
            finally { loading = false; }
        }
        if ("IntersectionObserver" in window) {
            const io = new IntersectionObserver(function (entries) {
                entries.forEach(function (e) { if (e.isIntersecting) loadMore(); });
            }, { root: container, rootMargin: "300px" });
            io.observe(sentinel);
        } else {
            container.addEventListener("scroll", function () {
                if (container.scrollTop + container.clientHeight >= container.scrollHeight - 300) loadMore();
            });
        }
        if (opts.infinite && ids.length) {
            setTimeout(function () { if (itemsWrap.children.length < 6) loadMore(); }, 100);
        }
        return container;
    };

    ui.row = function (opts) {
        opts = opts || {};
        const node = el('div', {
            style: {
                display: 'flex',
                flexDirection: 'row',
                alignItems: opts.align || 'center',
                justifyContent: opts.justify || 'flex-start',
                gap: (opts.gap || 8) + 'px',
                flexWrap: opts.wrap ? 'wrap' : 'nowrap'
            }
        });
        if (opts.children) opts.children.forEach(function (c) { node.appendChild(c); });
        return node;
    };

    ui.col = function (opts) {
        opts = opts || {};
        const node = el('div', {
            style: {
                display: 'flex',
                flexDirection: 'column',
                alignItems: opts.align || 'stretch',
                justifyContent: opts.justify || 'flex-start',
                gap: (opts.gap || 8) + 'px'
            }
        });
        if (opts.children) opts.children.forEach(function (c) { node.appendChild(c); });
        return node;
    };

    ui.button = function (label, onClick, opts) {
        opts = opts || {};
        const t = theme();
        const node = el('button', {
            type: 'button',
            text: label,
            style: {
                padding: opts.padding || '8px 14px',
                fontSize: opts.fontSize || '13px',
                fontWeight: 'bold',
                border: 'none',
                borderRadius: (opts.radius || 4) + 'px',
                cursor: 'pointer',
                background: opts.background || t.accent,
                color: opts.color || t.accentTekst,
                minWidth: opts.minWidth || ''
            },
            onClick: function (e) {
                if (typeof onClick === 'function') onClick(e);
            }
        });
        if (opts.icon) {
            const span = el('span', { style: { marginRight: '6px' }, html: opts.icon });
            node.insertBefore(span, node.firstChild);
        }
        return node;
    };

    ui.toggle = function (label, value, onChange, opts) {
        opts = opts || {};
        const t = theme();
        const wrap = el('label', { style: { display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: t.tekst } });
        const checkbox = el('input', { type: 'checkbox' });
        checkbox.checked = !!value;
        const slider = el('span', { style: {
            position: 'relative', display: 'inline-block', width: '40px', height: '22px',
            backgroundColor: value ? t.accent : t.uit, borderRadius: '22px', transition: 'background-color 150ms ease'
        }});
        const knob = el('span', { style: {
            position: 'absolute', top: '2px', left: value ? '20px' : '2px',
            width: '18px', height: '18px', borderRadius: '50%', backgroundColor: '#fff',
            transition: 'left 150ms ease', boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
        }});
        slider.appendChild(knob);
        const text = el('span', { text: label });
        wrap.append(checkbox, slider, text);
        checkbox.style.cssText = 'opacity:0;width:0;height:0;position:absolute;';
        wrap.addEventListener('click', function (e) {
            e.preventDefault();
            const next = !checkbox.checked;
            checkbox.checked = next;
            slider.style.backgroundColor = next ? t.accent : t.uit;
            knob.style.left = next ? '20px' : '2px';
            if (typeof onChange === 'function') onChange(next);
        });
        return wrap;
    };

    ui.input = function (opts) {
        opts = opts || {};
        const t = theme();
        const node = el('input', {
            type: opts.type || 'text',
            placeholder: opts.placeholder || '',
            value: opts.value || ''
        });
        Object.assign(node.style, {
            padding: opts.padding || '8px 10px',
            fontSize: opts.fontSize || '13px',
            border: '1px solid ' + t.rand,
            borderRadius: (opts.radius || 4) + 'px',
            background: t.veld,
            color: t.tekst,
            outline: 'none',
            width: opts.width || '100%',
            boxSizing: 'border-box'
        });
        if (typeof opts.onChange === 'function') node.addEventListener('input', function (e) { opts.onChange(e.target.value); });
        return node;
    };

    ui.textarea = function (opts) {
        opts = opts || {};
        const node = el('textarea', { placeholder: opts.placeholder || '', rows: opts.rows || 4 });
        Object.assign(node.style, {
            padding: '8px 10px', fontSize: '13px',
            border: '1px solid ' + theme().rand, borderRadius: '4px',
            background: theme().veld, color: theme().tekst,
            outline: 'none', width: '100%', boxSizing: 'border-box', resize: 'vertical'
        });
        if (opts.value) node.value = opts.value;
        if (typeof opts.onChange === 'function') node.addEventListener('input', function (e) { opts.onChange(e.target.value); });
        return node;
    };

    ui.select = function (opts) {
        opts = opts || {};
        const t = theme();
        const node = el('select', {});
        (opts.options || []).forEach(function (o) {
            const opt = el('option', { value: o.value != null ? o.value : o, text: o.label != null ? o.label : o });
            node.appendChild(opt);
        });
        if (opts.value != null) node.value = opts.value;
        Object.assign(node.style, {
            padding: '8px 10px', fontSize: '13px',
            border: '1px solid ' + t.rand, borderRadius: '4px',
            background: t.veld, color: t.tekst
        });
        if (typeof opts.onChange === 'function') node.addEventListener('change', function (e) { opts.onChange(e.target.value); });
        return node;
    };

    ui.tabs = function (tabs, opts) {
        opts = opts || {};
        const t = theme();
        const wrap = el('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } });
        const bar = el('div', { style: { display: 'flex', gap: '4px', borderBottom: '1px solid ' + t.rand } });
        const content = el('div', { style: { padding: '8px 0' } });
        let active = opts.active || 0;
        function render() {
            bar.innerHTML = '';
            content.innerHTML = '';
            tabs.forEach(function (tab, i) {
                const btn = ui.button(tab.title || ('Tab ' + (i + 1)), function () {
                    active = i;
                    render();
                }, {
                    background: i === active ? t.accent : 'transparent',
                    color: i === active ? t.accentTekst : t.tekst,
                    padding: '6px 12px'
                });
                bar.appendChild(btn);
            });
            const cur = tabs[active];
            if (cur && typeof cur.render === 'function') {
                content.appendChild(cur.render());
            } else if (cur && cur.html) {
                content.innerHTML = cur.html;
            }
        }
        render();
        wrap.append(bar, content);
        return wrap;
    };

    ui.list = function (items, render, opts) {
        opts = opts || {};
        const wrap = el('div', { style: { display: 'flex', flexDirection: 'column', gap: (opts.gap || 6) + 'px' } });
        items.forEach(function (item, i) {
            const node = (typeof render === 'function') ? render(item, i) : el('div', { text: String(item) });
            wrap.appendChild(node);
        });
        return wrap;
    };

    ui.card = function (opts) {
        opts = opts || {};
        const t = theme();
        const node = el('div', {
            style: {
                backgroundColor: opts.background || t.paneel,
                border: '1px solid ' + t.rand,
                borderRadius: '8px',
                padding: opts.padding || '16px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
            }
        });
        if (opts.title) node.appendChild(el('h3', { text: opts.title, style: { margin: '0 0 8px 0', color: t.tekst } }));
        if (opts.children) opts.children.forEach(function (c) { node.appendChild(c); });
        if (opts.html) node.innerHTML += opts.html;
        return node;
    };

    ui.toast = function (msg, opts) {
        opts = opts || {};
        const t = theme();
        const isError = opts.type === 'error';
        const isInfo = opts.type === 'info';
        const bg = opts.background || (isError ? t.gevaar : (isInfo ? '#2e7d32' : t.accent));
        const fg = opts.color || (isError || isInfo ? '#fff' : t.accentTekst);
        const node = el('div', {
            text: msg,
            style: {
                position: 'fixed',
                bottom: (opts.bottom || 20) + 'px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: bg,
                color: fg,
                padding: '10px 16px',
                borderRadius: '6px',
                zIndex: '2147483647',
                boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                fontSize: '13px',
                fontWeight: 'bold'
            }
        });
        document.body.appendChild(node);
        setTimeout(function () {
            node.style.transition = 'opacity 300ms ease';
            node.style.opacity = '0';
            setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, 320);
        }, opts.duration || 2500);
        return node;
    };

    ui.modal = function (title, body, opts) {
        const c = client();
        if (c && typeof c.openModal === 'function') {
            const html = (typeof body === 'string') ? body : '';
            const backdrop = c.openModal(title, html);
            if (typeof body !== 'string' && body instanceof Node) {
                const modal = backdrop.firstChild;
                const container = (modal && modal.lastElementChild) ? modal.lastElementChild : backdrop;
                container.appendChild(body);
            }
            // Optional overrides for the modal panel.
            if (opts && (opts.background || opts.width)) {
                const modalEl = backdrop.firstChild;
                if (modalEl) {
                    if (opts.background) modalEl.style.backgroundColor = opts.background;
                    if (opts.width) modalEl.style.width = opts.width;
                }
            }
            return backdrop;
        }
        // Fallback: build our own modal.
        const t = theme();
        const backdrop = el('div', { style: {
            position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
            backgroundColor: t.backdrop, zIndex: '9999999', display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontFamily: 'Arial, sans-serif'
        }});
        const modal = el('div', { style: {
            backgroundColor: t.modal, color: t.tekst, width: 'min(520px, calc(100vw - 32px))',
            maxHeight: 'calc(100vh - 32px)', boxSizing: 'border-box', overflow: 'hidden',
            borderRadius: '6px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px'
        }});
        const head = el('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid ' + t.rand, paddingBottom: '10px' } });
        head.appendChild(el('h2', { text: title, style: { margin: '0', fontSize: '22px', fontWeight: '500' } }));
        const close = ui.button('Sluiten', function () { if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop); }, { background: t.accent, color: t.accentTekst });
        head.appendChild(close);
        modal.appendChild(head);
        const bodyWrap = el('div', { style: { overflowY: 'auto', maxHeight: 'calc(100vh - 190px)' } });
        if (typeof body === 'string') bodyWrap.innerHTML = body;
        else if (body instanceof Node) bodyWrap.appendChild(body);
        modal.appendChild(bodyWrap);
        backdrop.appendChild(modal);
        backdrop.addEventListener('click', function (e) { if (e.target === backdrop) { if (backdrop.parentNode) backdrop.parentNode.removeChild(backdrop); } });
        document.body.appendChild(backdrop);
        return backdrop;
    };

    // ============================================================
    // GAME HELPERS
    // ============================================================
    const game = {};

    game.createCanvas = function (parent, width, height, opts) {
        opts = opts || {};
        const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) ? window.devicePixelRatio : 1;
        const canvas = el('canvas', { width: width * dpr, height: height * dpr });
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        Object.assign(canvas.style, {
            display: 'block',
            background: opts.background || '#000',
            border: '1px solid ' + theme().rand,
            borderRadius: (opts.radius || 4) + 'px',
            imageRendering: 'auto'
        });
        const ctx = canvas.getContext('2d');
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (parent) parent.appendChild(canvas);
        return { canvas: canvas, ctx: ctx, width: width, height: height, dpr: dpr };
    };

    game.input = function () {
        const state = { keys: {}, mouse: { x: 0, y: 0, down: false, clicked: false }, touches: [] };
        const onKeyDown = function (e) { state.keys[e.key] = true; state.keys[e.code] = true; };
        const onKeyUp = function (e) { state.keys[e.key] = false; state.keys[e.code] = false; };
        const onMouseMove = function (e) { const r = e.target.getBoundingClientRect ? e.target.getBoundingClientRect() : { left: 0, top: 0 }; state.mouse.x = e.clientX - r.left; state.mouse.y = e.clientY - r.top; };
        const onMouseDown = function (e) { state.mouse.down = true; state.mouse.clicked = true; };
        const onMouseUp = function (e) { state.mouse.down = false; };
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mouseup', onMouseUp);
        state.destroy = function () {
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mousedown', onMouseDown);
            window.removeEventListener('mouseup', onMouseUp);
        };
        state.consumeClick = function () { const c = state.mouse.clicked; state.mouse.clicked = false; return c; };
        return state;
    };

    game.loop = function (update, render, opts) {
        opts = opts || {};
        let running = true;
        let last = performance.now();
        let raf = null;
        function tick(now) {
            if (!running) return;
            const dt = Math.min((now - last) / 1000, opts.maxDt || 0.05);
            last = now;
            try { if (typeof update === 'function') update(dt); } catch (err) { console.error(err); }
            try { if (typeof render === 'function') render(dt); } catch (err) { console.error(err); }
            raf = requestAnimationFrame(tick);
        }
        raf = requestAnimationFrame(tick);
        return {
            stop: function () { running = false; if (raf) cancelAnimationFrame(raf); },
            pause: function () { running = false; },
            resume: function () { if (!running) { running = true; last = performance.now(); raf = requestAnimationFrame(tick); } }
        };
    };

    game.rect = function (ctx, x, y, w, h, color, opts) {
        opts = opts || {};
        ctx.fillStyle = color || '#fff';
        if (opts.radius) {
            const r = opts.radius;
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.lineTo(x + w - r, y);
            ctx.quadraticCurveTo(x + w, y, x + w, y + r);
            ctx.lineTo(x + w, y + h - r);
            ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
            ctx.lineTo(x + r, y + h);
            ctx.quadraticCurveTo(x, y + h, x, y + h - r);
            ctx.lineTo(x, y + r);
            ctx.quadraticCurveTo(x, y, x + r, y);
            ctx.closePath();
            ctx.fill();
        } else {
            ctx.fillRect(x, y, w, h);
        }
        if (opts.stroke) {
            ctx.strokeStyle = opts.stroke;
            ctx.lineWidth = opts.lineWidth || 1;
            ctx.strokeRect(x, y, w, h);
        }
    };

    game.circle = function (ctx, x, y, r, color, opts) {
        opts = opts || {};
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = color || '#fff';
        ctx.fill();
        if (opts.stroke) {
            ctx.strokeStyle = opts.stroke;
            ctx.lineWidth = opts.lineWidth || 1;
            ctx.stroke();
        }
    };

    game.text = function (ctx, str, x, y, opts) {
        opts = opts || {};
        ctx.fillStyle = opts.color || '#fff';
        ctx.font = (opts.bold ? 'bold ' : '') + (opts.size || 14) + 'px ' + (opts.font || 'Arial, sans-serif');
        ctx.textAlign = opts.align || 'left';
        ctx.textBaseline = opts.baseline || 'top';
        if (opts.shadow) {
            ctx.shadowColor = opts.shadow;
            ctx.shadowBlur = opts.shadowBlur || 4;
        }
        ctx.fillText(str, x, y);
        ctx.shadowBlur = 0;
    };

    game.sprite = function (ctx, img, x, y, w, h, opts) {
        opts = opts || {};
        if (opts.flipX) {
            ctx.save();
            ctx.translate(x + (w || img.width), y);
            ctx.scale(-1, 1);
            ctx.drawImage(img, 0, 0, w || img.width, h || img.height);
            ctx.restore();
        } else {
            ctx.drawImage(img, x, y, w || img.width, h || img.height);
        }
    };

    game.clear = function (ctx, color) {
        const c = ctx.canvas;
        if (color) {
            ctx.fillStyle = color;
            ctx.fillRect(0, 0, c.width, c.height);
        } else {
            ctx.clearRect(0, 0, c.width, c.height);
        }
    };

    game.collide = function (a, b) {
        return a.x < b.x + b.w && a.x + a.w > b.x &&
               a.y < b.y + b.h && a.y + a.h > b.y;
    };

    game.center = function (canvas) {
        return { x: canvas.width / 2, y: canvas.height / 2 };
    };

    // ============================================================
    // DATA HELPERS
    // ============================================================
    const data = {};

    data.storage = function (prefix) {
        const c = client();
        if (c && typeof c.storage === 'function') return c.storage(prefix);
        const p = 'egodact_lib_' + (prefix || 'global') + '_';
        return {
            get: function (key, fallback) {
                try { const raw = localStorage.getItem(p + key); return raw === null ? fallback : JSON.parse(raw); }
                catch (err) { return fallback; }
            },
            set: function (key, value) { try { localStorage.setItem(p + key, JSON.stringify(value)); return true; } catch (err) { return false; } },
            remove: function (key) { try { localStorage.removeItem(p + key); } catch (err) {} }
        };
    };

    const _bus = { listeners: {} };
    data.bus = {
        on: function (event, cb) {
            if (!_bus.listeners[event]) _bus.listeners[event] = [];
            _bus.listeners[event].push(cb);
            return function () { data.bus.off(event, cb); };
        },
        off: function (event, cb) {
            if (!_bus.listeners[event]) return;
            _bus.listeners[event] = _bus.listeners[event].filter(function (f) { return f !== cb; });
        },
        emit: function (event, payload) {
            const list = _bus.listeners[event] || [];
            list.forEach(function (cb) { try { cb(payload); } catch (err) { console.error(err); } });
        }
    };

    data.state = function (initial) {
        let value = (typeof initial === 'function') ? initial() : initial;
        const subs = [];
        return {
            get: function () { return value; },
            set: function (next) { value = (typeof next === 'function') ? next(value) : next; subs.forEach(function (cb) { try { cb(value); } catch (err) {} }); },
            subscribe: function (cb) { subs.push(cb); return function () { const i = subs.indexOf(cb); if (i >= 0) subs.splice(i, 1); }; }
        };
    };

    data.fetchJSON = function (url, opts) {
        opts = opts || {};
        return fetch(url, opts).then(function (res) {
            if (!res.ok) throw new Error('HTTP ' + res.status);
            return res.json();
        });
    };

    // ============================================================
    // LAYOUT HELPERS
    // ============================================================
    const layout = {};

    layout.center = function (node) {
        if (node) Object.assign(node.style, { display: 'flex', alignItems: 'center', justifyContent: 'center' });
        return node;
    };

    layout.grid = function (cols, opts) {
        opts = opts || {};
        const node = el('div', { style: {
            display: 'grid',
            gridTemplateColumns: 'repeat(' + cols + ', 1fr)',
            gap: (opts.gap || 8) + 'px'
        }});
        if (opts.children) opts.children.forEach(function (c) { node.appendChild(c); });
        return node;
    };

    layout.scroll = function (node, opts) {
        opts = opts || {};
        if (node) Object.assign(node.style, {
            overflowY: 'auto',
            maxHeight: opts.maxHeight || '300px'
        });
        return node;
    };

    // ============================================================
    // HAMBURGER MENU HELPER
    // ============================================================
    // Addons register dropdown items here; the host shows a hamburger
    // button next to the user's name only when at least one item exists.
    //
    //   EgodactAddonLib.hamburger.add({ addonId, id, title, icon, order });
    //   EgodactAddonLib.hamburger.onOpen(id, function () { ... });
    //
    // Only items registered through this helper appear in the
    // hamburger. Regular client.registerMenu() items stay in the
    // Addons library.
    const hamburger = {
        add: function (meta) {
            meta = meta || {};
            const c = client();
            if (c) {
                if (typeof c.registerHamburger === 'function') c.registerHamburger(meta);
                else if (typeof c.registerMenu === 'function') c.registerMenu(meta);
                else {
                    // Host without SDK helpers: dispatch directly so
                    // the host can pick it up.
                    try {
                        document.dispatchEvent(new CustomEvent('egodact:addon:register', {
                            detail: { type: 'hamburger', meta: meta }
                        }));
                    } catch (err) {}
                }
            }
            return meta.id;
        },
        onOpen: function (id, cb) {
            const c = client();
            if (c && typeof c.onOpen === 'function') c.onOpen(id, cb);
        },
        // Hide specific dropdown items (by registered id) in the
        // host's hamburger menu. Pass [] to show everything again.
        hide: function (ids) {
            const list = Array.isArray(ids) ? ids : (ids ? [ids] : []);
            const c = client();
            if (c && typeof c.setHamburgerHidden === 'function') {
                c.setHamburgerHidden(list);
                return;
            }
            try {
                document.dispatchEvent(new CustomEvent('egodact:addon:register', {
                    detail: { type: 'hamburger-hide', meta: { hidden: list } }
                }));
            } catch (err) {}
        },
        show: function () { hamburger.hide([]); }
    };

    // Friendly aliases on the ui namespace.
    ui.showInDropdown = hamburger.add;
    ui.onDropdownOpen = hamburger.onOpen;

    // ============================================================
    // THEME CHANGE LISTENER
    // ============================================================
    theme.onChange = function (cb) {
        const c = client();
        if (c && typeof c.onThemeChange === 'function') c.onThemeChange(cb);
    };

    // ============================================================
    // CHALLENGES HELPER
    // ============================================================
    const challenges = {
        list: function (force) {
            const c = client();
            return c && typeof c.getChallenges === 'function'
                ? c.getChallenges(force === true)
                : Promise.resolve([]);
        },
        onChange: function (cb) {
            const c = client();
            if (c && typeof c.onChallengesChanged === 'function') c.onChallengesChanged(cb);
        }
    };

    // ============================================================
    // TOPBAR SLOT HELPER
    // ============================================================
    const topbar = {
        add: function (meta) {
            meta = meta || {};
            const c = client();
            if (c && typeof c.registerButton === 'function') {
                c.registerButton(Object.assign({}, meta, {
                    position: 'header',
                    slot: meta.slot || 'actions',
                    order: (typeof meta.order === 'number') ? meta.order : null
                }));
            }
            return meta.id;
        }
    };

    // ============================================================
    // SIDEBAR PANEL HELPER
    // ============================================================
    const sidebar = {
        add: function (meta) {
            meta = meta || {};
            const c = client();
            const id = meta.id;
            if (c && typeof c.registerSidebarPanel === 'function') {
                // Alleen strings/nummers: Chromium laat geen functies door
                // CustomEvent-detail tussen extensies heen.
                c.registerSidebarPanel({ addonId: meta.addonId, id: id, title: meta.title, icon: meta.icon, order: meta.order });
            } else {
                try {
                    document.dispatchEvent(new CustomEvent('egodact:addon:register', {
                        detail: {
                            type: 'sidebar-panel',
                            meta: { addonId: meta.addonId, id: id, title: meta.title, icon: meta.icon, order: meta.order }
                        }
                    }));
                } catch (err) {}
            }
            // De host stuurt een open-event met de container zodra het paneel
            // getekend moet worden. Zo blijft de render-functie in de addon-
            // wereld (belangrijk in Chromium).
            if (c && typeof c.onOpen === 'function' && typeof meta.render === 'function') {
                c.onOpen(id, function (detail) {
                    detail = detail || {};
                    let container = detail.container || null;
                    if (!container && detail.containerId) {
                        container = document.getElementById(detail.containerId);
                    }
                    if (!container) {
                        container = document.querySelector('[data-egodact-addon-panel="' + String(id) + '"]');
                    }
                    if (container) {
                        try { meta.render(container); } catch (err) { console.error(err); }
                    }
                });
            }
            return id;
        },
        remove: function (id) {
            // Panels persist for the session; removal requires a reload.
        }
    };

    // ============================================================
    // SCHEDULER HELPER
    // ============================================================
    const scheduler = {
        schedule: function (meta) {
            meta = meta || {};
            const c = client();
            if (c && typeof c.schedule === 'function') c.schedule(meta);
            else {
                try {
                    document.dispatchEvent(new CustomEvent('egodact:addon:register', {
                        detail: { type: 'schedule', meta: meta }
                    }));
                } catch (err) {}
            }
            return meta.id;
        },
        cancel: function (id) {
            const c = client();
            if (c && typeof c.cancelSchedule === 'function') c.cancelSchedule(id);
            else {
                try {
                    document.dispatchEvent(new CustomEvent('egodact:addon:register', {
                        detail: { type: 'cancel-schedule', meta: { id: id } }
                    }));
                } catch (err) {}
            }
        }
    };


    // ============================================================
    // SHORTCUTS HELPER
    // ============================================================
    const shortcuts = {
        add: function (meta) {
            meta = meta || {};
            const c = client();
            const id = meta.id;
            if (c && typeof c.registerShortcut === 'function') {
                c.registerShortcut({ addonId: meta.addonId, id: id, title: meta.title, keys: meta.keys, scope: meta.scope || 'global' });
            } else {
                try {
                    document.dispatchEvent(new CustomEvent('egodact:addon:register', {
                        detail: { type: 'shortcut', meta: { addonId: meta.addonId, id: id, title: meta.title, keys: meta.keys, scope: meta.scope || 'global' } }
                    }));
                } catch (err) {}
            }
            if (c && typeof c.onShortcut === 'function' && typeof meta.action === 'function') {
                c.onShortcut(id, function (detail) {
                    try { meta.action(detail); } catch (err) { console.error(err); }
                });
            }
            return id;
        },
        remove: function (id) {
            const c = client();
            if (c && typeof c.unregisterShortcut === 'function') c.unregisterShortcut(id);
            else {
                try {
                    document.dispatchEvent(new CustomEvent('egodact:addon:register', {
                        detail: { type: 'unregister-shortcut', meta: { id: id } }
                    }));
                } catch (err) {}
            }
        }
    };

    const lib = {
        version: VERSION,
        theme: theme,
        cssVar: cssVar,
        el: el,
        ui: ui,
        game: game,
        data: data,
        layout: layout,
        hamburger: hamburger,
        challenges: challenges,
        topbar: topbar,
        sidebar: sidebar,
        shortcuts: shortcuts,
        scheduler: scheduler
    };

    if (typeof module !== 'undefined' && module.exports) module.exports = lib;
    if (typeof global !== 'undefined') global.EgodactAddonLib = lib;

})(typeof window !== 'undefined' ? window : this);
