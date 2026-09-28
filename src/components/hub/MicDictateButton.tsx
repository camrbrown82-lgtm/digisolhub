"use client";

import { Mic, Square } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

type SpeechResult = {
  isFinal: boolean;
  0: { transcript: string };
};

type SpeechEvent = {
  resultIndex: number;
  results: ArrayLike<SpeechResult>;
};

type SpeechRec = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function recognitionCtor(): (new () => SpeechRec) | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & {
    SpeechRecognition?: new () => SpeechRec;
    webkitSpeechRecognition?: new () => SpeechRec;
  };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

export function appendDictation(current: string, chunk: string) {
  const next = chunk.replace(/\s+/g, " ").trim();
  if (!next) return current;
  if (!current.trim()) return next;
  const spacer = /\s$/.test(current) ? "" : " ";
  return `${current}${spacer}${next}`;
}

export type MicStrings = {
  stop: string;
  unsupported: string;
  blocked: string;
  failed: string;
};

const EN_MIC_STRINGS: MicStrings = {
  stop: "Stop",
  unsupported: "Microphone dictation needs Chrome or Edge.",
  blocked: "Allow the microphone, then try again.",
  failed: "Microphone didn't start.",
};

/** Browser speech-to-text. Appends finished phrases into the field you pass. */
export function MicDictateButton({
  onText,
  disabled,
  label = "Mic",
  lang = "en-CA",
  strings = EN_MIC_STRINGS,
}: {
  onText: (chunk: string) => void;
  disabled?: boolean;
  label?: string;
  /** BCP 47 speech language, e.g. `fr-CA`. */
  lang?: string;
  strings?: MicStrings;
}) {
  const recRef = useRef<SpeechRec | null>(null);
  const [listening, setListening] = useState(false);
  const [hint, setHint] = useState("");

  useEffect(() => {
    return () => {
      recRef.current?.stop();
    };
  }, []);

  function toggle() {
    if (listening && recRef.current) {
      recRef.current.stop();
      setListening(false);
      return;
    }
    const Ctor = recognitionCtor();
    if (!Ctor) {
      setHint(strings.unsupported);
      return;
    }
    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (event) => {
      let chunk = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const row = event.results[i];
        if (row?.isFinal) chunk += ` ${row[0]?.transcript || ""}`;
      }
      if (chunk.trim()) onText(chunk.trim());
    };
    rec.onerror = () => {
      setListening(false);
      setHint(strings.blocked);
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    setHint("");
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
      setHint(strings.failed);
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={toggle}
        disabled={disabled}
        aria-pressed={listening}
        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs ${
          listening
            ? "border-rose-400/60 bg-rose-500/15 text-rose-200"
            : "border-zinc-700 text-zinc-300 hover:border-indigo-400 hover:text-white"
        } disabled:cursor-not-allowed disabled:opacity-40`}
      >
        {listening ? (
          <Square className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <Mic className="h-3.5 w-3.5" aria-hidden="true" />
        )}
        {listening ? strings.stop : label}
      </button>
      {hint ? <span className="text-xs text-amber-200/90">{hint}</span> : null}
    </span>
  );
}

/** Label row with a mic that appends into a named form field. */
export function DictatedField({
  label,
  name,
  defaultValue = "",
  multiline = false,
  rows = 3,
  placeholder,
  className = "block text-sm",
  required,
  disabled,
}: {
  label: ReactNode;
  name: string;
  defaultValue?: string;
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  const [value, setValue] = useState(defaultValue);
  return (
    <label className={className}>
      <span className="flex items-center justify-between gap-2">
        {label}
        <MicDictateButton
          disabled={disabled}
          onText={(chunk) => setValue((current) => appendDictation(current, chunk))}
        />
      </span>
      {multiline ? (
        <textarea
          name={name}
          value={value}
          required={required}
          rows={rows}
          placeholder={placeholder}
          onChange={(event) => setValue(event.target.value)}
          className="hub-field mt-1.5 resize-y"
        />
      ) : (
        <input
          name={name}
          value={value}
          required={required}
          placeholder={placeholder}
          onChange={(event) => setValue(event.target.value)}
          className="hub-field mt-1.5"
        />
      )}
    </label>
  );
}
