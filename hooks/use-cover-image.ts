import { useState } from "react";
import { coverImageUrl } from "@/utils/cover-image";

export function useCoverImage(value: string | undefined) {
  const url = coverImageUrl(value);
  const [loaded, setLoaded] = useState<string>();
  const [failed, setFailed] = useState<{ url?: string; error?: string }>();
  const status: "missing" | "failed" | "loaded" | "loading" = !url
    ? "missing"
    : failed?.url === url
      ? "failed"
      : loaded === url
        ? "loaded"
        : "loading";
  return {
    url: status !== "failed" ? url : undefined,
    visible: status === "loaded",
    status,
    error: status === "failed" ? failed?.error : undefined,
    onLoad: () => setLoaded(url),
    onError: (error?: string) => setFailed({ url, error }),
  };
}
