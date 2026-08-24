/**
 * Inline SVG icons.
 *
 * Hand-rolled rather than pulled from an icon package: there are twelve of them,
 * they all share one stroke weight, and it keeps the dependency list short.
 * Every icon inherits `currentColor` and sizes off the `size` prop.
 */

interface IconProps {
  size?: number;
  className?: string;
}

function svgProps(size: number, className?: string) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    'aria-hidden': true,
    focusable: 'false' as const,
  };
}

export function PlusIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function ChevronLeftIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

export function ChevronRightIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

export function SearchIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.5-3.5" />
    </svg>
  );
}

export function DownloadIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M12 3v12" />
      <path d="M7 11l5 5 5-5" />
      <path d="M4 20h16" />
    </svg>
  );
}

export function EyeIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

export function TrashIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M4 7h16" />
      <path d="M10 4h4M9 7v12M15 7v12" />
      <path d="M6 7l1 13h10l1-13" />
    </svg>
  );
}

export function CopyIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M15 5.5A1.5 1.5 0 0013.5 4H6a2 2 0 00-2 2v7.5A1.5 1.5 0 005.5 15" />
    </svg>
  );
}

export function PencilIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M4 20h4l10-10a2.5 2.5 0 10-3.5-3.5L4 16.5V20z" />
      <path d="M13.5 6.5L17.5 10.5" />
    </svg>
  );
}

export function SettingsIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2.5M12 18.5V21M4.2 7.5l2.2 1.2M17.6 15.3l2.2 1.2M4.2 16.5l2.2-1.2M17.6 8.7l2.2-1.2" />
    </svg>
  );
}

export function CheckIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M5 12.5l4.5 4.5L19 7" />
    </svg>
  );
}

export function AlertIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 8v4.5" />
      <path d="M12 16h.01" />
    </svg>
  );
}

export function CloseIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function DocumentIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z" />
      <path d="M14 3v5h5" />
    </svg>
  );
}

export function SpinnerIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)} className={`animate-spin ${className ?? ''}`}>
      <path d="M12 3a9 9 0 109 9" />
    </svg>
  );
}

export function CloudIcon({ size = 18, className }: IconProps) {
  return (
    <svg {...svgProps(size, className)}>
      <path d="M7 18h9.5a3.5 3.5 0 100-7 5 5 0 00-9.6 1.3A3 3 0 007 18z" />
    </svg>
  );
}
