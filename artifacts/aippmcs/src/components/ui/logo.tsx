interface LogoProps {
  className?: string;
  size?: number;
}

/**
 * Mtiririko — "Flow" in Swahili.
 * A water drop with twin sinusoidal wave lines inside, representing
 * continuous water flow monitored by the pump protection system.
 */
export function MtiririkoLogo({ className, size = 24 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Mtiririko logo"
    >
      {/* Water drop body */}
      <path
        d="M12 2.5L6.2 11C4.9 13.1 4.5 14.7 4.5 16.2C4.5 19.9 7.9 22.5 12 22.5C16.1 22.5 19.5 19.9 19.5 16.2C19.5 14.7 19.1 13.1 17.8 11L12 2.5Z"
        fill="currentColor"
        fillOpacity="0.12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Flow line 1 — upper wave */}
      <path
        d="M8.5 14C9.3 12.8 10.4 12.3 11.8 13C13.2 13.7 14.3 13.2 15 12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {/* Flow line 2 — lower wave */}
      <path
        d="M8.5 17C9.3 15.8 10.4 15.3 11.8 16C13.2 16.7 14.3 16.2 15 15"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
