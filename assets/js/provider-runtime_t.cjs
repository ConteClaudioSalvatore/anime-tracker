(() => {
  if (window.ProviderRuntime) {
    window.ProviderRuntime.configure(window.__providerConfig, window.__runtimeMode);
    if (window.__providerProgress) window.ProviderRuntime.command({ type: 'episodeProgress', progress: window.__providerProgress });
    return;
  }
  const sessionId = window.__providerSession;
  let documentId = Math.random().toString(36).slice(2);
  let config = window.__providerConfig || {};
  let mode = window.__runtimeMode || 'setup';
  let savedProgress = window.__providerProgress || {};
  const highlightedEpisodes = new Map();
  let selectMode = false, field = 'seriesNameSelector', requestId = '', selected = null;
  let lastEpisode = 0, lastPosted = 0, activePlayer = null, pendingResume = null;
  const history = [], documents = new WeakSet(), playerStates = new WeakMap();
  const css = value => window.CSS?.escape ? window.CSS.escape(value) : Array.from(String(value)).map(char => /[\w-]/.test(char) ? char : `\\${char.codePointAt(0).toString(16)} `).join('');
  const post = data => window.ReactNativeWebView?.postMessage(JSON.stringify({ channel: 'provider-runtime', sessionId, documentId, url: location.href, ...data }));
  const text = element => (element?.textContent || '').replace(/\s+/g, ' ').trim();
  const number = value => {
    const match = String(value || '').trim().match(/^(?:(?:episode|ep\.?|episodio|episodi|episodes|total|totale)\s*[:#-]?\s*)?(\d+(?:[.,]\d+)?)\s*(?:episodes?|episodi)?$/i);
    return match ? Number(match[1].replace(',', '.')) : NaN;
  };
  function query(selector, doc = document) { try { return selector ? [...doc.querySelectorAll(selector)] : []; } catch { return []; } }
  function selectorFor(element, doc = document, repeated = false) {
    if (!element || element.nodeType !== 1) return '';
    if (!repeated && element.id && query('#' + css(element.id), doc).length === 1) return '#' + css(element.id);
    const stableClasses = [...element.classList].filter(name => !/^(active|selected|playing|hover|focus|current)$/i.test(name) && !/\d{5,}/.test(name));
    const part = element.tagName.toLowerCase() + stableClasses.map(name => '.' + css(name)).join('');
    if (!repeated && query(part, doc).length === 1) return part;
    const parent = element.parentElement;
    if (!parent) return part;
    if (repeated) {
      // Find a shared list container; retain the repeated item's structure within it.
      let container = parent, suffix = part;
      while (container.parentElement && container !== doc.body) {
        // A one-episode list must learn the same container as a populated list.
        if (container.matches('ul, ol, [role="list"]')) return selectorFor(container, doc) + ' > ' + suffix;
        const parentPart = container.tagName.toLowerCase() + [...container.classList].filter(name => !/^(active|selected)$/i.test(name)).map(name => '.' + css(name)).join('');
        const siblings = [...container.parentElement.children].filter(item => item.matches(parentPart));
        if (siblings.length > 1) return selectorFor(container.parentElement, doc) + ' > ' + parentPart + ' > ' + suffix;
        if (query(part, container).length > 1) return selectorFor(container, doc) + ' ' + part;
        suffix = parentPart + ' > ' + suffix;
        container = container.parentElement;
      }
      return selectorFor(parent, doc) + ' > ' + part;
    }
    const index = [...parent.children].indexOf(element) + 1;
    return selectorFor(parent, doc) + ' > ' + part + ':nth-child(' + index + ')';
  }
  function evaluate(selector, kind) {
    let elements;
    try { elements = selector ? [...document.querySelectorAll(selector)] : []; }
    catch { return { selector, count: 0, texts: [], values: [], valid: false, error: 'This selection cannot be read. Choose it again.' }; }
    const texts = elements.map(text), values = texts.map(number);
    const valid = kind === 'seriesNameSelector' ? elements.length === 1 && !!texts[0] :
      kind === 'totalEpisodesSelector' ? elements.length === 1 && Number.isInteger(values[0]) && values[0] > 0 :
      elements.length > 0 && values.every(value => Number.isFinite(value) && value > 0) && new Set(values).size === values.length;
    return { selector, count: elements.length, texts: texts.slice(0, 50), values: values.map(value => Number.isFinite(value) ? value : null).slice(0, 50), valid,
      error: valid ? undefined : kind === 'seriesNameSelector' ? 'Choose one series title.' : kind === 'totalEpisodesSelector' ? 'Choose one total episode count containing a number.' : 'Choose episode numbers from the same list. Each must contain a distinct number.' };
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
    element.style.outline = '3px solid #2677ff';
    const selector = selectorFor(element, document, field === 'episodeNumberSelector');
    post({ type: 'selection', requestId, field, preview: evaluate(selector, field) });
  }
  function extract() {
    const title = evaluate(config.seriesNameSelector, 'seriesNameSelector');
    const episodes = evaluate(config.episodeNumberSelector, 'episodeNumberSelector');
    const total = evaluate(config.totalEpisodesSelector, 'totalEpisodesSelector');
    const active = query(config.episodeNumberSelector).find(element => element.matches('.active, .selected, [aria-current="true"], [aria-current="page"], [aria-selected="true"]') || element.parentElement?.matches('.active, .selected'));
    const selectedEpisode = number(text(active)) || lastEpisode || (episodes.count === 1 ? episodes.values[0] : 0);
    const episode = Number.isFinite(selectedEpisode) ? selectedEpisode : 0;
    // The announced total is independent of released episodes and pagination.
    return { title: title.texts[0] || '', episode, episodeCount: total.values[0] || 0, listedEpisodes: episodes.count,
      valid: title.valid && episodes.valid && total.valid, errors: [title, episodes, total].filter(item => !item.valid).map(item => item.error) };
  }
  function highlightEpisodeProgress() {
    const title = evaluate(config.seriesNameSelector, 'seriesNameSelector');
    const episodes = mode === 'watch' && title.valid && Object.prototype.hasOwnProperty.call(savedProgress, title.texts[0]) ? savedProgress[title.texts[0]] : {};
    const highlights = new Map();
    if (mode === 'watch') query(config.episodeNumberSelector).forEach(element => {
      const episode = number(text(element)), saved = episodes?.[episode];
      if (!(episode > 0) || !Number.isFinite(saved?.progress) || !(saved.progress > 0) || !Number.isFinite(saved.total) || !(saved.total > 0)) return;
      const percent = Math.round(Math.min(100, saved.progress / saved.total * 100));
      highlights.set(element, `linear-gradient(to right, #00d30045 ${percent}%, transparent ${percent}%, transparent)`);
    });
    highlightedEpisodes.forEach((previous, element) => {
      if (highlights.has(element)) return;
      if (element.style.backgroundImage === previous.applied) {
        if (previous.value) element.style.setProperty('background-image', previous.value, previous.priority);
        else element.style.removeProperty('background-image');
      }
      highlightedEpisodes.delete(element);
    });
    highlights.forEach((gradient, element) => {
      let previous = highlightedEpisodes.get(element);
      if (!previous || element.style.backgroundImage !== previous.applied) {
        previous = { value: element.style.getPropertyValue('background-image'), priority: element.style.getPropertyPriority('background-image'), applied: '' };
        highlightedEpisodes.set(element, previous);
      }
      if (gradient !== previous.gradient) {
        element.style.setProperty('background-image', gradient, 'important');
        previous.applied = element.style.backgroundImage;
        previous.gradient = gradient;
      }
    });
  }
  function gatherPlayers(doc = document, framePath = [], depth = 0, result = { players: [], inaccessibleFrames: 0 }) {
    if (depth > 8) return result;
    attachDocument(doc);
    query('video', doc).forEach(video => result.players.push({ video, locator: { selector: selectorFor(video, doc), framePath } }));
    query('iframe', doc).forEach(frame => {
      try {
        const child = frame.contentDocument;
        if (!child) { result.inaccessibleFrames++; return; }
        gatherPlayers(child, [...framePath, selectorFor(frame, doc)], depth + 1, result);
      } catch { result.inaccessibleFrames++; }
    });
    return result;
  }
  function stateFor(video) {
    let state = playerStates.get(video);
    if (state) return state;
    state = { previous: video.currentTime, progress: false, resume: false, seekTest: false, restore: null };
    playerStates.set(video, state);
    video.addEventListener('loadedmetadata', () => { state.previous = video.currentTime; state.progress = false; state.resume = false; state.seekTest = false; });
    video.addEventListener('seeking', () => { state.previous = video.currentTime; });
    video.addEventListener('seeked', () => {
      state.previous = video.currentTime;
      if (state.seekTest === 'seek' && Math.abs(video.currentTime - state.seekTarget) < 0.5) {
        state.seekTest = 'restore';
        try { video.currentTime = state.restore; } catch { state.seekTest = false; state.resume = false; }
      } else if (state.seekTest === 'restore' && Math.abs(video.currentTime - state.restore) < 0.5) {
        state.seekTest = false; state.resume = true;
      }
    });
    return state;
  }
  function resetVideo(video) {
    const state = stateFor(video);
    state.previous = video.currentTime; state.progress = false; state.resume = false; state.seekTest = false;
  }
  function tick() {
    highlightEpisodeProgress();
    const found = gatherPlayers();
    const players = found.players.map(({ video, locator }) => {
      const state = stateFor(video);
      if (!video.paused && !video.seeking && !state.seekTest && video.currentTime > state.previous + 0.1) state.progress = true;
      state.previous = video.currentTime;
      return { locator, time: Number.isFinite(video.currentTime) ? video.currentTime : 0, duration: Number.isFinite(video.duration) ? video.duration : 0, progress: state.progress && Number.isFinite(video.duration) && video.duration > 0, resume: state.resume, playing: !video.paused && !video.ended };
    });
    post({ type: 'players', players, inaccessibleFrames: found.inaccessibleFrames });
    const configured = config.player && found.players.find(item => JSON.stringify(item.locator) === JSON.stringify(config.player));
    const chosen = configured || (!config.player && found.players.length === 1 ? found.players[0] : null);
    const video = chosen?.video;
    if (mode !== 'watch' || !video) return;
    activePlayer = video;
    const preview = extract();
    if (!preview.valid || !(preview.episode > 0)) return;
    if (pendingResume && pendingResume.title === preview.title && pendingResume.episode === preview.episode && video.duration > 0 && video.seekable.length > 0) {
      const resume = pendingResume; pendingResume = null;
      try { video.currentTime = Math.min(Math.max(0, resume.progress), Math.max(0, video.duration - 1)); } catch { /* Playback can still be tracked when seeking is unavailable. */ }
    }
    if (Date.now() - lastPosted < 1000 || !Number.isFinite(video.duration) || video.duration <= 0) return;
    lastPosted = Date.now();
    post({ type: 'anime-found', payload: { animeTitle: preview.title, episode: preview.episode, episodeCount: preview.episodeCount,
      progress: video.currentTime, total: video.duration, providerId: config.id, url: location.href } });
  }
  function attachDocument(doc) {
    if (documents.has(doc)) return;
    documents.add(doc);
    doc.addEventListener('click', event => {
      const target = event.target?.nodeType === 1 ? event.target : event.target?.parentElement;
      if (selectMode && doc === document) {
        event.preventDefault(); event.stopImmediatePropagation(); select(target); return;
      }
      if (doc !== document || !target) return;
      let element;
      try { element = target.closest(config.episodeNumberSelector || 'video:not(video)'); } catch { return; }
      if (element) {
        const episode = number(text(element));
        if (episode > 0) {
          lastEpisode = episode; lastPosted = 0; pendingResume = null;
          if (activePlayer) resetVideo(activePlayer);
          if (mode === 'watch') {
            const preview = extract();
            if (preview.valid) post({ type: 'anime-found', payload: { animeTitle: preview.title, episode, episodeCount: preview.episodeCount, providerId: config.id, url: element.href || location.href } });
          }
        }
      }
    }, true);
  }
  function command(data) {
    if (!data || (data.documentId && data.documentId !== documentId)) return;
    if (data.type === 'configure') { window.ProviderRuntime.configure(data.config, data.mode); return; }
    if (data.type === 'episodeProgress') { savedProgress = data.progress || {}; highlightEpisodeProgress(); return; }
    if (data.type === 'reportReady') { post({ type: 'ready' }); return; }
    if (data.type === 'selectMode') { selectMode = !!data.enabled; field = data.field || field; requestId = data.requestId || ''; clear(); history.length = 0; return; }
    if (data.type === 'parent') { if (selected?.element?.parentElement && selected.element.parentElement !== document.body) select(selected.element.parentElement); return; }
    if (data.type === 'undo') { const element = history.pop(); if (element?.isConnected) select(element, false); return; }
    if (data.type === 'evaluate') { post({ type: 'selection', requestId: data.requestId, field: data.field, preview: evaluate(data.selector, data.field) }); return; }
    if (data.type === 'extract') { post({ type: 'extraction', requestId: data.requestId, preview: extract() }); return; }
    if (data.type === 'resume') { pendingResume = data.resume; return; }
    if (data.type === 'choosePlayer') {
      const candidate = gatherPlayers().players.find(item => JSON.stringify(item.locator) === JSON.stringify(data.locator));
      if (!candidate) return;
      candidate.video.scrollIntoView?.({ block: 'center' });
      const outline = candidate.video.style.outline;
      candidate.video.style.outline = '3px solid #2677ff';
      setTimeout(() => { candidate.video.style.outline = outline; }, 2000);
      return;
    }
    if (data.type === 'testSeek') {
      const candidate = gatherPlayers().players.find(item => JSON.stringify(item.locator) === JSON.stringify(data.locator));
      if (!candidate) return;
      const video = candidate.video, state = stateFor(video);
      if (!(video.duration > 0) || !video.seekable.length) return;
      state.restore = video.currentTime; state.seekTarget = Math.min(video.duration - 0.1, video.currentTime + 1);
      if (Math.abs(state.restore - state.seekTarget) < 0.2) state.seekTarget = Math.max(0, video.currentTime - 1);
      state.seekTest = 'seek';
      setTimeout(() => { if (state.seekTest) { state.seekTest = false; state.resume = false; } }, 5000);
      try { video.currentTime = state.seekTarget; } catch { state.seekTest = false; }
      return;
    }
    if (data.type === 'resetPlayerTest') { gatherPlayers().players.forEach(item => resetVideo(item.video)); }
  }
  window.ProviderRuntime = { command, configure(next, nextMode) { config = next || {}; mode = nextMode || mode; highlightEpisodeProgress(); }, evaluate, extract, selectorFor, gatherPlayers, tick, number, documentId };
  function ready() { attachDocument(document); post({ type: 'ready' }); tick(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready, { once: true }); else ready();
  let interval = setInterval(tick, 500);
  window.addEventListener('pagehide', () => { clearInterval(interval); interval = null; });
  window.addEventListener('pageshow', event => {
    if (!event.persisted) return;
    documentId = Math.random().toString(36).slice(2);
    if (!interval) interval = setInterval(tick, 500);
    ready();
  });
})();
