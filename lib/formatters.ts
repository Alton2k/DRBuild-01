export function formatMyrPrice(value: number, maximumFractionDigits = 2) {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    maximumFractionDigits,
  }).format(value);
}

const malaysiaMonthLabels = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

/**
 * Formats a timestamp in Malaysia time without locale-dependent output.
 * This keeps server-rendered and browser-rendered text identical during hydration.
 */
export function formatMalaysiaDateTime(timestamp: string) {
  const instant = new Date(timestamp);

  if (Number.isNaN(instant.getTime())) {
    return "Unknown";
  }

  const malaysiaTime = new Date(instant.getTime() + 8 * 60 * 60 * 1000);
  const day = String(malaysiaTime.getUTCDate()).padStart(2, "0");
  const month = malaysiaMonthLabels[malaysiaTime.getUTCMonth()];
  const year = malaysiaTime.getUTCFullYear();
  const minute = String(malaysiaTime.getUTCMinutes()).padStart(2, "0");
  const hour24 = malaysiaTime.getUTCHours();
  const hour12 = String(hour24 % 12 || 12).padStart(2, "0");
  const period = hour24 >= 12 ? "pm" : "am";

  return `${day} ${month} ${year}, ${hour12}:${minute} ${period}`;
}
