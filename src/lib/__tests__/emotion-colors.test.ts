import {
  deriveEmotionContext,
  getPaletteForEmotions,
  matchEmotionKeywords,
  resolvePaletteForEmotionTags,
} from "@/lib/emotion-colors";

describe("emotion-colors", () => {
  it("matches emotions from the latest user message before the broader transcript", () => {
    expect(
      matchEmotionKeywords(
        "I felt lonely but also hopeful after the show.",
        "assistant: think about calm shapes",
      ),
    ).toEqual(["lonely", "hopeful", "calm"]);
  });

  it("derives emotion context and palette entries from chat messages", () => {
    const context = deriveEmotionContext([
      { id: "1", role: "assistant", content: "Let's make the crowd softer." },
      { id: "2", role: "user", content: "I felt like an outsider in a noisy room." },
    ]);

    expect(context.matchedEmotions).toEqual(["outsider"]);
    expect(context.palette).toEqual([{ emotion: "outsider", hex: "#6D7B8D" }]);
  });

  it("falls back to the deterministic palette when model emotion tags are unknown", () => {
    expect(
      resolvePaletteForEmotionTags(
        ["loneliness", "alienated"],
        getPaletteForEmotions(["lonely"]),
      ),
    ).toEqual([{ emotion: "lonely", hex: "#5C6B73" }]);
  });
});
