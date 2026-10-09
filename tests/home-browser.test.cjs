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

const { reducer } = require("../store/app.state.ts");
const runtime = fs.readFileSync(
  path.join(rootPath, "assets/js/provider-runtime_t.cjs"),
  "utf8",
);

test("Home renews Android same-document navigation and saves progress back to episode links", async (t) => {
  const ui = new JSDOM('<div id="root"></div>');
  const site = new JSDOM(
    fs.readFileSync(path.join(__dirname, "fixtures/series.html"), "utf8"),
    { url: "https://example.com/", runScripts: "outside-only" },
  );
  const previous = {
    window: globalThis.window,
    document: globalThis.document,
    act: globalThis.IS_REACT_ACT_ENVIRONMENT,
  };
  globalThis.window = ui.window;
  globalThis.document = ui.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const provider = {
    id: 4,
    name: "User website",
    origin: "https://example.com/",
    whiteListedOrigins: [],
    seriesPageOrigin: "https://example.com/series/",
    seriesNameSelector: "h1",
    episodeNumberSelector: "#episode-list a",
    totalEpisodesSelector: "#episode-total",
    isPlayerSupported: true,
    isDefault: true,
  };
  let store = { providers: [provider], anime: {} };
  let refreshStore, browser, appState, updateApp;
  const packets = [],
    scripts = [];
  let reloads = 0;
  const appListeners = new Set();
  const nativeAppState = {
    currentState: "active",
    addEventListener: (name, listener) => {
      assert.equal(name, "change");
      appListeners.add(listener);
      return { remove: () => appListeners.delete(listener) };
    },
  };
  async function changeAppState(value) {
    await React.act(async () => {
      nativeAppState.currentState = value;
      for (const listener of [...appListeners]) listener(value);
    });
  }
  const webViewRef = {
    current: {
      reload: () => reloads++,
      injectJavaScript: (script) => {
        scripts.push(script);
        site.window.eval(script);
      },
    },
  };
  const contexts = {
    AccessoryContext: React.createContext({ webViewRef }),
    AppStateContext: React.createContext(null),
    StoreContext: React.createContext(null),
    AppStore: {
      Dispatch: async (action) => {
        store = reducer(store, action);
      },
    },
  };
  const load = Module._load;
  Module._load = function (request, parent, ...args) {
    if (request === "react-native") return { AppState: nativeAppState };
    if (request === "@/utils") return contexts;
    if (request === "@/assets/js/provider-runtime_t.cjs") return runtime;
    if (request === "@/hooks/use-app-translation")
      return {
        useMessageFormatter: () => (message) => JSON.stringify(message),
      };
    if (request === "@/hooks/use-provider-navigation")
      return { useProviderNavigation: () => () => true };
    return load.call(this, request, parent, ...args);
  };
  let useHomeBrowser;
  try {
    ({ useHomeBrowser } = require("../hooks/use-home-browser.ts"));
  } finally {
    Module._load = load;
  }
  function Browser() {
    browser = useHomeBrowser();
    return null;
  }
  function Harness() {
    const [app, updateState] = React.useState({
      url: provider.origin,
      providerId: provider.id,
    });
    const [snapshot, setSnapshot] = React.useState(store);
    appState = app;
    updateApp = updateState;
    refreshStore = async () => setSnapshot(store);
    return React.createElement(
      contexts.AppStateContext.Provider,
      { value: { state: app, updateState } },
      React.createElement(
        contexts.StoreContext.Provider,
        { value: { state: snapshot, stateChanged: refreshStore } },
        React.createElement(Browser),
      ),
    );
  }
  const root = createRoot(ui.window.document.querySelector("#root"));
  t.after(async () => {
    await React.act(async () => root.unmount());
    assert.equal(
      appListeners.size,
      0,
      "Unmount removes the app-state listener",
    );
    globalThis.window = previous.window;
    globalThis.document = previous.document;
    globalThis.IS_REACT_ACT_ENVIRONMENT = previous.act;
    ui.window.close();
    site.window.close();
  });
  await React.act(async () => root.render(React.createElement(Harness)));
  const win = site.window;
  win.ReactNativeWebView = { postMessage: (data) => packets.push(data) };
  win.setInterval = () => 1;
  let now = 100000;
  win.Date.now = () => now;
  async function drain() {
    while (packets.length) {
      const data = packets.shift();
      await React.act(async () => browser.onMessage({ nativeEvent: { data } }));
    }
  }
  async function navigate(url) {
    win.history.pushState({}, "", url);
    await React.act(async () => browser.onLoadStart({ nativeEvent: { url } }));
    await React.act(async () =>
      browser.onNavigationStateChange({
        url,
        loading: false,
        canGoBack: true,
        canGoForward: false,
      }),
    );
    await drain();
  }
  await React.act(async () =>
    browser.onLoadStart({ nativeEvent: { url: provider.origin } }),
  );
  assert.equal(browser.loading, true);
  assert.equal(appState.browserLoading, true);
  win.eval(browser.injection);
  win.document.dispatchEvent(new win.Event("DOMContentLoaded"));
  await React.act(async () =>
    browser.onLoadEnd({ nativeEvent: { url: provider.origin } }),
  );
  assert.equal(browser.loading, false);
  assert.equal(appState.browserLoading, false);
  await drain();
  const firstDocument = win.ProviderRuntime.documentId;
  const firstUrl = "https://example.com/series/example/1";
  await navigate(firstUrl);
  assert.notEqual(win.ProviderRuntime.documentId, firstDocument);
  assert.equal(browser.url, firstUrl);
  const video = win.document.querySelector("video");
  let time = 0;
  Object.defineProperties(video, {
    duration: { get: () => 120 },
    currentTime: {
      get: () => time,
      set: (value) => {
        time = value;
      },
    },
    paused: { get: () => false },
    ended: { get: () => false },
    seeking: { get: () => false },
    seekable: { get: () => ({ length: 1 }) },
  });
  async function play() {
    now += 1500;
    time += 2;
    win.ProviderRuntime.tick();
    await drain();
  }
  await play();
  await play();
  await play();
  const history = store.anime["Example Series"];
  assert.equal(history.episodeProgress[1].progress, time);
  assert.equal(history.latestVisitedUrl, firstUrl);
  assert.equal(history.providerId, provider.id);
  assert.ok(history.lastPlayedAt > 0);
  assert.match(
    win.document.querySelector("#episode-list a").style.backgroundImage,
    /linear-gradient/,
  );

  const oldDocument = win.ProviderRuntime.documentId;
  const sessionId = win.__providerSession;
  const secondUrl = "https://example.com/series/example/2";
  win.document.querySelector(".active").classList.remove("active");
  win.document.querySelectorAll("#episode-list a")[1].classList.add("active");
  await navigate(secondUrl);
  const secondDocument = win.ProviderRuntime.documentId;
  assert.notEqual(secondDocument, oldDocument);
  await React.act(async () =>
    browser.onMessage({
      nativeEvent: {
        data: JSON.stringify({
          channel: "provider-runtime",
          sessionId,
          documentId: oldDocument,
          url: firstUrl,
          type: "ready",
          navigationRevision: 2,
        }),
      },
    }),
  );
  const scriptCount = scripts.length;
  await React.act(async () =>
    browser.onMessage({
      nativeEvent: {
        data: JSON.stringify({
          channel: "provider-runtime",
          sessionId,
          documentId: "delayed-handshake",
          url: secondUrl,
          type: "ready",
          navigationRevision: 2,
        }),
      },
    }),
  );
  assert.equal(
    scripts.length,
    scriptCount,
    "An earlier navigation revision cannot bind a new document at the current URL",
  );
  await React.act(async () =>
    browser.onLoadEnd({ nativeEvent: { url: firstUrl } }),
  );
  assert.equal(
    scripts.length,
    scriptCount,
    "A stale load completion cannot handshake the current page",
  );
  await React.act(async () =>
    browser.onMessage({
      nativeEvent: {
        data: JSON.stringify({
          channel: "provider-runtime",
          sessionId,
          documentId: oldDocument,
          url: firstUrl,
          type: "anime-found",
          payload: {
            animeTitle: "Stale Series",
            episode: 99,
            progress: 20,
            total: 120,
          },
        }),
      },
    }),
  );
  assert.equal(store.anime["Stale Series"], undefined);
  await play();
  await play();
  await play();
  assert.equal(store.anime["Example Series"].episodeProgress[2].progress, time);
  assert.equal(store.anime["Example Series"].latestVisitedUrl, secondUrl);
  assert.equal(win.ProviderRuntime.documentId, secondDocument);
  assert.match(
    win.document.querySelectorAll("#episode-list a")[1].style.backgroundImage,
    /linear-gradient/,
  );

  await React.act(async () =>
    browser.onLoadStart({ nativeEvent: { url: secondUrl } }),
  );
  await React.act(async () =>
    browser.onLoadEnd({ nativeEvent: { url: firstUrl } }),
  );
  assert.equal(
    appState.browserLoading,
    true,
    "Stale load ends cannot stop loading",
  );
  await React.act(async () => browser.onError());
  assert.equal(appState.browserLoading, false, "Failed loads stop the spinner");

  await React.act(async () =>
    browser.onNavigationStateChange({
      url: secondUrl,
      loading: true,
      canGoBack: true,
      canGoForward: false,
    }),
  );
  assert.equal(appState.browserLoading, true);
  await React.act(async () =>
    browser.onNavigationStateChange({
      url: secondUrl,
      loading: false,
      canGoBack: true,
      canGoForward: false,
    }),
  );
  assert.equal(appState.browserLoading, false);

  await changeAppState("background");
  await changeAppState("active");
  assert.equal(
    reloads,
    0,
    "Healthy pages survive app return without reloading",
  );

  const recoveryDocument = win.ProviderRuntime.documentId;
  const historyBeforeRecovery = JSON.stringify(store.anime);
  await changeAppState("background");
  await React.act(async () => browser.onContentProcessDidTerminate());
  await React.act(async () => browser.onContentProcessDidTerminate());
  assert.equal(reloads, 0, "Background termination waits for app return");
  const recoveryScripts = scripts.length;
  await React.act(async () =>
    browser.onMessage({
      nativeEvent: {
        data: JSON.stringify({
          channel: "provider-runtime",
          sessionId,
          documentId: recoveryDocument,
          url: secondUrl,
          type: "anime-found",
          payload: {
            animeTitle: "Dead Document",
            episode: 99,
            progress: 20,
            total: 120,
          },
        }),
      },
    }),
  );
  assert.equal(scripts.length, recoveryScripts);
  assert.equal(store.anime["Dead Document"], undefined);
  await changeAppState("inactive");
  assert.equal(reloads, 0);
  await changeAppState("active");
  assert.equal(reloads, 1, "Queued iOS recovery reloads once on app return");
  assert.equal(
    browser.url,
    secondUrl,
    "Recovery retains the current episode URL",
  );
  assert.equal(appState.providerId, provider.id);
  assert.equal(browser.loading, true);
  assert.equal(JSON.stringify(store.anime), historyBeforeRecovery);
  await changeAppState("active");
  assert.equal(reloads, 1, "Consumed recovery cannot reload again");
  await navigate(secondUrl);
  assert.equal(browser.loading, false);
  assert.notEqual(win.ProviderRuntime.documentId, recoveryDocument);

  await React.act(async () => browser.onContentProcessDidTerminate());
  assert.equal(reloads, 2, "Foreground iOS termination recovers immediately");
  await navigate(secondUrl);
  const generation = browser.webViewGeneration;
  await React.act(async () => browser.onRenderProcessGone());
  assert.equal(browser.webViewGeneration, generation + 1);
  assert.equal(
    reloads,
    2,
    "Android replaces the dead WebView instead of reloading",
  );
  assert.equal(browser.url, secondUrl);
  await navigate(secondUrl);
  await changeAppState("background");
  await React.act(async () => browser.onRenderProcessGone());
  assert.equal(browser.webViewGeneration, generation + 1);
  await changeAppState("active");
  assert.equal(browser.webViewGeneration, generation + 2);
  await navigate(secondUrl);

  await changeAppState("background");
  await React.act(async () => browser.onContentProcessDidTerminate());
  await React.act(async () =>
    updateApp((previous) => ({ ...previous, url: firstUrl })),
  );
  await changeAppState("active");
  assert.equal(
    reloads,
    2,
    "URL changes cancel queued recovery of the old page",
  );
  await navigate(secondUrl);
  await changeAppState("background");
  await React.act(async () => browser.onRenderProcessGone());

  await React.act(async () =>
    browser.onLoadStart({ nativeEvent: { url: secondUrl } }),
  );
  await React.act(async () =>
    updateApp((previous) => ({
      ...previous,
      url: undefined,
      providerId: undefined,
    })),
  );
  assert.equal(
    appState.browserLoading,
    false,
    "Leaving the website resets loading",
  );
  await changeAppState("active");
  assert.equal(browser.webViewGeneration, generation + 2);
  assert.equal(reloads, 2, "Leaving the website cancels pending recovery");
});
