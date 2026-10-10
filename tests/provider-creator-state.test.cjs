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
const {
  createProviderCreatorState,
  providerCreatorReducer: reduce,
} = require("../utils/provider-creator-state.ts");

function configuredState() {
  const state = createProviderCreatorState();
  state.setup.draft = {
    ...state.setup.draft,
    id: 7,
    name: "My website",
    origin: "https://example.com/",
    isDefault: true,
    seriesNameSelector: ".title",
  };
  state.setup.pages = [
    "https://example.com/series/a",
    "https://example.com/series/b",
  ];
  state.setup.checks = Object.fromEntries(
    state.setup.pages.map((page) => [page, { valid: true }]),
  );
  state.setup.saveAnyway = true;
  state.reviewPage = state.setup.pages[0];
  return state;
}

test("editing configuration invalidates review and its limitations acknowledgment", () => {
  const before = configuredState();
  const after = reduce(before, {
    type: "edit",
    draft: { ...before.setup.draft, name: "Renamed" },
  });
  assert.equal(after.setup.draft.name, "Renamed");
  assert.deepEqual(after.setup.checks, {});
  assert.equal(after.reviewPage, null);
  assert.equal(after.setup.saveAnyway, false);
  assert.equal(after.setup.dirty, true);
  assert.deepEqual(after.setup.pages, before.setup.pages);
  assert.equal(before.setup.draft.name, "My website");
});

test("changing steps clears transient selection but preserves configuration and review results", () => {
  const before = configuredState();
  before.wizard = {
    step: 2,
    advanced: true,
    collapsed: true,
    error: "Old error",
  };
  before.selection.select = true;
  before.selection.candidate = { selector: ".title", valid: true };
  before.playback.timedOut = true;
  before.playback.videoHelp = true;
  const after = reduce(before, { type: "go", step: 6 });
  assert.deepEqual(after.wizard, {
    step: 6,
    error: "",
    advanced: false,
    collapsed: false,
  });
  assert.equal(after.selection.select, false);
  assert.equal(after.selection.candidate, null);
  assert.equal(after.reviewPage, null);
  assert.equal(after.playback.timedOut, false);
  assert.equal(after.playback.videoHelp, false);
  assert.equal(after.setup, before.setup);
});

test("a new document drops old media samples without forgetting the chosen player", () => {
  const before = configuredState();
  before.browser.ready = true;
  before.selection.candidate = { valid: true };
  before.playback = {
    ...before.playback,
    players: [{ time: 90 }],
    playerKey: "selected",
    inaccessible: 3,
    frameTrackingAvailable: false,
  };
  const after = reduce(before, { type: "pageLoading" });
  assert.equal(after.browser.ready, false);
  assert.equal(after.browser.loading, true);
  assert.equal(after.selection.candidate, null);
  assert.deepEqual(after.playback.players, []);
  assert.equal(after.playback.inaccessible, 0);
  assert.equal(after.playback.frameTrackingAvailable, undefined);
  assert.equal(after.playback.playerKey, "selected");
  assert.equal(after.setup, before.setup);
});

test("changing website discards learned settings while preserving provider identity", () => {
  const before = configuredState();
  before.setup.aliasInput = "https://mirror.example.com";
  before.browser.source = before.setup.draft.origin;
  before.playback.playerKey = "old-player";
  const after = reduce(before, {
    type: "changeWebsite",
    origin: "https://new.example.com/",
  });
  assert.deepEqual(after.setup.draft, {
    ...createProviderCreatorState().setup.draft,
    id: 7,
    name: "My website",
    isDefault: true,
    origin: "https://new.example.com/",
  });
  assert.deepEqual(after.setup.pages, []);
  assert.deepEqual(after.setup.checks, {});
  assert.equal(after.setup.aliasInput, "");
  assert.equal(after.setup.saveAnyway, false);
  assert.equal(after.setup.dirty, true);
  assert.equal(after.reviewPage, null);
  assert.equal(after.browser.source, "");
  assert.equal(after.playback.playerKey, "");
});

