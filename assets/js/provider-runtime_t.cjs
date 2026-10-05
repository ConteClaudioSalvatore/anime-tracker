(() => {
  if (window.ProviderRuntime) {
    window.ProviderRuntime.configure(
      window.__providerConfig,
      window.__runtimeMode,
    );
    if (window.__providerProgress)
      window.ProviderRuntime.command({
        type: "episodeProgress",
        progress: window.__providerProgress,
      });
    return;
  }
  const sessionId = window.__providerSession;
  const isMainFrame = window === window.top;
  const frameChannel = "provider-player-frame";
  const framePeers = new Map();
  const observedFrameLoads = new WeakSet();
  let parentBinding = null;
  let documentId = Math.random().toString(36).slice(2);
  let config = window.__providerConfig || {};
  let mode = window.__runtimeMode || "setup";
  let savedProgress = window.__providerProgress || {};
  const highlightedEpisodes = new Map();
  let selectMode = false,
    field = "seriesNameSelector",
    requestId = "",
    selected = null;
  let lastEpisode = 0,
    lastPosted = 0,
    activePlayer = null,
    pendingResume = null,
    awaitingResume = null;
  let lastPlayback = null;
  let playbackFloor = 0;
  const history = [],
    documents = new WeakSet(),
    playerStates = new WeakMap();
  const css = (value) =>
    window.CSS?.escape
      ? window.CSS.escape(value)
      : Array.from(String(value))
          .map((char) =>
            /[\w-]/.test(char)
              ? char
              : `\\${char.codePointAt(0).toString(16)} `,
          )
          .join("");
  const post = (data) => {
    if (!isMainFrame) return;
    window.ReactNativeWebView?.postMessage(
      JSON.stringify({
        channel: "provider-runtime",
        sessionId,
        documentId,
        url: location.href,
        ...data,
      }),
    );
  };
  const text = (element) =>
    (element?.textContent || "").replace(/\s+/g, " ").trim();
  const number = (value) => {
    const match = String(value || "")
      .trim()
      .match(
        /^(?:(?:episode|ep\.?|episodio|episodi|episodes|total|totale)\s*[:#-]?\s*)?(\d+(?:[.,]\d+)?)\s*(?:episodes?|episodi)?$/i,
      );
    return match ? Number(match[1].replace(",", ".")) : NaN;
  };
  const unknownTotal = (value) => {
    const label = String(value || "")
      .trim()
      .replace(
        /^(?:total(?:e)?(?:\s+(?:episodes?|episodi))?|episodes?|episodi)\s*[:#]?\s*/i,
        "",
      )
      .replace(/\s*(?:episodes?|episodi)$/i, "")
      .trim();
    return /^(?:[?\s]+|[-–—…]+|\.{2,}|n\/?a|tba|tbd|unknown|ongoing|not (?:yet )?(?:announced|available|known|specified)|to be (?:announced|determined)|sconosciut[oa]|in corso|da (?:annunciare|definire|determinare))$/i.test(
      label,
    );
  };
  function query(selector, doc = document) {
    try {
      return selector ? [...doc.querySelectorAll(selector)] : [];
    } catch {
      return [];
    }
  }
  function selectorFor(element, doc = document, repeated = false) {
    if (!element || element.nodeType !== 1) return "";
    if (
      !repeated &&
      element.id &&
      query("#" + css(element.id), doc).length === 1
    )
      return "#" + css(element.id);
    const stableClasses = [...element.classList].filter(
      (name) =>
        !/^(active|selected|playing|hover|focus|current)$/i.test(name) &&
        !/\d{5,}/.test(name),
    );
    const part =
      element.tagName.toLowerCase() +
      stableClasses.map((name) => "." + css(name)).join("");
    if (!repeated && query(part, doc).length === 1) return part;
    const parent = element.parentElement;
    if (!parent) return part;
    if (repeated) {
      // Find a shared list container; retain the repeated item's structure within it.
      let container = parent,
        suffix = part;
      while (container.parentElement && container !== doc.body) {
        // A one-episode list must learn the same container as a populated list.
        if (container.matches('ul, ol, [role="list"]'))
          return selectorFor(container, doc) + " > " + suffix;
        const parentPart =
          container.tagName.toLowerCase() +
          [...container.classList]
            .filter((name) => !/^(active|selected)$/i.test(name))
            .map((name) => "." + css(name))
            .join("");
        const siblings = [...container.parentElement.children].filter((item) =>
          item.matches(parentPart),
        );
        if (siblings.length > 1)
          return (
            selectorFor(container.parentElement, doc) +
            " > " +
            parentPart +
            " > " +
            suffix
          );
        if (query(part, container).length > 1)
          return selectorFor(container, doc) + " " + part;
        suffix = parentPart + " > " + suffix;
        container = container.parentElement;
      }
      return selectorFor(parent, doc) + " > " + part;
    }
    const index = [...parent.children].indexOf(element) + 1;
    return (
      selectorFor(parent, doc) + " > " + part + ":nth-child(" + index + ")"
    );
  }
  function evaluate(selector, kind) {
    let elements;
    try {
      elements = selector ? [...document.querySelectorAll(selector)] : [];
    } catch {
      return {
        selector,
        count: 0,
        texts: [],
        values: [],
        valid: false,
        error: "This selection cannot be read. Choose it again.",
        errorCode: "unreadable-selection",
      };
    }
    const texts = elements.map(text),
      values = texts.map(number);
    const valid =
      kind === "seriesNameSelector"
        ? elements.length === 1 && !!texts[0]
        : kind === "totalEpisodesSelector"
          ? elements.length === 1 &&
            ((Number.isInteger(values[0]) && values[0] > 0) ||
              unknownTotal(texts[0]))
          : elements.length > 0 &&
            values.every((value) => Number.isFinite(value) && value > 0) &&
            new Set(values).size === values.length;
    return {
      selector,
      count: elements.length,
      texts: texts.slice(0, 50),
      values: values
        .map((value) => (Number.isFinite(value) ? value : null))
        .slice(0, 50),
      valid,
      errorCode: valid
        ? undefined
        : kind === "seriesNameSelector"
          ? "choose-title"
          : kind === "totalEpisodesSelector"
            ? "choose-total"
            : "choose-episodes",
      error: valid
        ? undefined
        : kind === "seriesNameSelector"
          ? "Choose one series title."
          : kind === "totalEpisodesSelector"
            ? "Choose one total episode count containing a number or an unknown marker such as ?? or TBA."
            : "Choose episode numbers from the same list. Each must contain a distinct number.",
    };
  }
  function clear() {
    if (selected?.element) selected.element.style.outline = selected.outline;
    selected = null;
  }
  function select(element, remember = true) {
    if (!element || element.ownerDocument !== document) return;
    if (remember && selected) history.push(selected.element);
    clear();
    selected = { element, outline: element.style.outline };
    element.style.outline = "3px solid #2677ff";
    const selector = selectorFor(
      element,
      document,
      field === "episodeNumberSelector",
    );
    post({
      type: "selection",
      requestId,
      field,
      preview: evaluate(selector, field),
    });
  }
  function extract() {
    const title = evaluate(config.seriesNameSelector, "seriesNameSelector");
    const episodes = evaluate(
      config.episodeNumberSelector,
      "episodeNumberSelector",
    );
    const total = evaluate(
      config.totalEpisodesSelector,
      "totalEpisodesSelector",
    );
    const active = query(config.episodeNumberSelector).find(
      (element) =>
        element.matches(
          '.active, .selected, [aria-current="true"], [aria-current="page"], [aria-selected="true"]',
        ) || element.parentElement?.matches(".active, .selected"),
    );
    const selectedEpisode =
      number(text(active)) ||
      lastEpisode ||
      (episodes.count === 1 ? episodes.values[0] : 0);
    const episode = Number.isFinite(selectedEpisode) ? selectedEpisode : 0;
    // The announced total is independent of released episodes and pagination.
    return {
      title: title.texts[0] || "",
      episode,
      episodeCount: total.values[0] || 0,
      listedEpisodes: episodes.count,
      valid: title.valid && episodes.valid && total.valid,
      errors: [title, episodes, total]
        .filter((item) => !item.valid)
        .map((item) => item.error),
      errorCodes: [title, episodes, total]
        .filter((item) => !item.valid)
        .map((item) => item.errorCode),
    };
  }
  function highlightEpisodeProgress() {
    const title = evaluate(config.seriesNameSelector, "seriesNameSelector");
    const episodes =
      mode === "watch" &&
      title.valid &&
      Object.prototype.hasOwnProperty.call(savedProgress, title.texts[0])
        ? savedProgress[title.texts[0]]
        : {};
    const highlights = new Map();
    if (mode === "watch")
      query(config.episodeNumberSelector).forEach((element) => {
        const episode = number(text(element)),
          saved = episodes?.[episode];
        if (
          !(episode > 0) ||
          !Number.isFinite(saved?.progress) ||
          !(saved.progress > 0) ||
          !Number.isFinite(saved.total) ||
          !(saved.total > 0)
        )
          return;
        const percent = Math.round(
          Math.min(100, (saved.progress / saved.total) * 100),
        );
        highlights.set(
          element,
          `linear-gradient(to right, #00d30045 ${percent}%, transparent ${percent}%, transparent)`,
        );
      });
    highlightedEpisodes.forEach((previous, element) => {
      if (highlights.has(element)) return;
      if (element.style.backgroundImage === previous.applied) {
        if (previous.value)
          element.style.setProperty(
            "background-image",
            previous.value,
            previous.priority,
          );
        else element.style.removeProperty("background-image");
      }
      highlightedEpisodes.delete(element);
    });
    highlights.forEach((gradient, element) => {
      let previous = highlightedEpisodes.get(element);
      if (!previous || element.style.backgroundImage !== previous.applied) {
        previous = {
          value: element.style.getPropertyValue("background-image"),
          priority: element.style.getPropertyPriority("background-image"),
          applied: "",
        };
        highlightedEpisodes.set(element, previous);
      }
      if (gradient !== previous.gradient) {
        element.style.setProperty("background-image", gradient, "important");
        previous.applied = element.style.backgroundImage;
        previous.gradient = gradient;
      }
    });
  }
  function gatherPlayers(
    doc = document,
    framePath = [],
    depth = 0,
    result = { players: [], inaccessibleFrames: 0 },
  ) {
    if (depth > 8) return result;
    if (isMainFrame) attachDocument(doc);
    query("video", doc).forEach((video) =>
      result.players.push({
        video,
        locator: { selector: selectorFor(video, doc), framePath },
      }),
    );
    query("iframe", doc).forEach((frame) => {
      const peer = framePeers.get(frame);
      if (peer && Date.now() - peer.updatedAt < 2000) {
        const prefix = [...framePath, selectorFor(frame, doc)];
        peer.players.forEach((sample) =>
          result.players.push({
            locator: {
              selector: sample.locator.selector,
              framePath: [...prefix, ...sample.locator.framePath],
            },
            sample,
            peer,
            identity: peer.documentId + ":" + JSON.stringify(sample.locator),
          }),
        );
        result.inaccessibleFrames += peer.inaccessibleFrames;
        return;
      }
      try {
        const child = frame.contentDocument;
        if (!child) {
          result.inaccessibleFrames++;
          return;
        }
        gatherPlayers(
          child,
          [...framePath, selectorFor(frame, doc)],
          depth + 1,
          result,
        );
      } catch {
        result.inaccessibleFrames++;
      }
    });
    return result;
  }
  function stateFor(video) {
    let state = playerStates.get(video);
    if (state) return state;
    state = {
      previous: video.currentTime,
      progress: false,
      resume: false,
      seekTest: false,
      restore: null,
      playbackAt: 0,
    };
    playerStates.set(video, state);
    video.addEventListener("loadedmetadata", () => {
      state.previous = video.currentTime;
      state.progress = false;
      state.resume = false;
      state.seekTest = false;
      state.playbackAt = 0;
    });
    video.addEventListener("seeking", () => {
      state.previous = video.currentTime;
    });
    video.addEventListener("seeked", () => {
      state.previous = video.currentTime;
      if (
        state.seekTest === "seek" &&
        Math.abs(video.currentTime - state.seekTarget) < 0.5
      ) {
        state.seekTest = "restore";
        try {
          video.currentTime = state.restore;
        } catch {
          state.seekTest = false;
          state.resume = false;
        }
      } else if (
        state.seekTest === "restore" &&
        Math.abs(video.currentTime - state.restore) < 0.5
      ) {
        state.seekTest = false;
        state.resume = true;
      }
    });
    return state;
  }
  function resetVideo(video) {
    const state = stateFor(video);
    state.previous = video.currentTime;
    state.progress = false;
    state.resume = false;
    state.seekTest = false;
    state.playbackAt = 0;
  }
  // Only frame-local media data crosses this bridge. Series extraction stays in the main page.
  function framePost(target, data) {
    target.postMessage({ channel: frameChannel, sessionId, ...data }, "*");
  }
  function validFramePlayer(item) {
    return (
      item?.locator &&
      typeof item.locator.selector === "string" &&
      Array.isArray(item.locator.framePath) &&
      item.locator.framePath.length <= 8 &&
      item.locator.framePath.every((part) => typeof part === "string") &&
      [item.time, item.duration, item.playbackAt].every(Number.isFinite) &&
      item.time >= 0 &&
      item.duration >= 0 &&
      item.playbackAt >= 0 &&
      [item.progress, item.resume, item.playing, item.seekable].every(
        (value) => typeof value === "boolean",
      )
    );
  }
  window.addEventListener("message", (event) => {
    const data = event.data;
    if (!data || data.channel !== frameChannel || data.sessionId !== sessionId)
      return;
    if (!isMainFrame && event.source === window.parent) {
      if (
        data.type === "bind" &&
        typeof data.documentId === "string" &&
        typeof data.token === "string"
      ) {
        parentBinding = { documentId: data.documentId, token: data.token };
      } else if (
        data.type === "command" &&
        parentBinding &&
        data.documentId === parentBinding.documentId &&
        data.token === parentBinding.token &&
        data.childDocumentId === documentId &&
        ["choosePlayer", "testSeek", "seekTo", "resetPlayerTest"].includes(
          data.command?.type,
        )
      ) {
        command(data.command);
      }
      return;
    }
    const frame = query("iframe").find(
      (item) => item.contentWindow === event.source,
    );
    if (!frame || typeof data.documentId !== "string") return;
    if (!observedFrameLoads.has(frame)) {
      observedFrameLoads.add(frame);
      frame.addEventListener("load", () => framePeers.delete(frame));
    }
    let peer = framePeers.get(frame);
    if (data.type === "hello") {
      if (!peer || peer.documentId !== data.documentId) {
        peer = {
          frame,
          documentId: data.documentId,
          token: Math.random().toString(36).slice(2),
          players: [],
          inaccessibleFrames: 0,
          updatedAt: 0,
        };
        framePeers.set(frame, peer);
      }
      framePost(event.source, { type: "bind", documentId, token: peer.token });
    } else if (
      data.type === "sample" &&
      peer &&
      data.documentId === peer.documentId &&
      data.parentDocumentId === documentId &&
      data.token === peer.token &&
      Array.isArray(data.players) &&
      data.players.length <= 100 &&
      data.players.every(validFramePlayer) &&
      Number.isInteger(data.inaccessibleFrames) &&
      data.inaccessibleFrames >= 0
    ) {
      peer.players = data.players;
      peer.inaccessibleFrames = data.inaccessibleFrames;
      peer.updatedAt = Date.now();
    }
  });
  function forwardPlayerCommand(candidate, data) {
    const peer = candidate.peer;
    const locator = candidate.sample.locator;
    framePost(peer.frame.contentWindow, {
      type: "command",
      documentId,
      token: peer.token,
      childDocumentId: peer.documentId,
      command: { ...data, locator, documentId: peer.documentId },
    });
  }
  function tick() {
    if (isMainFrame) highlightEpisodeProgress();
    framePeers.forEach((peer, frame) => {
      if (!frame.isConnected) framePeers.delete(frame);
    });
    const found = gatherPlayers();
    const advancingPlayers = new Set();
    const players = found.players.map((item) => {
      const { video, locator } = item;
      if (item.sample) return { ...item.sample, locator };
      const state = stateFor(video);
      if (
        !video.paused &&
        !video.ended &&
        !video.seeking &&
        !state.seekTest &&
        video.currentTime > state.previous + 0.1
      ) {
        state.progress = true;
        state.playbackAt = Date.now();
        advancingPlayers.add(video);
      }
      state.previous = video.currentTime;
      return {
        locator,
        time: Number.isFinite(video.currentTime) ? video.currentTime : 0,
        duration: Number.isFinite(video.duration) ? video.duration : 0,
        progress:
          state.progress &&
          Number.isFinite(video.duration) &&
          video.duration > 0,
        resume: state.resume,
        playing: !video.paused && !video.ended,
        seekable: video.seekable.length > 0,
        playbackAt: state.playbackAt,
      };
    });
    if (!isMainFrame) {
      framePost(window.parent, { type: "hello", documentId });
      if (parentBinding)
        framePost(window.parent, {
          type: "sample",
          documentId,
          parentDocumentId: parentBinding.documentId,
          token: parentBinding.token,
          players,
          inaccessibleFrames: found.inaccessibleFrames,
        });
      return;
    }
    post({
      type: "players",
      players,
      inaccessibleFrames: found.inaccessibleFrames,
      frameTrackingAvailable: window.__providerFrameInjectionAvailable,
    });
    const configured =
      config.player &&
      found.players.find(
        (item) =>
          JSON.stringify(item.locator) === JSON.stringify(config.player),
      );
    const chosen =
      configured ||
      (!config.player && found.players.length === 1 ? found.players[0] : null);
    const video = chosen?.video;
    const sample = chosen && players[found.players.indexOf(chosen)];
    if (mode !== "watch" || !chosen) return;
    activePlayer = chosen;
    const preview = extract();
    if (!preview.valid || !(preview.episode > 0)) return;
    const identity = chosen.identity || video;
    if (
      advancingPlayers.has(video) ||
      (chosen.sample &&
        sample.playbackAt > playbackFloor &&
        sample.playbackAt > (lastPlayback?.at || 0))
    )
      lastPlayback = {
        video: identity,
        title: preview.title,
        episode: preview.episode,
        at: sample.playbackAt,
      };
    if (
      pendingResume &&
      pendingResume.title === preview.title &&
      pendingResume.episode === preview.episode &&
      sample.duration > 0 &&
      sample.seekable
    ) {
      const resume = pendingResume;
      pendingResume = null;
      try {
        const position = Math.min(
          Math.max(0, resume.progress),
          Math.max(0, sample.duration - 1),
        );
        if (chosen.peer) {
          awaitingResume = {
            title: preview.title,
            episode: preview.episode,
            identity,
            position,
            startedAt: Date.now(),
          };
          forwardPlayerCommand(chosen, { type: "seekTo", progress: position });
          return;
        }
        video.currentTime = position;
      } catch {
        /* Playback can still be tracked when seeking is unavailable. */
      }
    }
    if (awaitingResume) {
      const resume = awaitingResume;
      const elapsed = Date.now() - resume.startedAt;
      const samePlayer =
        resume.title === preview.title &&
        resume.episode === preview.episode &&
        resume.identity === identity;
      // Seeking across frames is asynchronous. Do not persist a cached pre-seek sample.
      const reachedPosition =
        sample.time >= resume.position - 0.5 &&
        sample.time <= resume.position + elapsed / 1000 + 1;
      if (samePlayer && !reachedPosition && elapsed < 5000) return;
      awaitingResume = null;
    }
    if (
      Date.now() - lastPosted < 1000 ||
      !Number.isFinite(sample.duration) ||
      sample.duration <= 0
    )
      return;
    lastPosted = Date.now();
    post({
      type: "anime-found",
      payload: {
        animeTitle: preview.title,
        episode: preview.episode,
        episodeCount:
          preview.episodeCount > 0 ? preview.episodeCount : undefined,
        lastPlayedAt:
          lastPlayback?.video === identity &&
          lastPlayback.title === preview.title &&
          lastPlayback.episode === preview.episode
            ? lastPlayback.at
            : undefined,
        progress: video ? video.currentTime : sample.time,
        total: sample.duration,
        providerId: config.id,
        url: location.href,
      },
    });
  }
  function attachDocument(doc) {
    if (documents.has(doc)) return;
    documents.add(doc);
    doc.addEventListener(
      "click",
      (event) => {
        const target =
          event.target?.nodeType === 1
            ? event.target
            : event.target?.parentElement;
        if (selectMode && doc === document) {
          event.preventDefault();
          event.stopImmediatePropagation();
          select(target);
          return;
        }
        if (doc !== document || !target) return;
        let element;
        try {
          element = target.closest(
            config.episodeNumberSelector || "video:not(video)",
          );
        } catch {
          return;
        }
        if (element) {
          const episode = number(text(element));
          if (episode > 0) {
            lastEpisode = episode;
            lastPosted = 0;
            pendingResume = null;
            awaitingResume = null;
            if (activePlayer?.peer)
              forwardPlayerCommand(activePlayer, { type: "resetPlayerTest" });
            else if (activePlayer?.video) resetVideo(activePlayer.video);
            lastPlayback = null;
            playbackFloor = Date.now();
            framePeers.clear();
            if (mode === "watch") {
              const preview = extract();
              if (preview.valid)
                post({
                  type: "anime-found",
                  payload: {
                    animeTitle: preview.title,
                    episode,
                    episodeCount:
                      preview.episodeCount > 0
                        ? preview.episodeCount
                        : undefined,
                    providerId: config.id,
                    url: element.href || location.href,
                  },
                });
            }
          }
        }
      },
      true,
    );
  }
  function command(data) {
    if (!data || (data.documentId && data.documentId !== documentId)) return;
    if (data.type === "configure") {
      window.ProviderRuntime.configure(data.config, data.mode);
      return;
    }
    if (data.type === "episodeProgress") {
      savedProgress = data.progress || {};
      highlightEpisodeProgress();
      return;
    }
    if (data.type === "reportReady") {
      post({ type: "ready" });
      return;
    }
    if (data.type === "selectMode") {
      selectMode = !!data.enabled;
      field = data.field || field;
      requestId = data.requestId || "";
      clear();
      history.length = 0;
      return;
    }
    if (data.type === "parent") {
      if (
        selected?.element?.parentElement &&
        selected.element.parentElement !== document.body
      )
        select(selected.element.parentElement);
      return;
    }
    if (data.type === "undo") {
      const element = history.pop();
      if (element?.isConnected) select(element, false);
      return;
    }
    if (data.type === "evaluate") {
      post({
        type: "selection",
        requestId: data.requestId,
        field: data.field,
        preview: evaluate(data.selector, data.field),
      });
      return;
    }
    if (data.type === "extract") {
      post({
        type: "extraction",
        requestId: data.requestId,
        preview: extract(),
      });
      return;
    }
    if (data.type === "resume") {
      pendingResume = data.resume;
      return;
    }
    if (["choosePlayer", "testSeek", "seekTo"].includes(data.type)) {
      const candidate = gatherPlayers().players.find(
        (item) => JSON.stringify(item.locator) === JSON.stringify(data.locator),
      );
      if (!candidate) return;
      if (candidate.peer) {
        if (data.type === "choosePlayer")
          candidate.peer.frame.scrollIntoView?.({ block: "center" });
        forwardPlayerCommand(candidate, data);
        return;
      }
      if (data.type === "seekTo") {
        const video = candidate.video;
        if (
          Number.isFinite(data.progress) &&
          video.duration > 0 &&
          video.seekable.length
        ) {
          try {
            video.currentTime = Math.min(
              Math.max(0, data.progress),
              Math.max(0, video.duration - 1),
            );
          } catch {
            /* Some players expose time but do not permit seeking. */
          }
        }
        return;
      }
      if (data.type === "testSeek") {
        testSeek(candidate.video);
        return;
      }
      candidate.video.scrollIntoView?.({ block: "center" });
      const outline = candidate.video.style.outline;
      candidate.video.style.outline = "3px solid #2677ff";
      setTimeout(() => {
        candidate.video.style.outline = outline;
      }, 2000);
      return;
    }
    if (data.type === "resetPlayerTest") {
      const resetPeers = new Set();
      gatherPlayers().players.forEach((item) => {
        if (item.peer) {
          if (!resetPeers.has(item.peer)) forwardPlayerCommand(item, data);
          resetPeers.add(item.peer);
        } else resetVideo(item.video);
      });
      framePeers.clear();
    }
  }
  function testSeek(video) {
    const state = stateFor(video);
    if (!(video.duration > 0) || !video.seekable.length) return;
    state.restore = video.currentTime;
    state.seekTarget = Math.min(video.duration - 0.1, video.currentTime + 1);
    if (Math.abs(state.restore - state.seekTarget) < 0.2)
      state.seekTarget = Math.max(0, video.currentTime - 1);
    state.seekTest = "seek";
    setTimeout(() => {
      if (state.seekTest) {
        state.seekTest = false;
        state.resume = false;
      }
    }, 5000);
    try {
      video.currentTime = state.seekTarget;
    } catch {
      state.seekTest = false;
    }
  }
  window.ProviderRuntime = {
    command,
    configure(next, nextMode) {
      config = next || {};
      mode = nextMode || mode;
      if (isMainFrame) highlightEpisodeProgress();
    },
    evaluate,
    extract,
    selectorFor,
    gatherPlayers,
    tick,
    number,
    documentId,
  };
  function ready() {
    if (isMainFrame) {
      attachDocument(document);
      post({ type: "ready" });
    }
    tick();
  }
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", ready, { once: true });
  else ready();
  let interval = setInterval(tick, 500);
  window.addEventListener("pagehide", () => {
    clearInterval(interval);
    interval = null;
    framePeers.clear();
    parentBinding = null;
  });
  window.addEventListener("pageshow", (event) => {
    if (!event.persisted) return;
    documentId = Math.random().toString(36).slice(2);
    if (!interval) interval = setInterval(tick, 500);
    ready();
  });
})();
