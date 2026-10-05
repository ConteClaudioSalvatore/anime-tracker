const { test } = require('node:test');
const assert = require('node:assert/strict');
const { patchJava, patchManager } = require('../scripts/patch-webview.cjs');

// Minimal upstream source fragments exercise the installer without changing dependencies.
const java = `    protected boolean messagingEnabled = false;
            evaluateJavascriptWithFallback("(function() {\\n" + injectedJSBeforeContentLoaded + ";\\n})();");
    public void destroy() {`;
const manager = `view.injectedJSBeforeContentLoaded = value
view.injectedJavaScriptBeforeContentLoadedForMainFrameOnly = value`;

test('Android frame injection patch is idempotent and guards the native feature', () => {
  const patchedJava = patchJava(java);
  const patchedManager = patchManager(manager);
  assert.equal(patchJava(patchedJava), patchedJava);
  assert.equal(patchManager(patchedManager), patchedManager);
  assert.match(patchedJava, /WebViewFeature\.isFeatureSupported\(WebViewFeature\.DOCUMENT_START_SCRIPT\)/);
  assert.match(patchedJava, /WebViewCompat\.addDocumentStartJavaScript/);
  assert.match(patchedJava, /!injectedJavaScriptBeforeContentLoadedForMainFrameOnly/);
  assert.match(patchedJava, /__providerFrameInjectionAvailable=/);
  assert.equal(patchedJava.split('frameInjectionScript.remove();').length - 1, 2);
  assert.equal(patchedManager.split('view.updateFrameInjectionScript()').length - 1, 2);
});

test('Android patch refuses changed or ambiguous upstream source', () => {
  assert.throws(() => patchJava('unrecognized upstream source'), /source changed/);
  assert.throws(() => patchManager(manager + '\n' + manager), /source changed/);
});
