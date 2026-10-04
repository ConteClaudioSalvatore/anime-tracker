const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

const root = path.resolve(__dirname, "..");
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...args) {
  return resolve.call(
    this,
    request.startsWith("@/") ? path.join(root, request.slice(2)) : request,
    parent,
    ...args,
  );
};
require.extensions[".ts"] = (module, filename) => {
  const result = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });
  module._compile(result.outputText, filename);
};

test("Clear all removes only anime history after confirmation and preserves providers", async () => {
  const load = Module._load;
  let stored;
  let buttons;
  let writes = 0;
  Module._load = function (request, parent, ...args) {
    if (request === "react-native")
      return {
        Alert: { alert: (_title, _message, options) => (buttons = options) },
      };
    if (request === "expo-file-system")
      return { File: class {}, Paths: { document: "test" } };
    if (request === "expo-document-picker" || request === "expo-sharing")
      return {};
    if (request === "./storage.util")
      return {
        Storage: {
          getItem: async (key) => {
            assert.equal(key, "state");
            return stored;
          },
          setItem: async (key, next) => {
            assert.equal(key, "state");
            stored = JSON.parse(JSON.stringify(next));
            writes++;
          },
          removeItem: async () =>
            assert.fail("Clear must not delete app state"),
        },
      };
    return load.call(this, request, parent, ...args);
  };
  let onClearHistory;
  let AppStore;
  try {
    ({ onClearHistory } = require("../utils/on-clear-history.util.ts"));
    ({ AppStore } = require("../utils/app-store.util.ts"));
  } finally {
    Module._load = load;
  }

  const website = {
    id: 4,
    name: "My website",
    origin: "https://example.com/",
    whiteListedOrigins: ["https://mirror.example.com"],
    isDefault: true,
    seriesPageOrigin: "https://example.com/series/",
    seriesNameSelector: "h1",
    episodeNumberSelector: ".episode",
    totalEpisodesSelector: ".total",
    isPlayerSupported: true,
  };
  const anime = {
    Watching: {
      name: "Watching",
      latestWatchedEpisode: 2,
      highestWatchedEpisode: 2,
      episodeProgress: { 2: { progress: 42, total: 120 } },
    },
    Finished: { name: "Finished", highestWatchedEpisode: 12, finished: true },
  };
  for (const providers of [
    [website, { ...website, id: 8, name: "Second website", isDefault: false }],
    [website],
    [],
    undefined,
  ]) {
    // History-only storage exercises the legacy migration path as well.
    stored = providers ? { anime, providers } : anime;
    const previousProviders = (await AppStore.Get()).providers;
    const before = JSON.stringify(stored);
    const previousWrites = writes;
    let refreshes = 0;
    onClearHistory(async () => {
      const reloaded = await AppStore.Get();
      assert.deepEqual(reloaded.anime, {});
      assert.deepEqual(reloaded.providers, previousProviders);
      refreshes++;
    });
    assert.equal(
      buttons.find((button) => button.style === "cancel").onPress,
      undefined,
    );
    assert.equal(JSON.stringify(stored), before);
    assert.equal(writes, previousWrites);
    assert.equal(refreshes, 0);
    await buttons.find((button) => button.style === "destructive").onPress();
    assert.deepEqual(stored.anime, {});
    assert.deepEqual(stored.providers, providers ?? []);
    assert.equal(writes, previousWrites + 1);
    assert.equal(refreshes, 1);
  }
});
