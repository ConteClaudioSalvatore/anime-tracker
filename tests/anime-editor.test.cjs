const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const React = require("react");
const { createRoot } = require("react-dom/client");
const { JSDOM } = require("jsdom");

const rootPath = path.resolve(__dirname, "..");
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...args) {
  return resolve.call(
    this,
    request.startsWith("@/") ? path.join(rootPath, request.slice(2)) : request,
    parent,
    ...args,
  );
};
require.extensions[".ts"] = (module, filename) => {
  const result = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  });
  module._compile(result.outputText, filename);
};
const {
  parseAnimeEpisode,
  parseAnimeTotal,
} = require("../utils/anime-editor.ts");
const { upsertAnime } = require("../store/app.actions.ts");
const {
  watchListProgress,
  watchListSummary,
} = require("../utils/watch-list.ts");
const { isAnimeFinished } = require("../utils/is-anime-finieshed.util.ts");
const { reducer } = require("../store/app.state.ts");
const { i18n } = require("../utils/i18n.ts");

const StoreContext = React.createContext(null);
let params = {},
  writes = [],
  backs = 0,
  refreshes = 0,
  dispatch;
const router = { back: () => backs++ };
const load = Module._load;
Module._load = function (request, parent, ...args) {
  if (request === "@/utils")
    return {
      StoreContext,
      AppStore: {
        Dispatch: (action) => {
          writes.push(action);
          return dispatch(action);
        },
      },
    };
  if (request === "expo-router")
    return { useLocalSearchParams: () => params, useRouter: () => router };
  if (request === "react-native") return { Keyboard: { dismiss: () => {} } };
  return load.call(this, request, parent, ...args);
};
let useAnimeEditor;
try {
  ({ useAnimeEditor } = require("../hooks/use-anime-editor.ts"));
} finally {
  Module._load = load;
}

async function mountEditor(t, initialParams = {}, anime = {}) {
  params = initialParams;
  writes = [];
  backs = 0;
  refreshes = 0;
  dispatch = async () => {};
  await i18n.changeLanguage("en");
  const dom = new JSDOM('<div id="root"></div>');
  const previous = {
    window: globalThis.window,
    document: globalThis.document,
    act: globalThis.IS_REACT_ACT_ENVIRONMENT,
  };
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let editor;
  function Editor() {
    editor = useAnimeEditor();
    return React.createElement("p", null, editor.error);
  }
  const root = createRoot(dom.window.document.querySelector("#root"));
  t.after(async () => {
    await React.act(async () => root.unmount());
    await i18n.changeLanguage("en");
    globalThis.window = previous.window;
    globalThis.document = previous.document;
    globalThis.IS_REACT_ACT_ENVIRONMENT = previous.act;
    dom.window.close();
  });
  await React.act(async () =>
    root.render(
      React.createElement(
        StoreContext.Provider,
        { value: { state: { anime }, stateChanged: async () => refreshes++ } },
        React.createElement(Editor),
      ),
    ),
  );
  return () => editor;
}

test("episode editing accepts zero and rejects empty, fractional, negative, or unsafe values", () => {
  for (const value of [
    "",
    " ",
    "-1",
    "1.5",
    "1e2",
    "NaN",
    "Infinity",
    "9007199254740992",
  ])
    assert.equal(parseAnimeEpisode(value), undefined, value);
  assert.equal(parseAnimeEpisode("0"), 0);
  assert.equal(parseAnimeEpisode(" 24 "), 24);
  assert.equal(parseAnimeEpisode("008"), 8);
});

test("blank input stays editable and cannot dispatch an invalid manual update", async (t) => {
  const current = await mountEditor(t);
  assert.equal(current().canSave, false);
  await React.act(async () => {
    current().change("name", "Series");
    current().change("episode", "");
  });
  assert.equal(current().fields.episode, "");
  assert.equal(current().canSave, false);
  await React.act(async () => current().save());
  assert.equal(writes.length, 0);
  await React.act(async () => current().change("episode", "0"));
  assert.equal(current().canSave, true);
  await React.act(async () => current().save());
  assert.equal(writes[0].payload.episode, 0);
  assert.equal(refreshes, 1);
  assert.equal(backs, 1);
});

