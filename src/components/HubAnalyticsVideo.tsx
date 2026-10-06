import { getServerMessages } from "@/lib/i18n/server";
import { HUB_ANALYTICS_TITLE, HUB_ANALYTICS_VIDEO_PATH } from "@/lib/media";

type HubAnalyticsVideoProps = {
  className?: string;
};

export function HubAnalyticsVideo({ className = "" }: HubAnalyticsVideoProps) {
  return (
    <video
      className={`aspect-video w-full rounded-xl border border-white/10 bg-black object-contain ${className}`}
      controls
      playsInline
      preload="metadata"
      aria-label={HUB_ANALYTICS_TITLE}
    >
      <source src={HUB_ANALYTICS_VIDEO_PATH} type="video/mp4" />
      <a href={HUB_ANALYTICS_VIDEO_PATH}>{getServerMessages().websiteAudit.analyticsFallback}</a>
    </video>
  );
}
