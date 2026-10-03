# Anime Tracker 💫

> A mobile app for user-configured anime websites, with local watch history and video progress.

---

## 📌 TL;DR

- Start with no built-in providers. Add a website through the guided provider creator, then browse and track it.
- Stores watch progress locally (AsyncStorage) and exposes a simple **Watch List** UI to view / edit items.
- Export and import your data as a JSON backup from the **Settings** screen.
- Built with Expo — runs on iOS add Android (behavior may vary by platform, web is not supported by the webview library).

---

## ✨ Features

- Embedded WebView with injected JavaScript that detects anime title and episode and posts messages to the app ✅
- Auto-tracking of the last watched episode per anime (updates only when a higher episode number is detected) ✅
- Manual add/edit via the **Add/Edit Anime** modal ✅
- Watch List with filtering (in-progress / watched), remove items, and clear watched ✅
- Backup (export) and Restore (import) via device sharing / document picker (exports `anime-tracker/backup.json`) ✅
- All data stored locally — no servers, no accounts 🔒

---

## How it works (quick)

1. Add a website from Websites or Settings. Select titles and episode information, verify two example pages, and test the site's primary video player.
2. The creator and main browser share `assets/js/provider-runtime_t.cjs` for extraction, accessible frame discovery, video progress, and resume.
3. Typed messages are validated and persisted in the AppStore (`utils/app-store.util.ts`), using `AsyncStorage`.
4. Watch History stores the provider used for each playback location. Provider setup warns when progress or seeking cannot be verified.
5. Backup and restore use `expo-file-system`, `expo-sharing` and `expo-document-picker`.

---

## 📱 Screenshots

### IOS 🍎

<div style="display: flex;">  
  <img alt="home" src="assets/images/screenshots/ios/home.png" height="400" />
  <img alt="anime-progress" src="assets/images/screenshots/ios/anime-progress.png" height="400" />
  <img alt="history" src="assets/images/screenshots/ios/history.png" height="400" />
  <img alt="search-history" src="assets/images/screenshots/ios/search-history.png" height="400" />
  <img alt="backup" src="assets/images/screenshots/ios/backup.png" height="400" />
</div>

### Android 🤖

<div style="display: flex;">  
  <img alt="home" src="assets/images/screenshots/android/home.png" height="400" />
  <img alt="anime-progress" src="assets/images/screenshots/android/anime-progress.png" height="400" />
  <img alt="history" src="assets/images/screenshots/android/history.png" height="400" />
  <img alt="search-history" src="assets/images/screenshots/android/search-history.png" height="400" />
  <img alt="backup" src="assets/images/screenshots/android/backup.png" height="400" />
</div>


---

## Getting started (development) 🔧

Requirements: Node.js and npm, plus Xcode/Android Studio if using simulators/emulators.

1. Install

```bash
npm install
```

2. Start

```bash
npm start
# or use platform scripts
npm run ios
npm run android
npm run web
```

Notes:

- Expo powers this project — see `package.json` for scripts.
- The app uses file-based routing (see the `app` folder) via `expo-router`.

---

## Developer notes

- Main WebView code and injected JS: `app/(tabs)/index.tsx` 🔍
- Watch list UI & actions: `app/(tabs)/watch-list.tsx` ✅
- Add/Edit modal: `app/anime-modal.tsx`
- Backup / Restore: `utils/app-store.util.ts` (creates `anime-tracker/backup.json` and uses system sharing/document picker)
- Type definitions: `model/*.ts`
- Validation: `npm test`, `npm run typecheck`, and `npm run lint`. See [device acceptance checks](docs/provider-testing.md).

---

## Legal / Disclaimer ⚠️

The app embeds websites configured by the user and stores watch history locally. It is not affiliated with those websites.

---

## License

See `LICENSE` in this repository.
