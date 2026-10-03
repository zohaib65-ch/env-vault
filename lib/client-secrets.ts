import { fail, ok, type ActionResult } from "@/lib/action-result"

const CLIPBOARD_FAILED = fail({
  code: "SERVER",
  message: "Your browser blocked clipboard access. Try again.",
})

/**
 * Copies a secret (or a whole .env) straight from the server response to the
 * clipboard.
 *
 * Must be called synchronously from a click/submit handler: the clipboard
 * write is started immediately with a pending ClipboardItem, which keeps the
 * user gesture alive in Safari while the passcode is checked on the server.
 * The value is never rendered or kept in component state.
 */
export async function copySecretFromServer(
  load: () => Promise<ActionResult<{ value: string }>>
): Promise<ActionResult<{ copied: true }>> {
  const pending = load()

  const canWriteItems =
    typeof ClipboardItem !== "undefined" &&
    typeof navigator.clipboard?.write === "function"

  if (canWriteItems) {
    const blob = pending.then((result) => {
      if (!result.ok) throw new Error("Secret unavailable")
      return new Blob([result.data.value], { type: "text/plain" })
    })
    blob.catch(() => {})

    try {
      await navigator.clipboard.write([new ClipboardItem({ "text/plain": blob })])
      return ok({ copied: true as const })
    } catch {
      const result = await pending
      if (!result.ok) return result
      // Some browsers reject promise-based items; fall back to plain text.
    }
  }

  const result = await pending
  if (!result.ok) return result
  try {
    await navigator.clipboard.writeText(result.data.value)
    return ok({ copied: true as const })
  } catch {
    return CLIPBOARD_FAILED
  }
}

/** Saves text as a file without ever placing it in the DOM. */
export function downloadTextFile(fileName: string, content: string) {
  const url = URL.createObjectURL(
    new Blob([content], { type: "text/plain;charset=utf-8" })
  )
  const link = document.createElement("a")
  link.href = url
  link.download = fileName
  link.rel = "noopener"
  link.style.display = "none"
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
