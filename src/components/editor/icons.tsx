import type { CSSProperties } from "react";

interface IconProps {
  size?: number;
  className?: string;
  style?: CSSProperties;
}

function Icon({
  size = 18,
  className,
  style,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
    >
      {children}
    </svg>
  );
}

export function ImageIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="9" cy="10" r="1.5" />
      <path d="M21 16.5l-5.5-5.5L11 15.5l-3-3L3 16.5" />
    </Icon>
  );
}

export function VideoIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <rect x="3" y="6" width="13" height="12" rx="2" />
      <path d="M16 10.5l5-3v9l-5-3z" />
    </Icon>
  );
}

export function TypeIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M5 6.5h14" />
      <path d="M12 6.5v13" />
      <path d="M9 19.5h6" />
    </Icon>
  );
}

export function ShapeRectIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <rect x="4" y="6" width="16" height="12" rx="1.5" />
    </Icon>
  );
}

export function ShapeCircleIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <circle cx="12" cy="12" r="8" />
    </Icon>
  );
}

export function ShapeHeartIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M12 20s-7-4.4-9.3-9.1C1.3 7.7 3 4.6 6.2 4.2c2-.3 3.9.8 5.8 3 1.9-2.2 3.8-3.3 5.8-3 3.2.4 4.9 3.5 3.5 6.7C19 15.6 12 20 12 20z" />
    </Icon>
  );
}

export function ShapeLineIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <line x1="4" y1="12" x2="20" y2="12" strokeWidth={2.4} />
    </Icon>
  );
}

export function ShapeTapeIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <rect x="3" y="9" width="18" height="6" rx="1" transform="rotate(-8 12 12)" />
    </Icon>
  );
}

export function SmileIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="9" cy="10" r="0.9" fill="currentColor" />
      <circle cx="15" cy="10" r="0.9" fill="currentColor" />
      <path d="M8 14c1.2 1.8 6.8 1.8 8 0" />
    </Icon>
  );
}

export function FlipHorizontalIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M12 3v18" strokeDasharray="2.5 2.5" />
      <path d="M16.5 7.5L20 12l-3.5 4.5" />
      <path d="M7.5 7.5L4 12l3.5 4.5" />
    </Icon>
  );
}

export function ShadowIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <rect x="8" y="8" width="12" height="12" rx="2" fill="currentColor" stroke="none" opacity={0.28} />
      <rect x="4" y="4" width="12" height="12" rx="2" />
    </Icon>
  );
}

export function AlignLeftIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="14" y2="12" />
      <line x1="4" y1="18" x2="17" y2="18" />
    </Icon>
  );
}

export function AlignCenterIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="7" y1="12" x2="17" y2="12" />
      <line x1="5.5" y1="18" x2="18.5" y2="18" />
    </Icon>
  );
}

export function HelpCircleIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </Icon>
  );
}

export function ShapeStarIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </Icon>
  );
}

export function ShapeFlowerIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M12 7.5a4.5 4.5 0 1 1 4.5 4.5M12 7.5A4.5 4.5 0 1 0 7.5 12M12 7.5V12m0 0a4.5 4.5 0 1 1 4.5 4.5M12 12a4.5 4.5 0 1 0-4.5 4.5M12 12v4.5" />
      <circle cx="12" cy="12" r="3" />
    </Icon>
  );
}

export function ShapeSparkleIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
    </Icon>
  );
}

export function ShapeCloudIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
    </Icon>
  );
}

export function AlignRightIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="10" y1="12" x2="20" y2="12" />
      <line x1="7" y1="18" x2="20" y2="18" />
    </Icon>
  );
}

export function ArrowUpIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M12 19V5" />
      <path d="M6 11l6-6 6 6" />
    </Icon>
  );
}

export function ArrowDownIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M12 5v14" />
      <path d="M18 13l-6 6-6-6" />
    </Icon>
  );
}

export function DuplicateIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <rect x="3" y="3" width="12" height="12" rx="2" />
      <rect x="9" y="9" width="12" height="12" rx="2" />
    </Icon>
  );
}

export function RotateIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M20 12a8 8 0 1 1-2.34-5.66" />
      <path d="M20 3.5V9h-5.5" />
    </Icon>
  );
}

export function TrashIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M4 7h16" />
      <path d="M6 7l1 13h10l1-13" />
      <path d="M9 7V4h6v3" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </Icon>
  );
}

export function CenterHIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <line x1="12" y1="3" x2="12" y2="21" strokeDasharray="2.5 2.5" />
      <path d="M8 8L4.5 12 8 16" />
      <path d="M16 8l3.5 4-3.5 4" />
    </Icon>
  );
}

export function CenterVIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <line x1="3" y1="12" x2="21" y2="12" strokeDasharray="2.5 2.5" />
      <path d="M8 8L12 4.5 16 8" />
      <path d="M8 16l4 3.5 4-3.5" />
    </Icon>
  );
}

export function PlusIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </Icon>
  );
}

export function CloseIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </Icon>
  );
}

export function PlayIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M5 3l14 9-14 9V3z" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function PauseIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <rect x="6" y="4" width="4" height="16" fill="currentColor" stroke="none" />
      <rect x="14" y="4" width="4" height="16" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function LayersIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 12 12 17 22 12" />
      <polyline points="2 17 12 22 22 17" />
    </Icon>
  );
}

export function UploadCloudIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M16 16l-4-4-4 4" />
      <path d="M12 12v9" />
      <path d="M20.39 18.39A5 5 0 0018 9h-1.26A8 8 0 103 16.3" />
      <path d="M16 16l-4-4-4 4" />
    </Icon>
  );
}