test("selection messages invalidate checks only when the selector changes", () => {
  const before = configuredState();
  const preview = {
    selector: ".title",
    valid: true,
    count: 1,
    texts: ["Series"],
    values: [],
  };
  const same = reduce(before, {
    type: "selectionReceived",
    field: "seriesNameSelector",
    preview,
  });
  assert.equal(same.setup, before.setup);
  assert.equal(same.selection.candidate, preview);
  const changed = reduce(same, {
    type: "selectionReceived",
    field: "seriesNameSelector",
    preview: { ...preview, selector: "h1" },
  });
  assert.equal(changed.setup.draft.seriesNameSelector, "h1");
  assert.deepEqual(changed.setup.checks, {});
  assert.equal(changed.setup.dirty, true);
});

test("player changes and retries revoke an earlier limitations acknowledgment", () => {
  const before = configuredState();
  before.playback.timedOut = true;
  before.playback.videoHelp = true;
  const chosen = reduce(before, { type: "choosePlayer", key: "new-player" });
  assert.equal(chosen.setup.saveAnyway, false);
  assert.equal(chosen.setup.dirty, true);
  assert.equal(chosen.playback.playerKey, "new-player");
  assert.equal(chosen.playback.timedOut, false);
  assert.equal(chosen.playback.videoHelp, false);
  const retried = reduce(before, { type: "retryPlayback" });
  assert.equal(retried.setup.saveAnyway, false);
  assert.equal(retried.playback.testRun, before.playback.testRun + 1);
  assert.equal(retried.playback.playerKey, before.playback.playerKey);
});

test("example changes clear previous results and functional patches keep all new checks", () => {
  const before = configuredState();
  const removed = reduce(before, {
    type: "removePage",
    page: before.setup.pages[0],
  });
  assert.deepEqual(removed.setup.pages, [before.setup.pages[1]]);
  assert.deepEqual(removed.setup.checks, {});
  const captured = reduce(removed, {
    type: "capturePage",
    page: "https://example.com/series/c",
  });
  assert.equal(captured.setup.pages.length, 2);
  assert.equal(captured.setup.dirty, true);
  let checked = captured;
  for (const page of captured.setup.pages) {
    checked = reduce(checked, {
      type: "setup",
      patch: (previous) => ({
        checks: { ...previous.checks, [page]: { valid: true } },
      }),
    });
  }
  assert.deepEqual(Object.keys(checked.setup.checks), captured.setup.pages);
});

