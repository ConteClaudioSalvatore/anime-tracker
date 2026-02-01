# AnimeWorld Tracker (Unofficial Client)

_`!! CREATED ONLY FOR EDUCATIONAL PURPOSES !!`_
A lightweight, privacy-focused mobile application that wraps [AnimeWorld](https://www.animeworld.ac) to provide an automatic and persistent watch history.

## 📖 About

This application is designed to solve the problem of losing track of your anime progress. It serves as a smart browser for AnimeWorld, automatically detecting your navigation and saving your progress locally. It combines the vast library of the web with the convenience of a dedicated watchlist app.

## ✨ Key Features

- **Integrated Webview:** Browse the full AnimeWorld library directly within the app.

- **Auto-Tracking:** The app listens to your navigation events. When you visit an anime or a specific episode, it is automatically added to your local database.

- **Smart Watchlist Tab:** A dedicated "History/Watchlist" tab parses your local data to show:
- - Animes you are currently watching.
- - The last episode you visited.
- - A direct link to resume exactly where you left off.

- **Data Portability:** Includes a **Backup & Restore** feature. You can export your `backup.json` and import it onto a new device, so you never lose your progress.

- **Privacy First: 🔒 No servers. No accounts.** All data is stored strictly locally on your device in a JSON format.

## ⚙️ How It Works

1. **Navigation:** The app renders AnimeWorld in a webview component.

2. **Interception:** As you navigate the site, the app intercepts the URL changes.

3. **Parsing:** It extracts the Anime Title and Episode Number.

4. **Storage:** This data is written to the `AsyncStorage` which can then be backed-up in a json file. If the anime already exists, it updates the "Last Watched" index.

5. **Display:** The main view reads this JSON file to render your personal list.

## 📱 Screenshots

[home](/assets/images/home.jpg)
[list](/assets/images/list.jpg)
[backup](/assets/images/backup.jpg)

## 🛠 Technical Overview

- **Source:** Relies on [AnimeWorld](https://www.animeworld.ac) for content.

- **Storage:** Local AsyncStorage + JSON backup file.

- **Permissions:** Internet access (for the webview) and File Storage access (for backup/restore).

# ⚠️ Disclaimer

This application is an unofficial client and is not affiliated with AnimeWorld. It acts solely as a web browser with history management features. `Please respect the terms of service of the content providers`.

`TESTED SOLELY ON IOS`

## Get started

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
