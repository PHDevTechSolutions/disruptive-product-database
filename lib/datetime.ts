/**
 * Returns current timestamp in Philippines timezone (UTC+8)
 * Format: ISO 8601 with Asia/Manila timezone offset
 */
export function getPhilippinesISOString(): string {
  const now = new Date();
  // Get timezone offset in minutes for Asia/Manila (should be -480 for UTC+8)
  const manilaDate = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Manila" }));
  const utcDate = new Date(now.toLocaleString("en-US", { timeZone: "UTC" }));
  const offsetMs = manilaDate.getTime() - utcDate.getTime();
  
  // Create Manila timestamp
  const manilaTimestamp = new Date(now.getTime() + offsetMs);
  
  // Format as ISO string with +08:00 offset
  const isoString = manilaTimestamp.toISOString();
  return isoString.replace("Z", "+08:00");
}

/**
 * Converts a UTC ISO string to Philippines timezone ISO string
 */
export function toPhilippinesTime(isoString: string): string {
  if (!isoString) return isoString;
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;
  
  const manilaDate = new Date(date.toLocaleString("en-US", { timeZone: "Asia/Manila" }));
  const utcDate = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
  const offsetMs = manilaDate.getTime() - utcDate.getTime();
  
  const manilaTimestamp = new Date(date.getTime() + offsetMs);
  return manilaTimestamp.toISOString().replace("Z", "+08:00");
}
