window.prevTarget = null;
window.prevTargetBorder = null;
window.currentTree = [];
window.isSelectMode = false;
/**
 * Selects the target element and posts a message to the WebView.
 * @param target {HTMLElement | null} The target element to select.
 */
window.selectTarget = (target, resetTree = true) => {
  if (window.prevTarget === target) {
    return;
  }
  if (window.prevTarget)
    window.prevTarget.style.border = window.prevTargetBorder;
  window.prevTarget = target;
  window.prevTargetBorder = target?.style.border ?? "";
  if (target) target.style.border = "1px dashed red";
  if (resetTree) {
    window.currentTree = [];
  }
  if (target) {
    const targetClasses = [...target.classList.values()];
    const index = target.parentElement
      ? [...target.parentElement.children].indexOf(target) + 1
      : 1;
    const targetClassesString =
      targetClasses.length > 0 ? `.${targetClasses.join(".")}` : "";
    window.currentTree = [
      `${target.nodeName}:nth-child(${index})${targetClassesString}`,
      ...window.currentTree,
    ];
  }
  window.ReactNativeWebView.postMessage(
    JSON.stringify({
      type: "targetChange",
      targetClass: target?.className,
      targetContent: target?.innerText,
      targetTree: window.currentTree.join(" > "),
    }),
  );
};
window.addEventListener(
  "click",
  (e) => {
    if (!window.isSelectMode) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    window.selectTarget(e.target, true);
  },
  true,
);
document.addEventListener("message", (e) => {
  /**
   * @type {{ type: string }}
   */
  const data = JSON.parse(e.data);
  if (data.type === "untarget") {
    window.selectTarget(null, true);
    return;
  }
  if (data.type === "testTargetSelector") {
    window.ReactNativeWebView.postMessage(
      JSON.stringify({
        type: "targetSelectorResultCount",
        count: document.querySelectorAll(data.selector).length,
      }),
    );
    return;
  }
  if (data.type === "switchMode") {
    console.log("switching mode", data.isSelect, ">", window.isSelectMode);
    if (!data.isSelect) {
      window.selectTarget(null, true);
    }
    window.isSelectMode = data.isSelect;
    return;
  }
  if (data.type !== "targetParent" || !window.prevTarget.parentNode) return;
  window.selectTarget(window.prevTarget.parentNode, false);
});
