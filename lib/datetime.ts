/**
 * Returns current timestamp in local machine timezone
 * Format: ISO 8601 with local timezone offset
 */
export function getLocalISOString(): string {
  const now = new Date();
  
  // Get timezone offset in minutes (positive if behind UTC, negative if ahead)
  const offset = now.getTimezoneOffset();
  const offsetHours = Math.abs(Math.floor(offset / 60));
  const offsetMinutes = Math.abs(offset % 60);
  const offsetSign = offset <= 0 ? "+" : "-";
  const offsetStr = `${offsetSign}${String(offsetHours).padStart(2, "0")}:${String(offsetMinutes).padStart(2, "0")}`;
  
  // Format the date using local time components
  const formatter = new Intl.DateTimeFormat("en-US", {
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
  
  // Build ISO string: YYYY-MM-DDTHH:mm:ss+/-HH:mm
  return `${partMap.year}-${partMap.month}-${partMap.day}T${partMap.hour}:${partMap.minute}:${partMap.second}${offsetStr}`;
}

// Keep alias for backward compatibility
export const getPhilippinesISOString = getLocalISOString;

/**
 * Converts a UTC ISO string to local machine timezone ISO string
 * Format: ISO 8601 with local timezone offset
 */
export function toLocalTime(isoString: string): string {
  if (!isoString) return isoString;
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;
  
  // Get timezone offset in minutes (positive if behind UTC, negative if ahead)
  const offset = date.getTimezoneOffset();
  const offsetHours = Math.abs(Math.floor(offset / 60));
  const offsetMinutes = Math.abs(offset % 60);
  const offsetSign = offset <= 0 ? "+" : "-";
  const offsetStr = `${offsetSign}${String(offsetHours).padStart(2, "0")}:${String(offsetMinutes).padStart(2, "0")}`;
  
  // Format the date using local time components
  const formatter = new Intl.DateTimeFormat("en-US", {
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
  
  // Build ISO string: YYYY-MM-DDTHH:mm:ss+/-HH:mm
  return `${partMap.year}-${partMap.month}-${partMap.day}T${partMap.hour}:${partMap.minute}:${partMap.second}${offsetStr}`;
}

// Keep alias for backward compatibility
export const toPhilippinesTime = toLocalTime;
