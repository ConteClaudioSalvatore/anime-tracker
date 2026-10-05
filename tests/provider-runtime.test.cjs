const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");
const { JSDOM } = require("jsdom");

// Run the production TypeScript modules directly, without a second test implementation.
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
const { formatMessage } = require("../utils/i18n.ts");
const helpers = require("../utils/provider-runtime.ts");
const bridge = require("../model/provider-runtime.model.ts");
const { WriteQueue } = require("../utils/write-queue.ts");
const { ProviderPageChecks } = require("../utils/provider-page-checks.ts");
const { reducer } = require("../store/app.state.ts");
const actions = require("../store/app.actions.ts");
const {
  sortWatchList,
  watchListSummary,
  watchListProgress,
} = require("../utils/watch-list.ts");
const { isAnimeFinished } = require("../utils/is-anime-finieshed.util.ts");
const { ProviderNavigationGuard } = require("../utils/provider-navigation.ts");
const script = fs.readFileSync(
  path.join(root, "assets/js/provider-runtime_t.cjs"),
  "utf8",
);
const fixture = fs.readFileSync(
  path.join(__dirname, "fixtures/series.html"),
  "utf8",
);
const provider = {
  id: 4,
  name: "User website",
  origin: "https://example.com/",
  whiteListedOrigins: [],
  isDefault: false,
  seriesPageOrigin: "https://example.com/series/",
  seriesNameSelector: "#series\\:title",
  episodeNumberSelector: "#episode-list > li > a",
  totalEpisodesSelector: "#episode-total",
  isPlayerSupported: true,
};
function setup(
  html = fixture,
  mode = "setup",
  config = provider,
  progress = {},
) {
  const dom = new JSDOM(html, {
    url: "https://example.com/series/example/1",
    runScripts: "outside-only",
  });
  const win = dom.window,
    messages = [];
  win.__providerSession = "session";
  win.__providerConfig = config;
  win.__runtimeMode = mode;
  win.__providerProgress = progress;
  win.ReactNativeWebView = {
    postMessage: (raw) => messages.push(JSON.parse(raw)),
  };
  win.setInterval = () => 1;
  win.clearInterval = () => {};
  win.eval(script);
  win.document.dispatchEvent(new win.Event("DOMContentLoaded"));
  return { win, dom, messages, runtime: win.ProviderRuntime };
}
function videoState(win, video = win.document.querySelector("video")) {
  const state = { time: 0, duration: 120, paused: false, seekable: true };
  Object.defineProperties(video, {
    currentTime: {
      configurable: true,
      get: () => state.time,
      set: (value) => {
        state.time = value;
        video.dispatchEvent(new win.Event("seeked"));
      },
    },
    duration: { configurable: true, get: () => state.duration },
    paused: { configurable: true, get: () => state.paused },
    seeking: { configurable: true, get: () => false },
    seekable: {
      configurable: true,
      get: () => ({ length: state.seekable ? 1 : 0 }),
    },
  });
  return state;
}

// Deliver window messages with their real frame source, while keeping DOM access blocked.
function frameHarness(main, t) {
  const queue = [],
    frames = [];
  let sender = null;
  let clock = 1700000000000;
  function run(win, callback) {
    const previous = sender;
    sender = win;
    try {
      return callback();
    } finally {
      sender = previous;
    }
  }
  function endpoint(win) {
    win.Date.now = () => clock;
    win.postMessage = (data) =>
      queue.push({ target: win, source: sender, data });
  }
  endpoint(main.win);
  function flush() {
    let count = 0;
    while (queue.length) {
      assert.ok(++count < 500, "frame messages must not loop");
      const { target, source, data } = queue.shift();
      run(target, () =>
        target.dispatchEvent(
          new target.MessageEvent("message", { source, data }),
        ),
      );
    }
  }
  function add(parent, selector, html = '<video id="primary-player"></video>') {
    const element = parent.document.querySelector(selector);
    const win = element.contentWindow;
    win.document.body.innerHTML = html;
    win.__providerSession = "session";
    win.__providerConfig = provider;
    win.__runtimeMode = "watch";
    win.setInterval = () => 1;
    win.clearInterval = () => {};
    win.ReactNativeWebView = {
      postMessage: () =>
        assert.fail("a child frame must never send native series messages"),
    };
    endpoint(win);
    run(win, () => {
      win.eval(script);
      win.document.dispatchEvent(new win.Event("DOMContentLoaded"));
    });
    // Simulate the same-origin policy without depending on a live website.
    Object.defineProperty(element, "contentDocument", {
      configurable: true,
      get() {
        throw new Error("cross origin");
      },
    });
    frames.push(win);
    return { win, element, runtime: win.ProviderRuntime };
  }
  function pump() {
    clock += 500;
    for (const win of [...frames].reverse())
      run(win, () => win.ProviderRuntime.tick());
    flush();
    run(main.win, () => main.runtime.tick());
  }
  function send(command) {
    const documentId = main.messages
      .filter((message) => message.type === "ready")
      .at(-1).documentId;
    run(main.win, () =>
      main.win.eval(bridge.runtimeCommand({ ...command, documentId })),
    );
  }
  t.after(() => {
    for (const win of [...frames].reverse()) win.close();
    main.dom.window.close();
  });
  return {
    add,
    pump,
    flush,
    run,
    send,
    queue,
    advance: (time) => {
      clock += time;
    },
  };
}

test("cross-origin placeholder players relay progress and resume without reading their DOM", (t) => {
  const locator = { selector: "#primary-player", framePath: ["#player-frame"] };
  const main = setup(
    fixture.replace(
      '<video id="primary-player" controls></video>',
      '<iframe id="player-frame"></iframe><video id="ad"></video>',
    ),
    "watch",
    { ...provider, player: locator },
  );
  const bus = frameHarness(main, t);
  const child = bus.add(
    main.win,
    "#player-frame",
    '<button id="placeholder">Play</button>',
  );
  const ad = videoState(main.win, main.win.document.querySelector("#ad"));
  ad.time = 10;
  bus.pump();
  bus.pump();
  assert.equal(
    main.messages.some((message) => message.type === "anime-found"),
    false,
  );
  child.win.document
    .querySelector("#placeholder")
    .addEventListener("click", () => {
      child.win.document.body.insertAdjacentHTML(
        "beforeend",
        '<video id="primary-player"></video>',
      );
    });
  child.win.document.querySelector("#placeholder").click();
  const state = videoState(child.win);
  state.paused = true;
  bus.pump();
  let report = main.messages
    .filter((message) => message.type === "players")
    .at(-1);
  const primary = () =>
    report.players.find((item) => item.locator.selector === "#primary-player");
  assert.equal(report.inaccessibleFrames, 0);
  assert.deepEqual(JSON.parse(JSON.stringify(primary().locator)), locator);
  assert.equal(primary().progress, false);
  assert.equal(primary().playing, false);
  state.paused = false;
  state.time = 2;
  bus.pump();
  bus.pump();
  const played = main.messages
    .filter((message) => message.type === "anime-found")
    .at(-1);
  assert.equal(played.payload.animeTitle, "Example Series");
  assert.equal(played.payload.episode, 1);
  assert.equal(played.payload.providerId, provider.id);
  assert.equal(played.payload.url, main.win.location.href);
  assert.ok(played.payload.lastPlayedAt > 0);
  bus.send({ type: "testSeek", locator });
  bus.flush();
  bus.pump();
  report = main.messages.filter((message) => message.type === "players").at(-1);
  assert.equal(primary().resume, true);
  assert.equal(state.time, 2);
  bus.send({
    type: "resume",
    resume: { title: "Example Series", episode: 1, progress: 42 },
  });
  bus.pump();
  const beforeSeek = main.messages.filter(
    (message) => message.type === "anime-found",
  ).length;
  bus.advance(1500);
  main.runtime.tick();
  assert.equal(
    main.messages.filter((message) => message.type === "anime-found").length,
    beforeSeek,
  );
  bus.flush();
  bus.pump();
  assert.equal(state.time, 42);
  assert.equal(ad.time, 10);
  state.paused = true;
  bus.pump();
  bus.pump();
  assert.equal(
    main.messages.filter((message) => message.type === "anime-found").at(-1)
      .payload.lastPlayedAt,
    played.payload.lastPlayedAt,
  );
});

test("nested cross-origin frames preserve selector paths and route only player commands", (t) => {
  const main = setup('<iframe id="outer"></iframe>');
  const bus = frameHarness(main, t);
  const outer = bus.add(
    main.win,
    "#outer",
    '<iframe id="inner"></iframe><video id="ad"></video>',
  );
  const inner = bus.add(outer.win, "#inner");
  inner.runtime.command({ type: "reportReady" });
  const state = videoState(inner.win);
  videoState(outer.win, outer.win.document.querySelector("#ad"));
  bus.pump();
  bus.pump();
  bus.pump();
  state.time = 4;
  bus.pump();
  bus.pump();
  const report = main.messages
    .filter((message) => message.type === "players")
    .at(-1);
  assert.equal(report.players.length, 2);
  const selected = report.players.find(
    (item) => item.locator.selector === "#primary-player",
  );
  assert.deepEqual(Array.from(selected.locator.framePath), [
    "#outer",
    "#inner",
  ]);
  assert.equal(selected.progress, true);
  bus.send({ type: "choosePlayer", locator: selected.locator });
  bus.flush();
  assert.match(inner.win.document.querySelector("video").style.outline, /3px/);
  assert.equal(outer.win.document.querySelector("video").style.outline, "");
  bus.send({ type: "testSeek", locator: selected.locator });
  bus.flush();
  bus.pump();
  bus.pump();
  assert.equal(state.time, 4);
  assert.equal(
    main.messages
      .at(-1)
      .players.find((item) => item.locator.selector === "#primary-player")
      .resume,
    true,
  );
  bus.send({ type: "resetPlayerTest" });
  bus.flush();
  bus.pump();
  bus.pump();
  assert.equal(
    main.messages
      .at(-1)
      .players.every((item) => !item.progress && !item.resume),
    true,
  );
});

test("frame samples reject wrong sessions, unknown windows, malformed data and retired bindings", (t) => {
  const main = setup('<iframe id="player-frame"></iframe>');
  const bus = frameHarness(main, t);
  const child = bus.add(main.win, "#player-frame");
  videoState(child.win);
  bus.pump();
  bus.pump();
  bus.run(child.win, () => child.runtime.tick());
  const sample = bus.queue.find((item) => item.data.type === "sample").data;
  bus.flush();
  const send = (data, source = child.win) =>
    main.win.dispatchEvent(
      new main.win.MessageEvent("message", { data, source }),
    );
  const count = () => main.runtime.gatherPlayers().players.length;
  assert.equal(count(), 1);
  child.element.dispatchEvent(new main.win.Event("load"));
  assert.equal(count(), 0);
  send(sample);
  assert.equal(count(), 0);
  bus.pump();
  bus.pump();
  const empty = { ...sample, players: [] };
  send(empty); // The old token must not clear a newly registered player.
  send({ ...empty, sessionId: "another-session" });
  send(empty, main.win);
  send({ ...sample, players: [{ locator: null }] });
  assert.equal(count(), 1);
  bus.advance(2500);
  assert.equal(count(), 0);
  bus.pump();
  assert.equal(count(), 1);
  child.element.remove();
  main.runtime.tick();
  assert.equal(count(), 0);
});

