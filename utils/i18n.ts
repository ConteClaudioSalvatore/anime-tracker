import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";
import * as en from "../locales/en.json";
import * as it from "../locales/it.json";

export type AppLanguage = "en" | "it";
export type TranslationKey = keyof typeof en;
export type MessageValues = Record<
  string,
  string | number | LocalizedMessage | AppMessage[]
>;
export type LocalizedMessage = { key: TranslationKey; values?: MessageValues };
/** Strings remain supported for legacy runtime messages and empty feedback. */
export type AppMessage = string | LocalizedMessage;
export type Translator = (
  key: TranslationKey,
  values?: MessageValues,
) => string;

export function resolveLanguage(
  locales: readonly { languageCode?: string | null; languageTag?: string }[],
): AppLanguage {
  for (const locale of locales) {
    const language = (
      locale.languageCode || locale.languageTag?.split(/[-_]/)[0]
    )?.toLowerCase();
    if (language === "en" || language === "it") return language;
  }
  return "en";
}

export const i18n = createInstance();
void i18n.use(initReactI18next).init({
  resources: { en: { translation: { ...en } }, it: { translation: { ...it } } },
  lng: "en",
  fallbackLng: "en",
  supportedLngs: ["en", "it"],
  keySeparator: false,
  initAsync: false,
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

export function message(
  key: TranslationKey,
  values?: MessageValues,
): LocalizedMessage {
  return values ? { key, values } : { key };
}

export function resolveMessageValues(
  values: MessageValues | undefined,
  translator: Translator = translate,
) {
  return (
    values &&
    Object.fromEntries(
      Object.entries(values).map(([name, value]) => [
        name,
        Array.isArray(value)
          ? value.map((item) => formatMessage(item, translator)).join(" ")
          : typeof value === "object"
            ? formatMessage(value, translator)
            : value,
      ]),
    )
  );
}

export function translate(key: TranslationKey, values?: MessageValues): string {
  return i18n.t(key, resolveMessageValues(values));
}

export function formatMessage(
  value: AppMessage,
  translator: Translator = translate,
): string {
  return typeof value === "string"
    ? value
    : translator(value.key, value.values);
}

/** Keep the Error contract in English while carrying language-neutral UI feedback. */
export class TranslationError extends Error {
  constructor(public readonly feedback: LocalizedMessage) {
    super(i18n.getFixedT("en")(feedback.key, feedback.values));
  }
}

export function errorMessage(
  cause: unknown,
  fallback: TranslationKey,
): LocalizedMessage {
  return cause instanceof TranslationError ? cause.feedback : message(fallback);
}
