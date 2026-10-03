# Repository Guidelines

## Agent Instructions

- **Required code search:** Use `codebase-memory-mcp` for repository discovery, code searches, and relationship tracing. Select this repository with `list_projects`; use `search_graph` for symbols, `search_code` for text, and `trace_path` for callers and dependencies. Refresh a missing or stale index with `index_repository`. Verify results against current files before editing. Do not substitute `rg`, `grep`, or filesystem scans for code discovery. If MCP is unavailable, report the blocker and request permission before using another search method.
- **Required communication style:** Use [Caveman](https://github.com/JuliusBrussee/caveman/blob/main/skills/caveman/SKILL.md) by default in chat. Lead with the answer; use short, direct sentences without filler. Preserve technical facts, negations, code, commands, paths, and errors exactly. Clarity takes priority over compression. Keep documentation, comments, commits, and PRs in normal professional prose. Honor `stop caveman` or `normal mode` for the session.

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

Use two-space indentation, semicolons, and the surrounding file's quote style. Use PascalCase for components and types, camelCase for functions and variables, and `use` prefixes for hooks. Follow existing filenames such as `themed-text.tsx`, `anime.model.ts`, and `backup.util.ts`. Prefer `@/` imports for shared modules. Keep domain logic outside screen components. No standalone formatter is configured.

## Testing Guidelines

Tests use `node:test`, strict assertions, and JSDOM against production modules. Name tests `*.test.cjs`; place HTML fixtures in `tests/fixtures/`. No coverage threshold is configured. Run tests, type checking, and lint before submitting. Follow `docs/provider-testing.md` on iOS and Android for playback, resume, provider editing, navigation restrictions, and backup compatibility; simulated media cannot verify native playback.

## Commit & Pull Request Guidelines

History uses short descriptive subjects, including `fix client messages` and `README updated`; no consistent Conventional Commits convention exists. Write focused, action-oriented subjects. Include the change's purpose, related issues when applicable, validation commands and results, and device/platform checks in PRs. Attach screenshots for UI changes and explain persistence or backup compatibility changes.
