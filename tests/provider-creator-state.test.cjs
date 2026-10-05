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

test("creator hooks keep document guards and automatic Review working across commits", async (t) => {
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
  const webView = {
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
    creator.actions.dispatch({ type: "go", step: 2 });
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
          ...payload,
        }),
      },
    };
  }
  await React.act(async () =>
    creator.browser.onLoadStart({ nativeEvent: { url: pages[0] } }),
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
    creator.browser.onLoadStart({ nativeEvent: { url: pages[1] } }),
  );
  await React.act(async () =>
    creator.browser.onMessage(message("ready", "first", pages[0])),
  );
  assert.equal(creator.state.browser.ready, false);
  assert.equal(creator.state.selection.candidate, null);

  await React.act(async () =>
    creator.actions.dispatch({ type: "go", step: 7 }),
  );
  await React.act(
    async () => new Promise((resolve) => setTimeout(resolve, 10)),
  );
  assert.equal(creator.state.reviewPage, pages[0]);
  for (const [index, page] of pages.entries()) {
    const documentId = "review-" + index;
    await React.act(async () =>
      creator.browser.onLoadStart({ nativeEvent: { url: page } }),
    );
    await React.act(async () =>
      creator.browser.onMessage(message("ready", documentId, page)),
    );
    const extraction = commands.findLast(
      (command) => command.type === "extract",
    );
    assert.equal(extraction.documentId, documentId);
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
});
