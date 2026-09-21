import {
  WEBSITE_AUDIT_TITLE,
  WEBSITE_AUDIT_VIDEO_PATH,
} from "@/lib/media";

type WebsiteAuditVideoProps = {
  className?: string;
  poster?: string;
};

export function WebsiteAuditVideo({
  className = "",
  poster = "/logo.jpg",
}: WebsiteAuditVideoProps) {
  return (
    <video
      className={`aspect-video w-full rounded-xl border border-white/10 bg-black object-contain ${className}`}
      controls
      playsInline
      preload="metadata"
      poster={poster}
      aria-label={WEBSITE_AUDIT_TITLE}
    >
      <source src={WEBSITE_AUDIT_VIDEO_PATH} type="video/mp4" />
      <a href={WEBSITE_AUDIT_VIDEO_PATH}>Download the DigiSol website audit video</a>
    </video>
  );
}
