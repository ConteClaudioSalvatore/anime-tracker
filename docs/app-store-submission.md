# App Store submission

## Release status

The app includes an offline English/Italian privacy policy, accessible from Settings and website setup. The policy documents local history, website traffic, remote cover images, exports, backups, deletion, and support. Website setup explains automatic local progress recording and authorized website use.

These changes do not establish third-party content permissions or guarantee approval. Complete the items below before submission.

## Privacy policy and support

Publish [the English policy](privacy-policy.md) and [the Italian policy](privacy-policy.it.md) at stable public URLs. Enter the English URL in App Store Connect's Privacy Policy field. Keep the public text synchronized with `locales/en.json` and `locales/it.json`, which supply the in-app policy.

The current support channel is the public repository's [issue tracker](https://github.com/ConteClaudioSalvatore/anime-tracker/issues). Confirm that this is the developer's intended, monitored channel, or replace `APP_SUPPORT_URL` in `constants/privacy.ts` and the policy links. Do not request private backups, credentials, or private URLs in public issues. Supply accurate developer contact information and a working Support URL in App Store Connect.

History and configurations are stored locally. There is no app-operated account, advertising SDK, analytics service, or application backend in this implementation. Do not infer a completed privacy label from those facts: audit the release build, website traffic, image requests, and any future SDK additions.

Apple excludes on-device-only processing from its definition of collected data. Its WebView guidance requires disclosure of web-traffic collection unless the app enables open-web navigation. Assess whether that exception fits this user-configured browser before choosing declarations. Playback progress recording is not advertising tracking; do not add an ATT prompt solely for local history.

Sources: [Apple privacy-label guidance](https://developer.apple.com/app-store/app-privacy-details/) and [Review guideline 5.1.1](https://developer.apple.com/app-store/review/guidelines/#privacy).

## Native privacy manifest

`app.json` declares required API reasons copied from the installed dependency manifests:

| API category     | Reasons                | Installed dependency evidence                         |
| ---------------- | ---------------------- | ----------------------------------------------------- |
| User defaults    | CA92.1                 | Expo Constants, Localization, System UI; React Native |
| File timestamps  | C617.1, 0A2A.1, 3B52.1 | AsyncStorage and React Native; Expo FileSystem        |
| Disk space       | E174.1, 85F4.1         | Expo FileSystem                                       |
| System boot time | 35F9.1                 | React Native timing and boost                         |

No blanket data-collection or tracking declaration was added for arbitrary third-party websites. Dependency manifests are retained. Reassess these reasons whenever dependencies or API use change; do not add reasons for APIs the binary does not use.

Rebuild the native iOS app to apply the manifest configuration. Generate the Xcode archive's privacy report, inspect the bundled `PrivacyInfo.xcprivacy` files, validate the archive, and review TestFlight processing messages for missing manifests or reasons. JavaScript checks alone cannot validate the archived native binary.

Sources: [Expo privacy manifests](https://docs.expo.dev/guides/apple-privacy/) and [Apple required-reason APIs](https://developer.apple.com/documentation/bundleresources/describing-use-of-required-reason-api).

## Content rights and age rating

Use developer-owned or explicitly authorized content for review examples. Obtain permission for displaying third-party services and their content, including covers and metadata, where required by their terms. Keep evidence ready for Apple. A user's ability to configure a site and an unaffiliated disclaimer do not establish this authorization.

Answer the age-rating questionnaire for the actual app, including user-entered web addresses and unrestricted web access where applicable. Origin approval controls navigation, not content maturity. Do not claim parental controls or mature-content filtering that the app does not implement. Review ads, embedded services, and any social features of the services used for submission.

Use owned or licensed material in screenshots and marketing. Confirm that public repository documentation and screenshots represent the current user-configured app rather than an older site-specific client.

Sources: [Review guidelines 5.2.1–5.2.3](https://developer.apple.com/app-store/review/guidelines/#intellectual-property) and [age-rating definitions](https://developer.apple.com/help/app-store-connect/reference/app-information/age-ratings-values-and-definitions).

## Review notes draft

Complete the bracketed fields before pasting these notes into App Store Connect. Do not submit this draft with missing URLs or unverified permission claims.

> Anime Tracker provides a native watchlist with manual series editing, recently played sorting, search, progress tracking, optional resume, and JSON export/backup. No Anime Tracker account is needed. Website configurations and watch history are stored locally. The app starts with no built-in websites. Playback depends on the website and its player.
>
> To review the manual features, open Watch List, add a series, edit its episode progress, and use the watchlist actions to export JSON or create a backup. The privacy policy is available from Settings.
>
> To review website setup, add a provider with homepage [AUTHORIZED HOMEPAGE]. Use [SERIES PAGE ONE] and [SERIES PAGE TWO] as the example pages. Select [TITLE ELEMENT], [EPISODE ELEMENT], and [ANNOUNCED TOTAL ELEMENT]. Activate the video placeholder if present, then press Play. Advancing playback verifies progress tracking. Automatic resume is optional; unsupported players show a limitation rather than promising compatibility. Review both example-page checks and save. Play an episode and return to Watch List to inspect saved progress.
>
> Review service access: [CREDENTIALS IF NEEDED; OTHERWISE STATE NO LOGIN REQUIRED]. Content and service authorization: [SPECIFIC BASIS AND SUPPORTING DOCUMENTS]. Public privacy policy: [PUBLISHED POLICY URL]. Support: [CONFIRMED SUPPORT URL].

Keep this setup reproducible without shipping a seeded provider. Make the authorized example available throughout review; it should include two series pages and working media. Explain regional restrictions, subscriptions, or service sign-in if applicable. Never hide features or change behavior specifically for reviewers.

## Validation before upload

- Run `npm test`, `npm run typecheck`, and `npm run lint`.
- Check Settings and the complete privacy policy in English/Italian, light/dark mode, large text, and VoiceOver on iPhone and iPad.
- Check that opening the policy during setup and returning preserves the draft.
- Follow [the native device checklist](provider-testing.md) for playback, resume, navigation, and backup/restore.
- Confirm the support link opens or displays an actionable error.
- Validate the release archive and privacy report; complete actual App Store Connect privacy, age-rating, contact, screenshot, and review-note fields.

No device checks, release archive validation, policy publication, service authorization, or App Store Connect edits were performed as part of the source changes described above.
