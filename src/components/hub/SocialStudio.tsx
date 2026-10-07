"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import { ImageTextEditor } from "@/components/hub/ImageTextEditor";
import { MAX_FILE_MB } from "@/lib/files";
import { uploadHubFile } from "@/lib/hubUpload";
import type { LayoutPiece } from "@/lib/layoutPieces";

type Channel = "facebook" | "instagram";

type Draft = { channel: Channel; body: string };

type ChatMessage = { role: "user" | "assistant"; content: string };

type MediaFile = { url: string; label: string; kind: "image" | "video"; source?: "media" | "poster" };

function kindFor(url: string, files: MediaFile[]) {
  const known = files.find((file) => file.url === url);
  if (known) return known.kind;
  return /\.(mp4|mov|m4v|webm)(\?|$)/i.test(url) ? "video" : "image";
}

function isPublishableVideo(file: File) {
  return file.type === "video/mp4" || file.type === "video/quicktime" || /\.(mp4|mov|m4v)$/i.test(file.name);
}

type RecentPost = {
  id: string;
  channel: string;
  body: string;
  status: string;
  scheduled_at: string | null;
  published_at: string | null;
  external_url: string | null;
  error_message: string | null;
};

const inputClass =
  "w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-indigo-400 focus:outline-none";

const LABEL: Record<Channel, string> = { facebook: "Facebook", instagram: "Instagram" };

function statusLabel(status: string) {
  if (status === "published") return "Posted";
  if (status === "failed") return "Didn't send";
  if (status === "queued") return "Scheduled";
  if (status === "publishing") return "Sending";
  return status;
}

function tomorrowMountain() {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Edmonton",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [year, month, day] = today.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + 1)).toISOString().slice(0, 10);
}

