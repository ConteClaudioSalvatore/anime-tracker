import React from "react";

/** Offer recovery without declaring a page or its metadata valid. */
export function useCreatorLoadHelp(key: string, waiting: boolean) {
  const [attempt, setAttempt] = React.useState(0);
  const waitToken = React.useMemo(
    () => ({ key, waiting, attempt }),
    [key, waiting, attempt],
  );
  const [promptToken, setPromptToken] = React.useState<typeof waitToken | null>(
    null,
  );
  React.useEffect(() => {
    if (!waitToken.waiting) return;
    const timer = setTimeout(() => setPromptToken(waitToken), 15000);
    return () => clearTimeout(timer);
  }, [waitToken]);
  const keepWaiting = React.useCallback(() => {
    setPromptToken(null);
    setAttempt((previous) => previous + 1);
  }, []);
  return {
    loadHelpVisible: waiting && promptToken === waitToken,
    keepWaiting,
  };
}
