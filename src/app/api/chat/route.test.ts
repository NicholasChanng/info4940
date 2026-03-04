import { POST } from "@/app/api/chat/route";
import {
  GeminiRequestError,
  generateSketchDraft,
  repairSketchDraft,
} from "@/lib/gemini";

vi.mock("@/lib/gemini", async () => {
  const actual = await vi.importActual<typeof import("@/lib/gemini")>("@/lib/gemini");

  return {
    ...actual,
    generateSketchDraft: vi.fn(),
    repairSketchDraft: vi.fn(),
  };
});

const validDraft = {
  explanation: "A lone circle drifts away from a noisy crowd. The slow motion and muted colors keep the sketch easy to read.",
  visualMetaphors: ["isolated circle", "muted crowd"],
  emotionTags: ["lonely"],
  p5Code: `
    function setup() {
      createCanvas(windowWidth, windowHeight);
    }

    function draw() {
      background("#f0f0f0");
      circle(width * 0.5, height * 0.5, 120);
    }
  `,
};

describe("POST /api/chat", () => {
  it("returns a valid first-pass response", async () => {
    vi.mocked(generateSketchDraft).mockResolvedValue(validDraft);

    const response = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        body: JSON.stringify({
          messages: [{ id: "1", role: "user", content: "I felt lonely in the crowd." }],
        }),
      }),
    );

    const body = (await response.json()) as {
      repairApplied: boolean;
      colorPalette: Array<{ emotion: string; hex: string }>;
    };

    expect(response.status).toBe(200);
    expect(body.repairApplied).toBe(false);
    expect(body.colorPalette).toEqual([{ emotion: "lonely", hex: "#5C6B73" }]);
    expect(repairSketchDraft).not.toHaveBeenCalled();
  });

  it("repairs invalid first-pass code once", async () => {
    vi.mocked(generateSketchDraft).mockResolvedValue({
      ...validDraft,
      p5Code: `
        function setup() {
          createCanvas(windowWidth, windowHeight);
        }

        function draw() {
          eval("background(0)");
        }
      `,
    });
    vi.mocked(repairSketchDraft).mockResolvedValue(validDraft);

    const response = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        body: JSON.stringify({
          messages: [{ id: "1", role: "user", content: "I felt lonely in the crowd." }],
        }),
      }),
    );

    const body = (await response.json()) as { repairApplied: boolean };

    expect(response.status).toBe(200);
    expect(body.repairApplied).toBe(true);
    expect(repairSketchDraft).toHaveBeenCalledTimes(1);
  });

  it("returns a server error when repair still fails", async () => {
    vi.mocked(generateSketchDraft).mockResolvedValue({
      ...validDraft,
      p5Code: "function setup() {}",
    });
    vi.mocked(repairSketchDraft).mockResolvedValue({
      ...validDraft,
      p5Code: "function setup() {}",
    });

    const response = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        body: JSON.stringify({
          messages: [{ id: "1", role: "user", content: "I felt lonely in the crowd." }],
        }),
      }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error:
        "I couldn't turn that description into a working sketch just now. Please try again.",
    });
  });

  it("rejects malformed request payloads", async () => {
    const response = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        body: JSON.stringify({ messages: [] }),
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Please send a valid chat payload.",
    });
  });

  it("returns a quota-specific 429 error for Gemini rate limits", async () => {
    vi.mocked(generateSketchDraft).mockRejectedValue(
      new GeminiRequestError({
        status: 429,
        model: "gemini-2.5-pro",
        message:
          'Gemini quota is unavailable for "gemini-2.5-pro". Set `GEMINI_MODEL=gemini-2.5-flash` in `.env.local`, or enable Gemini billing, then try again.',
      }),
    );

    const response = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        body: JSON.stringify({
          messages: [{ id: "1", role: "user", content: "I felt lonely in the crowd." }],
        }),
      }),
    );

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toEqual({
      error:
        'Gemini quota is unavailable for "gemini-2.5-pro". Set `GEMINI_MODEL=gemini-2.5-flash` in `.env.local`, or enable Gemini billing, then try again.',
    });
  });
});
