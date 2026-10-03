const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');
const { JSDOM } = require('jsdom');

// Run the production TypeScript modules directly, without a second test implementation.
const root = path.resolve(__dirname, '..');
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...args) {
  return resolve.call(this, request.startsWith('@/') ? path.join(root, request.slice(2)) : request, parent, ...args);
};
require.extensions['.ts'] = (module, filename) => {
  const result = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  module._compile(result.outputText, filename);
};
const helpers = require('../utils/provider-runtime.ts');
const bridge = require('../model/provider-runtime.model.ts');
const { WriteQueue } = require('../utils/write-queue.ts');
const { ProviderPageChecks } = require('../utils/provider-page-checks.ts');
const { reducer } = require('../store/app.state.ts');
const actions = require('../store/app.actions.ts');
const { sortWatchList, watchListSummary } = require('../utils/watch-list.ts');
const script = fs.readFileSync(path.join(root, 'assets/js/provider-runtime_t.cjs'), 'utf8');
const fixture = fs.readFileSync(path.join(__dirname, 'fixtures/series.html'), 'utf8');
const provider = {
  id: 4, name: 'User website', origin: 'https://example.com/', whiteListedOrigins: [], isDefault: false,
  seriesPageOrigin: 'https://example.com/series/', seriesNameSelector: '#series\\:title',
  episodeNumberSelector: '#episode-list > li > a', totalEpisodesSelector: '#episode-total', isPlayerSupported: true,
};
function setup(html = fixture, mode = 'setup', config = provider, progress = {}) {
  const dom = new JSDOM(html, { url: 'https://example.com/series/example/1', runScripts: 'outside-only' });
  const win = dom.window, messages = [];
  win.__providerSession = 'session'; win.__providerConfig = config; win.__runtimeMode = mode;
  win.__providerProgress = progress;
  win.ReactNativeWebView = { postMessage: raw => messages.push(JSON.parse(raw)) };
  win.setInterval = () => 1; win.clearInterval = () => {};
  win.eval(script);
  win.document.dispatchEvent(new win.Event('DOMContentLoaded'));
  return { win, dom, messages, runtime: win.ProviderRuntime };
}
function videoState(win, video = win.document.querySelector('video')) {
  const state = { time: 0, duration: 120, paused: false, seekable: true };
  Object.defineProperties(video, {
    currentTime: { configurable: true, get: () => state.time, set: value => { state.time = value; video.dispatchEvent(new win.Event('seeked')); } },
    duration: { configurable: true, get: () => state.duration },
    paused: { configurable: true, get: () => state.paused },
    seeking: { configurable: true, get: () => false },
    seekable: { configurable: true, get: () => ({ length: state.seekable ? 1 : 0 }) },
  });
  return state;
}

