import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ChatPanel } from "@/components/chat-panel";

const starterPrompts = [
  "I felt lonely in a crowded room at a party.",
  "I felt calm watching rain after a stressful week.",
];

describe("ChatPanel", () => {
  it("fills the textarea when a prompt chip is clicked", async () => {
    const user = userEvent.setup();

    render(
      <ChatPanel
        messages={[]}
        loading={false}
        error={null}
        starterPrompts={starterPrompts}
        onSubmit={async () => true}
      />,
    );

    await user.click(screen.getByRole("button", { name: starterPrompts[0] }));

    expect(screen.getByLabelText(/Describe your experience/i)).toHaveValue(
      starterPrompts[0],
    );
  });

  it("disables the send button while loading", () => {
    render(
      <ChatPanel
        messages={[]}
        loading
        error={null}
        starterPrompts={starterPrompts}
        onSubmit={async () => true}
      />,
    );

    expect(screen.getByRole("button", { name: /Generating/i })).toBeDisabled();
  });
});