function PostPreview({
  channel,
  companyName,
  body,
  mediaUrl,
  kind,
  onOpenMedia,
}: {
  channel: Channel;
  companyName: string;
  body: string;
  mediaUrl: string;
  kind: "image" | "video" | "";
  onOpenMedia: (url: string) => void;
}) {
  const mark = companyName.trim().slice(0, 1).toUpperCase() || "D";
  const media = !mediaUrl ? (
    <p className="bg-zinc-100 px-4 py-10 text-center text-sm text-zinc-500">No file on this post.</p>
  ) : kind === "video" ? (
    <video src={mediaUrl} controls playsInline preload="metadata" className="aspect-video w-full bg-black" />
  ) : (
    <button type="button" className="block w-full bg-zinc-100" onClick={() => onOpenMedia(mediaUrl)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={mediaUrl} alt="" className="h-auto w-full" />
    </button>
  );

  if (channel === "instagram") {
    return (
      <div className="overflow-hidden rounded-xl bg-white text-zinc-900">
        <div className="flex items-center gap-2 px-3 py-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white">
            {mark}
          </span>
          <p className="text-sm font-semibold">{companyName}</p>
        </div>
        {media}
        <p className="whitespace-pre-line px-3 py-3 text-sm leading-5">
          <span className="font-semibold">{companyName} </span>
          {body}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl bg-white text-zinc-900">
      <div className="flex items-center gap-2 px-3 py-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-600 text-sm font-semibold text-white">
          {mark}
        </span>
        <div>
          <p className="text-sm font-semibold">{companyName}</p>
          <p className="text-xs text-zinc-500">Facebook</p>
        </div>
      </div>
      <p className="whitespace-pre-line px-3 pb-3 text-sm leading-5">{body}</p>
      {media}
    </div>
  );
}

export function SocialStudio({
  posters,
  recent,
  companyName,
  logoUrl,
  siteUrl,
  palette,
}: {
  posters: MediaFile[];
  recent: RecentPost[];
  companyName: string;
  logoUrl?: string;
  siteUrl?: string;
  palette?: { name: string; value: string }[];
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Tell me what to post, including the offer and whether you want the logo and badge. I'll write both captions and build the image from this company's files. Nothing goes out until you press Post.",
    },
  ]);
  const [input, setInput] = useState("");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const videoInput = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState(posters);
  const [images, setImages] = useState<Record<Channel, string>>({ facebook: posters[0]?.url || "", instagram: posters[0]?.url || "" });
  const [artByUrl, setArtByUrl] = useState<Record<string, string>>({});
  const [piecesByUrl, setPiecesByUrl] = useState<Record<string, LayoutPiece[]>>({});
  const [editGen, setEditGen] = useState(0);
  const [imageRev, setImageRev] = useState(0);
  const [videoUrl, setVideoUrl] = useState(
    posters.find((file) => file.kind === "video" && file.source !== "media")?.url || "",
  );
  const [videoCaption, setVideoCaption] = useState("");
  const [videoChannels, setVideoChannels] = useState<Record<Channel, boolean>>({ facebook: true, instagram: true });
  const [day, setDay] = useState(tomorrowMountain);
  const [hour, setHour] = useState(10);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [openImage, setOpenImage] = useState("");

  async function sendChat() {
    const text = input.trim();
    if (!text) return;
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setInput("");
    setBusy("chat");
    setNotice("");
    try {
      const response = await fetch("/api/hub/social/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.slice(1) }),
      });
      const json = (await response.json().catch(() => ({}))) as {
        error?: string;
        reply?: string;
        drafts?: Draft[];
        visual?: string;
      };
      if (!response.ok) {
        setNotice(json.error || "Kaylev could not write that.");
        return;
      }
      setMessages((current) => [...current, { role: "assistant", content: json.reply || "Done." }]);
      if (json.drafts?.length) setDrafts(json.drafts);
      if (json.visual) {
        setBusy("image");
        setNotice("Creating that picture…");
        const currentUrl = images.facebook || images.instagram || "";
        const currentArt = artByUrl[currentUrl] || "";
        const canReplace = Boolean(currentArt && currentArt !== currentUrl);
        const imageResponse = await fetch("/api/hub/social/image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: json.visual,
            replaceUrl: canReplace ? currentUrl : "",
            artUrl: canReplace ? currentArt : "",
          }),
        });
        const imageJson = (await imageResponse.json().catch(() => ({}))) as {
          error?: string;
          url?: string;
          artUrl?: string;
          pieces?: LayoutPiece[];
          label?: string;
        };
        if (!imageResponse.ok || !imageJson.url) {
          setNotice(imageJson.error || "The captions are ready. The image did not build.");
        } else {
          const nextUrl = imageJson.url;
          setFiles((current) =>
            current.some((file) => file.url === nextUrl)
              ? current
              : [{ url: nextUrl, label: imageJson.label || "New poster", kind: "image" }, ...current],
          );
          setArtByUrl((current) => ({ ...current, [nextUrl]: imageJson.artUrl || nextUrl }));
          setPiecesByUrl((current) => ({ ...current, [nextUrl]: imageJson.pieces || [] }));
          setEditGen((current) => current + 1);
          setImageRev((current) => current + 1);
          setImages({ facebook: nextUrl, instagram: nextUrl });
          setNotice("Image is attached to both posts. Edit the words on that same image.");
        }
      }
    } finally {
      setBusy("");
    }
  }

  async function uploadVideo(file: File | undefined) {
    if (!file) return;
    if (!isPublishableVideo(file)) {
      setNotice("Upload an MP4 or MOV. Facebook and Instagram publish those.");
      return;
    }
    setBusy("upload");
    setNotice("");
    try {
      const saved = await uploadHubFile(file, "video");
      const next = { url: saved.url, label: `Video · ${saved.filename}`, kind: "video" as const };
      setFiles((current) => [next, ...current.filter((item) => item.url !== next.url)]);
      setVideoUrl(next.url);
      setImages({ facebook: next.url, instagram: next.url });
      setNotice("Video is saved. Write a caption and post it, or attach it to a Kaylev draft.");
      router.refresh();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Could not upload that video.");
    } finally {
      setBusy("");
      if (videoInput.current) videoInput.current.value = "";
    }
  }

  async function publish(draft: Draft, when: "now" | "later", mediaUrl?: string) {
    const label = `${draft.channel}-${when}`;
    if (when === "now") {
      const where = LABEL[draft.channel];
      if (!window.confirm(`Post this to ${where} now?`)) return;
    }
    setBusy(label);
    setNotice("");
    try {
      const response = await fetch("/api/hub/social/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          channel: draft.channel,
          body: draft.body,
          mediaUrl: mediaUrl ?? images[draft.channel] ?? "",
          when,
          day,
          hour,
        }),
      });
      const json = (await response.json().catch(() => ({}))) as { error?: string; scheduled?: boolean };
      if (!response.ok) {
        setNotice(json.error || "Could not publish.");
        return;
      }
      setNotice(json.scheduled ? `${LABEL[draft.channel]} is scheduled.` : `${LABEL[draft.channel]} is posted.`);
      router.refresh();
    } finally {
      setBusy("");
    }
  }

  async function publishVideo(when: "now" | "later") {
    const channels = (Object.keys(videoChannels) as Channel[]).filter((channel) => videoChannels[channel]);
    if (!videoUrl || kindFor(videoUrl, files) !== "video") {
      setNotice("Upload an MP4 or MOV first.");
      return;
    }
    if (videoCaption.trim().length < 8) {
      setNotice("Write a caption of at least a few words.");
      return;
    }
    if (channels.length === 0) {
      setNotice("Choose Facebook, Instagram, or both.");
      return;
    }
    if (when === "now") {
      const where = channels.map((channel) => LABEL[channel]).join(" and ");
      if (!window.confirm(`Post this video to ${where} now?`)) return;
    }
    setBusy(`video-${when}`);
    setNotice("");
    const posted: string[] = [];
    try {
      for (const channel of channels) {
        const response = await fetch("/api/hub/social/publish", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            channel,
            body: videoCaption,
            mediaUrl: videoUrl,
            when,
            day,
            hour,
          }),
        });
        const json = (await response.json().catch(() => ({}))) as { error?: string; scheduled?: boolean };
        if (!response.ok) {
          const reason = json.error || `Could not publish to ${LABEL[channel]}.`;
          setNotice(posted.length ? `${posted.join(" and ")} is done. ${LABEL[channel]}: ${reason}` : reason);
          return;
        }
        posted.push(LABEL[channel]);
      }
      setNotice(when === "later" ? `${posted.join(" and ")} is scheduled.` : `${posted.join(" and ")} is posted.`);
      router.refresh();
    } finally {
      setBusy("");
    }
  }

  const savedVideos = files.filter((file) => file.kind === "video");
  const mediaVideos = savedVideos.filter((file) => file.source === "media");
  const uploadedVideos = savedVideos.filter((file) => file.source !== "media");

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="flex min-h-[28rem] flex-col rounded-2xl border border-zinc-800 bg-zinc-900/40">
          <div className="border-b border-zinc-800 px-5 py-4">
            <h2 className="text-lg font-semibold text-white">Kaylev</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Describe the offer. Ask for the logo, the badge, or another file from this company.
            </p>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
            {messages.map((message, index) => (
              <p
                key={`${message.role}-${index}`}
                className={`max-w-[95%] whitespace-pre-line rounded-2xl px-3 py-2 text-sm ${
                  message.role === "user"
                    ? "ml-auto bg-indigo-600/30 text-indigo-50"
                    : "bg-zinc-950 text-zinc-200"
                }`}
              >
                {message.content}
              </p>
            ))}
          </div>
          <form
            className="border-t border-zinc-800 p-4"
            onSubmit={(event) => {
              event.preventDefault();
              void sendChat();
            }}
          >
            <textarea
              className={inputClass}
              rows={3}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="e.g. A post for Calgary trades businesses about the free website audit."
            />
            <button
              type="submit"
              disabled={Boolean(busy) || input.trim().length < 2}
              className="mt-3 inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
            >
              {busy === "chat" || busy === "image" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {busy === "image" ? "Building image…" : busy === "chat" ? "Writing…" : "Ask Kaylev"}
            </button>
          </form>
        </section>

        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Ready to post</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Upload a video or use a Kaylev draft. Instagram needs an image or a video. Times are Mountain.
            </p>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
            <h3 className="text-sm font-semibold text-white">Post a video</h3>
            <p className="mt-1 text-sm text-zinc-400">
              Choose a video from DigiSol media, or upload an MP4 or MOV up to {MAX_FILE_MB}MB. Uploads are saved with
              this company. Then post it to Facebook and Instagram from here.
            </p>
            <label className="mt-3 flex w-full cursor-pointer flex-col gap-2 text-xs text-zinc-400 sm:flex-row sm:items-center">
              <span className="inline-flex w-full items-center justify-center rounded-full border border-zinc-600 px-4 py-2 text-sm text-zinc-200 sm:w-auto">
                {busy === "upload" ? "Uploading…" : "Choose video"}
              </span>
              <input
                ref={videoInput}
                type="file"
                accept="video/mp4,video/quicktime,.mp4,.mov,.m4v"
                disabled={Boolean(busy)}
                className="sr-only"
                onChange={(event) => void uploadVideo(event.target.files?.[0])}
              />
            </label>
            {savedVideos.length > 0 ? (
              <label className="mt-3 block text-xs text-zinc-400">
                Videos
                <select
                  className={`${inputClass} mt-1`}
                  value={videoUrl}
                  onChange={(event) => {
                    const url = event.target.value;
                    setVideoUrl(url);
                    if (url) setImages({ facebook: url, instagram: url });
                  }}
                >
                  <option value="">Choose a video</option>
                  {mediaVideos.length > 0 ? (
                    <optgroup label="DigiSol media">
                      {mediaVideos.map((file) => (
                        <option key={file.url} value={file.url}>
                          {file.label}
                        </option>
                      ))}
                    </optgroup>
                  ) : null}
                  {uploadedVideos.length > 0 ? (
                    <optgroup label="Uploaded">
                      {uploadedVideos.map((file) => (
                        <option key={file.url} value={file.url}>
                          {file.label}
                        </option>
                      ))}
                    </optgroup>
                  ) : null}
                </select>
              </label>
            ) : null}
            {videoUrl ? (
              <video
                key={videoUrl}
                src={videoUrl}
                controls
                playsInline
                preload="metadata"
                className="mt-4 aspect-video w-full rounded-xl bg-black"
              />
            ) : null}
            <textarea
              className={`${inputClass} mt-3`}
              rows={4}
              value={videoCaption}
              onChange={(event) => setVideoCaption(event.target.value)}
              placeholder="Caption for this video"
            />
            <div className="mt-3 flex flex-wrap gap-4 text-sm text-zinc-200">
              {(Object.keys(LABEL) as Channel[]).map((channel) => (
                <label key={channel} className="inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={videoChannels[channel]}
                    onChange={(event) =>
                      setVideoChannels((current) => ({ ...current, [channel]: event.target.checked }))
                    }
                  />
                  {LABEL[channel]}
                </label>
              ))}
            </div>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <button
                type="button"
                disabled={Boolean(busy)}
                onClick={() => void publishVideo("now")}
                className="w-full rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60 sm:w-auto"
              >
                {busy === "video-now" ? "Posting…" : "Post video now"}
              </button>
              <button
                type="button"
                disabled={Boolean(busy)}
                onClick={() => void publishVideo("later")}
                className="w-full rounded-full border border-zinc-600 px-4 py-2 text-sm text-zinc-200 hover:border-zinc-400 disabled:opacity-60 sm:w-auto"
              >
                {busy === "video-later" ? "Scheduling…" : "Schedule video"}
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <label className="text-xs text-zinc-400">
              Day
              <input type="date" className={`${inputClass} mt-1`} value={day} onChange={(event) => setDay(event.target.value)} />
            </label>
            <label className="text-xs text-zinc-400">
              Hour
              <select
                className={`${inputClass} mt-1`}
                value={hour}
                onChange={(event) => setHour(Number(event.target.value))}
              >
                {Array.from({ length: 13 }, (_, index) => index + 8).map((value) => (
                  <option key={value} value={value}>
                    {value}:00
                  </option>
                ))}
              </select>
            </label>
          </div>
          {drafts.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-zinc-700 px-4 py-8 text-sm text-zinc-500">
              Drafts show up here after Kaylev writes them.
            </p>
          ) : (
            drafts.map((draft) => (
              <article key={draft.channel} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
                <p className="text-sm font-semibold text-white">{LABEL[draft.channel]} preview</p>
                <div className="mt-3">
                  <PostPreview
                    channel={draft.channel}
                    companyName={companyName}
                    body={draft.body}
                    mediaUrl={images[draft.channel] ? `${images[draft.channel]}?v=${imageRev}` : ""}
                    kind={images[draft.channel] ? kindFor(images[draft.channel], files) : ""}
                    onOpenMedia={setOpenImage}
                  />
                </div>
                <textarea
                  className={`${inputClass} mt-3`}
                  rows={6}
                  value={draft.body}
                  onChange={(event) =>
                    setDrafts((current) =>
                      current.map((item) => (item.channel === draft.channel ? { ...item, body: event.target.value } : item)),
                    )
                  }
                />
                {images[draft.channel] && kindFor(images[draft.channel], files) === "image" ? (
                  <div className="mt-3">
                    <ImageTextEditor
                      key={`${artByUrl[images[draft.channel]] || images[draft.channel]}-${editGen}`}
                      imageUrl={artByUrl[images[draft.channel]] || images[draft.channel]}
                      replaceUrl={images[draft.channel]}
                      initialPieces={piecesByUrl[images[draft.channel]]}
                      designWidth={1080}
                      designHeight={1080}
                      logoUrl={logoUrl}
                      siteUrl={siteUrl}
                      palette={palette}
                      onSaved={() => setImageRev((current) => current + 1)}
                    />
                  </div>
                ) : null}
                <label className="mt-3 block text-xs text-zinc-400">
                  File
                  <select
                    className={`${inputClass} mt-1`}
                    value={images[draft.channel]}
                    onChange={(event) => setImages((current) => ({ ...current, [draft.channel]: event.target.value }))}
                  >
                    <option value="">No file</option>
                    {files.map((poster, index) => (
                      <option key={`${poster.url}-${index}`} value={poster.url}>
                        {poster.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={Boolean(busy)}
                    onClick={() => void publish(draft, "now")}
                    className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
                  >
                    {busy === `${draft.channel}-now` ? "Posting…" : "Post now"}
                  </button>
                  <button
                    type="button"
                    disabled={Boolean(busy)}
                    onClick={() => void publish(draft, "later")}
                    className="rounded-full border border-zinc-600 px-4 py-2 text-sm text-zinc-200 hover:border-zinc-400 disabled:opacity-60"
                  >
                    {busy === `${draft.channel}-later` ? "Scheduling…" : "Schedule"}
                  </button>
                </div>
              </article>
            ))
          )}
          {notice ? <p className="text-sm text-amber-100">{notice}</p> : null}
        </section>
      </div>

      {openImage ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setOpenImage("")}>
          <div className="max-h-[92vh] overflow-auto" onClick={(event) => event.stopPropagation()}>
            {kindFor(openImage, files) === "video" ? (
              <video src={openImage} controls playsInline className="mx-auto max-h-[88vh] w-auto max-w-[92vw]" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={openImage} alt="" className="mx-auto h-auto max-h-[88vh] w-auto max-w-[92vw]" />
            )}
            <button
              type="button"
              className="mt-3 rounded-full bg-white px-4 py-2 text-sm font-semibold text-zinc-900"
              onClick={() => setOpenImage("")}
            >
              Close
            </button>
          </div>
        </div>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">Recent posts</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-zinc-500">Nothing queued yet.</p>
        ) : (
          <ul className="space-y-2">
            {recent.map((post) => (
              <li key={post.id} className="rounded-xl border border-zinc-800 px-4 py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium capitalize text-zinc-200">{post.channel}</p>
                  <p
                    className={`text-xs font-semibold uppercase tracking-wide ${
                      post.status === "published"
                        ? "text-emerald-300"
                        : post.status === "failed"
                          ? "text-rose-300"
                          : "text-zinc-500"
                    }`}
                  >
                    {statusLabel(post.status)}
                  </p>
                </div>
                <p className="mt-1 line-clamp-2 whitespace-pre-line text-zinc-400">{post.body}</p>
                {post.error_message ? <p className="mt-1 text-xs text-rose-300">{post.error_message}</p> : null}
                {post.external_url ? (
                  <a href={post.external_url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs text-indigo-300">
                    Open post
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
