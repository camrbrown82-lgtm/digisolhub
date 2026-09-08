"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Note = { id: string; body: string; created_at: string };

export function ContactNotes({
  contactId,
  notes,
}: {
  contactId: string;
  notes: Note[];
}) {
  const router = useRouter();
  const [body, setBody] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (!body.trim()) return;
    await fetch(`/api/hub/contacts/${contactId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    setBody("");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <form onSubmit={onSubmit} className="space-y-2">
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={3}
          className="hub-field resize-y"
          placeholder="Add a note…"
        />
        <button type="submit" className="hub-btn">
          Add note
        </button>
      </form>
      <ul className="space-y-3">
        {notes.map((note) => (
          <li
            key={note.id}
            className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-3 text-sm text-zinc-300"
          >
            <p className="whitespace-pre-wrap">{note.body}</p>
            <p className="mt-2 text-xs text-zinc-500">
              {new Date(note.created_at).toLocaleString()}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
