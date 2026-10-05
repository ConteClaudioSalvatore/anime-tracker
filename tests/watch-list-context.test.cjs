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

test("Watchlist accessory and screen share filters, sorting, search and actions", async (t) => {
  const ui = new JSDOM('<div id="root"></div>');
  const previous = {
    window: globalThis.window,
    document: globalThis.document,
    act: globalThis.IS_REACT_ACT_ENVIRONMENT,
  };
  globalThis.window = ui.window;
  globalThis.document = ui.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const navigations = [];
  const StoreContext = React.createContext({
    state: {
      providers: [],
      anime: {
        Zebra: { highestWatchedEpisode: 1, lastPlayedAt: 2 },
        Alpha: { highestWatchedEpisode: 2, lastPlayedAt: 1 },
        Finished: { highestWatchedEpisode: 3, finished: true },
      },
    },
    stateChanged: () => {},
  });
  const AppStateContext = React.createContext({ updateState: () => {} });
  const load = Module._load;
  Module._load = function (request, parent, ...args) {
    if (request === "@/utils")
      return { StoreContext, isAnimeFinished: () => false };
    if (request === "@/utils/app-state.util") return { AppStateContext };
    if (request === "@/utils/backup.util")
      return { exportWatchList: async () => {} };
    if (request === "@/hooks/use-app-translation")
      return { useAppTranslation: () => (key) => key };
    if (request === "expo-router")
      return {
        useRouter: () => ({ navigate: (route) => navigations.push(route) }),
      };
    return load.call(this, request, parent, ...args);
  };
  let useWatchList, useWatchListContext, WatchListContext;
  try {
    ({
      useWatchList,
      useWatchListContext,
      WatchListContext,
    } = require("../hooks/use-watch-list.ts"));
  } finally {
    Module._load = load;
  }
  let controls, screen;
  function Accessory() {
    controls = useWatchListContext();
    return null;
  }
  function Screen() {
    screen = useWatchListContext();
    return null;
  }
  function Harness() {
    const list = useWatchList();
    return React.createElement(
      WatchListContext.Provider,
      { value: list },
      React.createElement(Accessory),
      React.createElement(Screen),
    );
  }
  const root = createRoot(ui.window.document.querySelector("#root"));
  t.after(async () => {
    await React.act(async () => root.unmount());
    globalThis.window = previous.window;
    globalThis.document = previous.document;
    globalThis.IS_REACT_ACT_ENVIRONMENT = previous.act;
    ui.window.close();
  });
  await React.act(async () => root.render(React.createElement(Harness)));
  assert.equal(controls, screen);
  assert.deepEqual(
    screen.items.map(([name]) => name),
    ["Zebra", "Alpha"],
  );
  await React.act(async () => controls.setOnlyInProgress(false));
  await React.act(async () => controls.setSortMode("name-asc"));
  assert.deepEqual(
    screen.items.map(([name]) => name),
    ["Alpha", "Finished", "Zebra"],
  );
  await React.act(async () => screen.setSearchValue("finished"));
  assert.deepEqual(
    controls.items.map(([name]) => name),
    ["Finished"],
  );
  await React.act(async () => controls.onAdd());
  assert.deepEqual(navigations, [{ pathname: "/anime-modal", params: {} }]);
  assert.equal(controls, screen);
});
