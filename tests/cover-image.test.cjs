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
require.extensions[".tsx"] = require.extensions[".ts"] = (module, filename) => {
  module._compile(
    ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        esModuleInterop: true,
        jsx: ts.JsxEmit.ReactJSX,
      },
    }).outputText,
    filename,
  );
};
const { useCoverImage } = require("../hooks/use-cover-image.ts");

test("cover diagnostics distinguish missing URLs, image failures, loading, and stale callbacks", async (t) => {
  const dom = new JSDOM('<div id="root"></div>');
  const previous = {
    window: globalThis.window,
    document: globalThis.document,
    act: globalThis.IS_REACT_ACT_ENVIRONMENT,
  };
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const root = createRoot(dom.window.document.querySelector("#root"));
  t.after(async () => {
    await React.act(async () => root.unmount());
    globalThis.window = previous.window;
    globalThis.document = previous.document;
    globalThis.IS_REACT_ACT_ENVIRONMENT = previous.act;
    dom.window.close();
  });
  let cover;
  function Probe({ url }) {
    cover = useCoverImage(url);
    return null;
  }
  async function render(url) {
    await React.act(async () =>
      root.render(React.createElement(Probe, { url })),
    );
  }
  await render(undefined);
  assert.equal(cover.status, "missing");
  assert.equal(cover.visible, false);
  await render("https://example.com/first.jpg");
  assert.equal(cover.status, "loading");
  const oldLoad = cover.onLoad,
    oldError = cover.onError;
  await React.act(async () => cover.onError("HTTP 403"));
  assert.equal(cover.status, "failed");
  assert.equal(cover.error, "HTTP 403");
  assert.equal(cover.url, undefined);
  assert.equal(cover.visible, false);
  await render("https://example.com/second.jpg");
  assert.equal(cover.status, "loading");
  assert.equal(cover.error, undefined);
  await React.act(async () => oldLoad());
  assert.equal(cover.status, "loading");
  await React.act(async () => oldError("late failure"));
  assert.equal(cover.status, "loading");
  await React.act(async () => cover.onLoad());
  assert.equal(cover.status, "loaded");
  assert.equal(cover.visible, true);
  assert.equal(cover.url, "https://example.com/second.jpg");
  await render("file:///tmp/cover.jpg");
  assert.equal(cover.status, "missing");
  assert.equal(cover.visible, false);
});

