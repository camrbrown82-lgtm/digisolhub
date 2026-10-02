"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";

type Channel = "facebook" | "instagram";

type Draft = { channel: Channel; body: string };

type ChatMessage = { role: "user" | "assistant"; content: string };

type Poster = { url: string; label: string };

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
  imageUrl,
  onOpenImage,
}: {
  channel: Channel;
  companyName: string;
  body: string;
  imageUrl: string;
  onOpenImage: (url: string) => void;
}) {
  const mark = companyName.trim().slice(0, 1).toUpperCase() || "D";
  const image = imageUrl ? (
    <button type="button" className="block w-full bg-zinc-100" onClick={() => onOpenImage(imageUrl)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={imageUrl} alt="" className="h-auto w-full" />
    </button>
  ) : (
    <p className="bg-zinc-100 px-4 py-10 text-center text-sm text-zinc-500">No image on this post.</p>
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
        {image}
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
      {image}
    </div>
  );
}

export function SocialStudio({
  posters,
  recent,
  companyName,
}: {
  posters: Poster[];
  recent: RecentPost[];
  companyName: string;
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
  const [files, setFiles] = useState(posters);
  const [images, setImages] = useState<Record<Channel, string>>({ facebook: posters[0]?.url || "", instagram: posters[0]?.url || "" });
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
        setNotice("Building the image with this company's logo and badge…");
        const imageResponse = await fetch("/api/hub/social/image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: json.visual }),
        });
        const imageJson = (await imageResponse.json().catch(() => ({}))) as {
          error?: string;
          url?: string;
          label?: string;
        };
        if (!imageResponse.ok || !imageJson.url) {
          setNotice(imageJson.error || "The captions are ready. The image did not build.");
        } else {
          setFiles((current) => [{ url: imageJson.url!, label: imageJson.label || "New poster" }, ...current]);
          setImages({ facebook: imageJson.url, instagram: imageJson.url });
          setNotice("Image is attached to both posts. You can swap it for another file.");
        }
      }
    } finally {
      setBusy("");
    }
  }

  async function publish(draft: Draft, when: "now" | "later") {
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
          mediaUrl: images[draft.channel] || "",
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
              The preview is the post, image included. Click the image to open it full size. Instagram needs an image.
              Times are Mountain.
            </p>
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
                    imageUrl={images[draft.channel]}
                    onOpenImage={setOpenImage}
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
                <label className="mt-3 block text-xs text-zinc-400">
                  File
                  <select
                    className={`${inputClass} mt-1`}
                    value={images[draft.channel]}
                    onChange={(event) => setImages((current) => ({ ...current, [draft.channel]: event.target.value }))}
                  >
                    <option value="">No image</option>
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
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={openImage} alt="" className="mx-auto h-auto max-h-[88vh] w-auto max-w-[92vw]" />
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
