"use client";

import { useEffect, useRef } from "react";
import type { Editor } from "grapesjs";
import "grapesjs/dist/css/grapes.min.css";
import { type CompanyBrand } from "@/lib/branding";

type Props = {
  initialHtml?: string | null;
  initialProject?: unknown;
  companyName?: string;
  logoSrc?: string;
  brand?: CompanyBrand;
  onReady?: (api: {
    getHtml: () => string;
    getProject: () => unknown;
    insertHtml: (html: string) => void;
  }) => void;
};

export function EmailEditor({
  initialHtml,
  initialProject,
  companyName,
  logoSrc,
  brand,
  onReady,
}: Props) {
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
      } else if (logoSrc) {
        const header = brand?.secondaryColor || "#09090b";
        const name = companyName || "Company";
        editor.setComponents(
          `<div data-digisol-logo="1" style="text-align:center;padding:28px 24px;background:${header}">
            <img src="${logoSrc}" alt="${name} logo" style="display:block;margin:0 auto;max-width:180px;height:auto;border:0" />
          </div>
          <div data-digisol-body="1" style="padding:28px;font-family:${brand?.fonts || "Inter, Arial, sans-serif"};color:#18181b">
            <p>Hey {{name}},</p>
            <p>{{tagline}}</p>
            <p>{{company}}</p>
          </div>`,
        );
      }

      editorRef.current = editor;
      onReady?.({
        getHtml: () =>
          (editor.runCommand("gjs-get-inlined-html") as string) || editor.getHtml(),
        getProject: () => editor.getProjectData(),
        insertHtml: (html: string) => editor.addComponents(html),
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