test("creator hooks recover redirected pages, follow document URLs, and retain stale-page and Review guards", async (t) => {
  const React = require("react");
  const { createRoot } = require("react-dom/client");
  const { JSDOM } = require("jsdom");
  const { ProviderPageChecks } = require("../utils/provider-page-checks.ts");
  const dom = new JSDOM('<div id="root"></div>');
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  const previousAct = globalThis.IS_REACT_ACT_ENVIRONMENT;
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const load = Module._load;
  let useCreatorState, useCreatorBrowser;
  Module._load = function (request, parent, ...args) {
    if (request === "react-native") return { Alert: { alert: () => {} } };
    if (request === "expo-router")
      return {
        useFocusEffect: (callback) => React.useEffect(callback, [callback]),
      };
    return load.call(this, request, parent, ...args);
  };
  try {
    ({
      useCreatorState,
    } = require("../hooks/provider-creator/use-creator-state.ts"));
    ({
      useCreatorBrowser,
    } = require("../hooks/provider-creator/use-creator-browser.ts"));
  } finally {
    Module._load = load;
  }
  const root = createRoot(dom.window.document.querySelector("#root"));
  t.after(async () => {
    await React.act(async () => root.unmount());
    globalThis.window = previousWindow;
    globalThis.document = previousDocument;
    globalThis.IS_REACT_ACT_ENVIRONMENT = previousAct;
    dom.window.close();
  });
  const commands = [];
  let reloads = 0;
  const webView = {
    reload: () => reloads++,
    injectJavaScript: (script) => {
      const json = script.slice(
        "window.ProviderRuntime?.command(".length,
        -"); true;".length,
      );
      commands.push(JSON.parse(json));
    },
  };
  let creator;
  function Harness() {
    const { state, actions } = useCreatorState();
    const latestDraftRef = React.useRef(state.setup.draft);
    const pageChecks = React.useRef(new ProviderPageChecks());
    React.useEffect(() => {
      latestDraftRef.current = state.setup.draft;
    }, [state.setup.draft]);
    const browser = useCreatorBrowser({
      state,
      actions,
      latestDraftRef,
      pageChecks,
      edit: (draft) => actions.dispatch({ type: "edit", draft }),
    });
    React.useLayoutEffect(() => {
      browser.webView.current = webView;
      creator = { state, actions, browser };
    });
    return null;
  }
  await React.act(async () =>
    root.render(
      React.createElement(React.StrictMode, null, React.createElement(Harness)),
    ),
  );
  const pages = configuredState().setup.pages;
  await React.act(async () => {
    creator.actions.updateSetup({
      draft: configuredState().setup.draft,
      pages,
      initialized: true,
    });
    creator.actions.dispatch({ type: "go", step: 1 });
  });
  function message(type, documentId, url, payload = {}) {
    return {
      nativeEvent: {
        data: JSON.stringify({
          channel: "provider-runtime",
          sessionId: creator.browser.session,
          documentId,
          url,
          type,
          ...(type === "ready"
            ? {
                navigationRevision:
                  commands.findLast((command) => command.type === "reportReady")
                    ?.navigationRevision ?? 1,
              }
            : {}),
          ...payload,
        }),
      },
    };
  }
  await React.act(async () =>
    creator.browser.onLoadStart({
      nativeEvent: { url: pages[0] + "?redirect=1" },
    }),
  );
  // DOM readiness can arrive before WebView reports the canonical redirect URL.
  await React.act(async () =>
    creator.browser.onMessage(message("ready", "first", pages[0])),
  );
  assert.equal(creator.state.browser.ready, false);
  await React.act(async () =>
    creator.browser.onLoadEnd({
      nativeEvent: { url: pages[0] + "?redirect=1" },
    }),
  );
  await React.act(async () =>
    creator.browser.onMessage(message("ready", "first", pages[0])),
  );
  assert.equal(creator.state.browser.ready, false);
  const reports = commands.filter(
    (command) => command.type === "reportReady",
  ).length;
  await React.act(async () =>
    creator.browser.onNavigationStateChange({
      url: pages[0],
      loading: true,
      canGoBack: true,
      canGoForward: false,
    }),
  );
  assert.equal(
    commands.filter((command) => command.type === "reportReady").length,
    reports,
    "Do not accept readiness from an outgoing document during loading",
  );
  await React.act(async () =>
    creator.browser.onNavigationStateChange({
      url: pages[0],
      loading: false,
      canGoBack: true,
      canGoForward: false,
    }),
  );
  assert.ok(
    commands.filter((command) => command.type === "reportReady").length >
      reports,
    "Request readiness again once the native redirect URL is known",
  );
  assert.equal(creator.state.browser.loadedUrl, pages[0]);
  assert.equal(creator.state.browser.ready, false);
  const reportsBeforeTitle = commands.filter(
    (command) => command.type === "reportReady",
  ).length;
  await React.act(async () =>
    creator.actions.dispatch({ type: "go", step: 2 }),
  );
  assert.equal(creator.state.selection.select, false);
  assert.equal(creator.state.browser.ready, false);
  assert.ok(
    commands.filter((command) => command.type === "reportReady").length >
      reportsBeforeTitle,
    "Entering Title retries readiness when page capture preceded the handshake",
  );
  const reportsAfterTitle = commands.filter(
    (command) => command.type === "reportReady",
  ).length;
  await React.act(
    async () => new Promise((resolve) => setTimeout(resolve, 550)),
  );
  assert.ok(
    commands.filter((command) => command.type === "reportReady").length >
      reportsAfterTitle,
    "A dropped readiness reply cannot leave Title permanently disabled",
  );
  await React.act(async () =>
    creator.browser.onMessage(message("ready", "first", pages[0])),
  );
  const token = commands.findLast(
    (command) => command.type === "evaluate",
  ).requestId;
  const preview = {
    selector: "h1",
    count: 1,
    texts: ["Series A"],
    values: [],
    valid: true,
  };
  await React.act(async () =>
    creator.browser.onMessage(
      message("selection", "first", pages[0], {
        requestId: "obsolete",
        field: "seriesNameSelector",
        preview,
      }),
    ),
  );
  assert.equal(creator.state.selection.candidate, null);
  await React.act(async () =>
    creator.browser.onMessage(
      message("selection", "first", pages[0], {
        requestId: token,
        field: "seriesNameSelector",
        preview,
      }),
    ),
  );
  assert.equal(creator.state.setup.draft.seriesNameSelector, "h1");
  assert.deepEqual(creator.state.selection.candidate, preview);
  await React.act(async () =>
    creator.actions.dispatch({ type: "go", step: 3 }),
  );
  await React.act(async () => creator.browser.startSelection());
  const obsoleteSelection = commands.findLast(
    (command) => command.type === "selectMode",
  ).requestId;
  assert.equal(creator.state.selection.select, true);
  await React.act(async () =>
    creator.actions.dispatch({ type: "go", step: 2 }),
  );
  assert.equal(creator.state.selection.select, false);
  assert.equal(
    commands.findLast((command) => command.type === "selectMode").enabled,
    false,
  );
  assert.equal(creator.state.selection.candidate, null);
  const previousCheck = commands.findLast(
    (command) => command.type === "evaluate",
  );
  const checksBeforeRetry = commands.filter(
    (command) =>
      command.type === "evaluate" &&
      command.requestId === previousCheck.requestId,
  ).length;
  // The DOM may still be filling in when a completed step is revisited.
  await React.act(async () =>
    creator.browser.onMessage(
      message("selection", "first", pages[0], {
        requestId: previousCheck.requestId,
        field: "seriesNameSelector",
        preview: { ...preview, count: 0, texts: [], valid: false },
      }),
    ),
  );
  await React.act(
    async () => new Promise((resolve) => setTimeout(resolve, 550)),
  );
  assert.ok(
    commands.filter(
      (command) =>
        command.type === "evaluate" &&
        command.requestId === previousCheck.requestId,
    ).length > checksBeforeRetry,
    "Returning to a completed step retries an invalid selector evaluation",
  );
  await React.act(async () =>
    creator.browser.onMessage(
      message("selection", "first", pages[0], {
        requestId: obsoleteSelection,
        field: "episodeNumberSelector",
        preview: { ...preview, selector: "a" },
      }),
    ),
  );
  assert.equal(creator.state.selection.candidate.valid, false);
  await React.act(async () =>
    creator.browser.onMessage(
      message("selection", "first", pages[0], {
        requestId: previousCheck.requestId,
        field: "seriesNameSelector",
        preview,
      }),
    ),
  );
  assert.deepEqual(creator.state.selection.candidate, preview);
  assert.equal(creator.state.selection.select, false);
  await React.act(async () =>
    creator.actions.updateSetup({
      draft: {
        ...creator.state.setup.draft,
        episodeNumberSelector: ".episodes",
        totalEpisodesSelector: ".total",
        coverImageSelector: ".cover",
      },
    }),
  );
  const selectorFields = {
    2: "seriesNameSelector",
    3: "episodeNumberSelector",
    4: "totalEpisodesSelector",
    5: "coverImageSelector",
  };
  for (const step of [3, 4, 5, 4, 3, 2, 3, 4, 5, 2]) {
    await React.act(async () => creator.actions.dispatch({ type: "go", step }));
    const evaluation = commands.findLast(
      (command) => command.type === "evaluate",
    );
    const field = selectorFields[step];
    assert.equal(evaluation.field, field);
    assert.equal(evaluation.selector, creator.state.setup.draft[field]);
    assert.equal(creator.state.selection.candidate, null);
    await React.act(async () =>
      creator.browser.onMessage(
        message("selection", "first", pages[0], {
          requestId: evaluation.requestId,
          field,
          preview: { ...preview, selector: evaluation.selector },
        }),
      ),
    );
    assert.equal(creator.state.selection.candidate.valid, true);
    assert.equal(creator.state.browser.ready, true);
  }
  // Same-document navigation need not produce a native navigation callback.
  const currentUrl = pages[0] + "/episode/2?view=full";
  await React.act(async () =>
    creator.browser.onMessage(
      message("players", "first", currentUrl, {
        players: [],
        inaccessibleFrames: 0,
      }),
    ),
  );
  assert.equal(creator.state.browser.url, currentUrl);
  assert.equal(creator.state.browser.ready, true);
  await React.act(async () =>
    creator.browser.onLoadStart({ nativeEvent: { url: pages[1] } }),
  );
  assert.equal(creator.state.browser.loadedUrl, null);
  await React.act(async () =>
    creator.browser.onLoadEnd({ nativeEvent: { url: currentUrl } }),
  );
  assert.equal(creator.state.browser.loadedUrl, null);
  await React.act(async () =>
    creator.browser.onMessage(message("ready", "first", pages[0])),
  );
  assert.equal(creator.state.browser.ready, false);

  await React.act(async () =>
    creator.browser.onHttpError({ nativeEvent: { statusCode: 404 } }),
  );
  await React.act(async () => creator.browser.confirmUsablePage());
  assert.equal(reloads, 1);
  assert.equal(creator.state.browser.ready, false);
  await React.act(async () =>
    creator.browser.onLoadEnd({ nativeEvent: { url: pages[1] } }),
  );
  await React.act(async () =>
    creator.browser.onNavigationStateChange({
      url: pages[1],
      loading: false,
      canGoBack: true,
      canGoForward: false,
    }),
  );
  assert.equal(
    creator.state.browser.loadedUrl,
    null,
    "Failed pages cannot be captured",
  );
  assert.equal(creator.state.selection.candidate, null);
  await React.act(async () =>
    creator.browser.onMessage(
      message("players", "first", currentUrl, {
        players: [],
        inaccessibleFrames: 0,
      }),
    ),
  );
  assert.equal(creator.state.browser.url, pages[1]);
  assert.equal(creator.state.browser.ready, false);

  await React.act(async () =>
    creator.actions.dispatch({ type: "go", step: 7 }),
  );
  await React.act(
    async () => new Promise((resolve) => setTimeout(resolve, 10)),
  );
  assert.equal(creator.state.reviewPage, pages[0]);
  const nativeSetTimeout = globalThis.setTimeout;
  const nativeClearTimeout = globalThis.clearTimeout;
  const helpTimers = new Map();
  let timerTime = 0;
  globalThis.setTimeout = (callback, delay, ...args) => {
    if (delay !== 15000) return nativeSetTimeout(callback, delay, ...args);
    const timer = {};
    helpTimers.set(timer, { at: timerTime + delay, callback });
    return timer;
  };
  globalThis.clearTimeout = (timer) => {
    if (helpTimers.has(timer)) helpTimers.delete(timer);
    else nativeClearTimeout(timer);
  };
  function advanceHelpTimers(delay) {
    timerTime += delay;
    for (const [timer, entry] of helpTimers) {
      if (entry.at > timerTime) continue;
      helpTimers.delete(timer);
      entry.callback();
    }
  }
  t.after(() => {
    globalThis.setTimeout = nativeSetTimeout;
    globalThis.clearTimeout = nativeClearTimeout;
  });
  for (const [index, page] of pages.entries()) {
    const documentId = "review-" + index;
    await React.act(async () =>
      creator.browser.onLoadStart({ nativeEvent: { url: page } }),
    );
    if (index === 0) {
      await React.act(async () => advanceHelpTimers(15000));
      assert.equal(creator.browser.loadHelpVisible, true);
      assert.equal(creator.state.reviewPage, page);
      assert.equal(creator.state.setup.checks[page], undefined);
      await React.act(async () =>
        creator.actions.updateBrowser({ ready: true, loading: false }),
      );
      assert.equal(creator.browser.loadHelpVisible, false);
      await React.act(async () =>
        creator.actions.updateBrowser({ ready: false, loading: true }),
      );
      assert.equal(creator.browser.loadHelpVisible, false);
      await React.act(async () => advanceHelpTimers(14999));
      assert.equal(creator.browser.loadHelpVisible, false);
      await React.act(async () => advanceHelpTimers(1));
      assert.equal(creator.browser.loadHelpVisible, true);
      await React.act(async () => creator.browser.keepWaiting());
      assert.equal(creator.browser.loadHelpVisible, false);
      await React.act(async () => advanceHelpTimers(14999));
      assert.equal(creator.browser.loadHelpVisible, false);
      await React.act(async () => advanceHelpTimers(1));
      assert.equal(creator.browser.loadHelpVisible, true);
      await React.act(async () => creator.browser.confirmUsablePage());
      assert.equal(creator.state.browser.ready, false);
      assert.equal(creator.state.setup.checks[page], undefined);
    } else {
      await React.act(async () =>
        creator.browser.onLoadEnd({ nativeEvent: { url: page } }),
      );
    }
    await React.act(async () =>
      creator.browser.onMessage(message("ready", documentId, page)),
    );
    assert.equal(creator.state.browser.ready, true);
    assert.equal(creator.state.browser.loadedUrl, page);
    assert.equal(creator.browser.loadHelpVisible, false);
    const extraction = commands.findLast(
      (command) => command.type === "extract",
    );
    assert.equal(extraction.documentId, documentId);
    await React.act(async () =>
      creator.browser.onMessage(
        message("extraction", documentId, page, {
          requestId: extraction.requestId,
          preview: {
            title: "",
            episode: 0,
            episodeCount: 0,
            valid: false,
            errors: ["Missing title"],
          },
        }),
      ),
    );
    assert.equal(creator.state.setup.checks[page], undefined);
    assert.equal(creator.state.reviewPage, page);
    await React.act(async () =>
      creator.browser.onMessage(
        message("extraction", documentId, page, {
          requestId: extraction.requestId,
          preview: {
            title: "Series " + index,
            episode: 1,
            episodeCount: 0,
            valid: true,
            errors: [],
          },
        }),
      ),
    );
    await React.act(
      async () => new Promise((resolve) => setTimeout(resolve, 10)),
    );
    assert.equal(creator.state.setup.checks[page].valid, true);
  }
  assert.equal(creator.state.reviewPage, null);
  assert.deepEqual(Object.keys(creator.state.setup.checks), pages);
  globalThis.setTimeout = nativeSetTimeout;
  globalThis.clearTimeout = nativeClearTimeout;
});

