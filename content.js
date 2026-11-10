// ============================================================
// CHAT ARCADE - turn-based mini-games for Egodact
// ============================================================
// Adds a game hub with Boter-kaas-en-eieren (tic-tac-toe) and
// Connect 4, playable against a computer or with two players on
// one screen. Tracks win/loss streaks, a daily goal and lets you
// share your score in the Egodact chat.
// ============================================================
(function () {
    'use strict';

    const client = window.EgodactAddonClient;
    const L = window.EgodactAddonLib;
    if (!client || !L) return;

    const { ui, theme, el, data } = L;

    const ADDON_ID = 'egodact-chat-arcade';
    const VERSION = '0.1.0';

    const ICON =
        '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
        'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ' +
        'style="opacity:1;display:block;pointer-events:none;">' +
        '<rect x="2" y="7" width="20" height="10" rx="4"></rect>' +
        '<path d="M7 10v4"></path><path d="M5 12h4"></path>' +
        '<circle cx="16" cy="11" r="1"></circle><circle cx="18" cy="13" r="1"></circle>' +
        '</svg>';

    const store = data.storage(ADDON_ID);

    // ------------------------------------------------------------
    // Stats + daily goal
    // ------------------------------------------------------------
    const EMPTY_SCORE = { wins: 0, losses: 0, draws: 0, streak: 0, best: 0 };

    function readStats() {
        const raw = store.get('stats', null) || {};
        return {
            ttt: Object.assign({}, EMPTY_SCORE, raw.ttt || {}),
            c4: Object.assign({}, EMPTY_SCORE, raw.c4 || {}),
            played: typeof raw.played === 'number' ? raw.played : 0
        };
    }

    let stats = readStats();

    function dayKey() {
        const d = new Date();
        return d.getFullYear() + '-' +
            String(d.getMonth() + 1).padStart(2, '0') + '-' +
            String(d.getDate()).padStart(2, '0');
    }

    let daily = store.get('daily', null);
    if (!daily || daily.date !== dayKey()) {
        daily = { date: dayKey(), played: 0, wins: 0, goal: 2, done: false };
    }

    function saveStats() {
        store.set('stats', stats);
        store.set('daily', daily);
    }

    function recordResult(game, result) {
        stats.played++;
        const s = stats[game];
        if (result === 'win') {
            s.wins++;
            s.streak++;
            if (s.streak > s.best) s.best = s.streak;
        } else if (result === 'loss') {
            s.losses++;
            s.streak = 0;
        } else {
            s.draws++;
        }
        daily.played++;
        if (result === 'win') daily.wins++;
        const justDone = !daily.done && daily.wins >= daily.goal;
        if (justDone) daily.done = true;
        saveStats();
        if (justDone) {
            try { ui.toast('Dagdoel gehaald: ' + daily.goal + ' potjes gewonnen!', { type: 'success' }); } catch (e) {}
        }
    }

    function scoreLine(s) {
        return s.wins + 'W / ' + s.losses + 'L / ' + s.draws + 'D';
    }

    function shareText() {
        return 'Chat Arcade\n' +
            'Boter-kaas-en-eieren: ' + scoreLine(stats.ttt) + ' (streak ' + stats.ttt.streak + ', best ' + stats.ttt.best + ')\n' +
            'Connect 4: ' + scoreLine(stats.c4) + '\n' +
            'Dagdoel: ' + Math.min(daily.wins, daily.goal) + '/' + daily.goal + (daily.done ? ' gehaald!' : '');
    }

    function copyText(text, okMessage) {
        function done() {
            try { ui.toast(okMessage || 'Gekopieerd', { type: 'success' }); } catch (e) {}
        }
        function fallback() {
            const ta = el('textarea', { style: { position: 'fixed', left: '-9999px', top: '0' } });
            ta.value = text;
            document.body.appendChild(ta);
            ta.focus();
            ta.select();
            try { document.execCommand('copy'); done(); } catch (e) {}
            if (ta.parentNode) ta.parentNode.removeChild(ta);
        }
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(text).then(done).catch(fallback);
                return;
            }
        } catch (e) {}
        fallback();
    }

    function openChat() {
        const candidates = [
            'egodact-addon-btn-egodact-chat-button',
            'egodact-addon-btn-egodact-chat-menu',
            'egodact-chat-button'
        ];
        for (let i = 0; i < candidates.length; i++) {
            const btn = document.getElementById(candidates[i]);
            if (btn) { btn.click(); return true; }
        }
        try { ui.toast('Chat-addon niet gevonden. Installeer "Egodact Addon: Chat".', { type: 'info' }); } catch (e) {}
        return false;
    }

    // ------------------------------------------------------------
    // Shared UI helpers
    // ------------------------------------------------------------
    function chip(text) {
        const t = theme();
        return el('span', {
            text: text,
            style: {
                display: 'inline-flex',
                alignItems: 'center',
                padding: '4px 9px',
                borderRadius: '999px',
                background: t.veld,
                border: '1px solid ' + t.rand,
                color: t.tekst,
                fontSize: '12px',
                whiteSpace: 'nowrap'
            }
        });
    }

    function segmented(label, active, onClick) {
        const t = theme();
        return ui.button(label, onClick, {
            padding: '6px 10px',
            fontSize: '12px',
            background: active ? t.accent : t.veld,
            color: active ? t.accentTekst : t.tekst
        });
    }

    function statusBar(text) {
        const t = theme();
        return el('div', {
            text: text,
            style: {
                fontSize: '13px',
                fontWeight: 'bold',
                color: t.tekst,
                minHeight: '18px',
                textAlign: 'center'
            }
        });
    }

    function makePaintable(build) {
        const root = el('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } });
        function paint() {
            root.innerHTML = '';
            build(root, paint);
        }
        paint();
        return root;
    }

    // ------------------------------------------------------------
    // Boter-kaas-en-eieren
    // ------------------------------------------------------------
    const TTT_LINES = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6]
    ];

    const ttt = {
        board: ['', '', '', '', '', '', '', '', ''],
        turn: 'X',
        mode: 'ai',
        difficulty: 'slim',
        over: false,
        result: null,
        counted: false,
        timer: null
    };

    function tttReset() {
        if (ttt.timer) { clearTimeout(ttt.timer); ttt.timer = null; }
        ttt.board = ['', '', '', '', '', '', '', '', ''];
        ttt.turn = 'X';
        ttt.over = false;
        ttt.result = null;
        ttt.counted = false;
    }

    function tttWinner(board) {
        for (let i = 0; i < TTT_LINES.length; i++) {
            const a = TTT_LINES[i][0], b = TTT_LINES[i][1], c = TTT_LINES[i][2];
            if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a];
        }
        return board.every(Boolean) ? 'draw' : null;
    }

    function tttScore(board, player) {
        const w = tttWinner(board);
        if (w === 'O') return 10;
        if (w === 'X') return -10;
        if (w === 'draw') return 0;
        let best = player === 'O' ? -Infinity : Infinity;
        for (let i = 0; i < 9; i++) {
            if (board[i]) continue;
            board[i] = player;
            const s = tttScore(board, player === 'O' ? 'X' : 'O');
            board[i] = '';
            if (player === 'O' ? s > best : s < best) best = s;
        }
        return best;
    }

    function tttAiMove() {
        const empty = [];
        for (let i = 0; i < 9; i++) if (!ttt.board[i]) empty.push(i);
        if (!empty.length) return -1;
        if (ttt.difficulty === 'makkelijk') {
            return empty[Math.floor(Math.random() * empty.length)];
        }
        let best = -Infinity;
        let moves = [];
        for (let i = 0; i < empty.length; i++) {
            const idx = empty[i];
            ttt.board[idx] = 'O';
            const s = tttScore(ttt.board, 'X');
            ttt.board[idx] = '';
            if (s > best) { best = s; moves = [idx]; }
            else if (s === best) moves.push(idx);
        }
        return moves[Math.floor(Math.random() * moves.length)];
    }

    function tttFinish() {
        const w = tttWinner(ttt.board);
        if (!w) return false;
        ttt.over = true;
        ttt.result = w;
        if (!ttt.counted && ttt.mode === 'ai') {
            ttt.counted = true;
            recordResult('ttt', w === 'X' ? 'win' : (w === 'O' ? 'loss' : 'draw'));
        }
        return true;
    }

    function tttPlay(index, paint) {
        if (ttt.over || ttt.board[index]) return;
        if (ttt.mode === 'ai' && ttt.turn !== 'X') return;
        ttt.board[index] = ttt.turn;
        if (tttFinish()) { paint(); return; }
        ttt.turn = ttt.turn === 'X' ? 'O' : 'X';
        paint();
        if (ttt.mode === 'ai' && ttt.turn === 'O' && !ttt.over) {
            ttt.timer = setTimeout(function () {
                ttt.timer = null;
                const move = tttAiMove();
                if (move >= 0 && !ttt.over) {
                    ttt.board[move] = 'O';
                    tttFinish();
                    ttt.turn = 'X';
                }
                paint();
            }, 260);
        }
    }

    function tttStatus() {
        if (ttt.over) {
            if (ttt.result === 'draw') return 'Gelijkspel';
            if (ttt.mode === '2p') return ttt.result === 'X' ? 'Speler X wint!' : 'Speler O wint!';
            return ttt.result === 'X' ? 'Jij wint!' : 'De computer wint';
        }
        if (ttt.mode === 'ai') return ttt.turn === 'X' ? 'Jouw beurt (X)' : 'Computer denkt...';
        return ttt.turn === 'X' ? 'Speler X is aan zet' : 'Speler O is aan zet';
    }

    function renderTTT() {
        return makePaintable(function (root, paint) {
            const t = theme();

            const top = ui.row({
                gap: 6,
                wrap: true,
                justify: 'space-between',
                children: [
                    ui.row({
                        gap: 6,
                        children: [
                            segmented('Tegen computer', ttt.mode === 'ai', function () {
                                ttt.mode = 'ai';
                                tttReset();
                                paint();
                            }),
                            segmented('2 spelers', ttt.mode === '2p', function () {
                                ttt.mode = '2p';
                                tttReset();
                                paint();
                            })
                        ]
                    }),
                    ui.row({
                        gap: 6,
                        children: [
                            segmented('Slim', ttt.difficulty === 'slim', function () {
                                ttt.difficulty = 'slim';
                                paint();
                            }),
                            segmented('Makkelijk', ttt.difficulty === 'makkelijk', function () {
                                ttt.difficulty = 'makkelijk';
                                paint();
                            })
                        ]
                    })
                ]
            });
            if (ttt.mode === '2p') top.lastChild.style.visibility = 'hidden';

            root.appendChild(top);
            root.appendChild(statusBar(tttStatus()));

            const grid = el('div', {
                style: {
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 72px)',
                    gap: '6px',
                    justifyContent: 'center'
                }
            });

            ttt.board.forEach(function (value, index) {
                const isX = value === 'X';
                const isO = value === 'O';
                grid.appendChild(el('button', {
                    type: 'button',
                    text: value || '',
                    onClick: function () { tttPlay(index, paint); },
                    style: {
                        width: '72px',
                        height: '72px',
                        fontSize: '30px',
                        fontWeight: 'bold',
                        borderRadius: '8px',
                        border: '1px solid ' + t.rand,
                        background: t.veld,
                        color: isX ? t.accent : (isO ? '#ffb74d' : t.tekst),
                        cursor: value || ttt.over ? 'default' : 'pointer',
                        transition: 'background 120ms ease'
                    }
                }));
            });

            root.appendChild(grid);

            const footer = ui.row({
                gap: 8,
                justify: 'center',
                wrap: true,
                children: [
                    chip('Reeks: ' + stats.ttt.streak + ' (best ' + stats.ttt.best + ')'),
                    ui.button('Nieuw potje', function () { tttReset(); paint(); }, {
                        padding: '6px 12px',
                        fontSize: '12px'
                    }),
                    ui.button('Deel score', function () {
                        copyText(shareText(), 'Score gekopieerd - plak hem in de chat!');
                    }, {
                        padding: '6px 12px',
                        fontSize: '12px',
                        background: t.veld,
                        color: t.tekst
                    })
                ]
            });
            root.appendChild(footer);
        });
    }

    // ------------------------------------------------------------
    // Connect 4
    // ------------------------------------------------------------
    const C4_ROWS = 6;
    const C4_COLS = 7;
    const C4_RED = '#ef5350';
    const C4_YELLOW = '#ffd54f';

    const c4 = {
        board: new Array(C4_ROWS * C4_COLS).fill(''),
        turn: 'R',
        mode: 'ai',
        over: false,
        result: null,
        counted: false,
        thinking: false,
        timer: null
    };

    function c4Reset() {
        if (c4.timer) { clearTimeout(c4.timer); c4.timer = null; }
        c4.board = new Array(C4_ROWS * C4_COLS).fill('');
        c4.turn = 'R';
        c4.over = false;
        c4.result = null;
        c4.counted = false;
        c4.thinking = false;
    }

    function c4DropRow(board, col) {
        for (let r = C4_ROWS - 1; r >= 0; r--) {
            if (!board[r * C4_COLS + col]) return r;
        }
        return -1;
    }

    function c4Winner(board, player) {
        const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
        for (let r = 0; r < C4_ROWS; r++) {
            for (let c = 0; c < C4_COLS; c++) {
                if (board[r * C4_COLS + c] !== player) continue;
                for (let d = 0; d < dirs.length; d++) {
                    const dr = dirs[d][0], dc = dirs[d][1];
                    let count = 1;
                    while (count < 4) {
                        const rr = r + dr * count;
                        const cc = c + dc * count;
                        if (rr < 0 || rr >= C4_ROWS || cc < 0 || cc >= C4_COLS) break;
                        if (board[rr * C4_COLS + cc] !== player) break;
                        count++;
                    }
                    if (count === 4) return true;
                }
            }
        }
        return false;
    }

    function c4AiMove() {
        const cols = [];
        for (let c = 0; c < C4_COLS; c++) {
            if (c4DropRow(c4.board, c) >= 0) cols.push(c);
        }
        if (!cols.length) return -1;

        // Win if possible.
        for (let i = 0; i < cols.length; i++) {
            const c = cols[i];
            const r = c4DropRow(c4.board, c);
            c4.board[r * C4_COLS + c] = 'Y';
            const wins = c4Winner(c4.board, 'Y');
            c4.board[r * C4_COLS + c] = '';
            if (wins) return c;
        }

        // Block the player.
        for (let i = 0; i < cols.length; i++) {
            const c = cols[i];
            const r = c4DropRow(c4.board, c);
            c4.board[r * C4_COLS + c] = 'R';
            const wins = c4Winner(c4.board, 'R');
            c4.board[r * C4_COLS + c] = '';
            if (wins) return c;
        }

        // Prefer the middle columns.
        const order = [3, 2, 4, 1, 5, 0, 6];
        for (let i = 0; i < order.length; i++) {
            if (cols.indexOf(order[i]) !== -1) return order[i];
        }
        return cols[0];
    }

    function c4Finish() {
        if (c4Winner(c4.board, 'R')) {
            c4.over = true;
            c4.result = 'R';
        } else if (c4Winner(c4.board, 'Y')) {
            c4.over = true;
            c4.result = 'Y';
        } else if (c4.board.every(Boolean)) {
            c4.over = true;
            c4.result = 'draw';
        } else {
            return false;
        }
        if (!c4.counted && c4.mode === 'ai') {
            c4.counted = true;
            if (c4.result === 'R') recordResult('c4', 'win');
            else if (c4.result === 'Y') recordResult('c4', 'loss');
            else recordResult('c4', 'draw');
        }
        return true;
    }

    function c4Play(col, paint) {
        if (c4.over || c4.thinking) return;
        if (c4.mode === 'ai' && c4.turn !== 'R') return;
        const row = c4DropRow(c4.board, col);
        if (row < 0) return;
        c4.board[row * C4_COLS + col] = c4.turn;
        c4.turn = c4.turn === 'R' ? 'Y' : 'R';
        if (c4Finish()) { paint(); return; }
        paint();
        if (c4.mode === 'ai' && c4.turn === 'Y' && !c4.over) {
            c4.thinking = true;
            paint();
            c4.timer = setTimeout(function () {
                c4.timer = null;
                const c = c4AiMove();
                if (c >= 0) {
                    const r = c4DropRow(c4.board, c);
                    if (r >= 0) c4.board[r * C4_COLS + c] = 'Y';
                }
                c4.turn = 'R';
                c4.thinking = false;
                c4Finish();
                paint();
            }, 320);
        }
    }

    function c4Status() {
        if (c4.over) {
            if (c4.result === 'draw') return 'Gelijkspel - bord vol';
            if (c4.mode === '2p') return c4.result === 'R' ? 'Rood wint!' : 'Geel wint!';
            return c4.result === 'R' ? 'Jij wint!' : 'De computer wint';
        }
        if (c4.mode === 'ai') return c4.turn === 'R' ? 'Jouw beurt (rood)' : 'Computer denkt...';
        return c4.turn === 'R' ? 'Rood is aan zet' : 'Geel is aan zet';
    }

    function renderC4() {
        return makePaintable(function (root, paint) {
            const t = theme();

            root.appendChild(ui.row({
                gap: 6,
                wrap: true,
                justify: 'space-between',
                children: [
                    ui.row({
                        gap: 6,
                        children: [
                            segmented('Tegen computer', c4.mode === 'ai', function () {
                                c4.mode = 'ai';
                                c4Reset();
                                paint();
                            }),
                            segmented('2 spelers', c4.mode === '2p', function () {
                                c4.mode = '2p';
                                c4Reset();
                                paint();
                            })
                        ]
                    }),
                    chip('Reeks: ' + stats.c4.streak + ' (best ' + stats.c4.best + ')')
                ]
            }));

            root.appendChild(statusBar(c4Status()));

            const grid = el('div', {
                style: {
                    display: 'grid',
                    gridTemplateColumns: 'repeat(' + C4_COLS + ', 42px)',
                    gap: '5px',
                    justifyContent: 'center',
                    padding: '8px',
                    background: t.veld,
                    border: '1px solid ' + t.rand,
                    borderRadius: '10px',
                    alignSelf: 'center'
                }
            });

            for (let r = 0; r < C4_ROWS; r++) {
                for (let c = 0; c < C4_COLS; c++) {
                    const value = c4.board[r * C4_COLS + c];
                    const fill = value === 'R' ? C4_RED : (value === 'Y' ? C4_YELLOW : 'transparent');
                    grid.appendChild(el('button', {
                        type: 'button',
                        title: 'Kolom ' + (c + 1),
                        onClick: function () { c4Play(c, paint); },
                        style: {
                            width: '42px',
                            height: '42px',
                            padding: '0',
                            borderRadius: '50%',
                            border: '1px solid ' + t.rand,
                            background: fill,
                            cursor: (c4.over || c4.thinking) ? 'default' : 'pointer',
                            transition: 'background 120ms ease'
                        }
                    }));
                }
            }

            root.appendChild(grid);

            root.appendChild(ui.row({
                gap: 8,
                justify: 'center',
                wrap: true,
                children: [
                    ui.button('Nieuw potje', function () { c4Reset(); paint(); }, {
                        padding: '6px 12px',
                        fontSize: '12px'
                    }),
                    ui.button('Deel score', function () {
                        copyText(shareText(), 'Score gekopieerd - plak hem in de chat!');
                    }, {
                        padding: '6px 12px',
                        fontSize: '12px',
                        background: t.veld,
                        color: t.tekst
                    })
                ]
            }));
        });
    }

    // ------------------------------------------------------------
    // Stats tab
    // ------------------------------------------------------------
    function statCard(title, s, color) {
        const t = theme();
        return ui.card({
            padding: '12px',
            children: [
                el('div', {
                    text: title,
                    style: { fontSize: '13px', fontWeight: 'bold', color: color || t.tekst, marginBottom: '6px' }
                }),
                el('div', {
                    text: scoreLine(s),
                    style: { fontSize: '15px', color: t.tekst, marginBottom: '4px' }
                }),
                el('div', {
                    text: 'Reeks: ' + s.streak + ' - best ' + s.best,
                    style: { fontSize: '12px', color: t.tekstZacht }
                })
            ]
        });
    }

    function renderStats() {
        const t = theme();
        const root = el('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } });

        root.appendChild(ui.row({
            gap: 6,
            wrap: true,
            children: [
                chip('Gespeeld: ' + stats.played),
                chip('Dagdoel: ' + Math.min(daily.wins, daily.goal) + '/' + daily.goal + (daily.done ? ' gehaald' : '')),
                chip('TTT reeks: ' + stats.ttt.streak)
            ]
        }));

        const progress = Math.min(100, Math.round((daily.wins / Math.max(1, daily.goal)) * 100));
        root.appendChild(el('div', {
            style: {
                height: '8px',
                borderRadius: '999px',
                background: t.veld,
                border: '1px solid ' + t.rand,
                overflow: 'hidden'
            }
        }, el('div', {
            style: {
                width: progress + '%',
                height: '100%',
                background: daily.done ? '#66bb6a' : t.accent,
                transition: 'width 180ms ease'
            }
        })));

        root.appendChild(ui.row({
            gap: 8,
            align: 'stretch',
            children: [
                statCard('Boter-kaas-en-eieren', stats.ttt, t.accent),
                statCard('Connect 4', stats.c4, C4_RED)
            ]
        }));

        root.appendChild(el('div', {
            text: 'Win 2 potjes per dag tegen de computer om je dagdoel te halen.',
            style: { fontSize: '12px', color: t.tekstZacht }
        }));

        root.appendChild(ui.row({
            gap: 8,
            wrap: true,
            children: [
                ui.button('Deel score', function () {
                    copyText(shareText(), 'Score gekopieerd - plak hem in de chat!');
                }, { padding: '7px 12px', fontSize: '12px' }),
                ui.button('Open chat', function () { openChat(); }, {
                    padding: '7px 12px',
                    fontSize: '12px',
                    background: t.veld,
                    color: t.tekst
                }),
                ui.button('Reset statistieken', function () {
                    if (!window.confirm('Alle statistieken en reeksen wissen?')) return;
                    stats = { ttt: Object.assign({}, EMPTY_SCORE), c4: Object.assign({}, EMPTY_SCORE), played: 0 };
                    daily = { date: dayKey(), played: 0, wins: 0, goal: 2, done: false };
                    saveStats();
                    try { ui.toast('Statistieken gewist', { type: 'info' }); } catch (e) {}
                    if (currentBackdrop && currentBackdrop.parentNode) currentBackdrop.parentNode.removeChild(currentBackdrop);
                    setTimeout(openArcade, 0);
                }, {
                    padding: '7px 12px',
                    fontSize: '12px',
                    background: '#7f1d1d',
                    color: '#fff'
                })
            ]
        }));

        return root;
    }

    // ------------------------------------------------------------
    // Modal
    // ------------------------------------------------------------
    let currentBackdrop = null;

    function openArcade() {
        if (currentBackdrop && document.body.contains(currentBackdrop)) return;

        const body = ui.col({
            gap: 12,
            children: [
                ui.row({
                    gap: 6,
                    wrap: true,
                    children: [
                        chip('Dagdoel ' + Math.min(daily.wins, daily.goal) + '/' + daily.goal),
                        chip('TTT reeks ' + stats.ttt.streak),
                        chip('Sneltoets F9')
                    ]
                }),
                ui.tabs([
                    { title: 'Boter-kaas-en-eieren', render: renderTTT },
                    { title: 'Connect 4', render: renderC4 },
                    { title: 'Stats', render: renderStats }
                ])
            ]
        });

        currentBackdrop = ui.modal('Chat Arcade', body, {
            width: 'min(580px, calc(100vw - 32px))'
        });
    }

    // ------------------------------------------------------------
    // Registration
    // ------------------------------------------------------------
    client.registerAddon({
        id: ADDON_ID,
        name: 'Chat Arcade',
        version: VERSION,
        description: 'Boter-kaas-en-eieren en Connect 4, plus een dagdoel en score delen in de chat.',
        author: 'MaxiTaxi'
    });

    client.registerMenu({
        addonId: ADDON_ID,
        id: 'arcade-menu',
        title: 'Chat Arcade',
        icon: ICON
    });

    client.registerButton({
        addonId: ADDON_ID,
        id: 'arcade-button',
        title: 'Chat Arcade',
        icon: ICON,
        position: 'header'
    });

    L.hamburger.add({
        addonId: ADDON_ID,
        id: 'arcade-hamburger',
        title: 'Chat Arcade',
        icon: ICON,
        order: 40
    });
    L.hamburger.onOpen('arcade-hamburger', openArcade);

    client.onOpen('arcade-menu', openArcade);
    client.onOpen('arcade-button', openArcade);

    L.shortcuts.add({
        addonId: ADDON_ID,
        id: 'arcade-open',
        title: 'Chat Arcade openen',
        keys: 'f9',
        action: openArcade
    });
})();
