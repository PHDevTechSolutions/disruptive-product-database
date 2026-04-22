/**
 * Returns current timestamp in Philippines timezone (UTC+8)
 * Format: ISO 8601 with Asia/Manila timezone offset (+08:00)
 */
export function getPhilippinesISOString(): string {
  const now = new Date();
  
  // Format the date in Asia/Manila timezone using Intl.DateTimeFormat
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
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
 * Converts a UTC ISO string to Philippines timezone ISO string
 * Format: ISO 8601 with Asia/Manila timezone offset (+08:00)
 */
export function toPhilippinesTime(isoString: string): string {
  if (!isoString) return isoString;
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return isoString;
  
  // Format the date in Asia/Manila timezone using Intl.DateTimeFormat
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
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

/**
 * Converts UTC timestamp to Philippines time by adding UTC+8 offset
 * This ensures consistent behavior on both server (UTC) and client
 */
function toPhilippinesDate(date: Date): Date {
  // UTC+8 offset in milliseconds (8 hours * 60 minutes * 60 seconds * 1000 ms)
  const UTC_PLUS_8_OFFSET = 8 * 60 * 60 * 1000;
  // Get UTC time in ms and add 8 hours
  const philippinesTimeMs = date.getTime() + UTC_PLUS_8_OFFSET;
  return new Date(philippinesTimeMs);
}

/**
 * Formats a UTC ISO string to Philippines timezone display string
 * Format: "Jan 15, 2024, 02:30:45 PM" (with Asia/Manila timezone)
 * Works consistently on both server (UTC) and client
 */
export function formatPhilippinesDate(isoString: string | Date | null | undefined): string {
  if (!isoString) return "-";
  const date = typeof isoString === "string" ? new Date(isoString) : isoString;
  if (isNaN(date.getTime())) return "-";

  // Convert to Philippines time
  const phDate = toPhilippinesDate(date);

  // Format using UTC methods (since we've already adjusted the time)
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[phDate.getUTCMonth()];
  const day = String(phDate.getUTCDate()).padStart(2, "0");
  const year = phDate.getUTCFullYear();

  // Format time with AM/PM
  let hours = phDate.getUTCHours();
  const minutes = String(phDate.getUTCMinutes()).padStart(2, "0");
  const seconds = String(phDate.getUTCSeconds()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'

  return `${month} ${day}, ${year}, ${String(hours).padStart(2, "0")}:${minutes}:${seconds} ${ampm}`;
}

/**
 * Formats a UTC ISO string to Philippines timezone short display string (date only)
 * Format: "Jan 15, 2024" (with Asia/Manila timezone)
 * Works consistently on both server (UTC) and client
 */
export function formatPhilippinesDateShort(isoString: string | Date | null | undefined): string {
  if (!isoString) return "-";
  const date = typeof isoString === "string" ? new Date(isoString) : isoString;
  if (isNaN(date.getTime())) return "-";

  // Convert to Philippines time
  const phDate = toPhilippinesDate(date);

  // Format using UTC methods (since we've already adjusted the time)
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[phDate.getUTCMonth()];
  const day = String(phDate.getUTCDate()).padStart(2, "0");
  const year = phDate.getUTCFullYear();

  return `${month} ${day}, ${year}`;
}