test('URLs normalize safely and approved origins use exact equality', () => {
  assert.equal(helpers.normalizeWebsite(' example.com/home '), 'https://example.com/home');
  assert.throws(() => helpers.normalizeWebsite('javascript:alert(1)'));
  assert.equal(helpers.allowedUrl(provider, 'https://example.com.evil.test/'), false);
  assert.equal(helpers.allowedUrl({ ...provider, whiteListedOrigins: ['https://mirror.example.com'] }, 'https://mirror.example.com/series'), true);
  assert.equal(helpers.providerForUrl([], 'https://example.com/'), undefined);
});
test('saved series select their recorded website even when another provider shares its alias', () => {
  const other = { ...provider, id: 9, origin: 'https://other.example/', whiteListedOrigins: [provider.origin] };
  const state = reducer({ anime: {}, providers: [other, provider] }, actions.animeUpdated(provider.origin, {
    animeTitle: 'Series', episode: 3, providerId: provider.id, url: 'https://example.com/series/three', lastPlayedAt: 1700000000000,
  }));
  const entry = state.anime.Series;
  assert.equal(entry.latestVisitedUrl, 'https://example.com/series/three');
  assert.equal(helpers.providerForUrl(state.providers, entry.latestVisitedUrl, entry.providerId).id, provider.id);
  assert.equal(helpers.providerForUrl([provider], entry.latestVisitedUrl).id, provider.id);
  assert.equal(helpers.providerForUrl([{ ...other, whiteListedOrigins: [] }], entry.latestVisitedUrl, entry.providerId), undefined);
});
test('recent sorting handles legacy dates and ties, retains name sorting, and leaves history untouched', () => {
  const entries = [['Zulu', { lastPlayedAt: 2000 }], ['Beta', {}], ['Alpha', { lastPlayedAt: 2000 }], ['Recent', { lastPlayedAt: 3000 }], ['Invalid', { lastPlayedAt: NaN }]];
  const original = entries.map(([name]) => name);
  assert.deepEqual(sortWatchList(entries, 'recent').map(([name]) => name), ['Recent', 'Alpha', 'Zulu', 'Beta', 'Invalid']);
  assert.deepEqual(sortWatchList(entries, 'name-asc').map(([name]) => name), ['Alpha', 'Beta', 'Invalid', 'Recent', 'Zulu']);
  assert.deepEqual(sortWatchList(entries, 'name-desc').map(([name]) => name), ['Zulu', 'Recent', 'Invalid', 'Beta', 'Alpha']);
  assert.deepEqual(entries.map(([name]) => name), original);
});
test('watch list summaries include only names and overall progress, including manual and legacy entries', () => {
  const history = {
    Ongoing: { name: 'Ongoing', highestWatchedEpisode: 3, total: 12, providerId: 4, latestVisitedUrl: 'https://example.com/private', lastPlayedAt: 1700000000000, episodeProgress: { 3: { progress: 30, total: 120 } } },
    Manual: { highestWatchedEpisode: 2, finished: true },
    Completed: { highestWatchedEpisode: 12, total: 12, episodeProgress: { 12: { progress: 115, total: 120 } } },
  };
  assert.deepEqual(watchListSummary(history), [
    { name: 'Completed', highestWatchedEpisode: 12, totalEpisodes: 12, finished: true },
    { name: 'Manual', highestWatchedEpisode: 2, totalEpisodes: null, finished: true },
    { name: 'Ongoing', highestWatchedEpisode: 3, totalEpisodes: 12, finished: false },
  ]);
  assert.deepEqual(watchListSummary({}), []);
});
test('page matching keeps complete path segments and supports query-based series', () => {
  const rule = helpers.learnPageRule(['https://example.com/series/abc', 'https://example.com/series/abd'], provider.origin);
  assert.equal(rule.pathPrefix, '/series/');
  assert.equal(helpers.matchesSeries({ ...provider, pageRule: rule }, 'https://example.com/series/xyz'), true);
  assert.equal(helpers.matchesSeries({ ...provider, pageRule: rule }, 'https://example.com/series-evil/xyz'), false);
  assert.throws(() => helpers.learnPageRule(['https://example.com/a#one', 'https://example.com/a#two'], provider.origin));
  assert.throws(() => helpers.learnPageRule(['https://example.com/a', 'https://other.com/b'], provider.origin));
  const query = helpers.learnPageRule(['https://example.com/watch?id=a', 'https://example.com/watch?id=b'], provider.origin);
  assert.deepEqual(query.queryKeys, ['id']);
  assert.equal(helpers.matchesSeries({ ...provider, pageRule: query }, 'https://example.com/watch'), false);
});
test('pop-ups are blocked separately from unrelated navigation, including Android events without frame metadata', () => {
  const ad = 'https://advert.example/';
  assert.equal(helpers.providerNavigation(provider, { url: ad, isTopFrame: true, hasTargetFrame: false }), 'popup');
  assert.equal(helpers.providerNavigation(provider, { url: provider.origin, hasTargetFrame: false }), 'popup');
  assert.equal(helpers.providerNavigation(provider, { url: ad, isTopFrame: false, hasTargetFrame: true }), 'allow');
  assert.equal(helpers.providerNavigation(provider, { url: ad, isTopFrame: true, hasTargetFrame: true }), 'blocked');
  assert.equal(helpers.providerNavigation(provider, { url: ad }), 'blocked');
  assert.equal(helpers.providerNavigation(provider, { url: provider.origin }), 'allow');
});
test('review page checks survive selection commands and canonical redirects, then permit saving', t => {
  const checks = new ProviderPageChecks(), results = {};
  const pages = ['https://example.com/series/first', 'https://example.com/series/second'];
  for (const page of pages) {
    const { dom, win, runtime, messages } = setup(); t.after(() => dom.window.close());
    checks.start(page);
    const session = new bridge.RuntimeSession();
    session.begin(page);
    // Native navigation follows a canonical redirect before the ready message.
    session.redirected(win.location.href);
    const ready = messages.find(message => message.type === 'ready');
    assert.equal(session.accept(ready), true);
    const command = checks.command(ready.documentId);
    runtime.command({ type: 'selectMode', enabled: false, requestId: 'selection-token' });
    win.eval(bridge.runtimeCommand(command));
    const message = bridge.parseRuntimeMessage(JSON.stringify(messages.at(-1)), 'session');
    assert.equal(session.accept(message), true);
    const result = checks.accept(message);
    assert.equal(result.page, page);
    assert.equal(result.preview.valid, true);
    results[result.page] = result.preview;
  }
  const draft = { ...provider, verification: { progress: true, resume: true } };
  assert.equal(helpers.providerSaveError(draft, pages, results, false), null);
  assert.match(helpers.providerSaveError(draft, pages, { [pages[0]]: results[pages[0]] }, false), /Example 2/);
  assert.match(helpers.providerSaveError({ ...draft, verification: { progress: false, resume: false } }, pages, results, false), /Video test/);
  assert.equal(helpers.providerSaveError({ ...draft, verification: { progress: false, resume: false } }, pages, results, true), null);
});
test('review retries delayed series content and reports invalid extraction instead of leaving Save silently disabled', t => {
  const { dom, win, runtime, messages } = setup(); t.after(() => dom.window.close());
  const checks = new ProviderPageChecks(), page = win.location.href;
  const title = win.document.querySelector('h1');
  title.textContent = '';
  checks.start(page);
  runtime.command(checks.command(runtime.documentId));
  assert.equal(checks.accept(messages.at(-1)), null);
  title.textContent = 'Loaded series';
  runtime.command(checks.command(runtime.documentId));
  assert.equal(checks.accept(messages.at(-1)).preview.title, 'Loaded series');
  win.document.querySelector('#episode-total').textContent = 'Unknown';
  checks.start(page);
  runtime.command(checks.command(runtime.documentId));
  assert.equal(checks.accept(messages.at(-1)), null);
  const result = checks.finish();
  assert.equal(result.preview.valid, false);
  const reason = helpers.providerSaveError(provider, [page, page + '?other=1'], { [page]: result.preview }, true);
  assert.match(reason, /Example 1 did not pass/);
  assert.match(reason, /total episode count/);
});
test('review rejects obsolete requests, replacement documents, canceled checks, and times out with a retry message', () => {
  const checks = new ProviderPageChecks();
  const preview = { title: 'Series', episode: 1, episodeCount: 12, valid: true, errors: [] };
  checks.start(provider.origin);
  const old = checks.command('document');
  const message = { channel: 'provider-runtime', sessionId: 'session', type: 'extraction', url: provider.origin, preview };
  assert.equal(checks.command('document'), null);
  assert.equal(checks.accept({ ...old, ...message, preview: { ...preview, valid: false } }), null);
  assert.equal(checks.command('document', 'https://example.com/other'), null);
  const current = checks.command('document');
  assert.equal(checks.accept({ ...old, ...message }), null);
  assert.equal(checks.accept({ ...current, ...message, preview: { ...preview, valid: false } }), null);
  assert.equal(checks.command('replacement'), null);
  assert.equal(checks.accept({ ...current, ...message, documentId: 'replacement' }), null);
  checks.cancel();
  assert.equal(checks.accept({ ...current, ...message }), null);
  checks.start(provider.origin);
  assert.match(checks.finish().preview.errors[0], /retry/);
  assert.equal(checks.finish(), null);
});
test('empty configuration is invalid and legacy player flags remain unverified', () => {
  assert.match(helpers.validateProvider(helpers.newProviderDraft()), /name/);
  assert.equal(helpers.validateProvider(provider), null);
  assert.match(helpers.validateProvider({ ...provider, episodeNumberSelector: '' }), /episodes/);
  assert.equal(helpers.normalizeProviders([provider])[0].verification, undefined);
});
test('provider IDs survive deletion and updates reject missing providers', () => {
  const created = helpers.upsertProviderList([{ ...provider, id: 8 }], { ...provider, id: 0 });
  assert.equal(created[0].id, 9);
  assert.equal(helpers.upsertProviderList(created, { ...created[0], name: 'Renamed' })[0].name, 'Renamed');
  assert.throws(() => helpers.upsertProviderList([], provider), /deleted/);
});
test('a sole website opens on startup while multiple websites retain the chosen preference', () => {
  assert.deepEqual(helpers.normalizeProviders([]), []);
  assert.equal(helpers.normalizeProviders([{ ...provider, isDefault: false }])[0].isDefault, true);
  const websites = [{ ...provider, isDefault: false }, { ...provider, id: 8, isDefault: false }];
  assert.equal(helpers.normalizeProviders(websites).some(item => item.isDefault), false);
  const selected = helpers.normalizeProviders([{ ...websites[0], isDefault: true }, websites[1]]);
  assert.equal(selected[0].isDefault, true);
  assert.equal(selected[1].isDefault, false);
});
test('a failed storage write does not poison retry; writes stay ordered', async () => {
  const queue = new WriteQueue(), log = [];
  await assert.rejects(queue.run(async () => { throw new Error('disk full'); }), /disk full/);
  await Promise.all([queue.run(async () => { log.push(1); }), queue.run(async () => { log.push(2); })]);
  assert.deepEqual(log, [1, 2]);
});
test('saving a provider rejects failed writes and returns its stored ID after retry', async () => {
  const load = Module._load;
  let stored = { anime: { Old: { name: 'Old', latestWatchedEpisode: 1, highestWatchedEpisode: 1, latestVisitedUrl: 'https://example.com/' } }, providers: [] };
  let fail = true;
  const files = new Map(), shared = [];
  let sharingAvailable = true, fileFailure = false;
  Module._load = function(request, parent, ...args) {
    if (request === 'expo-file-system') return { File: class {
      constructor(base, name) { this.uri = base + '/' + name; }
      create() { if (fileFailure) throw new Error('disk full'); }
      write(content) { files.set(this.uri, content); }
    }, Paths: { document: 'test', cache: 'cache' } };
    if (request === 'expo-document-picker') return {};
    if (request === 'expo-sharing') return { isAvailableAsync: async () => sharingAvailable, shareAsync: async (uri, options) => { shared.push({ uri, options }); } };
    if (request === './storage.util' && parent.filename.endsWith('app-store.util.ts')) return { Storage: {
      getItem: async () => stored,
      setItem: async (_key, next) => { if (fail) throw new Error('write failed'); stored = next; },
    } };
    return load.call(this, request, parent, ...args);
  };
  let AppStore;
  try { ({ AppStore } = require('../utils/app-store.util.ts')); } finally { Module._load = load; }
  await assert.rejects(AppStore.SaveProvider({ ...provider, id: 0 }), /write failed/);
  assert.equal(stored.providers.length, 0);
  fail = false;
  const saved = await AppStore.SaveProvider({ ...provider, id: 0 });
  assert.equal(saved.id, 1);
  assert.equal(saved.isDefault, true);
  assert.equal(stored.providers[0].isDefault, true);
  assert.equal(stored.providers.length, 1);
  assert.equal(stored.anime.Old.name, 'Old');
  const edited = await AppStore.SaveProvider({ ...saved, name: 'Updated', isDefault: false });
  assert.equal(edited.id, 1);
  assert.equal(edited.isDefault, true);
  assert.equal(stored.providers.length, 1);
  // Existing backups with one unselected website also open automatically.
  stored = { ...stored, providers: [{ ...edited, isDefault: false }] };
  assert.equal((await AppStore.Get()).providers[0].isDefault, true);
  const added = await AppStore.SaveProvider({ ...provider, id: 0 });
  assert.equal(added.isDefault, false);
  assert.equal(stored.providers.find(item => item.id === saved.id).isDefault, true);
  await AppStore.Dispatch(actions.animeUpdated(provider.origin, { animeTitle: 'Series', episode: 3, episodeCount: 12, providerId: saved.id, lastPlayedAt: 1700000000000, url: 'https://example.com/series/three' }));
  const tracked = (await AppStore.Get()).anime.Series;
  assert.equal(tracked.lastPlayedAt, 1700000000000);
  assert.equal(tracked.providerId, saved.id);
  assert.equal(tracked.latestVisitedUrl, 'https://example.com/series/three');
  await AppStore.Backup();
  const backup = JSON.parse(files.get('test/anime-tracker/backup.json'));
  assert.equal(backup.anime.Series.lastPlayedAt, tracked.lastPlayedAt);
  await AppStore.ExportWatchList();
  assert.deepEqual(JSON.parse(files.get('cache/anime-tracker/watch-list.json')), watchListSummary(stored.anime));
  assert.equal(shared.at(-1).options.mimeType, 'application/json');
  assert.equal(shared.at(-1).uri, 'cache/anime-tracker/watch-list.json');
  assert.equal(files.get('test/anime-tracker/backup.json'), JSON.stringify(backup));
  sharingAvailable = false;
  await assert.rejects(AppStore.ExportWatchList(), /System sharing not available/);
  sharingAvailable = true; fileFailure = true;
  await assert.rejects(AppStore.ExportWatchList(), /disk full/);
  fileFailure = false;
  // With multiple websites, disabling startup remains a valid choice.
  await AppStore.Update(previous => ({ ...previous, providers: previous.providers.map(item => ({ ...item, isDefault: false })) }));
  assert.equal((await AppStore.Get()).providers.some(item => item.isDefault), false);
  await AppStore.Dispatch(actions.removeProvider(saved.id));
  assert.equal(stored.providers.length, 1);
  assert.equal(stored.providers[0].id, added.id);
  assert.equal(stored.providers[0].isDefault, true);
  assert.equal(stored.anime.Old.name, 'Old');
  await AppStore.Dispatch(actions.removeProvider(added.id));
  assert.equal((await AppStore.Get()).providers.length, 0);
  // Preference normalization must preserve the migration of history-only backups.
  await AppStore.Update(() => ({ Old: stored.anime.Old }));
  assert.equal((await AppStore.Get()).anime.Old.name, 'Old');
  assert.equal((await AppStore.Get()).providers.length, 0);
});
test('normalized tracking payloads store provider and preserve legacy history', () => {
  let state = reducer({ anime: {}, providers: [] }, actions.animeUpdated('https://example.com/', { animeTitle: 'Series', episode: 1, episodeCount: 12, progress: 42, total: 120, providerId: 4 }));
  assert.equal(state.anime.Series.providerId, 4);
  assert.equal(state.anime.Series.total, 12);
  state = reducer(state, actions.animeUpdated('https://example.com/', { animeTitle: 'Series', episode: 1 }));
  assert.equal(state.anime.Series.episodeProgress[1].progress, 42);
  const legacy = reducer(state, actions.animeUpdated('https://example.com/', { animeTitle: 'Old', episode: 2, info: { Episodi: '24' }, progress: 20, total: 100 }));
  assert.equal(legacy.anime.Old.total, 24);
  const saved = reducer(state, actions.upsertProvider({ ...provider, id: 0 }));
  assert.equal(saved.providers.length, 1);
});
test('only playback timestamps update recent order; manual edits and metadata retain the saved date', () => {
  let state = { anime: {}, providers: [] };
  const payload = { animeTitle: 'Series', episode: 1, providerId: 4 };
  state = reducer(state, actions.animeUpdated(provider.origin, payload));
  assert.equal(state.anime.Series.lastPlayedAt, undefined);
  state = reducer(state, actions.animeUpdated(provider.origin, { ...payload, lastPlayedAt: 2000 }));
  state = reducer(state, actions.animeUpdated(provider.origin, { ...payload, lastPlayedAt: 1000 }));
  state = reducer(state, actions.animeUpdated(provider.origin, payload));
  state = reducer(state, actions.upsertAnime('Series', 3));
  state = reducer(state, actions.toggleAnimeFinished('Series'));
  assert.equal(state.anime.Series.lastPlayedAt, 2000);
  state = reducer(state, actions.animeUpdated(provider.origin, { ...payload, lastPlayedAt: 3000 }));
  assert.equal(state.anime.Series.lastPlayedAt, 3000);
});
test('playback dates ignore paused pages, seeking, and episode selection', t => {
  const { dom, win, runtime, messages } = setup(fixture, 'watch'); t.after(() => dom.window.close());
  let clock = 1700000000000;
  win.Date.now = () => clock;
  const state = videoState(win); state.paused = true;
  const latest = () => messages.filter(message => message.type === 'anime-found').at(-1).payload;
  const tick = () => { clock += 1500; runtime.tick(); };
  tick();
  assert.equal(latest().lastPlayedAt, undefined);
  win.document.querySelector('video').currentTime = 50;
  tick();
  assert.equal(latest().lastPlayedAt, undefined);
  state.paused = false; state.time = 51; tick();
  const playedAt = clock;
  assert.equal(latest().lastPlayedAt, playedAt);
  assert.equal(bridge.parseRuntimeMessage(JSON.stringify(messages.filter(message => message.type === 'anime-found').at(-1)), 'session').payload.lastPlayedAt, playedAt);
  state.paused = true; tick(); tick();
  assert.equal(latest().lastPlayedAt, playedAt);
  state.paused = false; win.document.querySelector('video').currentTime = 60; tick();
  assert.equal(latest().lastPlayedAt, playedAt);
  win.document.querySelector('h1').textContent = 'Another Series'; state.paused = true; tick();
  assert.equal(latest().lastPlayedAt, undefined);
  const link = win.document.querySelectorAll('#episode-list a')[1];
  link.addEventListener('click', event => event.preventDefault());
  link.click();
  assert.equal(latest().episode, 2);
  assert.equal(latest().lastPlayedAt, undefined);
  state.paused = false; state.time = 61; tick();
  assert.equal(latest().lastPlayedAt, clock);
});
test('only the selected player contributes playback dates', t => {
  const { dom, win, runtime, messages } = setup(fixture.replace('</main>', '<video id="ad"></video></main>'), 'watch', { ...provider, player: { selector: '#primary-player', framePath: [] } });
  t.after(() => dom.window.close());
  let clock = 1700000000000; win.Date.now = () => clock;
  const primary = videoState(win), ad = videoState(win, win.document.querySelector('#ad'));
  primary.paused = true; runtime.tick();
  clock += 1500; ad.time = 1; runtime.tick();
  assert.equal(messages.filter(message => message.type === 'anime-found').at(-1).payload.lastPlayedAt, undefined);
  primary.paused = false; primary.time = 1; clock += 1500; runtime.tick();
  assert.equal(messages.filter(message => message.type === 'anime-found').at(-1).payload.lastPlayedAt, clock);
});
test('episode highlighting uses the selected provider history and retains legacy progress', () => {
  const progress = { 1: { progress: 30, total: 120 } };
  const history = {
    Current: { providerId: provider.id, episodeProgress: progress },
    Other: { providerId: 99, episodeProgress: progress },
    Legacy: { episodeProgress: progress },
    Unwatched: { providerId: provider.id },
  };
  assert.deepEqual(helpers.providerEpisodeProgress(history, provider.id), { Current: progress, Legacy: progress });
});
test('saved episode progress appears before a placeholder player is activated', t => {
  const { dom, win } = setup(fixture.replace('<video id="primary-player" controls></video>', ''), 'watch', provider, {
    'Example Series': { 1: { progress: 30, total: 120 }, 2: { progress: 120, total: 120 } },
    'Another Series': { 3: { progress: 120, total: 120 } },
  });
  t.after(() => dom.window.close());
  const episodes = win.document.querySelectorAll('#episode-list a');
  assert.match(episodes[0].style.backgroundImage, /linear-gradient.*25%/);
  assert.match(episodes[1].style.backgroundImage, /linear-gradient.*100%/);
  assert.equal(episodes[2].style.backgroundImage, '');
  assert.equal(win.document.querySelector('nav a').style.backgroundImage, '');
});
test('episode highlights refresh on progress updates and ignore invalid or obsolete samples', t => {
  const { dom, win, runtime } = setup(fixture, 'watch'); t.after(() => dom.window.close());
  const episodes = win.document.querySelectorAll('#episode-list a');
  runtime.command({ type: 'episodeProgress', documentId: runtime.documentId, progress: {
    'Example Series': { 1: { progress: 60, total: 120 }, 2: { progress: 90, total: 0 }, 3: { progress: -5, total: 120 } },
  } });
  assert.match(episodes[0].style.backgroundImage, /50%/);
  assert.equal(episodes[1].style.backgroundImage, '');
  assert.equal(episodes[2].style.backgroundImage, '');
  runtime.command({ type: 'episodeProgress', documentId: 'obsolete', progress: {} });
  assert.match(episodes[0].style.backgroundImage, /50%/);
  runtime.command({ type: 'episodeProgress', progress: { 'Example Series': { 1: { progress: 160, total: 120 } } } });
  assert.match(episodes[0].style.backgroundImage, /100%/);
  runtime.command({ type: 'episodeProgress', progress: { 'Example Series': { 1: { progress: Infinity, total: 120 } } } });
  assert.equal(episodes[0].style.backgroundImage, '');
});
test('pagination and delayed episode lists use actual episode numbers and the current series', t => {
  const { dom, win, runtime } = setup(fixture, 'watch', provider, {
    'Example Series': { 1: { progress: 30, total: 120 }, 51: { progress: 90, total: 120 } },
    'Another Series': { 51: { progress: 30, total: 120 } },
  });
  t.after(() => dom.window.close());
  const firstPage = win.document.querySelector('#episode-list a');
  win.document.querySelector('#episode-list').innerHTML = '<li><a>Episode 51</a></li><li><a>52</a></li>';
  runtime.tick();
  assert.equal(firstPage.style.backgroundImage, '');
  const episodes = win.document.querySelectorAll('#episode-list a');
  assert.match(episodes[0].style.backgroundImage, /75%/);
  assert.equal(episodes[1].style.backgroundImage, '');
  win.document.querySelector('h1').textContent = 'Another Series';
  runtime.tick();
  assert.match(episodes[0].style.backgroundImage, /25%/);
  win.document.querySelector('h1').textContent = 'Unwatched Series';
  runtime.tick();
  assert.equal(episodes[0].style.backgroundImage, '');
});
test('clearing progress or changing runtime mode restores the website background', t => {
  const { dom, win, runtime } = setup(fixture, 'watch'); t.after(() => dom.window.close());
  const episode = win.document.querySelector('#episode-list a');
  episode.style.setProperty('background-image', 'url("episode.png")', 'important');
  const original = episode.style.backgroundImage;
  const progress = { 'Example Series': { 1: { progress: 60, total: 120 } } };
  runtime.command({ type: 'episodeProgress', progress });
  assert.match(episode.style.backgroundImage, /50%/);
  runtime.command({ type: 'episodeProgress', progress: {} });
  assert.equal(episode.style.backgroundImage, original);
  assert.equal(episode.style.getPropertyPriority('background-image'), 'important');
  runtime.command({ type: 'episodeProgress', progress });
  runtime.configure(provider, 'setup');
  assert.equal(episode.style.backgroundImage, original);
  runtime.tick();
  assert.equal(episode.style.backgroundImage, original);
  runtime.configure(provider, 'watch');
  assert.match(episode.style.backgroundImage, /50%/);
  runtime.configure({ ...provider, episodeNumberSelector: 'nav a' }, 'watch');
  assert.equal(episode.style.backgroundImage, original);
});
test('runtime reinjection refreshes highlights and preserves the website background', t => {
  const { dom, win, runtime } = setup(fixture, 'watch'); t.after(() => dom.window.close());
  const episode = win.document.querySelector('#episode-list a');
  episode.style.backgroundImage = 'url("episode.png")';
  const original = episode.style.backgroundImage;
  for (const progress of [30, 60]) {
    win.__providerProgress = { 'Example Series': { 1: { progress, total: 120 } } };
    win.eval(script);
    assert.equal(win.ProviderRuntime, runtime);
    assert.match(episode.style.backgroundImage, new RegExp(progress / 120 * 100 + '%'));
  }
  runtime.command({ type: 'episodeProgress', progress: {} });
  assert.equal(episode.style.backgroundImage, original);
});
test('malformed messages and old sessions are ignored', () => {
  assert.equal(bridge.parseRuntimeMessage('{', 'session'), null);
  assert.equal(bridge.parseRuntimeMessage(JSON.stringify({ channel: 'provider-runtime', sessionId: 'old', type: 'ready', documentId: 'd', url: provider.origin }), 'session'), null);
  assert.equal(bridge.parseRuntimeMessage(JSON.stringify({ channel: 'provider-runtime', sessionId: 'session', type: 'players', documentId: 'd', url: provider.origin, players: [{}] }), 'session'), null);
  for (const lastPlayedAt of [-1, null, 'today']) {
    assert.equal(bridge.parseRuntimeMessage(JSON.stringify({ channel: 'provider-runtime', sessionId: 'session', type: 'anime-found', documentId: 'd', url: provider.origin, payload: { animeTitle: 'Series', episode: 1, lastPlayedAt } }), 'session'), null);
  }
});
test('retired documents cannot validate selections after navigation or reload', () => {
  const session = new bridge.RuntimeSession();
  const old = { channel: 'provider-runtime', sessionId: 'session', type: 'ready', documentId: 'old', url: 'https://example.com/first' };
  session.begin(old.url); assert.equal(session.accept(old), true);
  session.begin('https://example.com/second');
  assert.equal(session.accept(old), false);
  const next = { ...old, documentId: 'next', url: 'https://example.com/second' };
  assert.equal(session.accept(next), true);
  assert.equal(session.accept({ ...old, type: 'selection' }), false);
  session.begin(next.url);
  assert.equal(session.accept(next), false);
  assert.equal(session.accept({ ...next, documentId: 'reload' }), true);
});
test('selection is safe on pages without iframes and CSS identifiers are escaped', t => {
  const { dom, win, runtime, messages } = setup(); t.after(() => dom.window.close());
  const element = win.document.querySelector('h1');
  const selector = runtime.selectorFor(element);
  assert.equal(win.document.querySelector(selector), element);
  runtime.command({ type: 'selectMode', enabled: true, field: 'seriesNameSelector', requestId: 'r' });
  element.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true }));
  const selected = messages.find(message => message.type === 'selection');
  assert.equal(selected.preview.valid, true);
  assert.equal(selected.preview.texts[0], 'Example Series');
  assert.equal(selected.requestId, 'r');
  runtime.command({ type: 'parent', documentId: 'old-document' });
  assert.equal(messages.filter(message => message.type === 'selection').length, 1);
});
test('episode selectors generalize within the list without matching navigation numbers', t => {
  const { dom, win, runtime } = setup(); t.after(() => dom.window.close());
  const selector = runtime.selectorFor(win.document.querySelector('#episode-list a'), win.document, true);
  const result = runtime.evaluate(selector, 'episodeNumberSelector');
  assert.equal(result.count, 3);
  assert.equal(result.valid, true);
  assert.equal(runtime.evaluate('a', 'episodeNumberSelector').count, 4);
});
test('a selector learned from one episode stays inside its list on longer and paginated series', t => {
  const { dom, win, runtime } = setup(); t.after(() => dom.window.close());
  win.document.querySelector('#episode-list').innerHTML = '<li class="episode"><a class="active">1</a></li>';
  const selector = runtime.selectorFor(win.document.querySelector('#episode-list a'), win.document, true);
  const single = runtime.evaluate(selector, 'episodeNumberSelector');
  assert.equal(single.count, 1);
  assert.deepEqual(Array.from(single.values), [1]);
  for (const start of [1, 51]) {
    win.document.querySelector('#episode-list').innerHTML = Array.from({ length: 50 }, (_, i) => '<li class="episode"><a>' + (start + i) + '</a></li>').join('');
    const result = runtime.evaluate(selector, 'episodeNumberSelector');
    assert.equal(result.valid, true);
    assert.equal(result.count, 50);
    assert.equal(result.values[0], start);
    assert.equal(result.values[49], start + 49);
  }
});
test('invalid selectors, duplicate titles, and nonnumeric totals produce actionable errors', t => {
  const { dom, win, runtime } = setup(); t.after(() => dom.window.close());
  assert.equal(runtime.evaluate('[', 'seriesNameSelector').valid, false);
  win.document.body.insertAdjacentHTML('beforeend', '<h1>Another heading</h1>');
  assert.equal(runtime.evaluate('h1', 'seriesNameSelector').valid, false);
  win.document.querySelector('#episode-total').textContent = 'Unknown';
  assert.equal(runtime.extract().valid, false);
  assert.equal(runtime.number('Episode 12'), 12);
  assert.equal(runtime.number('12 episodes'), 12);
  assert.equal(Number.isNaN(runtime.number('Series 12')), true);
});
test('an invalid single episode still crosses the bridge with its validation error', t => {
  const { dom, win, runtime, messages } = setup(); t.after(() => dom.window.close());
  runtime.command({ type: 'configure', config: { ...provider, episodeNumberSelector: '#episode-list a' } });
  win.document.querySelector('#episode-list').innerHTML = '<a>Unknown</a>';
  runtime.command({ type: 'extract', requestId: 'invalid-episode' });
  const message = bridge.parseRuntimeMessage(JSON.stringify(messages.at(-1)), 'session');
  assert.equal(message.type, 'extraction');
  assert.equal(message.preview.valid, false);
  assert.equal(message.preview.episode, 0);
  assert.match(message.preview.errors[0], /episode numbers/);
});
test('both series fixtures use the same extraction configuration', t => {
  for (const title of ['Example Series', 'Another Series']) {
    const { dom, runtime } = setup(fixture.replace('Example Series', title)); t.after(() => dom.window.close());
    const result = runtime.extract();
    assert.equal(result.valid, true);
    assert.equal(result.title, title);
    assert.equal(result.episodeCount, 12);
  }
});
test('review accepts unreleased and paginated episodes independently of the total and without a video', t => {
  const checks = new ProviderPageChecks(), results = {}, pages = [];
  for (const [start, listed, total] of [[1, 3, 12], [1, 50, 200], [51, 50, 200], [101, 70, 200]]) {
    const { dom, win, runtime, messages } = setup(fixture.replace('<video id="primary-player" controls></video>', ''), 'setup', {
      ...provider, player: { selector: '#primary-player', framePath: [] },
    });
    t.after(() => dom.window.close());
    win.document.querySelector('#episode-total').textContent = total + ' episodes';
    win.document.querySelector('#episode-list').innerHTML = Array.from({ length: listed }, (_, i) =>
      '<li class="episode"><a' + (i === 0 ? ' class="active"' : '') + '>' + (start + i) + '</a></li>').join('');
    const page = 'https://example.com/series/' + start + '-' + total;
    pages.push(page);
    checks.start(page);
    runtime.command(checks.command(runtime.documentId));
    const result = checks.accept(bridge.parseRuntimeMessage(JSON.stringify(messages.at(-1)), 'session'));
    assert.equal(result.preview.valid, true);
    assert.equal(result.preview.episode, start);
    assert.equal(result.preview.listedEpisodes, listed);
    assert.equal(result.preview.episodeCount, total);
    assert.equal(runtime.gatherPlayers().players.length, 0);
    results[page] = result.preview;
  }
  assert.equal(helpers.providerSaveError({ ...provider, verification: { progress: true, resume: true } }, pages, results, false), null);
});
test('placeholder activation progresses from waiting to detected to verified without assuming page-load playback', t => {
  const { dom, win, runtime, messages } = setup(fixture.replace('<video id="primary-player" controls></video>', '<button id="placeholder">Play</button>'));
  t.after(() => dom.window.close());
  runtime.tick();
  assert.equal(helpers.playbackPhase(messages.at(-1).players[0]), 'waiting');
  let state;
  win.document.querySelector('#placeholder').addEventListener('click', () => {
    win.document.querySelector('#placeholder').insertAdjacentHTML('afterend', '<video id="primary-player"></video>');
    state = videoState(win); state.paused = true;
  });
  win.document.querySelector('#placeholder').click();
  runtime.tick();
  assert.equal(helpers.playbackPhase(messages.at(-1).players[0]), 'paused');
  state.paused = false;
  runtime.tick();
  assert.equal(helpers.playbackPhase(messages.at(-1).players[0]), 'checking');
  state.time = 1;
  runtime.tick();
  const player = messages.at(-1).players[0];
  assert.equal(helpers.playbackPhase(player), 'verified');
  assert.equal(player.resume, false);
  runtime.command({ type: 'testSeek', locator: player.locator });
  runtime.tick();
  assert.equal(messages.at(-1).players[0].resume, true);
  assert.equal(state.time, 1);
});
test('a configured player created by an iframe placeholder is tracked and resumed after activation', t => {
  const { dom, win, runtime, messages } = setup(fixture.replace('<video id="primary-player" controls></video>', '<iframe id="player-frame"></iframe><video id="ad"></video>'), 'watch', {
    ...provider, player: { selector: '#primary-player', framePath: ['#player-frame'] },
  });
  t.after(() => dom.window.close());
  const doc = win.document.querySelector('#player-frame').contentDocument;
  doc.body.innerHTML = '<button id="placeholder">Play episode</button>';
  const ad = videoState(win, win.document.querySelector('#ad'));
  runtime.command({ type: 'resume', resume: { title: 'Example Series', episode: 1, progress: 42 } });
  ad.time = 1;
  runtime.tick();
  assert.equal(messages.some(message => message.type === 'anime-found'), false);
  let state;
  doc.querySelector('#placeholder').addEventListener('click', () => {
    doc.body.insertAdjacentHTML('beforeend', '<video id="primary-player"></video>');
    state = videoState(win, doc.querySelector('video')); state.duration = 0; state.paused = true;
  });
  doc.querySelector('#placeholder').click();
  runtime.tick();
  assert.equal(messages.some(message => message.type === 'anime-found'), false);
  assert.equal(state.time, 0);
  state.duration = 120; state.paused = false; state.time = 1;
  runtime.tick();
  assert.equal(state.time, 42);
  assert.equal(ad.time, 1);
  const tracked = messages.find(message => message.type === 'anime-found');
  assert.equal(tracked.payload.progress, 42);
  assert.equal(tracked.payload.episodeCount, 12);
});
test('delayed videos and player replacement are discovered', t => {
  const { dom, win, runtime } = setup('<main></main>'); t.after(() => dom.window.close());
  assert.equal(runtime.gatherPlayers().players.length, 0);
  win.document.body.insertAdjacentHTML('beforeend', '<video id="new-player"></video>');
  assert.equal(runtime.gatherPlayers().players.length, 1);
  win.document.querySelector('video').outerHTML = '<video id="replacement"></video>';
  assert.equal(runtime.gatherPlayers().players[0].locator.selector, '#replacement');
});
test('nested accessible players are found and inaccessible frames never throw', t => {
  const { dom, win, runtime } = setup('<iframe id="outer"></iframe><iframe id="blocked"></iframe>'); t.after(() => dom.window.close());
  const outer = win.document.querySelector('#outer').contentDocument;
  outer.body.innerHTML = '<iframe id="inner"></iframe>';
  outer.querySelector('iframe').contentDocument.body.innerHTML = '<video id="video"></video>';
  Object.defineProperty(win.document.querySelector('#blocked'), 'contentDocument', { get() { throw new Error('cross origin'); } });
  const result = runtime.gatherPlayers();
  assert.equal(result.players.length, 1);
  assert.equal(result.players[0].locator.framePath.length, 2);
  assert.equal(result.inaccessibleFrames, 1);
});
test('video presence alone is not support; advancing time and seek roundtrip are tested separately', t => {
  const { dom, win, runtime, messages } = setup(); t.after(() => dom.window.close());
  const state = videoState(win); runtime.tick();
  assert.equal(messages.at(-1).players[0].progress, false);
  state.time = 2; runtime.tick();
  const sample = messages.at(-1).players[0];
  assert.equal(sample.progress, true); assert.equal(sample.resume, false);
  runtime.command({ type: 'testSeek', locator: sample.locator }); runtime.tick();
  assert.equal(state.time, 2);
  assert.equal(messages.at(-1).players[0].resume, true);
  runtime.command({ type: 'resetPlayerTest' }); runtime.tick();
  assert.equal(messages.at(-1).players[0].progress, false);
});
test('multiple players require a chosen locator and watch mode resumes saved time', t => {
  const { dom, win, runtime, messages } = setup(fixture.replace('</main>', '<video id="ad"></video></main>'), 'watch');
  t.after(() => dom.window.close());
  const state = videoState(win), ad = videoState(win, win.document.querySelector('#ad'));
  state.time = 1; ad.time = 1; runtime.tick();
  assert.equal(messages.some(message => message.type === 'anime-found'), false);
  runtime.command({ type: 'configure', config: { ...provider, player: { selector: '#primary-player', framePath: [] } } });
  runtime.command({ type: 'resume', resume: { title: 'Example Series', episode: 1, progress: 50 } });
  runtime.tick();
  assert.equal(state.time, 50);
  assert.equal(ad.time, 1);
  assert.equal(messages.find(message => message.type === 'anime-found').payload.providerId, provider.id);
});
test('reinjection does not duplicate page click listeners', t => {
  const { dom, win, runtime, messages } = setup(); t.after(() => dom.window.close());
  win.eval(script);
  runtime.command({ type: 'selectMode', enabled: true, field: 'seriesNameSelector', requestId: 'once' });
  win.document.querySelector('h1').dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  assert.equal(messages.filter(message => message.type === 'selection').length, 1);
});
test('seeking alone cannot falsely verify advancing playback', t => {
  const { dom, win, runtime, messages } = setup(); t.after(() => dom.window.close());
  const state = videoState(win); runtime.tick();
  win.document.querySelector('video').currentTime = 40;
  runtime.tick();
  assert.equal(messages.at(-1).players[0].progress, false);
  state.time = 41; runtime.tick();
  assert.equal(messages.at(-1).players[0].progress, true);
});
test('restored browser-history documents get a fresh bridge identity', t => {
  const { dom, win, messages } = setup(); t.after(() => dom.window.close());
  const original = messages.find(message => message.type === 'ready').documentId;
  win.dispatchEvent(new win.Event('pagehide'));
  const restored = new win.Event('pageshow'); Object.defineProperty(restored, 'persisted', { value: true });
  win.dispatchEvent(restored);
  const next = messages.filter(message => message.type === 'ready').at(-1).documentId;
  assert.notEqual(next, original);
});
