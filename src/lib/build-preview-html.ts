export const PREVIEW_MESSAGE_SOURCE = "p5-preview";

export function escapeScriptContent(code: string): string {
  return code.replace(/<\/script/gi, "<\\/script");
}

export function buildPreviewHtml(code: string): string {
  const escapedCode = escapeScriptContent(code);

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      html, body {
        margin: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background: #f7f3eb;
      }

      body {
        position: relative;
      }

      canvas {
        display: block;
      }
    </style>
  </head>
  <body>
    <script>
      const postError = (message) => {
        window.parent.postMessage(
          {
            source: "${PREVIEW_MESSAGE_SOURCE}",
            type: "runtime-error",
            message,
          },
          "*"
        );
      };

      window.onerror = function(message) {
        postError(String(message));
        return false;
      };

      window.onunhandledrejection = function(event) {
        const reason = event.reason && event.reason.message ? event.reason.message : String(event.reason ?? "Unknown promise rejection");
        postError(reason);
      };
    </script>
    <script src="https://cdn.jsdelivr.net/npm/p5@2.2.1/lib/p5.min.js"></script>
    <script>
${escapedCode}
    </script>
  </body>
</html>`;
}
