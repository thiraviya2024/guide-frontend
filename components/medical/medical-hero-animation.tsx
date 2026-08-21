"use client"

import { motion, useReducedMotion } from "framer-motion"
import { useMemo } from "react"

/**
 * Signature LIFE SAVER hero animation.
 * Combines a DNA double-helix, an ECG heartbeat trace, a medical cross,
 * and floating particles — all as lightweight SVG + Framer Motion.
 * Respects prefers-reduced-motion (renders a calm static composition).
 */
export function MedicalHeroAnimation({ className }: { className?: string }) {
  const reduce = useReducedMotion()

  // Precompute the two helix strands.
  const helix = useMemo(() => {
    const points = 22
    const strandA: { x: number; y: number }[] = []
    const strandB: { x: number; y: number }[] = []
    for (let i = 0; i < points; i++) {
      const t = (i / (points - 1)) * Math.PI * 4
      const y = 20 + (i / (points - 1)) * 320
      strandA.push({ x: 200 + Math.sin(t) * 70, y })
      strandB.push({ x: 200 - Math.sin(t) * 70, y })
    }
    return { strandA, strandB, points }
  }, [])

  const particles = useMemo(
    () =>
      Array.from({ length: 14 }).map((_, i) => ({
        id: i,
        x: 30 + ((i * 37) % 340),
        y: 20 + ((i * 61) % 340),
        size: 2 + (i % 3),
        delay: (i % 7) * 0.4,
        dur: 5 + (i % 5),
      })),
    [],
  )

  return (
    <div className={className} aria-hidden="true">
      <svg viewBox="0 0 400 360" fill="none" className="h-full w-full">
        <defs>
          <linearGradient id="ls-strand" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" />
            <stop offset="100%" stopColor="var(--color-accent)" />
          </linearGradient>
          <radialGradient id="ls-glow" cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* ambient glow */}
        <rect x="0" y="0" width="400" height="360" fill="url(#ls-glow)" />

        {/* DNA rungs */}
        {helix.strandA.map((p, i) => {
          const b = helix.strandB[i]
          return (
            <motion.line
              key={`rung-${i}`}
              x1={p.x}
              y1={p.y}
              x2={b.x}
              y2={b.y}
              stroke="var(--color-secondary-foreground)"
              strokeOpacity={0.25}
              strokeWidth={1.5}
              initial={reduce ? undefined : { opacity: 0 }}
              animate={reduce ? undefined : { opacity: [0.1, 0.5, 0.1] }}
              transition={
                reduce ? undefined : { duration: 3, repeat: Infinity, delay: i * 0.08, ease: "easeInOut" }
              }
            />
          )
        })}

        {/* strand A */}
        <motion.polyline
          points={helix.strandA.map((p) => `${p.x},${p.y}`).join(" ")}
          stroke="url(#ls-strand)"
          strokeWidth={3.5}
          strokeLinecap="round"
          initial={reduce ? undefined : { pathLength: 0 }}
          animate={reduce ? undefined : { pathLength: 1 }}
          transition={reduce ? undefined : { duration: 2, ease: "easeInOut" }}
        />
        {/* strand B */}
        <motion.polyline
          points={helix.strandB.map((p) => `${p.x},${p.y}`).join(" ")}
          stroke="url(#ls-strand)"
          strokeWidth={3.5}
          strokeLinecap="round"
          strokeOpacity={0.75}
          initial={reduce ? undefined : { pathLength: 0 }}
          animate={reduce ? undefined : { pathLength: 1 }}
          transition={reduce ? undefined : { duration: 2, ease: "easeInOut", delay: 0.25 }}
        />

        {/* helix nodes */}
        {helix.strandA.map((p, i) => (
          <motion.circle
            key={`na-${i}`}
            cx={p.x}
            cy={p.y}
            r={3}
            fill="var(--color-primary)"
            initial={reduce ? undefined : { scale: 0 }}
            animate={reduce ? undefined : { scale: [0, 1.2, 1] }}
            transition={reduce ? undefined : { duration: 0.6, delay: 0.4 + i * 0.05 }}
          />
        ))}

        {/* ECG heartbeat trace across the middle */}
        <motion.path
          d="M10 180 H120 L138 180 L150 140 L166 230 L182 100 L198 180 H250 L266 180 L278 150 L292 205 L306 180 H390"
          stroke="var(--color-danger)"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={reduce ? undefined : { pathLength: 0, opacity: 0 }}
          animate={reduce ? { opacity: 0.9 } : { pathLength: 1, opacity: 0.9 }}
          transition={reduce ? undefined : { duration: 2.4, repeat: Infinity, repeatType: "loop", ease: "easeInOut" }}
        />

        {/* medical cross badge */}
        <g>
          <motion.circle
            cx={200}
            cy={180}
            r={30}
            fill="var(--color-card)"
            stroke="var(--color-primary)"
            strokeWidth={2}
            initial={reduce ? undefined : { scale: 0, opacity: 0 }}
            animate={reduce ? undefined : { scale: 1, opacity: 1 }}
            transition={reduce ? undefined : { duration: 0.6, delay: 1 }}
          />
          <motion.g
            initial={reduce ? undefined : { scale: 0 }}
            animate={reduce ? undefined : { scale: [1, 1.08, 1] }}
            transition={reduce ? undefined : { duration: 1.6, repeat: Infinity, ease: "easeInOut", delay: 1.4 }}
            style={{ transformOrigin: "200px 180px" }}
          >
            <rect x={194} y={166} width={12} height={28} rx={3} fill="var(--color-primary)" />
            <rect x={186} y={174} width={28} height={12} rx={3} fill="var(--color-primary)" />
          </motion.g>
        </g>

        {/* floating particles */}
        {particles.map((p) => (
          <motion.circle
            key={p.id}
            cx={p.x}
            cy={p.y}
            r={p.size}
            fill="var(--color-accent)"
            fillOpacity={0.5}
            initial={reduce ? undefined : { opacity: 0 }}
            animate={reduce ? { opacity: 0.4 } : { y: [0, -14, 0], opacity: [0.15, 0.6, 0.15] }}
            transition={reduce ? undefined : { duration: p.dur, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
          />
        ))}
      </svg>
    </div>
  )
}
