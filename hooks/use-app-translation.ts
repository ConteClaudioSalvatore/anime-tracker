import React from "react";
import { useTranslation } from "react-i18next";
import {
  i18n,
  resolveMessageValues,
  formatMessage,
  type Translator,
  type AppMessage,
} from "@/utils/i18n";

/** Subscribe to language changes while sharing the imperative translator. */
export function useAppTranslation() {
  const { t } = useTranslation(undefined, { i18n });
  return React.useCallback<Translator>(
    function translate(key, values) {
      return t(key, resolveMessageValues(values, translate));
    },
    [t],
  );
}

export function useMessageFormatter() {
  const t = useAppTranslation();
  return React.useCallback((value: AppMessage) => formatMessage(value, t), [t]);
}
