// @vitest-environment jsdom
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Sheet } from "@/components/common/Sheet";
import { APP_OVERLAY_ID } from "@/components/shell/AppPortal";

/** Mirrors the chat: input state lives in the parent and onClose is an inline arrow (new every render). */
function ChatLike() {
  const [open, setOpen] = useState(true);
  const [text, setText] = useState("");
  return (
    <Sheet open={open} onClose={() => setOpen(false)} title="Finpal AI">
      <label htmlFor="msg">Message</label>
      <input id="msg" value={text} onChange={(e) => setText(e.target.value)} />
    </Sheet>
  );
}

describe("Sheet", () => {
  it("never steals focus from an input while typing (chat input bug)", async () => {
    const overlay = document.createElement("div");
    overlay.id = APP_OVERLAY_ID;
    document.body.appendChild(overlay);

    render(<ChatLike />);
    const input = await screen.findByLabelText("Message");
    const user = userEvent.setup();
    await user.click(input);
    await act(async () => {
      await user.type(input, "How did I spend this month?");
    });

    expect(input).toHaveProperty("value", "How did I spend this month?");
    expect(document.activeElement).toBe(input);
  });
});
