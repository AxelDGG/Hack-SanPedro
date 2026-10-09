export function LogoMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 512 512" className={className} aria-hidden="true">
      <rect width="512" height="512" rx="112" fill="#e2583e" />
      <path
        d="M256 84c-72 0-130 57-130 128 0 95 130 212 130 212s130-117 130-212c0-71-58-128-130-128z"
        fill="#fff8ee"
      />
      <g fill="#e2583e">
        <path d="M256 214c-26 0-50 22-50 42 0 15 12 22 25 20 9-1 16-5 25-5s16 4 25 5c13 2 25-5 25-20 0-20-24-42-50-42z" />
        <ellipse cx="207" cy="186" rx="15" ry="20" transform="rotate(-22 207 186)" />
        <ellipse cx="238" cy="160" rx="15" ry="21" transform="rotate(-7 238 160)" />
        <ellipse cx="274" cy="160" rx="15" ry="21" transform="rotate(7 274 160)" />
        <ellipse cx="305" cy="186" rx="15" ry="20" transform="rotate(22 305 186)" />
      </g>
    </svg>
  );
}

export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <LogoMark />
      <span className="font-display text-xl font-semibold tracking-tight">
        Callejer<span className="text-terracota">OS</span>
      </span>
    </span>
  );
}