test("Android cover uses row measurements before mounting the image and follows row resizing", async (t) => {
  const dom = new JSDOM('<div id="root"></div>');
  const previous = {
    window: globalThis.window,
    document: globalThis.document,
    act: globalThis.IS_REACT_ACT_ENVIRONMENT,
  };
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let surfaceProps, imageProps, hostProps, details, containerModifiers;
  const load = Module._load;
  Module._load = function (request, parent, ...args) {
    if (request === "react-native")
      return {
        Platform: { OS: "android" },
        StyleSheet: { absoluteFill: {} },
        View: (props) => {
          if (props.onLayout) surfaceProps = props;
          return React.createElement("div", null, props.children);
        },
      };
    if (request === "@expo/ui/jetpack-compose")
      return {
        Box: (props) => {
          containerModifiers = props.modifiers;
          return React.createElement("div", null, props.children);
        },
        RNHostView: (props) => {
          hostProps = props;
          return React.createElement("div", null, props.children);
        },
      };
    if (request === "@expo/ui/jetpack-compose/modifiers")
      return {
        fillMaxWidth: () => ({ type: "fill" }),
        onSizeChanged: (handler) => ({ type: "measure", handler }),
        onVisibilityChanged: (handler) => ({ type: "visibility", handler }),
      };
    if (
      request === "./cover-image" &&
      parent.filename.endsWith("cover-surface.tsx")
    )
      return {
        CoverImage: (props) => {
          imageProps = props;
          return React.createElement("span", { "data-cover": true });
        },
      };
    return load.call(this, request, parent, ...args);
  };
  let CoverSurface;
  try {
    CoverSurface =
      require("../components/watch-list/cover-surface.tsx").default;
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
  await React.act(async () =>
    root.render(
      React.createElement(CoverSurface, {
        url: "https://example.com/cover.jpg",
        children: (visible, nextDetails) => {
          details = nextDetails;
          return React.createElement("p", null, visible ? "covered" : "plain");
        },
      }),
    ),
  );
  assert.equal(
    imageProps,
    undefined,
    "Zero-size images must not start loading before the row is measured",
  );
  await React.act(async () =>
    containerModifiers
      .find((item) => item.type === "measure")
      .handler({ width: 379, height: 110 }),
  );
  assert.equal(
    surfaceProps.style.width,
    379,
    "The row must use the full native container width",
  );
  await React.act(async () =>
    surfaceProps.onLayout({
      nativeEvent: { layout: { width: 379, height: 110 } },
    }),
  );
  assert.equal(
    imageProps,
    undefined,
    "Measured offscreen rows must not load covers",
  );
  await React.act(async () =>
    containerModifiers.find((item) => item.type === "visibility").handler(true),
  );
  assert.deepEqual(imageProps.size, { width: 379, height: 110 });
  assert.equal(hostProps.matchContents, true);
  assert.deepEqual(details.size, imageProps.size);
  await React.act(async () => imageProps.onLoad());
  assert.equal(details.status, "loaded");
  assert.equal(dom.window.document.body.textContent, "covered");
  await React.act(async () =>
    containerModifiers
      .find((item) => item.type === "measure")
      .handler({ width: 520, height: 160 }),
  );
  assert.equal(surfaceProps.style.width, 520);
  await React.act(async () =>
    surfaceProps.onLayout({
      nativeEvent: { layout: { width: 520, height: 160 } },
    }),
  );
  assert.deepEqual(imageProps.size, { width: 520, height: 160 });
  assert.equal(details.status, "loaded");
  await React.act(async () =>
    containerModifiers
      .find((item) => item.type === "visibility")
      .handler(false),
  );
  assert.equal(dom.window.document.querySelector("[data-cover]"), null);
  assert.equal(dom.window.document.body.textContent, "plain");
  await React.act(async () =>
    containerModifiers.find((item) => item.type === "visibility").handler(true),
  );
  assert.ok(dom.window.document.querySelector("[data-cover]"));
  assert.equal(dom.window.document.body.textContent, "covered");
});

test("iOS covers load only for rows intersecting the scroll viewport", async (t) => {
  const dom = new JSDOM('<div id="root"></div>');
  const previous = {
    window: globalThis.window,
    document: globalThis.document,
    act: globalThis.IS_REACT_ACT_ENVIRONMENT,
  };
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  let rowModifiers, imageProps;
  const load = Module._load;
  Module._load = function (request, parent, ...args) {
    if (request === "@expo/ui/swift-ui") {
      const Container = (props) =>
        React.createElement("div", null, props.children);
      Container.Content = Container;
      return {
        Background: Container,
        RNHostView: Container,
        VStack: (props) => {
          rowModifiers = props.modifiers;
          return React.createElement("div", null, props.children);
        },
      };
    }
    if (request === "@expo/ui/swift-ui/modifiers")
      return {
        clipped: () => ({}),
        frame: () => ({}),
        onGeometryChange: (handler) => ({ type: "geometry", handler }),
      };
    if (
      request === "./cover-image" &&
      parent.filename.endsWith("cover-surface.ios.tsx")
    )
      return {
        CoverImage: (props) => {
          imageProps = props;
          return React.createElement("span", { "data-cover": true });
        },
      };
    return load.call(this, request, parent, ...args);
  };
  let CoverSurface;
  try {
    CoverSurface =
      require("../components/watch-list/cover-surface.ios.tsx").default;
  } finally {
    Module._load = load;
  }
  const { CoverViewportContext } = require("../utils/cover-viewport.ts");
  const root = createRoot(dom.window.document.querySelector("#root"));
  t.after(async () => {
    await React.act(async () => root.unmount());
    globalThis.window = previous.window;
    globalThis.document = previous.document;
    globalThis.IS_REACT_ACT_ENVIRONMENT = previous.act;
    dom.window.close();
  });
  async function render(viewport) {
    await React.act(async () =>
      root.render(
        React.createElement(
          CoverViewportContext.Provider,
          { value: viewport },
          React.createElement(CoverSurface, {
            url: "https://example.com/cover.jpg",
            children: (visible) =>
              React.createElement("p", null, visible ? "covered" : "plain"),
          }),
        ),
      ),
    );
  }
  async function position(y) {
    await React.act(async () =>
      rowModifiers
        .find((item) => item.type === "geometry")
        .handler({
          x: 0,
          y,
          width: 300,
          height: 100,
        }),
    );
  }
  await render(null);
  await position(150);
  assert.equal(
    imageProps,
    undefined,
    "Unknown viewport cannot start image requests",
  );
  const viewport = { x: 0, y: 100, width: 300, height: 400 };
  await render(viewport);
  assert.ok(dom.window.document.querySelector("[data-cover]"));
  await React.act(async () => imageProps.onLoad());
  assert.equal(dom.window.document.body.textContent, "covered");
  await position(500);
  assert.equal(dom.window.document.querySelector("[data-cover]"), null);
  await position(499);
  assert.ok(
    dom.window.document.querySelector("[data-cover]"),
    "Partially visible rows load",
  );
  await position(0);
  assert.equal(dom.window.document.querySelector("[data-cover]"), null);
  await position(100);
  assert.ok(dom.window.document.querySelector("[data-cover]"));
  assert.equal(
    imageProps.visible,
    true,
    "Loaded covers retain state when scrolled back",
  );
  await render({ ...viewport, y: 700 });
  assert.equal(dom.window.document.querySelector("[data-cover]"), null);
});
