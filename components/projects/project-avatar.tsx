"use client"

import { useMemo, useState, useSyncExternalStore } from "react"
import { createAvatar, type Style } from "@dicebear/core"
import { adventurer, bigSmile, bottts, funEmoji, thumbs } from "@dicebear/collection"

import { cn } from "@/lib/utils"

// Fun cartoon styles, picked at random. Generated in the browser, so project
// names never go to a third-party avatar service.
const STYLES = [funEmoji, bottts, bigSmile, thumbs, adventurer] as Style<object>[]

function hueFor(name: string) {
  let hash = 0
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return hash % 360
}

function randomPick() {
  return {
    style: Math.floor(Math.random() * STYLES.length),
    seed: Math.random().toString(36).slice(2),
  }
}

const subscribe = () => () => {}

/** A new random cartoon on every visit; click it (when `shuffle`) for another. */
export function ProjectAvatar({
  name,
  className,
  shuffle = false,
}: {
  name: string
  className?: string
  shuffle?: boolean
}) {
  const inBrowser = useSyncExternalStore(subscribe, () => true, () => false)
  const [pick, setPick] = useState(randomPick)
  const hue = hueFor(name)

  const image = useMemo(
    () => createAvatar(STYLES[pick.style], { seed: pick.seed }).toDataUri(),
    [pick]
  )

  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase()

  const tile = (
    <span
      aria-hidden
      className={cn(
        "relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border text-sm font-semibold",
        className
      )}
      style={{
        backgroundColor: `oklch(0.27 0.06 ${hue})`,
        borderColor: `oklch(0.42 0.08 ${hue} / 0.6)`,
        color: `oklch(0.88 0.11 ${hue})`,
      }}
    >
      {inBrowser ? (
        // eslint-disable-next-line @next/next/no-img-element -- inline SVG data URI
        <img
          key={pick.seed}
          src={image}
          alt=""
          draggable={false}
          className="animate-in fade-in absolute inset-0 size-full object-cover duration-300"
        />
      ) : (
        initials || "#"
      )}
    </span>
  )

  if (!shuffle) return tile

  return (
    <button
      type="button"
      onClick={() => setPick(randomPick())}
      title="Shuffle avatar"
      aria-label="Shuffle avatar"
      className="shrink-0 rounded-xl transition-transform outline-none hover:scale-105 hover:rotate-3 focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-95"
    >
      {tile}
    </button>
  )
}
