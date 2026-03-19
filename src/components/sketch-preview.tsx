"use client";

import { useEffect, useState } from "react";

import { PREVIEW_MESSAGE_SOURCE, buildPreviewHtml } from "@/lib/build-preview-html";
import type { PreviewMessagePayload } from "@/lib/types";

interface SketchPreviewProps {
  code: string | null;
  onRuntimeError?: (message: string) => void;
}

export function SketchPreview({ code, onRuntimeError }: SketchPreviewProps) {
  const [runtimeError, setRuntimeError] = useState<string | null>(null);

  useEffect(() => {
    setRuntimeError(null);
  }, [code]);

  useEffect(() => {
    function handleMessage(event: MessageEvent<PreviewMessagePayload>) {
      if (event.data?.source !== PREVIEW_MESSAGE_SOURCE) {
        return;
      }

      if (event.data.type === "runtime-error") {
        setRuntimeError(event.data.message);
        onRuntimeError?.(event.data.message);
      }
    }

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  return (
    <section className="flex min-h-[680px] flex-col self-start rounded-[28px] border border-white/55 bg-[color:var(--card-strong)] p-5 shadow-[0_24px_80px_rgba(18,34,41,0.12)] backdrop-blur lg:sticky lg:top-8 lg:z-0 lg:h-[820px] lg:min-h-0">
      <div className="space-y-2 border-b border-[color:var(--line)] pb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[color:var(--muted)]">
          Live Preview
        </p>
        <h2 className="text-3xl leading-tight">Sandboxed p5.js canvas</h2>
        <p className="text-sm leading-6 text-[color:var(--muted)]">
          Each AI response replaces the current sketch and rerenders this canvas in place.
        </p>
      </div>

      {runtimeError ? (
        <div className="mt-4 rounded-2xl border border-[color:var(--warning)]/35 bg-[#fff1ea] px-4 py-3 text-sm text-[color:var(--warning)]">
          Runtime preview error: {runtimeError}
        </div>
      ) : null}

      <div className="mt-4 min-h-0 flex-1 overflow-hidden rounded-[24px] border border-[color:var(--line)] bg-[#f7f3eb]">
        {code ? (
          <iframe
            key={code}
            title="p5.js sketch preview"
            sandbox="allow-scripts"
            srcDoc={buildPreviewHtml(code)}
            className="h-full min-h-[480px] w-full border-0"
          />
        ) : (
          <div className="flex h-full min-h-[480px] items-center justify-center p-8 text-center text-sm leading-7 text-[color:var(--muted)]">
            The canvas will appear here after you describe a life experience and the assistant generates a sketch.
          </div>
        )}
      </div>
    </section>
  );
}
