"use client";

import { useEffect, useRef } from "react";
import type { Editor } from "grapesjs";
import "grapesjs/dist/css/grapes.min.css";

type Props = {
  initialHtml?: string | null;
  initialProject?: unknown;
  onReady?: (api: {
    getHtml: () => string;
    getProject: () => unknown;
  }) => void;
};

export function EmailEditor({ initialHtml, initialProject, onReady }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Editor | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      const grapesjs = (await import("grapesjs")).default;
      const newsletter = (await import("grapesjs-preset-newsletter")).default;
      if (cancelled || !containerRef.current) return;

      const editor = grapesjs.init({
        container: containerRef.current,
        height: "100%",
        width: "auto",
        storageManager: false,
        fromElement: false,
        plugins: [newsletter],
      });

      if (initialProject) {
        editor.loadProjectData(initialProject as object);
      } else if (initialHtml) {
        editor.setComponents(initialHtml);
      }

      editorRef.current = editor;
      onReady?.({
        getHtml: () =>
          (editor.runCommand("gjs-get-inlined-html") as string) || editor.getHtml(),
        getProject: () => editor.getProjectData(),
      });
    }

    void boot();

    return () => {
      cancelled = true;
      editorRef.current?.destroy();
      editorRef.current = null;
    };
    // Editor should mount once per page load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="hub-email-editor h-[calc(100dvh-11rem)] min-h-[28rem] w-full overflow-hidden rounded-xl border border-zinc-800 bg-white">
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