test("same-origin frame injection does not duplicate discovery and reinjection keeps one relay", (t) => {
  const main = setup('<iframe id="player-frame"></iframe>');
  const bus = frameHarness(main, t);
  const child = bus.add(main.win, "#player-frame");
  delete child.element.contentDocument;
  const state = videoState(child.win);
  bus.pump();
  bus.pump();
  bus.run(child.win, () => child.win.eval(script));
  state.time = 3;
  bus.pump();
  assert.equal(main.messages.at(-1).players.length, 1);
  assert.equal(main.messages.at(-1).players[0].progress, true);
  assert.equal(main.messages.at(-1).inaccessibleFrames, 0);
});

test("cross-origin resume waits for placeholder activation, metadata and a seekable player", (t) => {
  const main = setup(
    fixture.replace(
      '<video id="primary-player" controls></video>',
      '<iframe id="player-frame"></iframe>',
    ),
    "watch",
    {
      ...provider,
      player: { selector: "#primary-player", framePath: ["#player-frame"] },
    },
  );
  const bus = frameHarness(main, t);
  main.runtime.command({
    type: "resume",
    resume: { title: "Example Series", episode: 1, progress: 42 },
  });
  const child = bus.add(main.win, "#player-frame", "<button>Play</button>");
  bus.pump();
  bus.pump();
  child.win.document.body.insertAdjacentHTML(
    "beforeend",
    '<video id="primary-player"></video>',
  );
  const state = videoState(child.win);
  state.duration = 0;
  state.seekable = false;
  state.paused = true;
  bus.pump();
  bus.flush();
  assert.equal(state.time, 0);
  state.duration = 120;
  bus.pump();
  bus.flush();
  assert.equal(state.time, 0);
  state.seekable = true;
  bus.pump();
  bus.flush();
  assert.equal(state.time, 42);
});

test("episode changes discard queued iframe samples and do not inherit a paused playback date", (t) => {
  const main = setup(
    fixture.replace(
      '<video id="primary-player" controls></video>',
      '<iframe id="player-frame"></iframe>',
    ),
    "watch",
    {
      ...provider,
      player: { selector: "#primary-player", framePath: ["#player-frame"] },
    },
  );
  const bus = frameHarness(main, t);
  const child = bus.add(main.win, "#player-frame");
  const state = videoState(child.win);
  bus.pump();
  bus.pump();
  state.time = 5;
  bus.pump();
  bus.pump();
  assert.ok(
    main.messages.filter((item) => item.type === "anime-found").at(-1).payload
      .lastPlayedAt > 0,
  );
  state.paused = true;
  bus.run(child.win, () => child.runtime.tick()); // Queued under the old binding.
  const link = main.win.document.querySelectorAll("#episode-list a")[1];
  link.addEventListener("click", (event) => {
    event.preventDefault();
    main.win.document
      .querySelector("#episode-list .active")
      .classList.remove("active");
    link.classList.add("active");
  });
  bus.run(main.win, () => link.click());
  bus.flush();
  assert.equal(main.runtime.gatherPlayers().players.length, 0);
  bus.pump();
  bus.pump();
  bus.pump();
  let payload = main.messages
    .filter((item) => item.type === "anime-found")
    .at(-1).payload;
  assert.equal(payload.episode, 2);
  assert.equal(payload.lastPlayedAt, undefined);
  state.paused = false;
  state.time = 6;
  bus.pump();
  bus.pump();
  payload = main.messages
    .filter((item) => item.type === "anime-found")
    .at(-1).payload;
  assert.equal(payload.episode, 2);
  assert.ok(payload.lastPlayedAt > 0);
});

test("browser-history restoration retires the old parent binding before accepting frame samples", (t) => {
  const main = setup('<iframe id="player-frame"></iframe>');
  const bus = frameHarness(main, t);
  const child = bus.add(main.win, "#player-frame");
  videoState(child.win);
  bus.pump();
  bus.pump();
  const previous = main.messages.find(
    (message) => message.type === "ready",
  ).documentId;
  bus.run(child.win, () => child.runtime.tick());
  bus.run(main.win, () => {
    main.win.dispatchEvent(new main.win.Event("pagehide"));
    main.win.dispatchEvent(
      new main.win.PageTransitionEvent("pageshow", { persisted: true }),
    );
  });
  assert.notEqual(
    main.messages.filter((message) => message.type === "ready").at(-1)
      .documentId,
    previous,
  );
  bus.flush();
  assert.equal(main.runtime.gatherPlayers().players.length, 0);
  bus.pump();
  assert.equal(main.runtime.gatherPlayers().players.length, 1);
});

test("native capability reports are optional, typed, and do not count as playback verification", () => {
  const message = {
    channel: "provider-runtime",
    sessionId: "session",
    documentId: "doc",
    url: provider.origin,
    type: "players",
    players: [],
    inaccessibleFrames: 1,
    frameTrackingAvailable: false,
  };
  assert.equal(
    bridge.parseRuntimeMessage(JSON.stringify(message), "session")
      .frameTrackingAvailable,
    false,
  );
  assert.equal(
    bridge.parseRuntimeMessage(
      JSON.stringify({ ...message, frameTrackingAvailable: "false" }),
      "session",
    ),
    null,
  );
  assert.equal(
    bridge.parseRuntimeMessage(
      JSON.stringify({ ...message, frameTrackingAvailable: undefined }),
      "session",
    ).type,
    "players",
  );
});

test("player reports expose optional seekability while preserving older sample compatibility", () => {
  const player = {
    locator: { selector: "video", framePath: [] },
    time: 2,
    duration: 120,
    progress: true,
    resume: false,
    playing: true,
  };
  const parse = (seekable) =>
    bridge.parseRuntimeMessage(
      JSON.stringify({
        channel: "provider-runtime",
        sessionId: "session",
        documentId: "doc",
        url: provider.origin,
        type: "players",
        inaccessibleFrames: 0,
        players: [{ ...player, seekable }],
      }),
      "session",
    );
  assert.equal(parse(true).players[0].seekable, true);
  assert.equal(parse(false).players[0].seekable, false);
  assert.equal(parse(undefined).players[0].seekable, undefined);
  assert.equal(parse("false"), null);
});

