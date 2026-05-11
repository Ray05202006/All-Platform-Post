import type { Platform } from "@/lib/types";
import { PLATFORM_LIMITS } from "@/lib/types";

export interface PlatformMeta {
  id: Platform;
  name: string;
  shortName: string;
  description: string;
  maxLength: number;
  brandColor: string;
  brandClassName: string;
  icon: "facebook" | "instagram" | "x" | "threads";
}

export const PLATFORMS: PlatformMeta[] = [
  {
    id: "facebook",
    name: "Facebook",
    shortName: "FB",
    description: "Publish to Facebook Pages",
    maxLength: PLATFORM_LIMITS.facebook,
    brandColor: "#1877F2",
    brandClassName: "bg-[#1877F2] text-white",
    icon: "facebook",
  },
  {
    id: "instagram",
    name: "Instagram",
    shortName: "IG",
    description: "Publish to Instagram Business",
    maxLength: PLATFORM_LIMITS.instagram,
    brandColor: "#E1306C",
    brandClassName: "bg-gradient-to-br from-[#833AB4] via-[#E1306C] to-[#FCAF45] text-white",
    icon: "instagram",
  },
  {
    id: "twitter",
    name: "Twitter / X",
    shortName: "X",
    description: "Publish tweets and threads",
    maxLength: PLATFORM_LIMITS.twitter,
    brandColor: "#000000",
    brandClassName: "bg-black text-white dark:bg-white dark:text-black",
    icon: "x",
  },
  {
    id: "threads",
    name: "Threads",
    shortName: "TH",
    description: "Publish to Threads",
    maxLength: PLATFORM_LIMITS.threads,
    brandColor: "#101010",
    brandClassName: "bg-[#101010] text-white dark:bg-white dark:text-black",
    icon: "threads",
  },
];

export const PLATFORM_BY_ID: Record<Platform, PlatformMeta> = Object.fromEntries(
  PLATFORMS.map((p) => [p.id, p])
) as Record<Platform, PlatformMeta>;

export function getPlatformMeta(platform: Platform | string): PlatformMeta | undefined {
  return PLATFORMS.find((p) => p.id === platform);
}

export function isPlatform(value: string): value is Platform {
  return PLATFORMS.some((p) => p.id === value);
}
