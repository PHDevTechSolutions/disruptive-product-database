/**
 * Returns current timestamp in China/Shanghai timezone (UTC+8)
 * Format: ISO 8601 with Asia/Shanghai timezone offset (+08:00)
 */
export function getPhilippinesISOString(): string {
  const now = new Date();
  
  // Format the date in Asia/Shanghai timezone using Intl.DateTimeFormat
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  
  const parts = formatter.formatToParts(now);
  const partMap: Record<string, string> = {};
  parts.forEach((p) => { partMap[p.type] = p.value; });
  
  // Build ISO string: YYYY-MM-DDTHH:mm:ss+08:00
  const isoString = `${partMap.year}-${partMap.month}-${partMap.day}T${partMap.hour}:${partMap.minute}:${partMap.second}+08:00`;
  
  return isoString;
}

/**
 * Converts a UTC ISO string to China/Shanghai timezone ISO string
 * Format: ISO 8601 with Asia/Shanghai timezone offset (+08:00)
 */
export function toPhilippinesTime(isoString: string): string {
  if (!isoString) return isoString;
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;
  
  // Format the date in Asia/Shanghai timezone using Intl.DateTimeFormat
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  
  const parts = formatter.formatToParts(date);
  const partMap: Record<string, string> = {};
  parts.forEach((p) => { partMap[p.type] = p.value; });
  
  // Build ISO string: YYYY-MM-DDTHH:mm:ss+08:00
  return `${partMap.year}-${partMap.month}-${partMap.day}T${partMap.hour}:${partMap.minute}:${partMap.second}+08:00`;
}
