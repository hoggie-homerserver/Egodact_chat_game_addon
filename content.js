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
    const VERSION = '0.2.0';

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
                    { title: 'Samen spelen', render: renderOnline },
                    { title: 'Stats', render: renderStats }
                ])
            ]
        });

        currentBackdrop = ui.modal('Chat Arcade', body, {
            width: 'min(580px, calc(100vw - 32px))'
        });
    }

    // ------------------------------------------------------------
    // Online multiplayer (Firestore, same project as the Chat addon)
    // ------------------------------------------------------------
    const FIREBASE_CONFIG = {
        apiKey: 'AIzaSyBF-ejVI_I3kmjXxjZlMGwyd3SZupQoFqY',
        authDomain: 'egodact-extension.firebaseapp.com',
        projectId: 'egodact-extension',
        storageBucket: 'egodact-extension.firebasestorage.app',
        messagingSenderId: '19331909527',
        appId: '1:19331909527:web:c86f39f6c8a0e0a5b026d2'
    };

    let myId = store.get('playerId', null);
    if (!myId || typeof myId !== 'string') {
        myId = 'arcade-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-3);
        store.set('playerId', myId);
    }
    let myName = store.get('playerName', 'Speler');
    if (!myName || typeof myName !== 'string') myName = 'Speler';

    const fb = { ready: false, db: null, auth: null };

    async function ensureFirebase() {
        if (fb.ready) return fb;
        if (typeof firebase === 'undefined' || !firebase.initializeApp) {
            throw new Error('Firebase is niet geladen (wordt de vendor-map meegeleverd?)');
        }
        if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
        fb.auth = firebase.auth();
        try {
            await fb.auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
        } catch (e) {}
        if (!fb.auth.currentUser) {
            await fb.auth.signInAnonymously();
        }
        fb.db = firebase.firestore();
        fb.ready = true;
        return fb;
    }

    const online = {
        active: false,
        loading: false,
        error: null,
        code: '',
        roomId: '',
        roomRef: null,
        unsub: null,
        arcade: null,
        state: null,
        game: 'ttt',
        role: null,
        symbol: null,
        paint: null,
        newGame: 'ttt'
    };

    function randomCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let out = '';
        for (let i = 0; i < 5; i++) out += chars[Math.floor(Math.random() * chars.length)];
        return out;
    }

    function normalizeCode(raw) {
        return String(raw || '')
            .toUpperCase()
            .replace(/^ARCADE[-\s]*/, '')
            .replace(/[^A-Z0-9]/g, '')
            .slice(0, 8);
    }

    function onlineGameLabel(game) {
        return game === 'c4' ? 'Connect 4' : 'Boter-kaas-en-eieren';
    }

    function initialOnlineState(game) {
        return {
            board: game === 'c4' ? new Array(C4_ROWS * C4_COLS).fill('') : new Array(9).fill(''),
            turn: game === 'c4' ? 'R' : 'X',
            over: false,
            result: null,
            gameId: Date.now()
        };
    }

    function onlineSetState(arcade) {
        online.arcade = arcade || {};
        online.game = online.arcade.game === 'c4' ? 'c4' : 'ttt';
        online.state = online.arcade.state || null;
        if (online.arcade.hostId === myId) {
            online.role = 'host';
            online.symbol = online.game === 'c4' ? 'R' : 'X';
        } else if (online.arcade.guestId === myId) {
            online.role = 'guest';
            online.symbol = online.game === 'c4' ? 'Y' : 'O';
        } else {
            online.role = null;
            online.symbol = null;
        }
    }

    function onlineSubscribe(ref) {
        if (online.unsub) {
            try { online.unsub(); } catch (e) {}
            online.unsub = null;
        }
        online.roomRef = ref;
        online.unsub = ref.onSnapshot(function (snap) {
            if (!snap.exists) {
                online.error = 'Deze room bestaat niet meer.';
                online.active = false;
                if (online.paint) online.paint();
                return;
            }
            const data = snap.data() || {};
            if (!data.arcade) {
                online.error = 'Deze room is geen Chat Arcade-room.';
                if (online.paint) online.paint();
                return;
            }
            online.error = null;
            online.active = true;
            online.code = String(ref.id).replace(/^arcade-/, '');
            online.roomId = ref.id;
            onlineSetState(data.arcade);
            if (online.paint) online.paint();
        }, function (err) {
            online.error = 'Verbinding mislukt: ' + (err.message || err);
            if (online.paint) online.paint();
        });
    }

    function onlineLeave() {
        if (online.unsub) {
            try { online.unsub(); } catch (e) {}
        }
        online.unsub = null;
        online.roomRef = null;
        online.active = false;
        online.loading = false;
        online.error = null;
        online.code = '';
        online.roomId = '';
        online.arcade = null;
        online.state = null;
        online.role = null;
        online.symbol = null;
        if (online.paint) online.paint();
    }

    function onlineWriteState(nextState) {
        if (!online.roomRef || typeof firebase === 'undefined') return;
        const arcade = Object.assign({}, online.arcade || {}, {
            state: nextState,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        online.arcade = arcade;
        online.state = nextState;
        if (online.paint) online.paint();
        online.roomRef.update({
            arcade: arcade,
            members: [arcade.hostId || myId, arcade.guestId || 'arcade-pending']
        }).catch(function (err) {
            online.error = 'Zet mislukt: ' + (err.message || err);
            if (online.paint) online.paint();
        });
    }

    async function createOnlineRoom(game) {
        online.error = null;
        online.loading = true;
        if (online.paint) online.paint();
        try {
            const f = await ensureFirebase();
            const code = randomCode();
            const state = initialOnlineState(game);
            const arcade = {
                v: 1,
                game: game,
                hostId: myId,
                hostName: myName,
                guestId: null,
                guestName: '',
                state: state,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            const ref = f.db.collection('rooms').doc('arcade-' + code);
            await ref.set({
                type: 'dm',
                members: [myId, 'arcade-pending'],
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                arcade: arcade
            });
            online.code = code;
            online.roomId = ref.id;
            online.newGame = game;
            onlineSubscribe(ref);
        } catch (err) {
            online.error = err && err.message ? err.message : String(err);
        }
        online.loading = false;
        if (online.paint) online.paint();
    }

    async function joinOnlineRoom(rawCode) {
        const code = normalizeCode(rawCode);
        if (!code) {
            online.error = 'Vul een code in.';
            if (online.paint) online.paint();
            return;
        }
        online.error = null;
        online.loading = true;
        if (online.paint) online.paint();
        try {
            const f = await ensureFirebase();
            const ref = f.db.collection('rooms').doc('arcade-' + code);
            const snap = await ref.get();
            if (!snap.exists) throw new Error('Deze code bestaat niet (meer).');
            const data = snap.data() || {};
            const arcade = data.arcade || {};
            if (arcade.hostId !== myId) {
                if (arcade.guestId && arcade.guestId !== myId) {
                    throw new Error('Deze room is al vol.');
                }
                const updated = Object.assign({}, arcade, {
                    guestId: myId,
                    guestName: myName,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                await ref.update({
                    members: [arcade.hostId || 'arcade-host', myId],
                    arcade: updated
                });
            }
            online.code = code;
            online.roomId = ref.id;
            onlineSubscribe(ref);
        } catch (err) {
            online.error = err && err.message ? err.message : String(err);
        }
        online.loading = false;
        if (online.paint) online.paint();
    }

    function onlineInviteText() {
        return 'Chat Arcade - ' + onlineGameLabel(online.game) + '\n' +
            'Code: ' + online.code + '\n' +
            'Open Chat Arcade (F9) -> Samen spelen -> Deelnemen en plak de code.';
    }

    function onlineMoveTTT(index) {
        const st = online.state;
        if (!st || st.over || !online.symbol) return;
        if (!online.arcade || !online.arcade.guestId) return;
        if (st.turn !== online.symbol || st.board[index]) return;
        const board = st.board.slice();
        board[index] = online.symbol;
        const winner = tttWinner(board);
        onlineWriteState({
            board: board,
            turn: online.symbol === 'X' ? 'O' : 'X',
            over: !!winner,
            result: winner || null,
            gameId: st.gameId
        });
    }

    function onlineMoveC4(col) {
        const st = online.state;
        if (!st || st.over || !online.symbol) return;
        if (!online.arcade || !online.arcade.guestId) return;
        if (st.turn !== online.symbol) return;
        const board = st.board.slice();
        const row = c4DropRow(board, col);
        if (row < 0) return;
        board[row * C4_COLS + col] = online.symbol;
        let result = null;
        if (c4Winner(board, 'R')) result = 'R';
        else if (c4Winner(board, 'Y')) result = 'Y';
        else if (board.every(Boolean)) result = 'draw';
        onlineWriteState({
            board: board,
            turn: online.symbol === 'R' ? 'Y' : 'R',
            over: !!result,
            result: result,
            gameId: st.gameId
        });
    }

    function onlineStatusText() {
        const st = online.state;
        if (!st) return 'Verbinden...';
        if (!online.symbol) return 'Je kijkt mee met deze room.';
        if (!online.arcade || !online.arcade.guestId) return 'Wachten op tegenstander...';
        if (st.over) {
            if (st.result === 'draw' || !st.result) return 'Gelijkspel';
            return st.result === online.symbol ? 'Jij wint!' : 'Tegenstander wint';
        }
        if (st.turn === online.symbol) return 'Jouw beurt';
        const other = online.role === 'host' ? (online.arcade.guestName || 'tegenstander') : (online.arcade.hostName || 'tegenstander');
        return 'Wachten op ' + other + '...';
    }

    function onlineBoard() {
        const t = theme();
        const st = online.state;
        if (!st) return el('div', { text: 'Verbinden...', style: { fontSize: '12px', color: t.tekstZacht } });

        if (online.game === 'c4') {
            const grid = el('div', {
                style: {
                    display: 'grid',
                    gridTemplateColumns: 'repeat(' + C4_COLS + ', 38px)',
                    gap: '4px',
                    justifyContent: 'center',
                    padding: '8px',
                    background: t.veld,
                    border: '1px solid ' + t.rand,
                    borderRadius: '10px'
                }
            });
            for (let r = 0; r < C4_ROWS; r++) {
                for (let c = 0; c < C4_COLS; c++) {
                    const value = st.board[r * C4_COLS + c];
                    grid.appendChild(el('button', {
                        type: 'button',
                        onClick: function () { onlineMoveC4(c); },
                        style: {
                            width: '38px',
                            height: '38px',
                            padding: '0',
                            borderRadius: '50%',
                            border: '1px solid ' + t.rand,
                            background: value === 'R' ? C4_RED : (value === 'Y' ? C4_YELLOW : 'transparent'),
                            cursor: (!st.over && st.turn === online.symbol && online.arcade && online.arcade.guestId) ? 'pointer' : 'default'
                        }
                    }));
                }
            }
            return grid;
        }

        const grid = el('div', {
            style: {
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 64px)',
                gap: '6px',
                justifyContent: 'center'
            }
        });
        st.board.forEach(function (value, index) {
            grid.appendChild(el('button', {
                type: 'button',
                text: value || '',
                onClick: function () { onlineMoveTTT(index); },
                style: {
                    width: '64px',
                    height: '64px',
                    fontSize: '26px',
                    fontWeight: 'bold',
                    borderRadius: '8px',
                    border: '1px solid ' + t.rand,
                    background: t.veld,
                    color: value === 'X' ? t.accent : (value === 'O' ? '#ffb74d' : t.tekst),
                    cursor: (!st.over && st.turn === online.symbol && !value && online.arcade && online.arcade.guestId) ? 'pointer' : 'default'
                }
            }));
        });
        return grid;
    }

    function renderOnline() {
        return makePaintable(function (root, paint) {
            online.paint = paint;
            const t = theme();

            if (online.error) {
                root.appendChild(el('div', {
                    text: online.error,
                    style: {
                        padding: '8px 10px',
                        borderRadius: '6px',
                        background: '#4a1d1d',
                        border: '1px solid #a33',
                        color: '#ffd7d7',
                        fontSize: '12px'
                    }
                }));
            }

            if (!online.active) {
                const nameInput = ui.input({ value: myName, placeholder: 'Je naam', width: '170px' });
                root.appendChild(ui.row({
                    gap: 6,
                    wrap: true,
                    children: [
                        el('span', { text: 'Naam', style: { fontSize: '12px', color: t.tekstZacht } }),
                        nameInput,
                        ui.button('Opslaan', function () {
                            const value = String(nameInput.value || '').trim().slice(0, 24);
                            if (!value) return;
                            myName = value;
                            store.set('playerName', value);
                            try { ui.toast('Naam opgeslagen', { type: 'success' }); } catch (e) {}
                            paint();
                        }, { padding: '6px 10px', fontSize: '12px' })
                    ]
                }));

                root.appendChild(ui.card({
                    padding: '12px',
                    children: [
                        el('div', { text: 'Uitdaging maken', style: { fontSize: '13px', fontWeight: 'bold', color: t.tekst, marginBottom: '8px' } }),
                        ui.row({
                            gap: 6,
                            children: [
                                segmented('Boter-kaas-en-eieren', online.newGame === 'ttt', function () {
                                    online.newGame = 'ttt';
                                    paint();
                                }),
                                segmented('Connect 4', online.newGame === 'c4', function () {
                                    online.newGame = 'c4';
                                    paint();
                                })
                            ]
                        }),
                        ui.button(online.loading ? 'Bezig...' : 'Maak code', function () {
                            if (online.loading) return;
                            createOnlineRoom(online.newGame);
                        }, { padding: '8px 12px', fontSize: '13px' }),
                        el('div', {
                            text: 'Je krijgt een code. Plak die in de chat, je tegenstander vult hem hier in.',
                            style: { fontSize: '11px', color: t.tekstZacht, marginTop: '8px' }
                        })
                    ]
                }));

                const joinInput = ui.input({ placeholder: 'Code, bijv. 7K2M9', width: '140px' });
                root.appendChild(ui.card({
                    padding: '12px',
                    children: [
                        el('div', { text: 'Deelnemen', style: { fontSize: '13px', fontWeight: 'bold', color: t.tekst, marginBottom: '8px' } }),
                        ui.row({
                            gap: 6,
                            wrap: true,
                            children: [
                                joinInput,
                                ui.button('Deelnemen', function () {
                                    if (online.loading) return;
                                    joinOnlineRoom(joinInput.value);
                                }, {
                                    padding: '8px 12px',
                                    fontSize: '13px',
                                    background: t.veld,
                                    color: t.tekst
                                })
                            ]
                        })
                    ]
                }));

                root.appendChild(el('div', {
                    text: 'Online potjes tellen niet mee voor je dagdoel.',
                    style: { fontSize: '11px', color: t.tekstZacht }
                }));
                return;
            }

            // In a room
            root.appendChild(ui.row({
                gap: 6,
                wrap: true,
                children: [
                    chip('Code: ' + online.code),
                    chip(onlineGameLabel(online.game)),
                    chip(online.role === 'host' ? 'Jij host' : 'Jij gast'),
                    chip(online.arcade && online.arcade.guestId ? 'Tegenstander erbij' : 'Nog alleen')
                ]
            }));

            root.appendChild(statusBar(onlineStatusText()));
            root.appendChild(onlineBoard());

            const buttons = [
                ui.button('Kopieer code', function () {
                    copyText(onlineInviteText(), 'Uitnodiging gekopieerd - plak hem in de chat!');
                }, { padding: '7px 10px', fontSize: '12px' }),
                ui.button('Open chat', function () { openChat(); }, {
                    padding: '7px 10px',
                    fontSize: '12px',
                    background: t.veld,
                    color: t.tekst
                })
            ];

            if (online.state && online.state.over) {
                buttons.push(ui.button('Nieuw potje', function () {
                    onlineWriteState(initialOnlineState(online.game));
                }, { padding: '7px 10px', fontSize: '12px' }));
            }

            buttons.push(ui.button('Verlaten', function () {
                onlineLeave();
            }, {
                padding: '7px 10px',
                fontSize: '12px',
                background: '#7f1d1d',
                color: '#fff'
            }));

            root.appendChild(ui.row({ gap: 6, wrap: true, justify: 'center', children: buttons }));
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

    L.hamburger.add({
        addonId: ADDON_ID,
        id: 'arcade-hamburger',
        title: 'Chat Arcade',
        icon: ICON,
        order: 40
    });
    L.hamburger.onOpen('arcade-hamburger', openArcade);

    L.shortcuts.add({
        addonId: ADDON_ID,
        id: 'arcade-open',
        title: 'Chat Arcade openen',
        keys: 'f9',
        action: openArcade
    });
})();
