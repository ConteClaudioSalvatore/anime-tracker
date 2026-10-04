const fs = require('node:fs');
const path = require('node:path');

const marker = 'AnimeTrackerFrameInjection';

function replaceOnce(source, before, after) {
  if (source.split(before).length !== 2) {
    throw new Error('The react-native-webview Android source changed. Review the frame injection patch before building.');
  }
  return source.replace(before, after);
}

function patchJava(source) {
  if (source.includes(marker)) return source;
  source = replaceOnce(source, '    protected boolean messagingEnabled = false;', `    // ${marker}: honor the existing all-frame prop through AndroidX WebKit.
    private androidx.webkit.ScriptHandler frameInjectionScript;

    public void updateFrameInjectionScript() {
        if (frameInjectionScript != null) {
            frameInjectionScript.remove();
            frameInjectionScript = null;
        }
        if (!injectedJavaScriptBeforeContentLoadedForMainFrameOnly &&
                !TextUtils.isEmpty(injectedJSBeforeContentLoaded) &&
                WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
            frameInjectionScript = WebViewCompat.addDocumentStartJavaScript(this,
                    "window.__providerFrameInjectionAvailable=true;\\n" + injectedJSBeforeContentLoaded,
                    java.util.Collections.singleton("*"));
        }
    }

    protected boolean messagingEnabled = false;`);
  source = replaceOnce(source,
    '            evaluateJavascriptWithFallback("(function() {\\n" + injectedJSBeforeContentLoaded + ";\\n})();");',
    '            evaluateJavascriptWithFallback("window.__providerFrameInjectionAvailable=" + (frameInjectionScript != null) + ";(function() {\\n" + injectedJSBeforeContentLoaded + ";\\n})();");');
  return replaceOnce(source, '    public void destroy() {', `    public void destroy() {
        if (frameInjectionScript != null) {
            frameInjectionScript.remove();
            frameInjectionScript = null;
        }`);
}

function patchManager(source) {
  if (source.includes(marker)) return source;
  for (const assignment of [
    'view.injectedJSBeforeContentLoaded = value',
    'view.injectedJavaScriptBeforeContentLoadedForMainFrameOnly = value',
  ]) {
    source = replaceOnce(source, assignment,
      `${assignment}\n        view.updateFrameInjectionScript() // ${marker}`);
  }
  return source;
}

function applyPatch() {
  const packagePath = require.resolve('react-native-webview/package.json');
  const { version } = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  if (version !== '13.16.1') {
    throw new Error(`Review the WebView frame injection patch for react-native-webview ${version}. Expected 13.16.1.`);
  }
  const directory = path.join(path.dirname(packagePath), 'android/src/main/java/com/reactnativecommunity/webview');
  // Validate both replacements before writing either dependency file.
  const files = [
    ['RNCWebView.java', patchJava],
    ['RNCWebViewManagerImpl.kt', patchManager],
  ].map(([file, patch]) => {
    const filename = path.join(directory, file);
    const original = fs.readFileSync(filename, 'utf8');
    return { filename, original, patched: patch(original) };
  });
  for (const { filename, original, patched } of files) {
    if (patched !== original) fs.writeFileSync(filename, patched);
  }
}

if (require.main === module) applyPatch();
module.exports = { patchJava, patchManager };
