const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

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
  i18n,
  resolveLanguage,
  translate,
  message,
  formatMessage,
  TranslationError,
  errorMessage,
} = require("../utils/i18n.ts");
const { providerSaveMessage } = require("../utils/provider-runtime.ts");
const {
  selectionFeedback,
  extractionFeedback,
} = require("../utils/runtime-feedback.ts");

test("locale selection honors ordered preferences, regional variants and English fallback", () => {
  for (const [locales, expected] of [
    [[{ languageCode: "it", languageTag: "it-IT" }], "it"],
    [[{ languageTag: "IT-ch" }], "it"],
    [[{ languageTag: "en-GB" }], "en"],
    [
      [{ languageCode: "fr" }, { languageCode: "it" }, { languageCode: "en" }],
      "it",
    ],
    [[{ languageCode: "en" }, { languageCode: "it" }], "en"],
    [[{ languageCode: null, languageTag: "it-IT" }], "it"],
    [[{ languageCode: "de" }, { languageCode: "fr" }], "en"],
    [[], "en"],
    [[{}], "en"],
  ])
    assert.equal(resolveLanguage(locales), expected);
});

test("bundled catalogs have complete matching keys and interpolation parameters", () => {
  const en = require("../locales/en.json");
  const it = require("../locales/it.json");
  assert.deepEqual(Object.keys(it).sort(), Object.keys(en).sort());
  const placeholders = (value) =>
    [...value.matchAll(/{{(\w+)}}/g)].map((match) => match[1]).sort();
  for (const [key, english] of Object.entries(en)) {
    assert.equal(typeof it[key], "string", key);
    assert.ok(it[key].trim(), key);
    assert.deepEqual(placeholders(it[key]), placeholders(english), key);
  }
  const plugin = require("../app.json").expo.plugins.find(
    (plugin) => Array.isArray(plugin) && plugin[0] === "expo-localization",
  );
  assert.deepEqual(plugin[1].supportedLocales, {
    ios: ["en", "it"],
    android: ["en", "it"],
  });
});

test("translations preserve user content, use plural forms and fall back to English", async (t) => {
  t.after(() => i18n.changeLanguage("en"));
  await i18n.changeLanguage("it");
  assert.equal(translate("navigation.websites"), "Siti web");
  assert.equal(
    translate("provider.openNamed", { name: 'Serie <&> "{{name}}"' }),
    'Apri Serie <&> "{{name}}"',
  );
  assert.equal(
    translate("creator.totalCount", { count: 1 }),
    "1 episodio totale",
  );
  assert.equal(
    translate("creator.totalCount", { count: 12 }),
    "12 episodi totali",
  );
  assert.equal(
    translate("creator.matches", { count: 1, texts: "Serie" }),
    "1 corrispondenza · Serie",
  );
  assert.equal(
    translate("creator.matches", { count: 2, texts: "Serie" }),
    "2 corrispondenze · Serie",
  );
  const saved = i18n.getResource("it", "translation", "common.close");
  i18n.addResource("it", "translation", "common.close", undefined);
  t.after(() => i18n.addResource("it", "translation", "common.close", saved));
  assert.equal(translate("common.close"), "Close");
});

test("retained feedback and nested runtime diagnostics translate at display time", async (t) => {
  t.after(() => i18n.changeLanguage("en"));
  const selection = {
    error: "Choose one series title.",
    errorCode: "choose-title",
  };
  const preview = {
    valid: false,
    errors: ["Choose one series title."],
    errorCodes: ["choose-title"],
  };
  const draft = {
    id: 1,
    name: "User site",
    origin: "https://example.com",
    whiteListedOrigins: [],
    seriesPageOrigin: "https://example.com/series/",
    seriesNameSelector: "h1",
    episodeNumberSelector: "a",
    totalEpisodesSelector: ".total",
    isPlayerSupported: true,
  };
  const pending = providerSaveMessage(
    draft,
    ["https://example.com/a", "https://example.com/b"],
    {
      "https://example.com/a": preview,
    },
    true,
  );
  await i18n.changeLanguage("en");
  assert.match(
    formatMessage(pending),
    /Example 1 did not pass: Choose one series title/,
  );
  await i18n.changeLanguage("it");
  assert.match(
    formatMessage(pending),
    /L’esempio 1 non ha superato la verifica: Scegli un solo titolo/,
  );
  assert.equal(
    selectionFeedback(selection),
    "Scegli un solo titolo della serie.",
  );
  assert.equal(
    formatMessage(extractionFeedback(preview)[0]),
    "Scegli un solo titolo della serie.",
  );
  assert.equal(
    selectionFeedback({ error: "Legacy selection error" }),
    "Legacy selection error",
  );
  assert.deepEqual(
    extractionFeedback({ errors: ["Legacy extraction error"] }),
    ["Legacy extraction error"],
  );
  const error = new TranslationError(message("provider.deleted"));
  assert.match(error.message, /This provider was deleted/);
  assert.match(
    formatMessage(errorMessage(error, "provider.saveFailed")),
    /è stato eliminato/,
  );
  assert.equal(
    formatMessage(
      errorMessage(new Error("Native storage details"), "provider.saveFailed"),
    ),
    "Impossibile salvare. La configurazione è ancora disponibile; riprova.",
  );
});

