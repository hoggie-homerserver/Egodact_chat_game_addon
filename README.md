# Egodact Addon: Chat Arcade

Turn-based mini-games for [Egodact](https://app.egodact.com), built as a separate addon extension. Adds a game hub to the hamburger menu and a global shortcut.

## Games

- **Boter-kaas-en-eieren** (tic-tac-toe) - play against the computer (easy or unbeatable) or with two players on one screen.
- **Connect 4** - drop discs, block the computer's four-in-a-row or play locally with two players.

## Features

- **Streaks and stats** per game: wins, losses, draws, current streak and best streak.
- **Daily goal**: win two games against the computer per day. Progress is tracked per day and shown in the Stats tab.
- **Share your score in chat**: copies a ready-to-paste score line and can open the Egodact Chat addon directly.
- **Shortcut**: `F9` opens Chat Arcade (rebindable in Hamburger -> Sneltoetsen).
- **Hamburger item**: Chat Arcade.

## Install

1. Load the Egodact host extension first.
2. Load this folder as an unpacked extension in Chrome/Edge (developer mode).
3. Open app.egodact.com and press `F9`, or use the hamburger menu.

Optional: install [Egodact Addon: Chat](https://github.com/hoggie-homerserver/Egodact_addon_chat) for the "Open chat" and score-sharing flow.

## Files

| File | Purpose |
|------|---------|
| `manifest.json` | Extension manifest (MV3). |
| `sdk.js` | Egodact Addon SDK client. |
| `lib.js` | Egodact Addon Library (UI, theme, storage, shortcuts). |
| `content.js` | Chat Arcade: games, stats, daily goal, registration. |

## Storage

Everything is stored locally through the host's addon storage (`egodact_arcade_*` keys in localStorage). No account, no server, no data leaves the browser.

## Roadmap

- Online multiplayer using the Chat addon's Firestore rooms (invite links, live board sync).
- Reaction-based emotes for game results in chat.
- More games: Word duel, Reversi, 2048 duel.
- Global leaderboards (needs a small backend or Firebase collections).

## Development

`node --check content.js` after edits. Reload the extension in `chrome://extensions` and hard-refresh the page (`Ctrl+Shift+R`).
