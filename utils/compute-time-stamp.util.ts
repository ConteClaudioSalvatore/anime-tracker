export function computeTimeStamp(progress: number): string {
  if (typeof progress !== "number" || Number.isNaN(progress)) {
    throw new TypeError("Input must be a valid number.");
  }
  if (progress < 0) {
    throw new Error("Seconds cannot be negative.");
  }

  // Calculate hours, minutes, seconds
  const hours = Math.floor(progress / 3600);
  const minutes = Math.floor((progress % 3600) / 60);
  const seconds = Math.floor(progress % 60);

  // Pad with leading zeros
  const pad = (num: number) => String(num).padStart(2, "0");

  if (hours === 0) {
    return `${pad(minutes)}:${pad(seconds)}`;
  }

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}
