import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import HomePage from "@/app/page";
import type { ChatResponse } from "@/lib/types";

const successfulResponse: ChatResponse = {
  explanation:
    "A single circle drifts away from a busier cluster so the composition feels isolated but readable. The muted palette keeps the emotional tone soft and reflective.",
  visualMetaphors: ["lone circle", "fading crowd"],
  emotionTags: ["lonely"],
  colorPalette: [{ emotion: "lonely", hex: "#5C6B73" }],
  p5Code: `
    function setup() {
      createCanvas(windowWidth, windowHeight);
    }

    function draw() {
      background("#f4efe2");
      circle(width * 0.5, height * 0.5, 80);
    }
  `,
  repairApplied: false,
};

describe("HomePage", () => {
  it("updates the explanation, palette, and code panel after a successful response", async () => {
    const user = userEvent.setup();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => successfulResponse,
      }),
    );

    render(<HomePage />);

    await user.click(
      screen.getByRole("button", {
        name: "I felt lonely in a crowded room at a party.",
      }),
    );
    await user.click(screen.getByRole("button", { name: /Generate sketch/i }));

    await waitFor(() => {
      expect(screen.getByText(/A single circle drifts away/i)).toBeInTheDocument();
    });

    expect(screen.getAllByText("lonely").length).toBeGreaterThan(0);
    expect(screen.getByText(/function setup/i)).toBeInTheDocument();
  });

  it("shows an inline error when the API request fails", async () => {
    const user = userEvent.setup();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({
          error: "The sketch request failed. Please try again.",
        }),
      }),
    );

    render(<HomePage />);

    await user.type(
      screen.getByLabelText(/Describe your experience/i),
      "I felt calm watching rain after a stressful week.",
    );
    await user.click(screen.getByRole("button", { name: /Generate sketch/i }));

    await waitFor(() => {
      expect(
        screen.getByText("The sketch request failed. Please try again."),
      ).toBeInTheDocument();
    });
  });
});
