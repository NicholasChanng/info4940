Generate plain JavaScript for p5.js only.

Required rules:
- Return a complete sketch, not a fragment.
- Define `setup()` and `draw()`.
- Keep the sketch self-contained.
- Keep the canvas responsive to the preview frame.
- Prefer simple shapes, colors, motion, and composition that a beginner can understand.
- Use `windowWidth` and `windowHeight` for sizing and include `windowResized()` with `resizeCanvas(windowWidth, windowHeight)`.

Forbidden output:
- No HTML.
- No imports, exports, or modules.
- No external assets.
- No network calls.
- No `eval`, `Function`, `fetch`, `XMLHttpRequest`, `localStorage`, `sessionStorage`, `document.write`, or `window.parent`.
- No references to React, Next.js, or browser DOM APIs outside normal p5 usage.
