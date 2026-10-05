import { useState } from "react";
import { coverImageUrl } from "@/utils/cover-image";

export function useCoverImage(value: string | undefined) {
  const url = coverImageUrl(value);
  const [loaded, setLoaded] = useState<string>();
  const [failed, setFailed] = useState<string>();
  return {
    url: url !== failed ? url : undefined,
    visible: !!url && loaded === url && failed !== url,
    onLoad: () => setLoaded(url),
    onError: () => setFailed(url),
  };
}
