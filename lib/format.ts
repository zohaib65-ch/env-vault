const relativeFormatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" })

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 60 * 60],
  ["month", 30 * 24 * 60 * 60],
  ["week", 7 * 24 * 60 * 60],
  ["day", 24 * 60 * 60],
  ["hour", 60 * 60],
  ["minute", 60],
]

export function timeAgo(date: string | Date, now = Date.now()) {
  const seconds = Math.round((new Date(date).getTime() - now) / 1000)
  if (Math.abs(seconds) < 45) return "just now"
  for (const [unit, unitSeconds] of UNITS) {
    if (Math.abs(seconds) >= unitSeconds || unit === "minute") {
      return relativeFormatter.format(Math.round(seconds / unitSeconds), unit)
    }
  }
  return "just now"
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date))
}

export function formatDateTime(date: string | Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(date))
}

export function pluralize(count: number, singular: string, plural?: string) {
  return `${count.toLocaleString("en")} ${count === 1 ? singular : (plural ?? `${singular}s`)}`
}

export function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "project"
  )
}

/** "Chrome on macOS" — good enough to tell two laptops apart. */
export function describeDevice(userAgent: string | null | undefined) {
  if (!userAgent) return "Unknown device"

  const browser = /Edg\//.test(userAgent)
    ? "Edge"
    : /OPR\//.test(userAgent)
      ? "Opera"
      : /Firefox\//.test(userAgent)
        ? "Firefox"
        : /Chrome\//.test(userAgent)
          ? "Chrome"
          : /Safari\//.test(userAgent)
            ? "Safari"
            : /curl\//i.test(userAgent)
              ? "curl"
              : "Browser"

  const os = /iPhone|iPad|iPod/.test(userAgent)
    ? "iOS"
    : /Android/.test(userAgent)
      ? "Android"
      : /Mac OS X|Macintosh/.test(userAgent)
        ? "macOS"
        : /Windows/.test(userAgent)
          ? "Windows"
          : /CrOS/.test(userAgent)
            ? "ChromeOS"
            : /Linux/.test(userAgent)
              ? "Linux"
              : null

  return os ? `${browser} on ${os}` : browser
}
