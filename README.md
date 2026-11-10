# Egodact Addon: Chat Arcade

Turn-based mini-games for [Egodact](https://app.egodact.com), built as a separate addon extension. Adds a game hub to the hamburger menu, a global shortcut and optional online matches with a short room code you can paste into the chat.

## Games

- **Boter-kaas-en-eieren** (tic-tac-toe) - play against the computer (easy or unbeatable), with two players on one screen, or online.
- **Connect 4** - drop discs, block the computer's four-in-a-row, play locally with two players, or online.

## Features

- **Streaks and stats** per game: wins, losses, draws, current streak and best streak.
- **Daily goal**: win two games against the computer per day. Progress is tracked per day and shown in the Stats tab.
- **Share your score in chat**: copies a ready-to-paste score line and can open the Egodact Chat addon directly.
- **Online multiplayer** (`Samen spelen` tab): create a room code, send it to a friend, and the board syncs live. Works through the same Firebase project as the Egodact Chat addon, so no extra account or server is needed.
- **Shortcut**: `F9` opens Chat Arcade (rebindable in Hamburger -> Sneltoetsen).
- **Hamburger item**: Chat Arcade.

## Online multiplayer

1. Open Chat Arcade (`F9`) and go to **Samen spelen**.
2. Pick a game and press **Maak code**. A five-character code appears.
3. Press **Kopieer code** (or **Open chat**) and send the code to your opponent.
4. Your opponent opens **Samen spelen -> Deelnemen**, fills in the code and presses **Deelnemen**.
5. The board updates live for both players. Press **Nieuw potje** after a game to play again.

Notes:

- Online games do **not** count toward your daily goal or local stats.
- A room fits one host and one guest. If a code is already taken, joining reports that the room is full.
- Rooms live in the `rooms` collection of the public `egodact-extension` Firebase project under an `arcade-<CODE>` document.
- Scores and names are stored in Firestore while the room exists. Do not use a real full name if you do not want it visible to whoever has the code.

## Install

1. Load the Egodact host extension first.
2. Load this folder as an unpacked extension in Chrome/Edge (developer mode).
3. Open app.egodact.com and press `F9`, or use the hamburger menu.

Optional: install [Egodact Addon: Chat](https://github.com/hoggie-homerserver/Egodact_addon_chat) for the "Open chat" and score-sharing flow. Online multiplayer only needs this addon, but the chat addon shares the same Firebase project.

## Files

| File | Purpose |
|------|---------|
| `manifest.json` | Extension manifest (MV3). |
| `sdk.js` | Egodact Addon SDK client. |
| `lib.js` | Egodact Addon Library (UI, theme, storage, shortcuts). |
| `content.js` | Chat Arcade: games, stats, daily goal, online rooms, registration. |
| `vendor/firebase-*-compat.js` | Firebase compat SDK (app, auth, firestore) for online play. |

## Storage

Local stats and settings are stored through the host's addon storage (`egodact_arcade_*` keys in localStorage). Online rooms use anonymous Firebase Auth plus Firestore; the Firebase web config is public by nature, and the Firestore rules in the Chat addon repository are the real gate.

## Roadmap

- Spectator mode and rematches with a single click.
- Reaction-based emotes for game results in chat.
- More games: Word duel, Reversi, 2048 duel.
- Global leaderboards (needs a small backend or Firebase collections).

## Development

`node --check content.js` after edits. Reload the extension in `chrome://extensions` and hard-refresh the page (`Ctrl+Shift+R`). Online play needs network access to `firestore.googleapis.com`.
