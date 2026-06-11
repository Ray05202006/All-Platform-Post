import type { Platform } from "@/lib/types";
import { cn } from "@/lib/utils";

interface PlatformIconProps {
  platform: Platform | string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_CLASS = {
  sm: "w-6 h-6 text-xs",
  md: "w-8 h-8 text-xs",
  lg: "w-10 h-10 text-sm",
};

const PLATFORM_STYLES: Record<string, { bg: string; label: string }> = {
  facebook: { bg: "bg-[#1877F2] text-white", label: "f" },
  instagram: { bg: "bg-gradient-to-br from-[#833AB4] via-[#E1306C] to-[#FCAF45] text-white", label: "ig" },
  twitter: { bg: "bg-black text-white dark:bg-white dark:text-black", label: "𝕏" },
  threads: { bg: "bg-[#101010] text-white dark:bg-white dark:text-black", label: "@" },
};

function FacebookSVG({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function InstagramSVG({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  );
}

function XSVG({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function ThreadsSVG({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.964-.065-1.19.408-2.285 1.33-3.082.88-.76 2.119-1.207 3.583-1.291a13.853 13.853 0 011.228.017c-.5-2.515-.5-2.515-1.748-2.515-.898 0-2.107.336-2.107 2.39v.17c-1.134.07-2.131.43-2.876 1.067-.907.772-1.38 1.872-1.33 3.1.083 1.74 1.017 3.225 2.58 4.22 1.252.795 2.855 1.163 4.623 1.063 2.208-.12 3.946-.996 5.168-2.603.8-1.054 1.3-2.388 1.487-3.983 1.017.58 1.797 1.375 2.28 2.445.774 1.77.8 4.486-1.532 6.748-1.794 1.756-4.059 2.577-7.03 2.6z" />
    </svg>
  );
}

export function PlatformIcon({ platform, size = "md", className }: PlatformIconProps) {
  const style = PLATFORM_STYLES[platform] ?? { bg: "bg-muted text-muted-foreground", label: "?" };

  const svgClass = "w-4 h-4";

  const icon =
    platform === "facebook" ? <FacebookSVG className={svgClass} /> :
    platform === "instagram" ? <InstagramSVG className={svgClass} /> :
    platform === "twitter" ? <XSVG className={svgClass} /> :
    platform === "threads" ? <ThreadsSVG className={svgClass} /> :
    <span className="font-bold">{style.label}</span>;

  return (
    <div
      className={cn(
        "rounded-lg flex items-center justify-center flex-shrink-0",
        SIZE_CLASS[size],
        style.bg,
        className
      )}
    >
      {icon}
    </div>
  );
}
