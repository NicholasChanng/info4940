import { buildSketchPrompt } from "@/lib/prompt-builder";

describe("prompt-builder", () => {
  it("includes the transcript, current sketch, and deterministic palette hints", () => {
    const prompt = buildSketchPrompt({
      messages: [
        { id: "1", role: "user", content: "I felt lonely in a crowd." },
        { id: "2", role: "assistant", content: "Let's emphasize contrast." },
      ],
      currentSketchCode: "function setup() {}\nfunction draw() {}",
      matchedEmotions: ["lonely"],
      matchedPalette: [{ emotion: "lonely", hex: "#5C6B73" }],
    });

    expect(prompt).toContain("I felt lonely in a crowd.");
    expect(prompt).toContain("function setup()");
    expect(prompt).toContain("#5C6B73");
    expect(prompt).toContain("Visual metaphor guide:");
  });
});
