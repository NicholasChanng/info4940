import {
  PREVIEW_MESSAGE_SOURCE,
  buildPreviewHtml,
  escapeScriptContent,
} from "@/lib/build-preview-html";

describe("build-preview-html", () => {
  it("escapes closing script tags in generated code", () => {
    expect(escapeScriptContent("function draw() {}</script>")).toContain("<\\/script>");
  });

  it("builds a preview document with a pinned p5 runtime and runtime error channel", () => {
    const html = buildPreviewHtml("function setup() {}\nfunction draw() {}");

    expect(html).toContain("p5@2.2.1");
    expect(html).toContain(PREVIEW_MESSAGE_SOURCE);
    expect(html).toContain("function draw()");
  });
});