test("foreground language changes update Home feedback without replacing its session or losing saved progress", async (t) => {
  const React = require("react");
  const { createRoot } = require("react-dom/client");
  const { JSDOM } = require("jsdom");
  const dom = new JSDOM('<div id="root"></div>');
  const previous = {
    window: globalThis.window,
    document: globalThis.document,
    act: globalThis.IS_REACT_ACT_ENVIRONMENT,
  };
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;

  const url = "https://example.com/series/one";
  const provider = {
    id: 1,
    name: "User website",
    origin: "https://example.com/",
    whiteListedOrigins: [],
    seriesPageOrigin: "https://example.com/series/",
    seriesNameSelector: "h1",
    episodeNumberSelector: "a",
    totalEpisodesSelector: ".total",
    isPlayerSupported: true,
  };
  const scripts = [],
    saved = [];
  const webViewRef = {
    current: { injectJavaScript: (script) => scripts.push(script) },
  };
  const contexts = {
    AccessoryContext: React.createContext({ webViewRef }),
    AppStateContext: React.createContext(null),
    StoreContext: React.createContext({
      state: {
        providers: [provider],
        anime: {
          Series: { episodeProgress: { 1: { progress: 20, total: 120 } } },
        },
      },
      stateChanged: async () => {},
    }),
    AppStore: {
      Dispatch: async (action) => saved.push(action),
      ApproveProviderOrigin: async () => {},
    },
  };
  let locales = [{ languageCode: "it" }],
    listener,
    removals = 0;
  let useHomeBrowser, useAppLocalization;
  const load = Module._load;
  Module._load = function (request, parent, ...args) {
    if (request === "react-native")
      return {
        Alert: { alert: () => {} },
        AppState: {
          addEventListener: (_event, callback) => {
            listener = callback;
            return { remove: () => removals++ };
          },
        },
      };
    if (request === "expo-localization") return { getLocales: () => locales };
    if (request === "expo-router")
      return {
        useFocusEffect: (callback) => React.useEffect(callback, [callback]),
      };
    if (request === "@/utils") return contexts;
    if (request === "@/assets/js/provider-runtime_t.cjs")
      return "/* runtime */";
    return load.call(this, request, parent, ...args);
  };
  try {
    ({ useHomeBrowser } = require("../hooks/use-home-browser.ts"));
    ({ useAppLocalization } = require("../hooks/use-app-localization.ts"));
  } finally {
    Module._load = load;
  }
  const root = createRoot(dom.window.document.querySelector("#root"));
  t.after(async () => {
    await React.act(async () => root.unmount());
    assert.equal(removals, 1);
    await i18n.changeLanguage("en");
    globalThis.window = previous.window;
    globalThis.document = previous.document;
    globalThis.IS_REACT_ACT_ENVIRONMENT = previous.act;
    dom.window.close();
  });
  let browser,
    mounts = 0;
  function Browser() {
    browser = useHomeBrowser();
    React.useEffect(() => {
      mounts++;
    }, []);
    return React.createElement("p", null, browser.status);
  }
  function Harness() {
    useAppLocalization();
    const [state, updateState] = React.useState({
      url,
      providerId: provider.id,
    });
    return React.createElement(
      contexts.AppStateContext.Provider,
      {
        value: { state, updateState },
      },
      React.createElement(Browser),
    );
  }
  await React.act(async () => root.render(React.createElement(Harness)));
  assert.match(dom.window.document.body.textContent, /Apri un episodio/);
  const injection = browser.injection;
  const sessionId = JSON.parse(
    injection.match(/window.__providerSession=([^;]+)/)[1],
  );
  const event = (type, data = {}) => ({
    nativeEvent: {
      data: JSON.stringify({
        channel: "provider-runtime",
        sessionId,
        documentId: "document",
        url,
        type,
        ...data,
      }),
    },
  });
  await React.act(async () => browser.onLoadStart({ nativeEvent: { url } }));
  await React.act(async () => browser.onMessage(event("ready")));
  await React.act(async () =>
    browser.onMessage(
      event("anime-found", {
        payload: { animeTitle: "Series", episode: 1, progress: 30, total: 120 },
      }),
    ),
  );
  assert.equal(
    saved.length,
    0,
    "First sample cannot overwrite the saved resume position",
  );
  assert.ok(scripts.some((script) => script.includes('"type":"resume"')));
  await React.act(async () =>
    browser.onMessage(
      event("anime-found", {
        payload: { animeTitle: "Series", episode: 1, progress: 31, total: 120 },
      }),
    ),
  );
  assert.equal(saved.length, 1);
  assert.equal(browser.status, "Series · Episodio 1 · 31 / 120 secondi");
  const scriptCount = scripts.length;
  locales = [{ languageCode: "en" }];
  await React.act(async () => listener("background"));
  assert.match(browser.status, /Episodio/);
  await React.act(async () => listener("active"));
  assert.equal(browser.status, "Series · Episode 1 · 31 / 120 seconds");
  assert.equal(browser.injection, injection);
  assert.equal(browser.webViewRef, webViewRef);
  assert.equal(scripts.length, scriptCount);
  assert.equal(saved.length, 1);
  assert.equal(mounts, 1);
  const coverUrl = "https://cdn.example.net/poster.jpg";
  await React.act(async () =>
    browser.onMessage(
      event("anime-cover", { payload: { animeTitle: "Series", coverUrl } }),
    ),
  );
  assert.equal(saved.length, 2);
  assert.deepEqual(
    saved[1],
    require("../store/app.actions.ts").animeCoverUpdated("Series", coverUrl),
  );
  assert.equal(browser.status, "Series · Episode 1 · 31 / 120 seconds");
  await React.act(async () =>
    browser.onMessage(
      event("anime-cover", { payload: { animeTitle: "Unwatched", coverUrl } }),
    ),
  );
  assert.equal(
    saved.length,
    2,
    "An unwatched title must not create history from its cover",
  );
});
