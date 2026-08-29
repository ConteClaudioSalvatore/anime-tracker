const getCurrentEpisode = (ep) =>
  +(
    ep ??
    document.querySelector(".episodes > .episode > a.active")?.textContent ??
    0
  );
// eslint-disable-next-line no-unused-vars
const notifyAnimeEpisode = (videoData, ep, url) => {
  const { progress = null, total = null } = videoData ?? {};
  // gently provided by animeWorld
  const animeTitle = window.animeName;
  const episode = getCurrentEpisode(ep);
  const infoKeys = [];
  const infoValues = [];
  document
    .querySelectorAll(".info > .row > .meta > dt, .info > .row > .meta > dd")
    .forEach((el) => {
      if (el.nodeName === "DT") {
        infoKeys.push(el.textContent.slice(0, -1));
      }
      if (el.nodeName === "DD") {
        infoValues.push(el.textContent);
      }
    });
  const info = Object.fromEntries(infoKeys.map((k, i) => [k, infoValues[i]]));

  window.ReactNativeWebView.postMessage(
    JSON.stringify({
      type: "anime-found",
      payload: { episode, animeTitle, info, progress, total, url },
    }),
  );
};