test("Example capture uses loaded URLs while required selections and optional covers keep their validation gates", async (t) => {
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
  const load = Module._load;
  let useProviderCreator;
  let selectionStarts = 0;
  Module._load = function (request, parent, ...args) {
    if (request === "expo-router")
      return { useLocalSearchParams: () => ({}), useRouter: () => ({}) };
    if (request === "@/hooks/use-app-translation")
      return { useAppTranslation: () => (key) => key };
    if (request === "@/hooks/use-provider-palette")
      return { useProviderPalette: () => ({}) };
    if (parent?.filename.endsWith("use-provider-creator.ts")) {
      if (request === "./use-creator-browser")
        return {
          useCreatorBrowser: () => ({
            resetResumeTest: () => {},
            startSelection: () => selectionStarts++,
            send: () => {},
          }),
        };
      if (request === "./use-creator-persistence")
        return { useCreatorPersistence: () => async () => {} };
    }
    return load.call(this, request, parent, ...args);
  };
  try {
    ({
      useProviderCreator,
    } = require("../hooks/provider-creator/use-provider-creator.ts"));
  } finally {
    Module._load = load;
  }
  const root = createRoot(dom.window.document.querySelector("#root"));
  t.after(async () => {
    await React.act(async () => root.unmount());
    globalThis.window = previous.window;
    globalThis.document = previous.document;
    globalThis.IS_REACT_ACT_ENVIRONMENT = previous.act;
    dom.window.close();
  });
  let creator;
  function Harness() {
    const current = useProviderCreator();
    React.useLayoutEffect(() => {
      creator = current;
    });
    return null;
  }
  await React.act(async () => root.render(React.createElement(Harness)));
  await React.act(async () =>
    creator.actions.updateSetup({ initialized: true }),
  );
  await React.act(async () => {
    creator.actions.updateSetup({
      draft: {
        ...creator.state.setup.draft,
        name: "My website",
        origin: "https://example.com/",
      },
      pages: [],
    });
    creator.go(1);
    creator.actions.updateBrowser({ ready: false, loadedUrl: null });
  });
  assert.equal(creator.primaryAction.disabled, true);
  const examples = [
    "https://example.com/series/a/episode/1?version=full",
    "https://example.com/series/b/episode/2?version=full",
  ];
  for (const page of examples) {
    await React.act(async () =>
      creator.actions.updateBrowser({
        url: "https://example.com/previous",
        loadedUrl: page,
        ready: false,
      }),
    );
    assert.equal(creator.primaryAction.disabled, false);
    assert.equal(creator.primaryAction.label, "creator.usePage");
    await React.act(async () => creator.primaryAction.onPress());
    assert.equal(creator.state.setup.pages.at(-1), page);
  }
  assert.equal(creator.primaryAction.label, "common.continue");
  assert.equal(creator.primaryAction.disabled, false);
  await React.act(async () => {
    creator.actions.updateBrowser({
      source: "https://example.com/",
      url: examples[1],
      loadedUrl: examples[1],
      ready: true,
    });
    creator.go(0);
  });
  await React.act(async () => creator.primaryAction.onPress());
  assert.equal(creator.state.wizard.step, 1);
  assert.equal(creator.state.browser.ready, true);
  assert.equal(creator.state.browser.loadedUrl, examples[1]);
  assert.equal(creator.state.browser.url, examples[1]);
  await React.act(async () => {
    creator.go(2);
    creator.actions.updateBrowser({ ready: false });
  });
  assert.equal(creator.state.selection.select, false);
  assert.equal(creator.primaryAction.label, "creator.selectTitle");
  assert.equal(creator.primaryAction.disabled, true);
  await React.act(async () => creator.actions.updateBrowser({ ready: true }));
  assert.equal(creator.state.selection.select, false);
  assert.equal(creator.primaryAction.label, "creator.selectTitle");
  assert.equal(creator.primaryAction.disabled, false);
  for (const existing of [undefined, "#existing-cover"]) {
    for (const candidate of [null, { selector: "#invalid", valid: false }]) {
      await React.act(async () => {
        creator.actions.updateSetup({
          draft: { ...creator.state.setup.draft, coverImageSelector: existing },
        });
        creator.go(5);
      });
      await React.act(async () => {
        if (candidate)
          creator.actions.dispatch({
            type: "selectionReceived",
            field: "coverImageSelector",
            preview: candidate,
          });
        else creator.actions.updateSelection({ candidate });
        creator.actions.updateBrowser({ ready: false });
      });
      assert.equal(creator.canContinue, true);
      assert.equal(creator.primaryAction.label, "creator.selectCover");
      assert.equal(creator.primaryAction.disabled, true);
      await React.act(async () =>
        creator.actions.updateBrowser({ ready: true }),
      );
      assert.equal(creator.primaryAction.disabled, false);
      const previousStarts = selectionStarts;
      await React.act(async () => creator.primaryAction.onPress());
      assert.equal(selectionStarts, previousStarts + 1);
      assert.equal(creator.state.wizard.step, 5);
      await React.act(async () =>
        creator.actions.updateSelection({ select: true }),
      );
      assert.equal(creator.primaryAction.label, "creator.tapCover");
      assert.equal(creator.primaryAction.disabled, true);
      await React.act(async () => creator.go(6));
      assert.equal(creator.state.wizard.step, 6);
      assert.equal(creator.state.setup.draft.coverImageSelector, existing);
    }
  }
  await React.act(async () => creator.go(5));
  await React.act(async () => {
    creator.actions.updateSelection({
      candidate: { selector: "#new-cover", valid: true },
    });
    creator.actions.updateBrowser({ ready: true });
  });
  assert.equal(creator.primaryAction.label, "common.continue");
  assert.equal(creator.primaryAction.disabled, false);
  await React.act(async () => creator.primaryAction.onPress());
  assert.equal(creator.state.setup.draft.coverImageSelector, "#new-cover");
  await React.act(async () => creator.go(5));
  await React.act(async () => creator.actions.updateSetup({ saving: true }));
  assert.equal(creator.primaryAction.disabled, true);
  await React.act(async () => creator.actions.updateSetup({ saving: false }));
  await React.act(async () => creator.skipCover());
  assert.equal(creator.state.setup.draft.coverImageSelector, undefined);
  for (const step of [2, 3, 4]) {
    await React.act(async () => creator.go(step));
    assert.equal(creator.canContinue, false);
    assert.notEqual(creator.primaryAction.label, "common.continue");
    await React.act(async () =>
      creator.actions.updateSelection({
        candidate: { selector: "#required", valid: true },
      }),
    );
    assert.equal(creator.primaryAction.label, "common.continue");
    assert.equal(creator.primaryAction.disabled, false);
  }
});
