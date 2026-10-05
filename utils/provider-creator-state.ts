import type { AppMessage } from "./i18n";
import type { Provider } from "@/model/provider.model";
import type {
  ExtractionPreview,
  FieldPreview,
  PlayerSample,
  SelectorField,
} from "@/model/provider-runtime.model";
import { newProviderDraft } from "@/utils/provider-runtime";

export type ProviderCreatorState = {
  setup: {
    draft: Provider<false>;
    initialized: boolean;
    aliasInput: string;
    pages: string[];
    checks: Record<string, ExtractionPreview>;
    saveAnyway: boolean;
    saving: boolean;
    saved: boolean;
    dirty: boolean;
  };
  wizard: {
    step: number;
    error: AppMessage;
    collapsed: boolean;
    advanced: boolean;
  };
  browser: {
    source: string;
    url: string;
    navigationState: { back: boolean; forward: boolean };
    loading: boolean;
    ready: boolean;
  };
  selection: {
    select: boolean;
    manualSelector: string;
    candidate: FieldPreview | null;
  };
  playback: {
    players: PlayerSample[];
    playerKey: string;
    inaccessible: number;
    frameTrackingAvailable: boolean | undefined;
    timedOut: boolean;
    videoHelp: boolean;
    testRun: number;
    resumeTest: "idle" | "testing" | "failed";
  };
  reviewPage: string | null;
};

export function createProviderCreatorState(): ProviderCreatorState {
  return {
    setup: {
      draft: newProviderDraft(),
      initialized: false,
      aliasInput: "",
      pages: [],
      checks: {},
      saveAnyway: false,
      saving: false,
      saved: false,
      dirty: false,
    },
    wizard: { step: 0, error: "", collapsed: false, advanced: false },
    browser: {
      source: "",
      url: "",
      navigationState: { back: false, forward: false },
      loading: false,
      ready: false,
    },
    selection: { select: false, manualSelector: "", candidate: null },
    playback: {
      players: [],
      playerKey: "",
      inaccessible: 0,
      frameTrackingAvailable: undefined,
      timedOut: false,
      videoHelp: false,
      testRun: 0,
      resumeTest: "idle",
    },
    reviewPage: null,
  };
}

type StatePatch<T> = Partial<T> | ((previous: T) => Partial<T>);
export type ProviderCreatorAction =
  | { type: "setup"; patch: StatePatch<ProviderCreatorState["setup"]> }
  | { type: "wizard"; patch: StatePatch<ProviderCreatorState["wizard"]> }
  | { type: "browser"; patch: StatePatch<ProviderCreatorState["browser"]> }
  | { type: "selection"; patch: StatePatch<ProviderCreatorState["selection"]> }
  | { type: "playback"; patch: StatePatch<ProviderCreatorState["playback"]> }
  | { type: "reviewPage"; page: string | null }
  | { type: "edit"; draft: Provider<false> }
  | { type: "go"; step: number }
  | { type: "pageLoading" }
  | { type: "capturePage"; page: string }
  | { type: "changeWebsite"; origin: string }
  | { type: "removePage"; page: string }
  | { type: "choosePlayer"; key: string }
  | { type: "retryPlayback" }
  | { type: "selectionReceived"; field: SelectorField; preview: FieldPreview };

function patch<T>(previous: T, update: StatePatch<T>): T {
  return {
    ...previous,
    ...(typeof update === "function" ? update(previous) : update),
  };
}

export function providerCreatorReducer(
  state: ProviderCreatorState,
  action: ProviderCreatorAction,
): ProviderCreatorState {
  switch (action.type) {
    case "edit":
      return {
        ...state,
        reviewPage: null,
        setup: {
          ...state.setup,
          draft: action.draft,
          dirty: true,
          checks: {},
          saveAnyway: false,
        },
      };
    case "go":
      return {
        ...state,
        reviewPage: null,
        wizard: {
          ...state.wizard,
          step: action.step,
          error: "",
          advanced: false,
          collapsed: false,
        },
        selection: { ...state.selection, select: false, candidate: null },
        playback:
          action.step === 6
            ? { ...state.playback, timedOut: false, videoHelp: false }
            : state.playback,
      };
    case "pageLoading":
      return {
        ...state,
        browser: { ...state.browser, loading: true, ready: false },
        selection: { ...state.selection, candidate: null },
        playback: {
          ...state.playback,
          players: [],
          inaccessible: 0,
          frameTrackingAvailable: undefined,
        },
      };
    case "capturePage":
      return {
        ...state,
        setup: {
          ...state.setup,
          pages: [...state.setup.pages, action.page],
          dirty: true,
          checks: {},
        },
        wizard: { ...state.wizard, error: "" },
      };
    case "changeWebsite":
      return {
        ...state,
        reviewPage: null,
        setup: {
          ...state.setup,
          draft: {
            ...newProviderDraft(),
            id: state.setup.draft.id,
            name: state.setup.draft.name,
            isDefault: state.setup.draft.isDefault,
            origin: action.origin,
          },
          pages: [],
          checks: {},
          aliasInput: "",
          saveAnyway: false,
          dirty: true,
        },
        browser: { ...state.browser, source: "" },
        playback: { ...state.playback, players: [], playerKey: "" },
      };
    case "removePage":
      return {
        ...state,
        setup: {
          ...state.setup,
          pages: state.setup.pages.filter((page) => page !== action.page),
          checks: {},
          dirty: true,
        },
      };
    case "choosePlayer":
      return {
        ...state,
        setup: { ...state.setup, saveAnyway: false, dirty: true },
        playback: {
          ...state.playback,
          playerKey: action.key,
          timedOut: false,
          videoHelp: false,
        },
      };
    case "retryPlayback":
      return {
        ...state,
        setup: { ...state.setup, saveAnyway: false },
        playback: {
          ...state.playback,
          timedOut: false,
          videoHelp: false,
          testRun: state.playback.testRun + 1,
        },
      };
    case "selectionReceived":
      return {
        ...state,
        selection: {
          ...state.selection,
          candidate: action.preview,
          manualSelector: action.preview.selector,
        },
        setup:
          state.setup.draft[action.field] === action.preview.selector
            ? state.setup
            : {
                ...state.setup,
                draft: {
                  ...state.setup.draft,
                  [action.field]: action.preview.selector,
                },
                checks: {},
                dirty: true,
              },
      };
    case "reviewPage":
      return { ...state, reviewPage: action.page };
    case "setup":
      return { ...state, setup: patch(state.setup, action.patch) };
    case "wizard":
      return { ...state, wizard: patch(state.wizard, action.patch) };
    case "browser":
      return { ...state, browser: patch(state.browser, action.patch) };
    case "selection":
      return { ...state, selection: patch(state.selection, action.patch) };
    case "playback":
      return { ...state, playback: patch(state.playback, action.patch) };
  }
}
