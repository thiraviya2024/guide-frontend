import { cn } from "@/lib/utils"

export function BrandLogo({
  className,
  showWordmark = true,
  size = 32,
}: {
  className?: string
  showWordmark?: boolean
  size?: number
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span
        className="relative inline-flex items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm"
        style={{ width: size, height: size }}
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24" width={size * 0.62} height={size * 0.62} fill="none">
          <path
            d="M3 12h3l2-5 3 10 2.5-6 1.5 3H21"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {showWordmark && (
        <span className="text-base font-bold tracking-tight text-foreground">
          LIFE<span className="text-primary"> SAVER</span>
        </span>
      )}
    </span>
  )
}
