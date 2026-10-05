import type {
  ExtractionPreview,
  FieldPreview,
  RuntimeDiagnosticCode,
} from "../model/provider-runtime.model";
import {
  formatMessage,
  message,
  translate,
  type AppMessage,
  type TranslationKey,
  type Translator,
} from "./i18n";

const diagnostics: Record<RuntimeDiagnosticCode, TranslationKey> = {
  "unreadable-selection": "runtime.unreadableSelection",
  "choose-cover": "runtime.chooseCover",
  "choose-title": "runtime.chooseTitle",
  "choose-total": "runtime.chooseTotal",
  "choose-episodes": "runtime.chooseEpisodes",
  "page-timeout": "runtime.pageTimeout",
};

export function selectionFeedback(
  preview: FieldPreview,
  t: Translator = translate,
): string {
  return preview.errorCode
    ? formatMessage(message(diagnostics[preview.errorCode]), t)
    : (preview.error ?? "");
}

export function extractionFeedback(preview: ExtractionPreview): AppMessage[] {
  return preview.errors.map((error, index) => {
    const code = preview.errorCodes?.[index];
    return code ? message(diagnostics[code]) : error;
  });
}