test("URLs normalize safely and approved origins use exact equality", () => {
  assert.equal(
    helpers.normalizeWebsite(" example.com/home "),
    "https://example.com/home",
  );
  assert.throws(() => helpers.normalizeWebsite("javascript:alert(1)"));
  assert.equal(
    helpers.allowedUrl(provider, "https://example.com.evil.test/"),
    false,
  );
  assert.equal(
    helpers.allowedUrl(
      { ...provider, whiteListedOrigins: ["https://mirror.example.com"] },
      "https://mirror.example.com/series",
    ),
    true,
  );
  assert.equal(helpers.providerForUrl([], "https://example.com/"), undefined);
});
test("navigation hook retains pending approvals across commits and uses current callbacks", async (t) => {
  const React = require("react");
  const { createRoot } = require("react-dom/client");
  const dom = new JSDOM('<div id="root"></div>');
  const previousWindow = globalThis.window,
    previousDocument = globalThis.document;
  const previousAct = globalThis.IS_REACT_ACT_ENVIRONMENT;
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const alerts = [],
    log = [];
  const load = Module._load;
  let useProviderNavigation;
  Module._load = function (request, parent, ...args) {
    if (request === "react-native")
      return { Alert: { alert: (...args) => alerts.push(args) } };
    if (request === "expo-router")
      return {
        useFocusEffect: (callback) => React.useEffect(callback, [callback]),
      };
    return load.call(this, request, parent, ...args);
  };
  try {
    ({
      useProviderNavigation,
    } = require("../hooks/use-provider-navigation.ts"));
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
  let handle;
  function Harness({ options }) {
    const callback = useProviderNavigation(options);
    React.useLayoutEffect(() => {
      handle = callback;
    }, [callback]);
    return null;
  }
  const options = {
    provider,
    pageKey: () => "page",
    approve: async () => log.push("old approval"),
    navigate: () => log.push("old navigation"),
    onError: (message) => assert.fail(message),
  };
  await React.act(async () =>
    root.render(
      React.createElement(
        React.StrictMode,
        null,
        React.createElement(Harness, { options }),
      ),
    ),
  );
  const firstHandle = handle;
  const request = { url: "https://other.example/series" };
  assert.equal(handle({ url: provider.origin }), true);
  assert.equal(handle(request), false);
  assert.equal(alerts.length, 1);
  const updated = {
    ...options,
    approve: async () => log.push("new approval"),
    navigate: (url) => log.push(url),
  };
  await React.act(async () =>
    root.render(
      React.createElement(
        React.StrictMode,
        null,
        React.createElement(Harness, { options: updated }),
      ),
    ),
  );
  assert.equal(handle, firstHandle);
  assert.equal(handle(request), false);
  assert.equal(alerts.length, 1);
  await React.act(async () => alerts[0][2][1].onPress());
  assert.deepEqual(log, ["new approval", request.url]);
  assert.equal(handle({ url: "https://another.example/" }), false);
  assert.equal(alerts.length, 2);
  await React.act(async () => root.unmount());
  await React.act(async () => alerts[1][2][1].onPress());
  assert.deepEqual(log, ["new approval", request.url]);
});
test("saved series select their recorded website even when another provider shares its alias", () => {
  const other = {
    ...provider,
    id: 9,
    origin: "https://other.example/",
    whiteListedOrigins: [provider.origin],
  };
  const state = reducer(
    { anime: {}, providers: [other, provider] },
    actions.animeUpdated(provider.origin, {
      animeTitle: "Series",
      episode: 3,
      providerId: provider.id,
      url: "https://example.com/series/three",
      lastPlayedAt: 1700000000000,
    }),
  );
  const entry = state.anime.Series;
  assert.equal(entry.latestVisitedUrl, "https://example.com/series/three");
  assert.equal(
    helpers.providerForUrl(
      state.providers,
      entry.latestVisitedUrl,
      entry.providerId,
    ).id,
    provider.id,
  );
  assert.equal(
    helpers.providerForUrl([provider], entry.latestVisitedUrl).id,
    provider.id,
  );
  assert.equal(
    helpers.providerForUrl(
      [{ ...other, whiteListedOrigins: [] }],
      entry.latestVisitedUrl,
      entry.providerId,
    ),
    undefined,
  );
});
test("recent sorting handles legacy dates and ties, retains name sorting, and leaves history untouched", () => {
  const entries = [
    ["Zulu", { lastPlayedAt: 2000 }],
    ["Beta", {}],
    ["Alpha", { lastPlayedAt: 2000 }],
    ["Recent", { lastPlayedAt: 3000 }],
    ["Invalid", { lastPlayedAt: NaN }],
  ];
  const original = entries.map(([name]) => name);
  assert.deepEqual(
    sortWatchList(entries, "recent").map(([name]) => name),
    ["Recent", "Alpha", "Zulu", "Beta", "Invalid"],
  );
  assert.deepEqual(
    sortWatchList(entries, "name-asc").map(([name]) => name),
    ["Alpha", "Beta", "Invalid", "Recent", "Zulu"],
  );
  assert.deepEqual(
    sortWatchList(entries, "name-desc").map(([name]) => name),
    ["Zulu", "Recent", "Invalid", "Beta", "Alpha"],
  );
  assert.deepEqual(
    entries.map(([name]) => name),
    original,
  );
});
test("watch list summaries include only names and overall progress, including manual and legacy entries", () => {
  const history = {
    Ongoing: {
      name: "Ongoing",
      highestWatchedEpisode: 3,
      total: 12,
      providerId: 4,
      latestVisitedUrl: "https://example.com/private",
      lastPlayedAt: 1700000000000,
      episodeProgress: { 3: { progress: 30, total: 120 } },
    },
    Manual: { highestWatchedEpisode: 2, finished: true },
    Completed: {
      highestWatchedEpisode: 12,
      total: 12,
      episodeProgress: { 12: { progress: 115, total: 120 } },
    },
  };
  assert.deepEqual(watchListSummary(history), [
    {
      name: "Completed",
      highestWatchedEpisode: 12,
      totalEpisodes: 12,
      finished: true,
    },
    {
      name: "Manual",
      highestWatchedEpisode: 2,
      totalEpisodes: null,
      finished: true,
    },
    {
      name: "Ongoing",
      highestWatchedEpisode: 3,
      totalEpisodes: 12,
      finished: false,
    },
  ]);
  assert.deepEqual(watchListSummary({}), []);
});
test("page matching keeps complete path segments and supports query-based series", () => {
  const rule = helpers.learnPageRule(
    ["https://example.com/series/abc", "https://example.com/series/abd"],
    provider.origin,
  );
  assert.equal(rule.pathPrefix, "/series/");
  assert.equal(
    helpers.matchesSeries(
      { ...provider, pageRule: rule },
      "https://example.com/series/xyz",
    ),
    true,
  );
  assert.equal(
    helpers.matchesSeries(
      { ...provider, pageRule: rule },
      "https://example.com/series-evil/xyz",
    ),
    false,
  );
  assert.throws(() =>
    helpers.learnPageRule(
      ["https://example.com/a#one", "https://example.com/a#two"],
      provider.origin,
    ),
  );
  assert.throws(() =>
    helpers.learnPageRule(
      ["https://example.com/a", "https://other.com/b"],
      provider.origin,
    ),
  );
  const query = helpers.learnPageRule(
    ["https://example.com/watch?id=a", "https://example.com/watch?id=b"],
    provider.origin,
  );
  assert.deepEqual(query.queryKeys, ["id"]);
  assert.equal(
    helpers.matchesSeries(
      { ...provider, pageRule: query },
      "https://example.com/watch",
    ),
    false,
  );
});
test("pop-ups are blocked separately from unrelated navigation, including Android events without frame metadata", () => {
  const ad = "https://advert.example/";
  assert.equal(
    helpers.providerNavigation(provider, {
      url: ad,
      isTopFrame: true,
      hasTargetFrame: false,
    }),
    "popup",
  );
  assert.equal(
    helpers.providerNavigation(provider, {
      url: provider.origin,
      hasTargetFrame: false,
    }),
    "popup",
  );
  assert.equal(
    helpers.providerNavigation(provider, {
      url: ad,
      isTopFrame: false,
      hasTargetFrame: true,
    }),
    "allow",
  );
  assert.equal(
    helpers.providerNavigation(provider, {
      url: ad,
      isTopFrame: true,
      hasTargetFrame: true,
    }),
    "blocked",
  );
  assert.equal(helpers.providerNavigation(provider, { url: ad }), "blocked");
  assert.equal(
    helpers.providerNavigation(provider, { url: provider.origin }),
    "allow",
  );
});
test("approved addresses are exact HTTP origins, without paths, duplicates, or provider changes", () => {
  const approved = helpers.approveProviderOrigin(
    provider,
    "https://mirror.example.com/watch?id=one#player",
  );
  assert.deepEqual(approved.whiteListedOrigins, ["https://mirror.example.com"]);
  assert.equal(approved.id, provider.id);
  assert.equal(
    helpers.allowedUrl(approved, "https://mirror.example.com/other"),
    true,
  );
  assert.equal(
    helpers.allowedUrl(approved, "https://mirror.example.com.evil.test/"),
    false,
  );
  assert.equal(
    helpers.approveProviderOrigin(approved, "https://mirror.example.com/other"),
    approved,
  );
  assert.equal(
    helpers.approveProviderOrigin(approved, provider.origin),
    approved,
  );
  assert.deepEqual(provider.whiteListedOrigins, []);
  for (const url of [
    "javascript:alert(1)",
    "file:///tmp/test",
    "not a url",
    "https://user:password@example.com/",
  ]) {
    assert.equal(helpers.websiteOrigin(url), null);
    assert.throws(() => helpers.approveProviderOrigin(provider, url), /HTTP/);
  }
});
test("navigation waits for one approval and a successful save before replaying the original URL", async () => {
  let context = { provider, pageKey: "page" },
    accept;
  const log = [],
    destination = "https://mirror.example.com/series/one?episode=2";
  const guard = new ProviderNavigationGuard({
    current: () => context,
    confirm: (item, origin) => {
      log.push(["prompt", item.id, origin]);
      return new Promise((resolve) => {
        accept = resolve;
      });
    },
    approve: async (item, origin) => {
      log.push(["save", item.id, origin]);
      context = {
        ...context,
        provider: helpers.approveProviderOrigin(context.provider, origin),
      };
    },
    navigate: (url) => log.push(["navigate", url]),
    onError: (message) => assert.fail(message),
  });
  const request = { url: destination, isTopFrame: true, hasTargetFrame: true };
  assert.equal(guard.handle(request), false);
  assert.equal(guard.handle(request), false);
  assert.deepEqual(log, [
    ["prompt", provider.id, "https://mirror.example.com"],
  ]);
  accept(true);
  await guard.pending;
  assert.deepEqual(log, [
    ["prompt", provider.id, "https://mirror.example.com"],
    ["save", provider.id, "https://mirror.example.com"],
    ["navigate", destination],
  ]);
  assert.equal(guard.handle(request), true);
  assert.equal(log.length, 3);
});
test("cancel keeps the page blocked and a later navigation can ask again", async () => {
  let context = { provider, pageKey: "first" },
    prompts = 0;
  const guard = new ProviderNavigationGuard({
    current: () => context,
    confirm: async () => {
      prompts++;
      return false;
    },
    approve: async () => assert.fail("Canceled navigation must not save"),
    navigate: () => assert.fail("Canceled navigation must not navigate"),
    onError: (message) => assert.fail(message),
  });
  const request = { url: "https://other.example/one" };
  assert.equal(guard.handle(request), false);
  await guard.pending;
  assert.equal(
    guard.handle({ ...request, url: "https://other.example/two" }),
    false,
  );
  await guard.pending;
  assert.equal(prompts, 2);
  context = { ...context, pageKey: "second" };
  assert.equal(guard.handle(request), false);
  await guard.pending;
  assert.equal(prompts, 3);
  assert.equal(guard.handle({ ...request, hasTargetFrame: false }), false);
  assert.equal(guard.handle({ ...request, isTopFrame: false }), true);
  assert.equal(guard.handle({ url: provider.origin }), true);
  assert.equal(prompts, 3);
});
test("failed approvals leave navigation blocked and permit retry", async () => {
  let fail = true,
    attempts = 0;
  const navigated = [],
    errors = [];
  const guard = new ProviderNavigationGuard({
    current: () => ({ provider, pageKey: "page" }),
    confirm: async () => {
      attempts++;
      return true;
    },
    approve: async () => {
      if (fail) throw new Error("write failed");
    },
    navigate: (url) => navigated.push(url),
    onError: (message) => errors.push(message),
  });
  const request = { url: "https://other.example/one" };
  guard.handle(request);
  await guard.pending;
  assert.equal(navigated.length, 0);
  assert.match(formatMessage(errors[0]), /stayed blocked/);
  fail = false;
  guard.handle(request);
  await guard.pending;
  assert.equal(attempts, 2);
  assert.deepEqual(navigated, [request.url]);
  guard.handle({ url: "javascript:alert(1)" });
  assert.equal(attempts, 2);
  assert.match(formatMessage(errors[1]), /HTTP or HTTPS/);
});
test("pending prompts do not save or navigate after a page or provider change", async () => {
  for (const change of ["page", "provider", "unmount"]) {
    let context = { provider, pageKey: "first" },
      accept;
    const guard = new ProviderNavigationGuard({
      current: () => context,
      confirm: () =>
        new Promise((resolve) => {
          accept = resolve;
        }),
      approve: async () => assert.fail("Stale approval must not save"),
      navigate: () => assert.fail("Stale approval must not navigate"),
      onError: (message) => assert.fail(message),
    });
    guard.handle({ url: "https://other.example/" });
    context =
      change === "unmount"
        ? null
        : change === "provider"
          ? { ...context, provider: { ...provider, id: 99 } }
          : { ...context, pageKey: "second" };
    accept(true);
    await guard.pending;
  }
});
test("approval already saving may finish but cannot navigate a replacement page", async () => {
  let context = { provider, pageKey: "first" },
    finish;
  const guard = new ProviderNavigationGuard({
    current: () => context,
    confirm: async () => true,
    approve: () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
    navigate: () => assert.fail("Replaced page must not navigate"),
    onError: (message) => assert.fail(message),
  });
  guard.handle({ url: "https://other.example/" });
  await Promise.resolve();
  context = { ...context, pageKey: "second" };
  finish();
  await guard.pending;
});
test("review page checks survive selection commands and canonical redirects, then permit saving", (t) => {
  const checks = new ProviderPageChecks(),
    results = {};
  const pages = [
    "https://example.com/series/first",
    "https://example.com/series/second",
  ];
  for (const page of pages) {
    const { dom, win, runtime, messages } = setup();
    t.after(() => dom.window.close());
    checks.start(page);
    const session = new bridge.RuntimeSession();
    session.begin(page);
    // Native navigation follows a canonical redirect before the ready message.
    session.redirected(win.location.href);
    const ready = messages.find((message) => message.type === "ready");
    assert.equal(session.accept(ready), true);
    const command = checks.command(ready.documentId);
    runtime.command({
      type: "selectMode",
      enabled: false,
      requestId: "selection-token",
    });
    win.eval(bridge.runtimeCommand(command));
    const message = bridge.parseRuntimeMessage(
      JSON.stringify(messages.at(-1)),
      "session",
    );
    assert.equal(session.accept(message), true);
    const result = checks.accept(message);
    assert.equal(result.page, page);
    assert.equal(result.preview.valid, true);
    results[result.page] = result.preview;
  }
  const draft = { ...provider, verification: { progress: true, resume: true } };
  assert.equal(helpers.providerSaveError(draft, pages, results, false), null);
  assert.equal(
    helpers.providerSaveError(
      { ...draft, verification: { progress: true, resume: false } },
      pages,
      results,
      false,
    ),
    null,
  );
  assert.match(
    helpers.providerSaveError(
      { ...draft, verification: { progress: false, resume: true } },
      pages,
      results,
      false,
    ),
    /Playback tracking/,
  );
  assert.match(
    helpers.providerSaveError(
      draft,
      pages,
      { [pages[0]]: results[pages[0]] },
      false,
    ),
    /Example 2/,
  );
  assert.match(
    helpers.providerSaveError(
      { ...draft, verification: { progress: false, resume: false } },
      pages,
      results,
      false,
    ),
    /Playback tracking/,
  );
  assert.equal(
    helpers.providerSaveError(
      { ...draft, verification: { progress: false, resume: false } },
      pages,
      results,
      true,
    ),
    null,
  );
});
test("review retries delayed series content and reports invalid extraction instead of leaving Save silently disabled", (t) => {
  const { dom, win, runtime, messages } = setup();
  t.after(() => dom.window.close());
  const checks = new ProviderPageChecks(),
    page = win.location.href;
  const title = win.document.querySelector("h1");
  title.textContent = "";
  checks.start(page);
  runtime.command(checks.command(runtime.documentId));
  assert.equal(checks.accept(messages.at(-1)), null);
  title.textContent = "Loaded series";
  runtime.command(checks.command(runtime.documentId));
  assert.equal(checks.accept(messages.at(-1)).preview.title, "Loaded series");
  win.document.querySelector("#episode-total").textContent = "Invalid count";
  checks.start(page);
  runtime.command(checks.command(runtime.documentId));
  assert.equal(checks.accept(messages.at(-1)), null);
  const result = checks.finish();
  assert.equal(result.preview.valid, false);
  const reason = helpers.providerSaveError(
    provider,
    [page, page + "?other=1"],
    { [page]: result.preview },
    true,
  );
  assert.match(reason, /Example 1 did not pass/);
  assert.match(reason, /total episode count/);
});
test("review rejects obsolete requests, replacement documents, canceled checks, and times out with a retry message", () => {
  const checks = new ProviderPageChecks();
  const preview = {
    title: "Series",
    episode: 1,
    episodeCount: 12,
    valid: true,
    errors: [],
  };
  checks.start(provider.origin);
  const old = checks.command("document");
  const message = {
    channel: "provider-runtime",
    sessionId: "session",
    type: "extraction",
    url: provider.origin,
    preview,
  };
  assert.equal(checks.command("document"), null);
  assert.equal(
    checks.accept({
      ...old,
      ...message,
      preview: { ...preview, valid: false },
    }),
    null,
  );
  assert.equal(checks.command("document", "https://example.com/other"), null);
  const current = checks.command("document");
  assert.equal(checks.accept({ ...old, ...message }), null);
  assert.equal(
    checks.accept({
      ...current,
      ...message,
      preview: { ...preview, valid: false },
    }),
    null,
  );
  assert.equal(checks.command("replacement"), null);
  assert.equal(
    checks.accept({ ...current, ...message, documentId: "replacement" }),
    null,
  );
  checks.cancel();
  assert.equal(checks.accept({ ...current, ...message }), null);
  checks.start(provider.origin);
  assert.match(checks.finish().preview.errors[0], /retry/);
  assert.equal(checks.finish(), null);
});
test("empty configuration is invalid and legacy player flags remain unverified", () => {
  assert.match(helpers.validateProvider(helpers.newProviderDraft()), /name/);
  assert.equal(helpers.validateProvider(provider), null);
  assert.match(
    helpers.validateProvider({ ...provider, episodeNumberSelector: "" }),
    /episodes/,
  );
  assert.equal(
    helpers.normalizeProviders([provider])[0].verification,
    undefined,
  );
});
test("provider IDs survive deletion and updates reject missing providers", () => {
  const created = helpers.upsertProviderList([{ ...provider, id: 8 }], {
    ...provider,
    id: 0,
  });
  assert.equal(created[0].id, 9);
  assert.equal(
    helpers.upsertProviderList(created, { ...created[0], name: "Renamed" })[0]
      .name,
    "Renamed",
  );
  assert.throws(() => helpers.upsertProviderList([], provider), /deleted/);
});
test("a sole website opens on startup while multiple websites retain the chosen preference", () => {
  assert.deepEqual(helpers.normalizeProviders([]), []);
  assert.equal(
    helpers.normalizeProviders([{ ...provider, isDefault: false }])[0]
      .isDefault,
    true,
  );
  const websites = [
    { ...provider, isDefault: false },
    { ...provider, id: 8, isDefault: false },
  ];
  assert.equal(
    helpers.normalizeProviders(websites).some((item) => item.isDefault),
    false,
  );
  const selected = helpers.normalizeProviders([
    { ...websites[0], isDefault: true },
    websites[1],
  ]);
  assert.equal(selected[0].isDefault, true);
  assert.equal(selected[1].isDefault, false);
});
test("a failed storage write does not poison retry; writes stay ordered", async () => {
  const queue = new WriteQueue(),
    log = [];
  await assert.rejects(
    queue.run(async () => {
      throw new Error("disk full");
    }),
    /disk full/,
  );
  await Promise.all([
    queue.run(async () => {
      log.push(1);
    }),
    queue.run(async () => {
      log.push(2);
    }),
  ]);
  assert.deepEqual(log, [1, 2]);
});
test("saving a provider rejects failed writes and returns its stored ID after retry", async () => {
  const load = Module._load;
  let stored = {
    anime: {
      Old: {
        name: "Old",
        latestWatchedEpisode: 1,
        highestWatchedEpisode: 1,
        latestVisitedUrl: "https://example.com/",
      },
    },
    providers: [],
  };
  let fail = true;
  const files = new Map(),
    shared = [];
  let sharingAvailable = true,
    fileFailure = false;
  Module._load = function (request, parent, ...args) {
    if (request === "expo-file-system")
      return {
        File: class {
          constructor(base, name) {
            this.uri = base + "/" + name;
          }
          create() {
            if (fileFailure) throw new Error("disk full");
          }
          write(content) {
            files.set(this.uri, content);
          }
        },
        Paths: { document: "test", cache: "cache" },
      };
    if (request === "expo-document-picker") return {};
    if (request === "expo-sharing")
      return {
        isAvailableAsync: async () => sharingAvailable,
        shareAsync: async (uri, options) => {
          shared.push({ uri, options });
        },
      };
    if (
      request === "./storage.util" &&
      parent.filename.endsWith("app-store.util.ts")
    )
      return {
        Storage: {
          getItem: async () => stored,
          setItem: async (_key, next) => {
            if (fail) throw new Error("write failed");
            stored = next;
          },
        },
      };
    return load.call(this, request, parent, ...args);
  };
  let AppStore;
  try {
    ({ AppStore } = require("../utils/app-store.util.ts"));
  } finally {
    Module._load = load;
  }
  await assert.rejects(
    AppStore.SaveProvider({ ...provider, id: 0 }),
    /write failed/,
  );
  assert.equal(stored.providers.length, 0);
  fail = false;
  const saved = await AppStore.SaveProvider({ ...provider, id: 0 });
  assert.equal(saved.id, 1);
  assert.equal(saved.isDefault, true);
  assert.equal(stored.providers[0].isDefault, true);
  assert.equal(stored.providers.length, 1);
  assert.equal(stored.anime.Old.name, "Old");
  const edited = await AppStore.SaveProvider({
    ...saved,
    name: "Updated",
    isDefault: false,
  });
  assert.equal(edited.id, 1);
  assert.equal(edited.isDefault, true);
  assert.equal(stored.providers.length, 1);
  // Existing backups with one unselected website also open automatically.
  stored = { ...stored, providers: [{ ...edited, isDefault: false }] };
  assert.equal((await AppStore.Get()).providers[0].isDefault, true);
  const added = await AppStore.SaveProvider({ ...provider, id: 0 });
  assert.equal(added.isDefault, false);
  assert.equal(
    stored.providers.find((item) => item.id === saved.id).isDefault,
    true,
  );
  const beforeApproval = JSON.stringify(stored);
  fail = true;
  await assert.rejects(
    AppStore.ApproveProviderOrigin(saved.id, "https://mirror.example.com/path"),
    /write failed/,
  );
  assert.equal(JSON.stringify(stored), beforeApproval);
  fail = false;
  await AppStore.ApproveProviderOrigin(
    saved.id,
    "https://mirror.example.com/path",
  );
  await AppStore.ApproveProviderOrigin(
    saved.id,
    "https://mirror.example.com/another",
  );
  const approved = (await AppStore.Get()).providers.find(
    (item) => item.id === saved.id,
  );
  assert.deepEqual(approved.whiteListedOrigins, ["https://mirror.example.com"]);
  assert.equal(approved.name, "Updated");
  assert.equal(approved.isDefault, true);
  assert.deepEqual(
    stored.providers.find((item) => item.id === added.id).whiteListedOrigins,
    [],
  );
  await assert.rejects(
    AppStore.ApproveProviderOrigin(99, "https://other.example"),
    /deleted/,
  );
  await AppStore.Dispatch(
    actions.animeUpdated(provider.origin, {
      animeTitle: "Series",
      episode: 3,
      episodeCount: 12,
      providerId: saved.id,
      lastPlayedAt: 1700000000000,
      url: "https://example.com/series/three",
    }),
  );
  const tracked = (await AppStore.Get()).anime.Series;
  assert.equal(tracked.lastPlayedAt, 1700000000000);
  assert.equal(tracked.providerId, saved.id);
  assert.equal(tracked.latestVisitedUrl, "https://example.com/series/three");
  await AppStore.Backup();
  const backup = JSON.parse(files.get("test/anime-tracker/backup.json"));
  assert.equal(backup.anime.Series.lastPlayedAt, tracked.lastPlayedAt);
  assert.equal(backup.anime.Series.playbackFinished, false);
  await AppStore.ExportWatchList();
  assert.deepEqual(
    JSON.parse(files.get("cache/anime-tracker/watch-list.json")),
    watchListSummary(stored.anime),
  );
  assert.equal(shared.at(-1).options.mimeType, "application/json");
  assert.equal(shared.at(-1).uri, "cache/anime-tracker/watch-list.json");
  assert.equal(
    files.get("test/anime-tracker/backup.json"),
    JSON.stringify(backup),
  );
  sharingAvailable = false;
  await assert.rejects(
    AppStore.ExportWatchList(),
    /System sharing not available/,
  );
  sharingAvailable = true;
  fileFailure = true;
  await assert.rejects(AppStore.ExportWatchList(), /disk full/);
  fileFailure = false;
  // With multiple websites, disabling startup remains a valid choice.
  await AppStore.Update((previous) => ({
    ...previous,
    providers: previous.providers.map((item) => ({
      ...item,
      isDefault: false,
    })),
  }));
  assert.equal(
    (await AppStore.Get()).providers.some((item) => item.isDefault),
    false,
  );
  await AppStore.Dispatch(actions.removeProvider(saved.id));
  assert.equal(stored.providers.length, 1);
  assert.equal(stored.providers[0].id, added.id);
  assert.equal(stored.providers[0].isDefault, true);
  assert.equal(stored.anime.Old.name, "Old");
  await AppStore.Dispatch(actions.removeProvider(added.id));
  assert.equal((await AppStore.Get()).providers.length, 0);
  // Preference normalization must preserve the migration of history-only backups.
  await AppStore.Update(() => ({ Old: stored.anime.Old }));
  assert.equal((await AppStore.Get()).anime.Old.name, "Old");
  assert.equal((await AppStore.Get()).providers.length, 0);
});
test("normalized tracking payloads store provider and preserve legacy history", () => {
  let state = reducer(
    { anime: {}, providers: [] },
    actions.animeUpdated("https://example.com/", {
      animeTitle: "Series",
      episode: 1,
      episodeCount: 12,
      progress: 42,
      total: 120,
      providerId: 4,
    }),
  );
  assert.equal(state.anime.Series.providerId, 4);
  assert.equal(state.anime.Series.total, 12);
  state = reducer(
    state,
    actions.animeUpdated("https://example.com/", {
      animeTitle: "Series",
      episode: 1,
    }),
  );
  assert.equal(state.anime.Series.episodeProgress[1].progress, 42);
  const legacy = reducer(
    state,
    actions.animeUpdated("https://example.com/", {
      animeTitle: "Old",
      episode: 2,
      info: { Episodi: "24" },
      progress: 20,
      total: 100,
    }),
  );
  assert.equal(legacy.anime.Old.total, 24);
  const saved = reducer(state, actions.upsertProvider({ ...provider, id: 0 }));
  assert.equal(saved.providers.length, 1);
});
test("only playback timestamps update recent order; manual edits and metadata retain the saved date", () => {
  let state = { anime: {}, providers: [] };
  const payload = { animeTitle: "Series", episode: 1, providerId: 4 };
  state = reducer(state, actions.animeUpdated(provider.origin, payload));
  assert.equal(state.anime.Series.lastPlayedAt, undefined);
  state = reducer(
    state,
    actions.animeUpdated(provider.origin, { ...payload, lastPlayedAt: 2000 }),
  );
  state = reducer(
    state,
    actions.animeUpdated(provider.origin, { ...payload, lastPlayedAt: 1000 }),
  );
  state = reducer(state, actions.animeUpdated(provider.origin, payload));
  state = reducer(state, actions.upsertAnime("Series", 3));
  state = reducer(state, actions.toggleAnimeFinished("Series"));
  assert.equal(state.anime.Series.lastPlayedAt, 2000);
  state = reducer(
    state,
    actions.animeUpdated(provider.origin, { ...payload, lastPlayedAt: 3000 }),
  );
  assert.equal(state.anime.Series.lastPlayedAt, 3000);
});
test("playback dates ignore paused pages, seeking, and episode selection", (t) => {
  const { dom, win, runtime, messages } = setup(fixture, "watch");
  t.after(() => dom.window.close());
  let clock = 1700000000000;
  win.Date.now = () => clock;
  const state = videoState(win);
  state.paused = true;
  const latest = () =>
    messages.filter((message) => message.type === "anime-found").at(-1).payload;
  const tick = () => {
    clock += 1500;
    runtime.tick();
  };
  tick();
  assert.equal(latest().lastPlayedAt, undefined);
  win.document.querySelector("video").currentTime = 50;
  tick();
  assert.equal(latest().lastPlayedAt, undefined);
  state.paused = false;
  state.time = 51;
  tick();
  const playedAt = clock;
  assert.equal(latest().lastPlayedAt, playedAt);
  assert.equal(
    bridge.parseRuntimeMessage(
      JSON.stringify(
        messages.filter((message) => message.type === "anime-found").at(-1),
      ),
      "session",
    ).payload.lastPlayedAt,
    playedAt,
  );
  state.paused = true;
  tick();
  tick();
  assert.equal(latest().lastPlayedAt, playedAt);
  state.paused = false;
  win.document.querySelector("video").currentTime = 60;
  tick();
  assert.equal(latest().lastPlayedAt, playedAt);
  win.document.querySelector("h1").textContent = "Another Series";
  state.paused = true;
  tick();
  assert.equal(latest().lastPlayedAt, undefined);
  const link = win.document.querySelectorAll("#episode-list a")[1];
  link.addEventListener("click", (event) => event.preventDefault());
  link.click();
  assert.equal(latest().episode, 2);
  assert.equal(latest().lastPlayedAt, undefined);
  state.paused = false;
  state.time = 61;
  tick();
  assert.equal(latest().lastPlayedAt, clock);
});
test("only the selected player contributes playback dates", (t) => {
  const { dom, win, runtime, messages } = setup(
    fixture.replace("</main>", '<video id="ad"></video></main>'),
    "watch",
    { ...provider, player: { selector: "#primary-player", framePath: [] } },
  );
  t.after(() => dom.window.close());
  let clock = 1700000000000;
  win.Date.now = () => clock;
  const primary = videoState(win),
    ad = videoState(win, win.document.querySelector("#ad"));
  primary.paused = true;
  runtime.tick();
  clock += 1500;
  ad.time = 1;
  runtime.tick();
  assert.equal(
    messages.filter((message) => message.type === "anime-found").at(-1).payload
      .lastPlayedAt,
    undefined,
  );
  primary.paused = false;
  primary.time = 1;
  clock += 1500;
  runtime.tick();
  assert.equal(
    messages.filter((message) => message.type === "anime-found").at(-1).payload
      .lastPlayedAt,
    clock,
  );
});
test("switching providers retains the largest total and one visible series", () => {
  let state = reducer(
    { anime: {}, providers: [] },
    actions.animeUpdated(provider.origin, {
      animeTitle: "Series",
      episode: 12,
      episodeCount: 24,
      providerId: provider.id,
      progress: 115,
      total: 120,
      lastPlayedAt: 1000,
    }),
  );
  const url = "https://other.example/series/12";
  for (const episodeCount of [12, undefined, 0, -1, NaN, 12.5]) {
    state = reducer(
      state,
      actions.animeUpdated(url, {
        animeTitle: "Series",
        episode: 12,
        episodeCount,
        providerId: 99,
      }),
    );
    assert.deepEqual(Object.keys(state.anime), ["Series"]);
    assert.equal(state.anime.Series.total, 24);
    assert.equal(isAnimeFinished(state.anime.Series), false);
    assert.equal(state.anime.Series.providerId, 99);
    assert.equal(state.anime.Series.latestVisitedUrl, url);
    assert.equal(state.anime.Series.episodeProgress[12].progress, 115);
    assert.equal(state.anime.Series.lastPlayedAt, 1000);
  }
  for (const Episodi of ["??", "TBA", "N/A", "Unknown", "12"]) {
    state = reducer(
      state,
      actions.animeUpdated(provider.origin, {
        animeTitle: "Series",
        episode: 12,
        info: { Episodi },
        providerId: provider.id,
      }),
    );
    assert.equal(state.anime.Series.total, 24);
  }
  state = reducer(
    state,
    actions.animeUpdated(provider.origin, {
      animeTitle: "Series",
      episode: 12,
      info: { Episodi: "30" },
    }),
  );
  assert.equal(state.anime.Series.total, 30);
  assert.equal(state.anime.Series.providerId, provider.id);
});

test("completion and drop status change only on fresh advancing playback", () => {
  let state = { anime: {}, providers: [] };
  const update = (payload) => {
    state = reducer(
      state,
      actions.animeUpdated(provider.origin, {
        animeTitle: "Series",
        episode: 12,
        episodeCount: 12,
        total: 120,
        ...payload,
      }),
    );
    return state.anime.Series;
  };
  assert.equal(
    isAnimeFinished(update({ progress: 115, lastPlayedAt: 1000 })),
    true,
  );
  for (const lastPlayedAt of [undefined, 1000, 900]) {
    assert.equal(isAnimeFinished(update({ progress: 10, lastPlayedAt })), true);
  }
  assert.equal(
    isAnimeFinished(update({ episode: 1, progress: 20, lastPlayedAt: 2000 })),
    false,
  );
  assert.equal(state.anime.Series.highestWatchedEpisode, 12);
  assert.equal(state.anime.Series.finished, false);
  update({ episode: 12, progress: 115, lastPlayedAt: 2000 });
  const restored = JSON.parse(JSON.stringify(state));
  assert.equal(isAnimeFinished(restored.anime.Series), false);
  assert.equal(watchListSummary(restored.anime)[0].finished, false);
  assert.equal(
    isAnimeFinished(update({ progress: 108, lastPlayedAt: 3000 })),
    false,
  );
  assert.equal(
    isAnimeFinished(update({ progress: 115, lastPlayedAt: 4000 })),
    true,
  );
  state = reducer(state, actions.toggleAnimeFinished("Series"));
  assert.equal(isAnimeFinished(state.anime.Series), false);
  assert.equal(state.anime.Series.finished, false);
  update({ progress: 115, lastPlayedAt: 4000 });
  assert.equal(isAnimeFinished(state.anime.Series), false);
  state = reducer(state, actions.toggleAnimeFinished("Series"));
  assert.equal(state.anime.Series.finished, true);
  for (const lastPlayedAt of [undefined, 4000, 3500]) {
    update({ episode: 1, progress: 20, lastPlayedAt });
    assert.equal(state.anime.Series.finished, true);
  }
  update({ episode: 1, progress: 21, lastPlayedAt: 5000 });
  assert.equal(state.anime.Series.finished, false);
  assert.equal(isAnimeFinished(state.anime.Series), false);
  update({ progress: 115, lastPlayedAt: 6000 });
  assert.equal(isAnimeFinished(state.anime.Series), true);
  update({ episodeCount: 24 });
  assert.equal(isAnimeFinished(state.anime.Series), false);
  update({ episode: 24 });
  assert.equal(isAnimeFinished(state.anime.Series), false);
});

test("legacy completion survives metadata and manual edits reset automatic completion", () => {
  const entry = {
    name: "Series",
    latestWatchedEpisode: 12,
    highestWatchedEpisode: 12,
    latestVisitedUrl: provider.origin,
    total: 12,
    episodeProgress: { 12: { progress: 115, total: 120 } },
  };
  assert.equal(isAnimeFinished(entry), true);
  let state = reducer(
    { anime: { Series: entry }, providers: [] },
    actions.animeUpdated(provider.origin, {
      animeTitle: "Series",
      episode: 12,
      progress: 0,
      total: 120,
    }),
  );
  assert.equal(isAnimeFinished(state.anime.Series), true);
  state = reducer(state, actions.upsertAnime("Series", 12));
  assert.equal(isAnimeFinished(state.anime.Series), false);
  for (const total of [undefined, 0, NaN]) {
    assert.equal(isAnimeFinished({ ...entry, total }), false);
  }
  assert.equal(
    isAnimeFinished({
      ...entry,
      episodeProgress: { 12: { progress: 1, total: 0 } },
    }),
    false,
  );
  state = reducer(
    { anime: { Series: { ...entry, finished: true } }, providers: [] },
    actions.toggleAnimeFinished("Series"),
  );
  assert.equal(state.anime.Series.finished, false);
  assert.equal(isAnimeFinished(state.anime.Series), false);
});

test("another provider receives shared highlights before activation and can resume the saved episode", (t) => {
  const state = reducer(
    { anime: {}, providers: [] },
    actions.animeUpdated(provider.origin, {
      animeTitle: "Example Series",
      episode: 1,
      episodeCount: 12,
      providerId: provider.id,
      progress: 42,
      total: 120,
      lastPlayedAt: 1000,
    }),
  );
  const { dom, win, runtime } = setup(
    fixture.replace('<video id="primary-player" controls></video>', ""),
    "watch",
    { ...provider, id: 99 },
    helpers.providerEpisodeProgress(state.anime),
  );
  t.after(() => dom.window.close());
  assert.match(
    win.document.querySelector("#episode-list a").style.backgroundImage,
    /35%/,
  );
  runtime.command({
    type: "resume",
    resume: {
      title: "Example Series",
      episode: 1,
      progress: state.anime["Example Series"].episodeProgress[1].progress,
    },
  });
  win.document
    .querySelector("main")
    .insertAdjacentHTML("beforeend", '<video id="primary-player"></video>');
  const video = videoState(win);
  runtime.tick();
  assert.equal(video.time, 42);
});

test("episode highlighting shares title history across providers and retains legacy progress", () => {
  const progress = { 1: { progress: 30, total: 120 } };
  const history = {
    Current: { providerId: provider.id, episodeProgress: progress },
    Other: { providerId: 99, episodeProgress: progress },
    Legacy: { episodeProgress: progress },
    Unwatched: { providerId: provider.id },
  };
  assert.deepEqual(helpers.providerEpisodeProgress(history), {
    Current: progress,
    Other: progress,
    Legacy: progress,
  });
});
test("saved episode progress appears before a placeholder player is activated", (t) => {
  const { dom, win } = setup(
    fixture.replace('<video id="primary-player" controls></video>', ""),
    "watch",
    provider,
    {
      "Example Series": {
        1: { progress: 30, total: 120 },
        2: { progress: 120, total: 120 },
      },
      "Another Series": { 3: { progress: 120, total: 120 } },
    },
  );
  t.after(() => dom.window.close());
  const episodes = win.document.querySelectorAll("#episode-list a");
  assert.match(episodes[0].style.backgroundImage, /linear-gradient.*25%/);
  assert.match(episodes[1].style.backgroundImage, /linear-gradient.*100%/);
  assert.equal(episodes[2].style.backgroundImage, "");
  assert.equal(win.document.querySelector("nav a").style.backgroundImage, "");
});
test("episode highlights refresh on progress updates and ignore invalid or obsolete samples", (t) => {
  const { dom, win, runtime } = setup(fixture, "watch");
  t.after(() => dom.window.close());
  const episodes = win.document.querySelectorAll("#episode-list a");
  runtime.command({
    type: "episodeProgress",
    documentId: runtime.documentId,
    progress: {
      "Example Series": {
        1: { progress: 60, total: 120 },
        2: { progress: 90, total: 0 },
        3: { progress: -5, total: 120 },
      },
    },
  });
  assert.match(episodes[0].style.backgroundImage, /50%/);
  assert.equal(episodes[1].style.backgroundImage, "");
  assert.equal(episodes[2].style.backgroundImage, "");
  runtime.command({
    type: "episodeProgress",
    documentId: "obsolete",
    progress: {},
  });
  assert.match(episodes[0].style.backgroundImage, /50%/);
  runtime.command({
    type: "episodeProgress",
    progress: { "Example Series": { 1: { progress: 160, total: 120 } } },
  });
  assert.match(episodes[0].style.backgroundImage, /100%/);
  runtime.command({
    type: "episodeProgress",
    progress: { "Example Series": { 1: { progress: Infinity, total: 120 } } },
  });
  assert.equal(episodes[0].style.backgroundImage, "");
});
test("pagination and delayed episode lists use actual episode numbers and the current series", (t) => {
  const { dom, win, runtime } = setup(fixture, "watch", provider, {
    "Example Series": {
      1: { progress: 30, total: 120 },
      51: { progress: 90, total: 120 },
    },
    "Another Series": { 51: { progress: 30, total: 120 } },
  });
  t.after(() => dom.window.close());
  const firstPage = win.document.querySelector("#episode-list a");
  win.document.querySelector("#episode-list").innerHTML =
    "<li><a>Episode 51</a></li><li><a>52</a></li>";
  runtime.tick();
  assert.equal(firstPage.style.backgroundImage, "");
  const episodes = win.document.querySelectorAll("#episode-list a");
  assert.match(episodes[0].style.backgroundImage, /75%/);
  assert.equal(episodes[1].style.backgroundImage, "");
  win.document.querySelector("h1").textContent = "Another Series";
  runtime.tick();
  assert.match(episodes[0].style.backgroundImage, /25%/);
  win.document.querySelector("h1").textContent = "Unwatched Series";
  runtime.tick();
  assert.equal(episodes[0].style.backgroundImage, "");
});
test("clearing progress or changing runtime mode restores the website background", (t) => {
  const { dom, win, runtime } = setup(fixture, "watch");
  t.after(() => dom.window.close());
  const episode = win.document.querySelector("#episode-list a");
  episode.style.setProperty(
    "background-image",
    'url("episode.png")',
    "important",
  );
  const original = episode.style.backgroundImage;
  const progress = { "Example Series": { 1: { progress: 60, total: 120 } } };
  runtime.command({ type: "episodeProgress", progress });
  assert.match(episode.style.backgroundImage, /50%/);
  runtime.command({ type: "episodeProgress", progress: {} });
  assert.equal(episode.style.backgroundImage, original);
  assert.equal(
    episode.style.getPropertyPriority("background-image"),
    "important",
  );
  runtime.command({ type: "episodeProgress", progress });
  runtime.configure(provider, "setup");
  assert.equal(episode.style.backgroundImage, original);
  runtime.tick();
  assert.equal(episode.style.backgroundImage, original);
  runtime.configure(provider, "watch");
  assert.match(episode.style.backgroundImage, /50%/);
  runtime.configure({ ...provider, episodeNumberSelector: "nav a" }, "watch");
  assert.equal(episode.style.backgroundImage, original);
});
test("runtime reinjection refreshes highlights and preserves the website background", (t) => {
  const { dom, win, runtime } = setup(fixture, "watch");
  t.after(() => dom.window.close());
  const episode = win.document.querySelector("#episode-list a");
  episode.style.backgroundImage = 'url("episode.png")';
  const original = episode.style.backgroundImage;
  for (const progress of [30, 60]) {
    win.__providerProgress = {
      "Example Series": { 1: { progress, total: 120 } },
    };
    win.eval(script);
    assert.equal(win.ProviderRuntime, runtime);
    assert.match(
      episode.style.backgroundImage,
      new RegExp((progress / 120) * 100 + "%"),
    );
  }
  runtime.command({ type: "episodeProgress", progress: {} });
  assert.equal(episode.style.backgroundImage, original);
});
test("malformed messages and old sessions are ignored", () => {
  assert.equal(bridge.parseRuntimeMessage("{", "session"), null);
  assert.equal(
    bridge.parseRuntimeMessage(
      JSON.stringify({
        channel: "provider-runtime",
        sessionId: "old",
        type: "ready",
        documentId: "d",
        url: provider.origin,
      }),
      "session",
    ),
    null,
  );
  assert.equal(
    bridge.parseRuntimeMessage(
      JSON.stringify({
        channel: "provider-runtime",
        sessionId: "session",
        type: "players",
        documentId: "d",
        url: provider.origin,
        players: [{}],
      }),
      "session",
    ),
    null,
  );
  for (const lastPlayedAt of [-1, null, "today"]) {
    assert.equal(
      bridge.parseRuntimeMessage(
        JSON.stringify({
          channel: "provider-runtime",
          sessionId: "session",
          type: "anime-found",
          documentId: "d",
          url: provider.origin,
          payload: { animeTitle: "Series", episode: 1, lastPlayedAt },
        }),
        "session",
      ),
      null,
    );
  }
});
test("retired documents cannot validate selections after navigation or reload", () => {
  const session = new bridge.RuntimeSession();
  const old = {
    channel: "provider-runtime",
    sessionId: "session",
    type: "ready",
    documentId: "old",
    url: "https://example.com/first",
  };
  session.begin(old.url);
  assert.equal(session.accept(old), true);
  session.begin("https://example.com/second");
  assert.equal(session.accept(old), false);
  const next = {
    ...old,
    documentId: "next",
    url: "https://example.com/second",
  };
  assert.equal(session.accept(next), true);
  assert.equal(session.accept({ ...old, type: "selection" }), false);
  session.begin(next.url);
  assert.equal(session.accept(next), false);
  assert.equal(session.accept({ ...next, documentId: "reload" }), true);
});
test("selection is safe on pages without iframes and CSS identifiers are escaped", (t) => {
  const { dom, win, runtime, messages } = setup();
  t.after(() => dom.window.close());
  const element = win.document.querySelector("h1");
  const selector = runtime.selectorFor(element);
  assert.equal(win.document.querySelector(selector), element);
  runtime.command({
    type: "selectMode",
    enabled: true,
    field: "seriesNameSelector",
    requestId: "r",
  });
  element.dispatchEvent(
    new win.MouseEvent("click", { bubbles: true, cancelable: true }),
  );
  const selected = messages.find((message) => message.type === "selection");
  assert.equal(selected.preview.valid, true);
  assert.equal(selected.preview.texts[0], "Example Series");
  assert.equal(selected.requestId, "r");
  runtime.command({ type: "parent", documentId: "old-document" });
  assert.equal(
    messages.filter((message) => message.type === "selection").length,
    1,
  );
});
test("episode selectors generalize within the list without matching navigation numbers", (t) => {
  const { dom, win, runtime } = setup();
  t.after(() => dom.window.close());
  const selector = runtime.selectorFor(
    win.document.querySelector("#episode-list a"),
    win.document,
    true,
  );
  const result = runtime.evaluate(selector, "episodeNumberSelector");
  assert.equal(result.count, 3);
  assert.equal(result.valid, true);
  assert.equal(runtime.evaluate("a", "episodeNumberSelector").count, 4);
});
test("a selector learned from one episode stays inside its list on longer and paginated series", (t) => {
  const { dom, win, runtime } = setup();
  t.after(() => dom.window.close());
  win.document.querySelector("#episode-list").innerHTML =
    '<li class="episode"><a class="active">1</a></li>';
  const selector = runtime.selectorFor(
    win.document.querySelector("#episode-list a"),
    win.document,
    true,
  );
  const single = runtime.evaluate(selector, "episodeNumberSelector");
  assert.equal(single.count, 1);
  assert.deepEqual(Array.from(single.values), [1]);
  for (const start of [1, 51]) {
    win.document.querySelector("#episode-list").innerHTML = Array.from(
      { length: 50 },
      (_, i) => '<li class="episode"><a>' + (start + i) + "</a></li>",
    ).join("");
    const result = runtime.evaluate(selector, "episodeNumberSelector");
    assert.equal(result.valid, true);
    assert.equal(result.count, 50);
    assert.equal(result.values[0], start);
    assert.equal(result.values[49], start + 49);
  }
});
test("invalid selectors, duplicate titles, and invalid totals produce actionable errors", (t) => {
  const { dom, win, runtime } = setup();
  t.after(() => dom.window.close());
  assert.equal(runtime.evaluate("[", "seriesNameSelector").valid, false);
  win.document.body.insertAdjacentHTML("beforeend", "<h1>Another heading</h1>");
  assert.equal(runtime.evaluate("h1", "seriesNameSelector").valid, false);
  win.document.querySelector("#episode-total").textContent = "Invalid count";
  assert.equal(runtime.extract().valid, false);
  assert.equal(runtime.number("Episode 12"), 12);
  assert.equal(runtime.number("12 episodes"), 12);
  assert.equal(Number.isNaN(runtime.number("Series 12")), true);
});
test("unknown totals pass selection, automatic Review, and saving without inferring a count", (t) => {
  const { dom, win, runtime, messages } = setup();
  t.after(() => dom.window.close());
  const checks = new ProviderPageChecks(),
    results = {},
    pages = [];
  const total = win.document.querySelector("#episode-total");
  for (const marker of [
    "?",
    "??",
    "Episodes: ??",
    "?? episodes",
    "Total episodes: ??",
    "-",
    "—",
    "…",
    "...",
    "N/A",
    "TBA",
    "TBD",
    "Unknown",
    "Ongoing",
    "Not yet announced",
    "To be determined",
    "Totale: sconosciuto",
    "In corso",
  ]) {
    total.textContent = marker;
    const selection = runtime.evaluate(
      provider.totalEpisodesSelector,
      "totalEpisodesSelector",
    );
    assert.equal(selection.valid, true, marker);
    assert.equal(selection.values[0], null, marker);
    const page = "https://example.com/series/" + pages.length;
    pages.push(page);
    checks.start(page);
    runtime.command(checks.command(runtime.documentId));
    const result = checks.accept(
      bridge.parseRuntimeMessage(JSON.stringify(messages.at(-1)), "session"),
    );
    assert.equal(result.preview.valid, true, marker);
    assert.equal(result.preview.episode, 1);
    assert.equal(result.preview.listedEpisodes, 3);
    assert.equal(result.preview.episodeCount, 0);
    assert.deepEqual(Array.from(result.preview.errors), []);
    results[page] = result.preview;
  }
  assert.equal(
    helpers.providerSaveError(
      { ...provider, verification: { progress: true, resume: false } },
      pages.slice(0, 2),
      results,
      false,
    ),
    null,
  );
  total.textContent = "12 episodes";
  assert.equal(runtime.extract().episodeCount, 12);
  total.textContent = "??";
  assert.equal(runtime.extract().valid, true);
  assert.equal(runtime.extract().episodeCount, 0);
});
test("unknown-total support still rejects missing, ambiguous, invalid totals and unknown episode numbers", (t) => {
  const { dom, win, runtime } = setup();
  t.after(() => dom.window.close());
  for (const value of [
    "",
    "0",
    "-12",
    "12.5",
    "Invalid count",
    "Series 12",
    "TBA 12",
  ]) {
    win.document.querySelector("#episode-total").textContent = value;
    assert.equal(runtime.extract().valid, false, value);
  }
  win.document.querySelector("#episode-total").textContent = "??";
  assert.equal(
    runtime.evaluate("#missing-total", "totalEpisodesSelector").valid,
    false,
  );
  win.document.body.insertAdjacentHTML(
    "beforeend",
    '<span class="another-total">TBA</span>',
  );
  assert.equal(
    runtime.evaluate("#episode-total, .another-total", "totalEpisodesSelector")
      .valid,
    false,
  );
  win.document.querySelector("#episode-list li a").textContent = "??";
  assert.equal(runtime.extract().valid, false);
  assert.equal(Number.isNaN(runtime.number("??")), true);
});
test("unknown totals retain playback tracking and known history totals, then update when announced", (t) => {
  const { dom, win, runtime, messages } = setup(fixture, "watch");
  t.after(() => dom.window.close());
  const total = win.document.querySelector("#episode-total");
  total.textContent = "??";
  const video = videoState(win);
  video.time = 115;
  let clock = 1700000000000;
  win.Date.now = () => clock;
  runtime.tick();
  const latest = () =>
    bridge.parseRuntimeMessage(
      JSON.stringify(
        messages.filter((message) => message.type === "anime-found").at(-1),
      ),
      "session",
    ).payload;
  const payload = latest();
  assert.equal(Object.hasOwn(payload, "episodeCount"), false);
  assert.equal(payload.progress, 115);
  assert.equal(payload.total, 120);
  assert.equal(payload.providerId, provider.id);
  assert.equal(payload.url, win.location.href);
  let state = reducer(
    { anime: {}, providers: [] },
    actions.animeUpdated(provider.origin, payload),
  );
  assert.equal(state.anime["Example Series"].total, undefined);
  assert.deepEqual(watchListSummary(state.anime), [
    {
      name: "Example Series",
      highestWatchedEpisode: 1,
      totalEpisodes: null,
      finished: false,
    },
  ]);
  total.textContent = "12 episodes";
  clock += 1500;
  runtime.tick();
  assert.equal(latest().episodeCount, 12);
  state = reducer(state, actions.animeUpdated(provider.origin, latest()));
  total.textContent = "Unknown";
  clock += 1500;
  runtime.tick();
  state = reducer(state, actions.animeUpdated(provider.origin, latest()));
  assert.equal(state.anime["Example Series"].total, 12);
  win.document.addEventListener("click", (event) => event.preventDefault());
  win.document.querySelectorAll("#episode-list a")[1].click();
  assert.equal(latest().episode, 2);
  assert.equal(Object.hasOwn(latest(), "episodeCount"), false);
  state = reducer(state, actions.animeUpdated(provider.origin, latest()));
  assert.equal(state.anime["Example Series"].total, 12);
});
test("an invalid single episode still crosses the bridge with its validation error", (t) => {
  const { dom, win, runtime, messages } = setup();
  t.after(() => dom.window.close());
  runtime.command({
    type: "configure",
    config: { ...provider, episodeNumberSelector: "#episode-list a" },
  });
  win.document.querySelector("#episode-list").innerHTML = "<a>Unknown</a>";
  runtime.command({ type: "extract", requestId: "invalid-episode" });
  const message = bridge.parseRuntimeMessage(
    JSON.stringify(messages.at(-1)),
    "session",
  );
  assert.equal(message.type, "extraction");
  assert.equal(message.preview.valid, false);
  assert.equal(message.preview.episode, 0);
  assert.match(message.preview.errors[0], /episode numbers/);
});
test("both series fixtures use the same extraction configuration", (t) => {
  for (const title of ["Example Series", "Another Series"]) {
    const { dom, runtime } = setup(fixture.replace("Example Series", title));
    t.after(() => dom.window.close());
    const result = runtime.extract();
    assert.equal(result.valid, true);
    assert.equal(result.title, title);
    assert.equal(result.episodeCount, 12);
  }
});
test("review accepts unreleased and paginated episodes independently of the total and without a video", (t) => {
  const checks = new ProviderPageChecks(),
    results = {},
    pages = [];
  for (const [start, listed, total] of [
    [1, 3, 12],
    [1, 50, 200],
    [51, 50, 200],
    [101, 70, 200],
  ]) {
    const { dom, win, runtime, messages } = setup(
      fixture.replace('<video id="primary-player" controls></video>', ""),
      "setup",
      {
        ...provider,
        player: { selector: "#primary-player", framePath: [] },
      },
    );
    t.after(() => dom.window.close());
    win.document.querySelector("#episode-total").textContent =
      total + " episodes";
    win.document.querySelector("#episode-list").innerHTML = Array.from(
      { length: listed },
      (_, i) =>
        '<li class="episode"><a' +
        (i === 0 ? ' class="active"' : "") +
        ">" +
        (start + i) +
        "</a></li>",
    ).join("");
    const page = "https://example.com/series/" + start + "-" + total;
    pages.push(page);
    checks.start(page);
    runtime.command(checks.command(runtime.documentId));
    const result = checks.accept(
      bridge.parseRuntimeMessage(JSON.stringify(messages.at(-1)), "session"),
    );
    assert.equal(result.preview.valid, true);
    assert.equal(result.preview.episode, start);
    assert.equal(result.preview.listedEpisodes, listed);
    assert.equal(result.preview.episodeCount, total);
    assert.equal(runtime.gatherPlayers().players.length, 0);
    results[page] = result.preview;
  }
  assert.equal(
    helpers.providerSaveError(
      { ...provider, verification: { progress: true, resume: true } },
      pages,
      results,
      false,
    ),
    null,
  );
});
test("placeholder activation progresses from waiting to detected to verified without assuming page-load playback", (t) => {
  const { dom, win, runtime, messages } = setup(
    fixture.replace(
      '<video id="primary-player" controls></video>',
      '<button id="placeholder">Play</button>',
    ),
  );
  t.after(() => dom.window.close());
  runtime.tick();
  assert.equal(helpers.playbackPhase(messages.at(-1).players[0]), "waiting");
  let state;
  win.document.querySelector("#placeholder").addEventListener("click", () => {
    win.document
      .querySelector("#placeholder")
      .insertAdjacentHTML("afterend", '<video id="primary-player"></video>');
    state = videoState(win);
    state.paused = true;
  });
  win.document.querySelector("#placeholder").click();
  runtime.tick();
  assert.equal(helpers.playbackPhase(messages.at(-1).players[0]), "paused");
  state.paused = false;
  runtime.tick();
  assert.equal(helpers.playbackPhase(messages.at(-1).players[0]), "checking");
  state.time = 1;
  runtime.tick();
  const player = messages.at(-1).players[0];
  assert.equal(helpers.playbackPhase(player), "verified");
  assert.equal(player.resume, false);
  runtime.command({ type: "testSeek", locator: player.locator });
  runtime.tick();
  assert.equal(messages.at(-1).players[0].resume, true);
  assert.equal(state.time, 1);
});
test("a configured player created by an iframe placeholder is tracked and resumed after activation", (t) => {
  const { dom, win, runtime, messages } = setup(
    fixture.replace(
      '<video id="primary-player" controls></video>',
      '<iframe id="player-frame"></iframe><video id="ad"></video>',
    ),
    "watch",
    {
      ...provider,
      player: { selector: "#primary-player", framePath: ["#player-frame"] },
    },
  );
  t.after(() => dom.window.close());
  const doc = win.document.querySelector("#player-frame").contentDocument;
  doc.body.innerHTML = '<button id="placeholder">Play episode</button>';
  const ad = videoState(win, win.document.querySelector("#ad"));
  runtime.command({
    type: "resume",
    resume: { title: "Example Series", episode: 1, progress: 42 },
  });
  ad.time = 1;
  runtime.tick();
  assert.equal(
    messages.some((message) => message.type === "anime-found"),
    false,
  );
  let state;
  doc.querySelector("#placeholder").addEventListener("click", () => {
    doc.body.insertAdjacentHTML(
      "beforeend",
      '<video id="primary-player"></video>',
    );
    state = videoState(win, doc.querySelector("video"));
    state.duration = 0;
    state.paused = true;
  });
  doc.querySelector("#placeholder").click();
  runtime.tick();
  assert.equal(
    messages.some((message) => message.type === "anime-found"),
    false,
  );
  assert.equal(state.time, 0);
  state.duration = 120;
  state.paused = false;
  state.time = 1;
  runtime.tick();
  assert.equal(state.time, 42);
  assert.equal(ad.time, 1);
  const tracked = messages.find((message) => message.type === "anime-found");
  assert.equal(tracked.payload.progress, 42);
  assert.equal(tracked.payload.episodeCount, 12);
});
test("delayed videos and player replacement are discovered", (t) => {
  const { dom, win, runtime } = setup("<main></main>");
  t.after(() => dom.window.close());
  assert.equal(runtime.gatherPlayers().players.length, 0);
  win.document.body.insertAdjacentHTML(
    "beforeend",
    '<video id="new-player"></video>',
  );
  assert.equal(runtime.gatherPlayers().players.length, 1);
  win.document.querySelector("video").outerHTML =
    '<video id="replacement"></video>';
  assert.equal(
    runtime.gatherPlayers().players[0].locator.selector,
    "#replacement",
  );
});
test("nested accessible players are found and inaccessible frames never throw", (t) => {
  const { dom, win, runtime } = setup(
    '<iframe id="outer"></iframe><iframe id="blocked"></iframe>',
  );
  t.after(() => dom.window.close());
  const outer = win.document.querySelector("#outer").contentDocument;
  outer.body.innerHTML = '<iframe id="inner"></iframe>';
  outer.querySelector("iframe").contentDocument.body.innerHTML =
    '<video id="video"></video>';
  Object.defineProperty(
    win.document.querySelector("#blocked"),
    "contentDocument",
    {
      get() {
        throw new Error("cross origin");
      },
    },
  );
  const result = runtime.gatherPlayers();
  assert.equal(result.players.length, 1);
  assert.equal(result.players[0].locator.framePath.length, 2);
  assert.equal(result.inaccessibleFrames, 1);
});
test("video presence alone is not support; advancing time and seek roundtrip are tested separately", (t) => {
  const { dom, win, runtime, messages } = setup();
  t.after(() => dom.window.close());
  const state = videoState(win);
  runtime.tick();
  assert.equal(messages.at(-1).players[0].progress, false);
  state.time = 2;
  runtime.tick();
  const sample = messages.at(-1).players[0];
  assert.equal(sample.progress, true);
  assert.equal(sample.resume, false);
  runtime.command({ type: "testSeek", locator: sample.locator });
  runtime.tick();
  assert.equal(state.time, 2);
  assert.equal(messages.at(-1).players[0].resume, true);
  runtime.command({ type: "resetPlayerTest" });
  runtime.tick();
  assert.equal(messages.at(-1).players[0].progress, false);
});
test("multiple players require a chosen locator and watch mode resumes saved time", (t) => {
  const { dom, win, runtime, messages } = setup(
    fixture.replace("</main>", '<video id="ad"></video></main>'),
    "watch",
  );
  t.after(() => dom.window.close());
  const state = videoState(win),
    ad = videoState(win, win.document.querySelector("#ad"));
  state.time = 1;
  ad.time = 1;
  runtime.tick();
  assert.equal(
    messages.some((message) => message.type === "anime-found"),
    false,
  );
  runtime.command({
    type: "configure",
    config: {
      ...provider,
      player: { selector: "#primary-player", framePath: [] },
    },
  });
  runtime.command({
    type: "resume",
    resume: { title: "Example Series", episode: 1, progress: 50 },
  });
  runtime.tick();
  assert.equal(state.time, 50);
  assert.equal(ad.time, 1);
  assert.equal(
    messages.find((message) => message.type === "anime-found").payload
      .providerId,
    provider.id,
  );
});
test("reinjection does not duplicate page click listeners", (t) => {
  const { dom, win, runtime, messages } = setup();
  t.after(() => dom.window.close());
  win.eval(script);
  runtime.command({
    type: "selectMode",
    enabled: true,
    field: "seriesNameSelector",
    requestId: "once",
  });
  win.document
    .querySelector("h1")
    .dispatchEvent(new win.MouseEvent("click", { bubbles: true }));
  assert.equal(
    messages.filter((message) => message.type === "selection").length,
    1,
  );
});
test("seeking alone cannot falsely verify advancing playback", (t) => {
  const { dom, win, runtime, messages } = setup();
  t.after(() => dom.window.close());
  const state = videoState(win);
  runtime.tick();
  win.document.querySelector("video").currentTime = 40;
  runtime.tick();
  assert.equal(messages.at(-1).players[0].progress, false);
  state.time = 41;
  runtime.tick();
  assert.equal(messages.at(-1).players[0].progress, true);
});
test("restored browser-history documents get a fresh bridge identity", (t) => {
  const { dom, win, messages } = setup();
  t.after(() => dom.window.close());
  const original = messages.find(
    (message) => message.type === "ready",
  ).documentId;
  win.dispatchEvent(new win.Event("pagehide"));
  const restored = new win.Event("pageshow");
  Object.defineProperty(restored, "persisted", { value: true });
  win.dispatchEvent(restored);
  const next = messages
    .filter((message) => message.type === "ready")
    .at(-1).documentId;
  assert.notEqual(next, original);
});

test("runtime diagnostics retain legacy text while providing translatable selection and extraction codes", (t) => {
  const { dom, win, runtime, messages } = setup();
  t.after(() => dom.window.close());
  win.document.querySelector("h1").textContent = "";
  win.document.querySelector("#episode-total").textContent = "Invalid count";
  const selection = runtime.evaluate(
    provider.seriesNameSelector,
    "seriesNameSelector",
  );
  assert.equal(selection.errorCode, "choose-title");
  assert.equal(selection.error, "Choose one series title.");
  runtime.command({ type: "extract", requestId: "diagnostics" });
  const parsed = bridge.parseRuntimeMessage(
    JSON.stringify(messages.at(-1)),
    "session",
  );
  assert.deepEqual(parsed.preview.errorCodes, ["choose-title", "choose-total"]);
  assert.equal(parsed.preview.errors[0], "Choose one series title.");
  assert.match(parsed.preview.errors[1], /total episode count/);
  const { extractionFeedback } = require("../utils/runtime-feedback.ts");
  assert.deepEqual(
    extractionFeedback(parsed.preview).map((item) => item.key),
    ["runtime.chooseTitle", "runtime.chooseTotal"],
  );
  const unreadable = runtime.evaluate("[", "seriesNameSelector");
  // Invalid CSS retains the existing unreadable-selection diagnostic.
  assert.equal(unreadable.valid, false);
  assert.equal(unreadable.errorCode, "unreadable-selection");
  assert.equal(
    unreadable.error,
    "This selection cannot be read. Choose it again.",
  );
});

test("runtime bridge accepts legacy diagnostics and rejects malformed optional diagnostic codes", () => {
  const base = {
    channel: "provider-runtime",
    sessionId: "session",
    documentId: "document",
    url: provider.origin,
    type: "selection",
    requestId: "test",
    field: "seriesNameSelector",
    preview: {
      selector: "h1",
      count: 0,
      texts: [],
      values: [],
      valid: false,
      error: "Legacy error",
    },
  };
  const parse = (value) =>
    bridge.parseRuntimeMessage(JSON.stringify(value), "session");
  assert.ok(parse(base));
  assert.ok(
    parse({ ...base, preview: { ...base.preview, errorCode: "choose-title" } }),
  );
  for (const errorCode of ["unknown-key", "__proto__", 1, null]) {
    assert.equal(
      parse({ ...base, preview: { ...base.preview, errorCode } }),
      null,
    );
  }
  const extraction = {
    ...base,
    type: "extraction",
    preview: {
      title: "",
      episode: 0,
      episodeCount: 0,
      valid: false,
      errors: ["Legacy error"],
    },
  };
  assert.ok(parse(extraction));
  assert.ok(
    parse({
      ...extraction,
      preview: { ...extraction.preview, errorCodes: ["choose-title"] },
    }),
  );
  for (const errorCodes of [
    ["unknown-key"],
    [],
    ["choose-title", "choose-total"],
    "choose-title",
    null,
  ]) {
    assert.equal(
      parse({ ...extraction, preview: { ...extraction.preview, errorCodes } }),
      null,
    );
  }
});

test("watch list progress omits unknown totals and never changes completion or history", () => {
  for (const total of [undefined, null, 0, -1, NaN, Infinity]) {
    assert.equal(
      watchListProgress({ highestWatchedEpisode: 8, total }),
      undefined,
    );
  }
  const anime = Object.freeze({
    highestWatchedEpisode: 24,
    total: 24,
    playbackFinished: false,
  });
  assert.equal(watchListProgress(anime), 1);
  assert.equal(
    isAnimeFinished(anime),
    false,
    "A full bar is not evidence of completed playback",
  );
  assert.equal(
    watchListProgress({ highestWatchedEpisode: 8, total: 24 }),
    1 / 3,
  );
  assert.equal(watchListProgress({ highestWatchedEpisode: 30, total: 24 }), 1);
  assert.equal(watchListProgress({ highestWatchedEpisode: -3, total: 24 }), 0);
  assert.equal(watchListProgress({ highestWatchedEpisode: NaN, total: 24 }), 0);
});
