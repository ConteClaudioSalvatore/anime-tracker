import React from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import WebView from 'react-native-webview';
import runtime from '@/assets/js/provider-runtime_t.cjs';
import ActionButton from '@/components/provider-creator/action-button';
import type { Provider, SaveProviderResult } from '@/model/provider.model';
import { parseRuntimeMessage, runtimeCommand, RuntimeSession, type ExtractionPreview, type FieldPreview, type PlayerSample, type SelectorField } from '@/model/provider-runtime.model';
import { AppStore, StoreContext } from '@/utils';
import { AppStateContext } from '@/utils/app-state.util';
import { allowedUrl, learnPageRule, newProviderDraft, normalizeWebsite, playbackPhase, providerNavigation, providerSaveError } from '@/utils/provider-runtime';
import { ProviderPageChecks, type PageCheckResult } from '@/utils/provider-page-checks';
import { useProviderPalette } from '@/hooks/use-provider-palette';
import ProviderInput from '@/components/provider-creator/provider-input';
import ProviderSurface from '@/components/provider-creator/provider-surface';
const steps = ['Website', 'Example pages', 'Series title', 'Episodes', 'Total episodes', 'Video test', 'Review'];
const fields: Partial<Record<number, SelectorField>> = { 2: 'seriesNameSelector', 3: 'episodeNumberSelector', 4: 'totalEpisodesSelector' };
const instructions = [
  'Give this website a name and paste its homepage address.',
  'Open a series page and choose “Use this page”. Repeat with a different series.',
  'Choose Select, then tap the series title on the website.',
  'Choose Select, then tap an episode number. We will find the other episodes in its list.',
  'Choose Select, then tap the announced total, such as “12 episodes”. It can differ from the released episodes or the episodes listed on this page.',
  'Open an episode and tap its player placeholder or Play button. Once the video appears, choose the primary player below. Then test seeking to verify resume.',
  'We’ll check both example pages automatically. Review the results before saving.',
];
export default function ProviderCreatorScreen() {
  const { id } = useLocalSearchParams<{
    id?: string;
  }>();
  const router = useRouter(), navigation = useNavigation();
  const { stateChanged } = React.useContext(StoreContext);
  const { updateState } = React.useContext(AppStateContext);
  const colors = useProviderPalette();
  const [draft, setDraft] = React.useState<Provider<false>>(newProviderDraft);
  const [initialized, setInitialized] = React.useState(false);
  const [step, setStep] = React.useState(0);
  const [source, setSource] = React.useState('');
  const [url, setUrl] = React.useState('');
  const [navigationState, setNavigationState] = React.useState({ back: false, forward: false });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [select, setSelect] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(false);
  const [advanced, setAdvanced] = React.useState(false);
  const [manualSelector, setManualSelector] = React.useState('');
  const [aliasInput, setAliasInput] = React.useState('');
  const [candidate, setCandidate] = React.useState<FieldPreview | null>(null);
  const [pages, setPages] = React.useState<string[]>([]);
  const [checks, setChecks] = React.useState<Record<string, ExtractionPreview>>({});
  const [reviewPage, setReviewPage] = React.useState<string | null>(null);
  const [players, setPlayers] = React.useState<PlayerSample[]>([]);
  const [playerKey, setPlayerKey] = React.useState('');
  const [inaccessible, setInaccessible] = React.useState(0);
  const [timedOut, setTimedOut] = React.useState(false);
  const [videoHelp, setVideoHelp] = React.useState(false);
  const [testRun, setTestRun] = React.useState(0);
  const [saveAnyway, setSaveAnyway] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [dirty, setDirty] = React.useState(false);
  const [ready, setReady] = React.useState(false);
  const webView = React.useRef<WebView>(null);
  const session = React.useId();
  const pageSession = React.useRef(new RuntimeSession());
  const request = React.useRef('');
  const latestDraft = React.useRef(draft);
  React.useEffect(() => { latestDraft.current = draft; }, [draft]);
  const pageChecks = React.useRef(new ProviderPageChecks());
  const saveLock = React.useRef(false);
  const allowExit = React.useRef(false);
  const field = fields[step];
  const selectedPlayer = players.find(player => JSON.stringify(player.locator) === playerKey);
  const videoPhase = playbackPhase(selectedPlayer);
  const send = React.useCallback((command: Record<string, unknown>) => {
    if (pageSession.current.documentId)
      webView.current?.injectJavaScript(runtimeCommand({ ...command, documentId: pageSession.current.documentId }));
  }, []);
  const edit = (next: Provider<false>) => { pageChecks.current.cancel(); setReviewPage(null); setDraft(next); setDirty(true); setChecks({}); setSaveAnyway(false); };
  const completeCheck = React.useCallback((result: PageCheckResult | null) => {
    if (!result) return;
    setChecks(previous => ({ ...previous, [result.page]: result.preview }));
    setReviewPage(null);
  }, []);
  const openPage = React.useCallback((value: string) => {
    pageChecks.current.cancel();
    setReviewPage(null);
    setSource(value);
    setUrl(value);
    setSelect(false);
    setCandidate(null);
    setReady(false);
    pageSession.current.begin(value);
    if (value === source) webView.current?.injectJavaScript(`window.location.assign(${JSON.stringify(value)}); true;`);
  }, [source]);
  const testExample = React.useCallback((page: string) => {
    if (url !== page || !ready) openPage(page);
    pageChecks.current.start(page);
    setReviewPage(page);
  }, [url, ready, openPage]);
  React.useEffect(() => navigation.addListener('beforeRemove', event => {
    if (allowExit.current || saved || !dirty)
      return;
    event.preventDefault();
    if (saveLock.current)
      return;
    Alert.alert('Discard provider changes?', 'Your unfinished setup will be lost.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => { allowExit.current = true; navigation.dispatch(event.data.action); } },
    ]);
  }), [navigation, dirty, saved]);
  React.useEffect(() => {
    let active = true;
    AppStore.Get().then(state => {
      if (!active)
        return;
      const existing = id ? state.providers.find(provider => provider.id === Number(id)) : undefined;
      if (id && !existing) {
        setError('This provider no longer exists. Close this screen and create a new provider.');
        setInitialized(true);
        return;
      }
      if (existing) {
        setDraft({ ...existing });
        setPages(existing.examplePages ?? []);
        setSource(existing.origin);
        setUrl(existing.origin);
        if (existing.player)
          setPlayerKey(JSON.stringify(existing.player));
      }
      setInitialized(true);
    }).catch(() => { if (active) {
      setError('Could not load providers. Close this screen and try again.');
      setInitialized(true);
    } });
    return () => { active = false; };
  }, [id]);
  React.useEffect(() => {
    if (ready)
      send({ type: 'configure', config: draft });
  }, [draft, ready, send]);
  React.useEffect(() => {
    if (!ready)
      return;
    const token = Math.random().toString(36).slice(2);
    request.current = token;
    send({ type: 'selectMode', enabled: select && !!field, field, requestId: token });
    const selector = field && latestDraft.current[field];
    if (selector) {
      send({ type: 'evaluate', selector, field, requestId: token });
    }
  }, [step, field, ready, select, send]);
  React.useEffect(() => {
    if (step !== 5 || !ready || videoPhase !== 'checking')
      return;
    const timer = setTimeout(() => setTimedOut(true), 20000);
    return () => clearTimeout(timer);
  }, [step, ready, testRun, videoPhase, playerKey]);
  React.useEffect(() => {
    if (step !== 6 || reviewPage) return;
    const unchecked = pages.find(page => !checks[page]);
    if (!unchecked) return;
    const start = setTimeout(() => testExample(unchecked), 0);
    return () => clearTimeout(start);
  }, [step, reviewPage, pages, checks, testExample]);
  React.useEffect(() => {
    if (step !== 6 || !ready || !reviewPage) return;
    const run = () => {
      const documentId = pageSession.current.documentId;
      if (!documentId) return;
      send({ type: 'configure', config: latestDraft.current });
      const command = pageChecks.current.command(documentId, reviewPage);
      if (command) send(command);
    };
    run();
    const retry = setInterval(run, 500);
    return () => clearInterval(retry);
  }, [step, ready, reviewPage, send]);
  React.useEffect(() => {
    if (!reviewPage) return;
    const timeout = setTimeout(() => completeCheck(pageChecks.current.finish()), 15000);
    return () => clearTimeout(timeout);
  }, [reviewPage, completeCheck]);
  function go(next: number) {
    pageChecks.current.cancel();
    setReviewPage(null);
    setSelect(false);
    setCandidate(null);
    setError('');
    setAdvanced(false);
    setCollapsed(false);
    setStep(next);
    if (next === 5) { setTimedOut(false); setVideoHelp(false); }
  }
  function next() {
    setError('');
    if (step === 0) {
      try {
        if (!draft.name?.trim())
          throw new Error('Enter a provider name.');
        const origin = normalizeWebsite(draft.origin ?? '');
        const aliases = aliasInput.split(/[,\n]/).map(value => value.trim()).filter(Boolean).map(value => new URL(normalizeWebsite(value)).origin);
        const whiteListedOrigins = [...new Set([...draft.whiteListedOrigins, ...aliases])];
        if (origin !== draft.origin || aliases.length)
          edit({ ...draft, origin, whiteListedOrigins });
        setSource(origin);
        setUrl(origin);
        go(1);
      }
      catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Check the website address.');
      }
      return;
    }
    if (step === 1) {
      try {
        if (pages.some(value => !allowedUrl(draft, value))) throw new Error('Choose pages on the website or an approved alias.');
        const rule = learnPageRule(pages, pages[0]);
        edit({ ...draft, pageRule: rule, seriesPageOrigin: rule.origin + rule.pathPrefix, examplePages: pages });
        go(2);
      }
      catch (cause) {
        setError((cause as Error).message);
      }
      return;
    }
    if (field) {
      if (!candidate?.valid)
        return;
      edit({ ...draft, [field]: candidate.selector });
    }
    if (step === 5) {
      if ((!selectedPlayer?.progress || !selectedPlayer.resume) && !saveAnyway)
        return;
      const acknowledged = saveAnyway;
      edit({ ...draft, isPlayerSupported: !!selectedPlayer?.progress, player: selectedPlayer?.locator,
        verification: { progress: !!selectedPlayer?.progress, resume: !!selectedPlayer?.resume, checkedAt: new Date().toISOString() } });
      setSaveAnyway(acknowledged);
    }
    go(step + 1);
  }
  async function saveProvider(): Promise<SaveProviderResult> {
    const invalid = providerSaveError(draft, pages, checks, saveAnyway);
    if (invalid)
      return { success: false, message: invalid };
    try {
      const provider = { ...draft, name: draft.name!.trim(), configurationVersion: 2, examplePages: pages } as Provider;
      if (id && !(await AppStore.Get()).providers.some(item => item.id === Number(id)))
        throw new Error('This provider was deleted. Create a new provider instead.');
      const stored = await AppStore.SaveProvider(provider);
      stateChanged();
      return { success: true, provider: stored };
    }
    catch (cause) {
      return { success: false, message: cause instanceof Error ? cause.message : 'Could not save. Your setup is still here; try again.' };
    }
  }
  async function save() {
    if (saveLock.current)
      return;
    saveLock.current = true;
    setSaving(true);
    setError('');
    const result = await saveProvider();
    saveLock.current = false;
    setSaving(false);
    if (!result.success) {
      setError(result.message);
      Alert.alert('Provider not saved', result.message);
      return;
    }
    allowExit.current = true;
    setSaved(true);
    setDirty(false);
    Alert.alert('Provider saved', 'Your website is ready to open.', [
      { text: 'Done', onPress: () => router.back() },
      { text: 'Open website', onPress: () => { updateState({ url: result.provider.origin, providerId: result.provider.id }); router.dismissTo('/'); } },
    ]);
  }
  const copy = (value: string, muted = false) => <Text style={[styles.copy, { color: muted ? colors.muted : colors.text }]}>{value}</Text>;
  const canContinue = initialized && !saving && (step === 0 ? !!draft.name?.trim() && !!draft.origin?.trim() :
    step === 1 ? pages.length >= 2 : field ? !!candidate?.valid && ready : step === 5 ? (!!selectedPlayer?.progress && !!selectedPlayer.resume) || saveAnyway : true);
  const hint = step === 0 ? 'Enter a name and website address.' : step === 1 ? 'Choose two different series pages.' : field ? candidate?.error ?? 'Select the requested information on the website.' : 'Play the primary video and test seeking, or read the warning below.';
  const saveError = step === 6 ? providerSaveError(draft, pages, checks, saveAnyway) : null;
  return (<SafeAreaView edges={['bottom', 'left', 'right']} style={[styles.screen, { backgroundColor: colors.bg }]}>
    <Stack.Screen options={{ title: id ? 'Edit provider' : 'Add provider', gestureEnabled: false, headerBackVisible: false, headerRight: () => <ActionButton label={'Close'} onPress={() => router.back()} disabled={saving}/> }}/>
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    {!initialized ? <ActivityIndicator accessibilityLabel="Loading provider"/> : <>
      <View style={styles.header}>
      <View style={styles.heading}>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>{steps[step]}</Text>
      {copy((step + 1) + ' / ' + steps.length, true)}
      </View>
      <View style={styles.progress}>{steps.map((title, index) => <View key={title} style={[styles.dot, { backgroundColor: index <= step ? colors.accent : colors.border }]}/>)}</View>
      </View>
      {source && step > 0 && <View style={styles.browser}>
      <ProviderSurface style={[styles.toolbar, { backgroundColor: colors.card }, styles.iosSurface]}>
        <Text numberOfLines={1} accessibilityLabel={'Website address ' + url} style={{ color: colors.muted, flex: 1, fontSize: 12 }}>{url}</Text>
        <View style={styles.row}>
        {<ActionButton label="Back" accessibilityLabel="Browser back" onPress={() => webView.current?.goBack()} disabled={!navigationState.back || saving}/>}
        {<ActionButton label={'Forward'} onPress={() => webView.current?.goForward()} disabled={!navigationState.forward || saving}/>}
        {<ActionButton label={'Reload'} onPress={() => webView.current?.reload()} disabled={saving}/>}
        </View>
        {loading && <ActivityIndicator accessibilityLabel="Loading website"/>}
      </ProviderSurface>
      <WebView ref={webView} source={{ uri: source }} style={styles.screen} injectedJavaScriptBeforeContentLoaded={"window.__providerSession=" + JSON.stringify(session) + ";window.__providerConfig=" + JSON.stringify(draft) + ";window.__runtimeMode='setup';" + runtime + ";true;"} injectedJavaScript={"window.__providerSession=" + JSON.stringify(session) + ";window.__providerConfig=" + JSON.stringify(draft) + ";window.__runtimeMode='setup';" + runtime + ";true;"} onLoadStart={event => { pageSession.current.begin(event.nativeEvent.url); setLoading(true); setReady(false); pageSession.current.documentId = null; request.current = ''; setCandidate(null); setPlayers([]); }} onLoadEnd={() => { setLoading(false); webView.current?.injectJavaScript(runtimeCommand({ type: 'reportReady' })); }} onError={() => { setLoading(false); setError('The website could not load. Check your connection and choose Reload.'); }} onHttpError={event => { if (event.nativeEvent.statusCode >= 400)
        setError('Website returned error ' + event.nativeEvent.statusCode + '. Choose Reload to retry.'); }} onNavigationStateChange={state => { if (allowedUrl(latestDraft.current, state.url)) pageSession.current.redirected(state.url); setUrl(state.url); setNavigationState({ back: state.canGoBack, forward: state.canGoForward }); }} onMessage={event => {
          const message = parseRuntimeMessage(event.nativeEvent.data, session);
          if (!message || !allowedUrl(latestDraft.current, message.url) || !pageSession.current.accept(message))
            return;
          if (message.type === 'ready') {

            setReady(true);
            setUrl(message.url);
            webView.current?.injectJavaScript(runtimeCommand({ type: 'configure', config: latestDraft.current, documentId: message.documentId }));
            return;
          }
          if (message.documentId !== pageSession.current.documentId)
            return;
          if (message.type === 'selection' && message.requestId === request.current && message.field === field) {
            setCandidate(message.preview);
            setManualSelector(message.preview.selector);
            if (draft[field] !== message.preview.selector) {
              setDraft(previous => ({ ...previous, [field]: message.preview.selector }));
              setChecks({}); setDirty(true);
            }
          }
          if (message.type === 'players') {
            setPlayers(message.players);
            setInaccessible(message.inaccessibleFrames);
            const chosen = message.players.find(player => JSON.stringify(player.locator) === playerKey);
            if (playbackPhase(chosen) !== 'checking') setTimedOut(false);
            if (!playerKey && message.players.length === 1)
              setPlayerKey(JSON.stringify(message.players[0].locator));
          }
          if (message.type === 'extraction') completeCheck(pageChecks.current.accept(message));
        }} javaScriptEnabled domStorageEnabled setSupportMultipleWindows onOpenWindow={() => { /* Block pop-ups without changing the current page or warning. */ }} onShouldStartLoadWithRequest={event => { const decision = providerNavigation(latestDraft.current, event); if (decision === 'allow') return true; if (decision === 'blocked') setError('This page is on another website. Add its address under Website → Approved website aliases if it belongs to this provider.'); return false; }}/>
      </View>}
      <ProviderSurface style={[styles.panel, { backgroundColor: colors.card }, styles.iosSurface, step > 0 ? styles.compactPanel : styles.screen]}>
      <ScrollView keyboardShouldPersistTaps="handled" style={styles.panelScroll} contentContainerStyle={styles.panelContent}>
      {!collapsed && <>
        {copy(instructions[step])}
        {step === 0 && <>
        {copy('Provider name')}
        <ProviderInput accessibilityLabel="Provider name" placeholder="My anime website" placeholderTextColor={colors.muted} value={draft.name ?? ''} onChangeText={name => edit({ ...draft, name })} style={[styles.input, { color: colors.text, borderColor: colors.border }]}/>
        {copy('Homepage address')}
        <ProviderInput accessibilityLabel="Homepage address" placeholder="https://example.com" placeholderTextColor={colors.muted} value={draft.origin ?? ''} autoCapitalize="none" autoCorrect={false} keyboardType="url" onChangeText={origin => {
            edit({ ...newProviderDraft(), id: draft.id, name: draft.name, isDefault: draft.isDefault, origin });
            setPages([]);
            setPlayers([]);
            setPlayerKey('');
            setAliasInput('');
            setSource('');
          }} style={[styles.input, { color: colors.text, borderColor: colors.border }]}/>
        {copy('Paste the homepage URL from your browser. HTTPS is added if you leave it out.', true)}
        <ActionButton label={advanced ? 'Hide approved aliases' : 'Approved website aliases'} onPress={() => setAdvanced(!advanced)} />
        {advanced && <>
          {copy('Only add other website addresses that this provider should be allowed to open. Separate addresses with commas. Embedded players do not need an alias.', true)}
          <ProviderInput accessibilityLabel="Approved website aliases" placeholder="https://mirror.example.com" placeholderTextColor={colors.muted}
          value={aliasInput} autoCapitalize="none" autoCorrect={false} onChangeText={value => { setAliasInput(value); setDirty(true); }} style={[styles.input, { color: colors.text, borderColor: colors.border }]} />
          {draft.whiteListedOrigins.map(origin => <View key={origin} style={styles.example}>{copy(origin)}<ActionButton label={'Remove alias ' + origin} onPress={() => edit({ ...draft, whiteListedOrigins: draft.whiteListedOrigins.filter(item => item !== origin) })} /></View>)}
        </>}
        </>}
        {step === 1 && <>
        {<ActionButton label={'Use this page'} onPress={() => {
            if (!allowedUrl(draft, url)) {
              setError('Choose a page on this website.');
              return;
            }
            const captured = new URL(url);
            captured.hash = '';
            if (pages.includes(captured.href)) {
              setError('This page is already selected. Open a different series.');
              return;
            }
            setPages(previous => [...previous, captured.href]);
            setDirty(true);
            setChecks({});
            setError('');
          }} disabled={!ready || pages.length >= 2 || saving}/>}
        {pages.map((page, index) => <View key={page} style={styles.example}>{copy('Example ' + (index + 1) + ': ' + page)}{<ActionButton label={'Remove example ' + (index + 1)} onPress={() => { setPages(pages.filter(item => item !== page)); setChecks({}); setDirty(true); }} disabled={saving}/>}</View>)}
        </>}
        {field && <>
        {copy(candidate ? candidate.count + ' matches · ' + candidate.texts.slice(0, 6).join(', ') : 'No selection yet', true)}
        {candidate?.valid && copy('Selection looks good. Continue when the preview matches the website.')}
        {candidate?.error && copy(candidate.error)}
        <View style={styles.row}>{<ActionButton label="Reselect" accessibilityLabel="Choose again" onPress={() => { setCandidate(null); setSelect(true); send({ type: 'selectMode', enabled: true, field, requestId: request.current }); }} disabled={saving}/>}{<ActionButton label="Parent" accessibilityLabel="Select surrounding element" onPress={() => send({ type: 'parent' })} disabled={!select || saving}/>}{<ActionButton label={'Undo'} onPress={() => send({ type: 'undo' })} disabled={!select || saving}/>}</View>
        {<ActionButton label={advanced ? 'Hide advanced' : 'Advanced'} onPress={() => setAdvanced(!advanced)} disabled={saving}/>}
        {advanced && <>
          {copy('CSS selector', true)}
          <ProviderInput accessibilityLabel="CSS selector" value={manualSelector} autoCapitalize="none" autoCorrect={false} onChangeText={setManualSelector} style={[styles.input, { color: colors.text, borderColor: colors.border }]}/>
          {<ActionButton label={'Test selector'} onPress={() => { const token = Math.random().toString(36).slice(2); request.current = token; setCandidate(null); send({ type: 'evaluate', field, selector: manualSelector, requestId: token }); }} disabled={!ready || saving}/>}
        </>}
        </>}
        {step === 5 && <>
        {players.map((player, index) => <View key={JSON.stringify(player.locator)} style={styles.example}>
          {<ActionButton label={(playerKey === JSON.stringify(player.locator) ? 'Selected: ' : 'Choose ') + 'player ' + (index + 1)} onPress={() => { setPlayerKey(JSON.stringify(player.locator)); send({ type: 'choosePlayer', locator: player.locator }); setTimedOut(false); setVideoHelp(false); setSaveAnyway(false); setDirty(true); }} disabled={saving} primary={playerKey === JSON.stringify(player.locator)}/>}
          {copy(player.time.toFixed(1) + ' / ' + player.duration.toFixed(1) + ' seconds · ' + (player.progress ? 'Progress verified' : 'Waiting for playback') + ' · ' + (player.resume ? 'Resume verified' : 'Resume not verified'), true)}
        </View>)}
        {videoPhase === 'waiting' && copy('Tap the website’s player placeholder or Play button. We’ll detect the video when it appears. If several players appear, choose the primary one.', true)}
        {videoPhase === 'paused' && copy('Player detected. Press Play on the website to start the video test.', true)}
        {<ActionButton label={'Test resume seeking'} onPress={() => send({ type: 'testSeek', locator: selectedPlayer?.locator })} disabled={!selectedPlayer?.progress || !!selectedPlayer.resume || saving}/>}
        {copy('The seek test briefly moves one second, then restores the playback position.', true)}
        {<ActionButton label={'Retry video test'} onPress={() => { send({ type: 'resetPlayerTest' }); setTimedOut(false); setVideoHelp(false); setSaveAnyway(false); setTestRun(value => value + 1); }} disabled={!ready || saving}/>}
        <ActionButton label="Video test help" onPress={() => setVideoHelp(true)} disabled={saving}/>
        {(timedOut || videoHelp) && <>
          {copy('Tap the player placeholder, choose the site’s primary player, and press Play. If you have done that and it still cannot be verified, this site may not be supported.')}
          {inaccessible > 0 && copy('Some embedded players are on another website and cannot be inspected.', true)}
          {copy('If you save anyway, playback progress and automatic resume may not work. Embedded players on another website cannot always be inspected.', true)}
          {<ActionButton label={saveAnyway ? 'Warning acknowledged' : 'Save anyway — acknowledge limitations'} onPress={() => { setSaveAnyway(true); setDirty(true); }} disabled={saving}/>}
        </>}
        </>}
        {step === 6 && <>
        {copy((draft.name ?? '') + ' · ' + draft.origin)}
        {copy('Progress: ' + (draft.verification?.progress ? 'verified' : 'not verified') + ' · Resume: ' + (draft.verification?.resume ? 'verified' : 'not verified'))}
        {pages.length < 2 && <>{copy('Add two example pages to verify this provider.')}{<ActionButton label={'Choose example pages'} onPress={() => go(1)} disabled={saving}/>}</>}
        {pages.map((page, index) => <View key={page} style={styles.example}>
          {copy('Example ' + (index + 1) + ': ' + page, true)}
          {checks[page] && copy(checks[page].valid ? checks[page].title + ' · ' + (checks[page].listedEpisodes ?? '?') + ' listed · ' + checks[page].episodeCount + ' total episodes — passed' : checks[page].errors.join(' '))}
          {<ActionButton label={'Test example ' + (index + 1)} onPress={() => testExample(page)} disabled={!!reviewPage || saving}/>}
        </View>)}
        <View style={styles.row}>{[0, 1, 2, 3, 4, 5].map(index => <ActionButton key={index} label={'Edit ' + steps[index].toLowerCase()} onPress={() => go(index)} disabled={saving}/>)}</View>
        {(!draft.verification?.progress || !draft.verification?.resume) && copy('This provider has unverified video features. Return to Video test to retry or explicitly acknowledge the limitations.')}
        </>}
      </>}
      {step === 6 && (reviewPage ? copy('Checking example ' + (pages.indexOf(reviewPage) + 1) + ' of ' + pages.length + '…', true) : saveError ? copy(saveError) : copy('Both example pages passed. Ready to save.'))}
      {!!error && <Text accessibilityRole="alert" style={[styles.copy, { color: colors.error }]}>{error}</Text>}
      {!canContinue && step < 6 && copy(hint, true)}
      </ScrollView>
      <View style={styles.footer}>
      {field && <View style={styles.row}><ActionButton label={select ? 'Selecting' : 'Select'} accessibilityLabel={select ? 'Selecting — tap the page' : 'Select'} onPress={() => setSelect(!select)} disabled={!ready || saving} primary={select}/><ActionButton label="Browse" onPress={() => setSelect(false)} disabled={!ready || saving} primary={!select}/></View>}
      <View style={[styles.row, styles.navigation]}>
        {step > 0 && <ActionButton label={collapsed ? 'Details' : 'Hide details'} accessibilityLabel={collapsed ? 'Show instructions' : 'Hide details'} onPress={() => setCollapsed(!collapsed)} disabled={saving}/>}
        <View style={styles.spacer}/>
        {step > 0 && <ActionButton label="Previous" accessibilityLabel="Previous step" onPress={() => go(step - 1)} disabled={saving}/>}
        {step < 6 ? <ActionButton label={'Continue'} onPress={next} disabled={!canContinue || saving} primary={true}/> : <ActionButton label={saving ? 'Saving…' : reviewPage ? 'Checking…' : 'Save provider'} onPress={() => void save()} disabled={saved || !!reviewPage || saving} primary={true}/>}
      </View>
      </View>
      </ProviderSurface>
    </>}
    </KeyboardAvoidingView>
  </SafeAreaView>);
}
const styles = StyleSheet.create({
  screen: { flex: 1 }, header: { paddingHorizontal: 12, paddingVertical: 6 }, heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }, title: { fontSize: 20, fontWeight: '700', flexShrink: 1 },
  progress: { flexDirection: 'row', gap: 4 }, dot: { height: 3, flex: 1, borderRadius: 3 }, browser: { flex: 1, minHeight: 120 },
  toolbar: { flexDirection: 'row', alignItems: 'center', padding: 6, gap: 4 }, panel: { flexShrink: 1 }, iosSurface: Platform.OS === 'ios' ? { marginHorizontal: 8, marginBottom: 6, borderRadius: 24 } : {}, compactPanel: { maxHeight: '30%' }, panelScroll: { flexGrow: 0, flexShrink: 1 }, panelContent: { paddingHorizontal: 10, paddingVertical: 8, gap: 6 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, footer: { paddingHorizontal: 10, paddingBottom: 8, gap: 6, flexShrink: 0 }, navigation: { alignItems: 'center' }, spacer: { flexGrow: 1 },
  copy: { fontSize: 14, lineHeight: 19 }, input: { borderWidth: 1, borderRadius: 10, padding: 10, minHeight: 44, fontSize: 16 }, example: { gap: 4, paddingVertical: 4 },
});
