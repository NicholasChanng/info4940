import { validateSketchCode } from "@/lib/sketch-validation";

describe("sketch-validation", () => {
  it("accepts a minimal valid p5.js sketch", () => {
    expect(
      validateSketchCode(`
        function setup() {
          createCanvas(windowWidth, windowHeight);
        }

        function draw() {
          background("#111111");
        }
      `),
    ).toEqual({
      ok: true,
      errors: [],
    });
  });

  it("rejects banned patterns", () => {
    const result = validateSketchCode(`
      function setup() {
        createCanvas(100, 100);
      }

      function draw() {
        eval("background(0)");
      }
    `);

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("Do not use eval().");
  });
});
