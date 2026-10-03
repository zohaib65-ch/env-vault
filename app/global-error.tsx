"use client"

import "./globals.css"

export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string }
  retry: () => void
}) {
  return (
    <html lang="en" className="dark">
      <body className="flex min-h-svh flex-col items-center justify-center gap-4 px-4 text-center font-sans">
        <h1 className="text-xl font-semibold">ENV Vault hit an unexpected error</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Nothing was changed. Try again, and if it keeps happening check the
          server logs.
          {error.digest ? (
            <span className="mt-2 block font-mono text-xs">Reference: {error.digest}</span>
          ) : null}
        </p>
        <button
          onClick={() => retry()}
          className="rounded-lg border px-3 py-1.5 text-sm hover:bg-muted"
        >
          Try again
        </button>
      </body>
    </html>
  )
}
