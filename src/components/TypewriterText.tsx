import { useEffect, useState } from 'react'
import { toFancyMono } from '../lib/mono'
import { missionSound } from '../lib/sound'

type TypewriterTextProps = {
  text: string
  speed?: number
  className?: string
  accentFrom?: number
  accentClassName?: string
  onComplete?: () => void
}

export function TypewriterText({
  text,
  speed = 31,
  className,
  accentFrom,
  accentClassName,
  onComplete,
}: TypewriterTextProps) {
  const [visibleLength, setVisibleLength] = useState(0)

  useEffect(() => {
    setVisibleLength(0)
    let current = 0
    let completeTimer: number | undefined

    const timer = window.setInterval(() => {
      current += 1
      setVisibleLength(current)

      if (text[current - 1]?.trim()) missionSound.play('type')

      if (current >= text.length) {
        window.clearInterval(timer)
        completeTimer = window.setTimeout(() => onComplete?.(), 120)
      }
    }, speed)

    return () => {
      window.clearInterval(timer)
      if (completeTimer) window.clearTimeout(completeTimer)
    }
  }, [onComplete, speed, text])

  const visible = text.slice(0, visibleLength)
  const standardText = accentFrom === undefined ? visible : visible.slice(0, accentFrom)
  const accentText = accentFrom === undefined ? '' : visible.slice(accentFrom)

  return (
    <span className={className} aria-label={text}>
      <span aria-hidden="true">{toFancyMono(standardText)}</span>
      {accentFrom !== undefined && (
        <span aria-hidden="true" className={accentClassName}>
          {toFancyMono(accentText)}
        </span>
      )}
      <span aria-hidden="true" className="type-cursor" />
    </span>
  )
}
