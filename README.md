# p5 Sketch Coach MVP

A bare-bones Next.js application that helps a novice programmer turn a personal life experience into a live `p5.js` sketch with Gemini.

## What it does

- accepts a freeform description of a life experience
- sends the latest conversation context to a server-side Gemini route
- asks Gemini for a complete `p5.js` sketch plus a short explanation and visual metaphors
- validates the generated code and automatically retries once if the sketch is invalid
- renders the sketch inside a sandboxed iframe and shows the generated code in a read-only panel

## Stack

- Next.js App Router
- React 19
- Tailwind CSS 4
- Gemini via `@google/genai`
- Vitest + React Testing Library

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Create a local environment file:

```bash
cp .env.example .env.local
```

3. Add your Gemini API key to `.env.local`:

```bash
GEMINI_API_KEY=your-key-here
GEMINI_MODEL=gemini-2.5-flash
```

`gemini-2.5-flash` is the default model in this repo because it is more likely to work on free-tier quota than `gemini-2.5-pro`. If you want to try Pro, set `GEMINI_MODEL=gemini-2.5-pro` and optionally keep `GEMINI_FALLBACK_MODEL=gemini-2.5-flash`.

4. Start the app:

```bash
npm run dev
```

5. Open `http://localhost:3000`.

## Tests

```bash
npm test
```

## Key constraints

- local-only MVP
- no auth, database, uploads, or persistent history
- chat context is limited to the latest 6 messages
- generated sketches are full replacements, not incremental patches
# info4940