test("failed saves retain fields, follow language changes, and retry without duplicate writes", async (t) => {
  const current = await mountEditor(t, {
    animeName: "User {{title}}",
    episode: "8",
  });
  dispatch = async () => {
    throw new Error("storage failed");
  };
  await React.act(async () => current().save());
  assert.deepEqual(current().fields, {
    name: "User {{title}}",
    episode: "8",
    total: "?",
  });
  assert.match(current().error, /Could not save/);
  assert.equal(current().saving, false);
  assert.equal(backs, 0);
  await React.act(async () => i18n.changeLanguage("it"));
  assert.match(current().error, /Impossibile salvare/);
  assert.deepEqual(current().fields, {
    name: "User {{title}}",
    episode: "8",
    total: "?",
  });

  let finishWrite;
  dispatch = () =>
    new Promise((resolve) => {
      finishWrite = resolve;
    });
  let pending;
  await React.act(async () => {
    pending = current().save();
    void current().save();
  });
  assert.equal(
    writes.length,
    2,
    "One failed attempt and one retry; the double tap is ignored",
  );
  assert.equal(current().saving, true);
  current().close();
  assert.equal(backs, 0);
  await React.act(async () => {
    finishWrite();
    await pending;
  });
  assert.equal(backs, 1);
  assert.equal(refreshes, 1);
  assert.equal(current().fields.name, "User {{title}}");

  const original = {
    latestVisitedUrl: "https://example.com/episode",
    providerId: 4,
    lastPlayedAt: 12345,
    episodeProgress: { 3: { progress: 30, total: 100 } },
  };
  const state = reducer(
    { anime: { "User {{title}}": original }, providers: [] },
    writes[1],
  );
  assert.equal(state.anime["User {{title}}"].providerId, 4);
  assert.equal(
    state.anime["User {{title}}"].latestVisitedUrl,
    original.latestVisitedUrl,
  );
  assert.equal(state.anime["User {{title}}"].lastPlayedAt, 12345);
  assert.equal(
    state.anime["User {{title}}"].episodeProgress,
    original.episodeProgress,
  );
  assert.equal(state.anime["User {{title}}"].highestWatchedEpisode, 8);
});

test("total episode input accepts positive counts or an explicit question mark", () => {
  assert.equal(parseAnimeTotal("?"), null);
  assert.equal(parseAnimeTotal(" ? "), null);
  assert.equal(parseAnimeTotal("24"), 24);
  for (const value of [
    "",
    " ",
    "0",
    "-1",
    "1.5",
    "1e2",
    "??",
    "9007199254740992",
  ]) {
    assert.equal(parseAnimeTotal(value), undefined, value);
  }
});

test("editing loads the saved total and can replace it with unknown without losing history", async (t) => {
  const original = {
    total: 24,
    highestWatchedEpisode: 8,
    lastPlayedAt: 12345,
    providerId: 4,
    latestVisitedUrl: "https://example.com/episode",
    episodeProgress: { 8: { progress: 25, total: 100 } },
  };
  const current = await mountEditor(
    t,
    { animeName: "Series", episode: "8" },
    { Series: original },
  );
  assert.equal(current().fields.total, "24");
  await React.act(async () => current().change("total", ""));
  assert.equal(current().canSave, false);
  await React.act(async () => current().save());
  assert.equal(writes.length, 0);
  await React.act(async () => current().change("total", "?"));
  assert.equal(current().canSave, true);
  await React.act(async () => current().save());
  assert.equal(writes[0].payload.total, null);
  const state = reducer(
    { anime: { Series: original }, providers: [] },
    writes[0],
  );
  const saved = JSON.parse(JSON.stringify(state));
  assert.equal(saved.anime.Series.total, undefined);
  assert.equal(watchListProgress(saved.anime.Series), undefined);
  assert.equal(isAnimeFinished(saved.anime.Series), false);
  assert.equal(watchListSummary(saved.anime)[0].totalEpisodes, null);
  assert.equal(saved.anime.Series.lastPlayedAt, original.lastPlayedAt);
  assert.equal(saved.anime.Series.providerId, 4);
  assert.equal(saved.anime.Series.latestVisitedUrl, original.latestVisitedUrl);
  assert.deepEqual(
    saved.anime.Series.episodeProgress,
    original.episodeProgress,
  );
});

test("manual numeric totals persist and legacy episode-only updates retain them", async (t) => {
  const current = await mountEditor(t);
  assert.equal(current().fields.total, "?");
  await React.act(async () => {
    current().change("name", "Series");
    current().change("episode", "3");
    current().change("total", "12");
  });
  await React.act(async () => current().save());
  const added = reducer({ anime: {}, providers: [] }, writes[0]);
  assert.equal(added.anime.Series.total, 12);
  assert.equal(watchListProgress(added.anime.Series), 0.25);
  const updated = reducer(added, upsertAnime("Series", 4));
  assert.equal(updated.anime.Series.total, 12);
  assert.equal(updated.anime.Series.highestWatchedEpisode, 4);
});
