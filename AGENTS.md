# Repository Guidelines

## Agent Instructions

- **Required code search:** Use `codebase-memory-mcp` for repository discovery, code searches, and relationship tracing. Select this repository with `list_projects`; use `search_graph` for symbols, `search_code` for text, and `trace_path` for callers and dependencies. Refresh a missing or stale index with `index_repository`. Verify results against current files before editing. Do not substitute `rg`, `grep`, or filesystem scans for code discovery. If MCP is unavailable, report the blocker and request permission before using another search method.
- **Required communication style:** Use [Caveman](https://github.com/JuliusBrussee/caveman/blob/main/skills/caveman/SKILL.md) by default in chat. Lead with the answer; use short, direct sentences without filler. Preserve technical facts, negations, code, commands, paths, and errors exactly. Clarity takes priority over compression. Keep documentation, comments, commits, and PRs in normal professional prose. Honor `stop caveman` or `normal mode` for the session.
- **Required formatting:** Format every changed code or documentation file before finishing; prefer Prettier and honor the repository's formatting configuration when present. Format only files changed for the task. Keep chat output clearly formatted and easy to scan. Verify formatting and run `git diff --check` before submitting.

## Established Product and UI Decisions

- Providers are entirely user-created. Do not introduce built-in websites, seeded providers, or site-specific defaults.
- Use native iOS Liquid Glass through `@expo/ui/swift-ui` controls and `expo-glass-effect` surfaces, with supported system fallbacks. Reuse the existing `.ios.tsx` components instead of inventing a glass-like style in React Native.
- Preserve Home's bottom navigation accessory and the website's available space. Do not replace it with a large persistent toolbar or status block above the WebView. The tab label is the current provider name, falling back to `Websites`.
- Preserve iOS `NativeTabs` minimization with `onScrollDown` on Home. Keep the browser's black background on `NativeTabs.Trigger.contentStyle`; background styling on the active Home wrapper or WebView container can break UIKit's scroll association. Do not remount the tab navigator to work around this. Keep collapsed navigation controls left aligned and the ellipsis menu padded.
- Keep the creator's bottom panel compact and its details scrollable. Each step has one prominent primary action. Secondary actions belong in clearly labeled expandable groups, with chevrons, accessible expanded state, indentation, and comfortable vertical spacing. Use the native Close header button without a nested rectangular button.
- Website settings use compact, consistent Open/Edit/Delete controls with icons, including the trash icon. A sole website opens automatically; its startup switch stays on and disabled until another website exists. Deleting back to one website restores this behavior without deleting watch history.

## Provider Extraction and Playback Invariants

- Start with `assets/js/provider-runtime_t.cjs`, `model/provider-runtime.model.ts`, `utils/provider-runtime.ts`, and `utils/provider-page-checks.ts` for runtime changes; `app/provider-creator.tsx` owns the wizard. Keep domain validation outside screen components.
- Review checks both example pages for series metadata independently of video availability. A series may have one released episode, an unfinished release schedule, or paginated lists (for example, fifty episodes per page). Never require the listed episode count to equal the announced total or infer the total from that list. Episode selectors must generalize from one episode without collecting unrelated navigation numbers.
- Announced totals may contain unknown markers such as `??`, `TBA`, `N/A`, or `Unknown`. Accept them in total selection and Review, and display `total unknown`. Actual episode numbers must remain numeric; missing or ambiguous selections must still fail. Setup previews use `episodeCount: 0` for unknown totals; tracking payloads omit `episodeCount` so previously known numeric totals survive. An unknown total must not automatically mark a series finished.
- A video may appear only after the user activates a placeholder or presses Play. Wait for playback and metadata; video presence alone does not verify tracking. Verified advancing playback enables Continue and Save. Automatic resume is optional under Video options, with bounded failure feedback and retry; unverified progress requires explicit acknowledgment of limitations.
- Embedded players can have different origins and nested frames. Inject the runtime into frames and relay selected-player media samples through parent frames; do not rely on reading cross-origin iframe DOM or fetching the iframe source. Only the main page emits series metadata and native messages. History retains the main episode URL and provider ID, never the iframe or media URL.
- Preserve session/document IDs, source-window checks, binding tokens, and stale-frame invalidation across navigation, frame replacement, and browser-history restoration. Player commands must use the destination frame's `documentId` at each relay hop. Cross-frame resume is asynchronous; do not overwrite saved progress with a cached pre-seek sample while awaiting the seek.
- `scripts/patch-webview.cjs` runs during postinstall and patches Android all-frame injection for `react-native-webview@13.16.1` using `DOCUMENT_START_SCRIPT`. Review the patch before upgrading that dependency. Native changes require rebuilding the development app; Expo Go or a JavaScript reload does not apply them. Unsupported devices must retain usable accessible players and show an actionable limitation for inaccessible ones.
- Runtime reinjection updates configuration without reinstalling existing script logic. Reload the website after runtime code changes before testing. Preserve the green episode-progress background, including before placeholder activation; use actual episode numbers across pagination and restore the website's original background when progress is cleared.

## Navigation and Watch History

- Unapproved top-level HTTP(S) navigation must ask whether to add the exact origin to the current provider's whitelist. Persist approval successfully before continuing to the original URL, including its path and query. Cancel or save failure leaves navigation blocked. Pending approvals must not navigate after page/provider changes or leaving the screen.
- Keep `window.open` and `target="_blank"` pop-ups separate: block them without showing the whitelist prompt or changing the page. Embedded frame navigation must not trigger a top-level approval prompt. Provider aliases use exact origin equality.
- Recently played is the default watch-list order, with name sorting still available. Update `lastPlayedAt` only for advancing playback, not paused visits, episode selection, seeking, or manual edits. Preserve the recorded provider ID and episode URL so selecting a series opens the correct website, including when providers share aliases. Retain legacy history compatibility and show the chooser when its website is unavailable.
- The lightweight watch-list JSON export contains only `name`, `highestWatchedEpisode`, `totalEpisodes` (null when unknown), and `finished`. Export all history regardless of UI filters. Keep full Backup/Restore separate and preserve provider configuration, playback dates, and per-episode data there.

## Known Implementation Pitfalls

- Keep ref reads and writes outside render. Initialize persistent navigation guards and update their callbacks in effects; retain the guard across commits so pending approvals survive rerenders.
- SwiftUI `Section` footers must use the appropriate `<Text>` element rather than raw strings. Preserve native text-field editing and keyboard behavior when modifying WebView wrappers.
- Use `docs/provider-testing.md` for the detailed device checklist and `tests/provider-runtime.test.cjs` for production-runtime regressions. JSDOM and bundle exports cannot prove native scrolling, Liquid Glass appearance, keyboard input, or real media playback. State clearly which device checks were performed and which remain pending.

## Project Structure & Module Organization

Anime Tracker is an Expo/React Native app using TypeScript and Expo Router.

- `app/`: file-based routes, tab layouts, watch history, settings, and provider creation.
- `components/`: reusable UI and feature components; `.ios.tsx` files provide iOS overrides.
- `hooks/` and `constants/`: shared hooks, themes, and configuration values.
- `model/`: domain types and WebView message contracts.
- `store/`: actions and reducers; `utils/`: persistence, provider logic, and backups.
- `assets/js/`: injected WebView scripts. Preserve the `_t.cjs` suffix: the custom Metro transformer imports these as source strings.
- `assets/images/` and `assets/icon.icon/`: images, screenshots, and app icons.
- `tests/`: runtime tests and HTML fixtures; `docs/provider-testing.md`: device acceptance checklist.

## Build, Test, and Development Commands

- `npm ci`: install dependencies from `package-lock.json`.
- `npm start`: start the Expo development server.
- `npm run ios` / `npm run android`: build and launch native development apps; require Xcode or Android tooling.
- `npm run web`: start the web preview; validate WebView behavior on native platforms.
- `npm run lint`: run ESLint with Expo's flat configuration.
- `npm run typecheck`: check strict TypeScript types without emitting files.
- `npm test`: run `tests/*.test.cjs` with Node's test runner.

EAS build profiles are defined in `eas.json`.

## Coding Style & Naming Conventions

Use two-space indentation, semicolons, and the surrounding file's quote style. Use PascalCase for components and types, camelCase for functions and variables, and `use` prefixes for hooks. Follow existing filenames such as `themed-text.tsx`, `anime.model.ts`, and `backup.util.ts`. Prefer `@/` imports for shared modules. Keep domain logic outside screen components. Prefer Prettier for final formatting and check only the files changed for the task.

## Testing Guidelines

Tests use `node:test`, strict assertions, and JSDOM against production modules. Name tests `*.test.cjs`; place HTML fixtures in `tests/fixtures/`. No coverage threshold is configured. Run tests, type checking, and lint before submitting. Follow `docs/provider-testing.md` on iOS and Android for playback, resume, provider editing, navigation restrictions, and backup compatibility; simulated media cannot verify native playback.

## Commit & Pull Request Guidelines

History uses short descriptive subjects, including `fix client messages` and `README updated`; no consistent Conventional Commits convention exists. Write focused, action-oriented subjects. Include the change's purpose, related issues when applicable, validation commands and results, and device/platform checks in PRs. Attach screenshots for UI changes and explain persistence or backup compatibility changes.
