import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { z } from "zod";
import { jsonError } from "@/lib/api";
import { runAgent, systemPrompt } from "@/lib/assistant/agent";
import { consumeAiMessage, dailyLimit } from "@/lib/assistant/usage";
import type { AssistantEvent } from "@/lib/assistant/cards";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/session";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// History comes from the client; validate its shape and keep it bounded.
const ToolCall = z.object({
  id: z.string().max(100),
  type: z.literal("function"),
  function: z.object({ name: z.string().max(60), arguments: z.string().max(4000) }),
});
const Message = z.discriminatedUnion("role", [
  z.object({ role: z.literal("user"), content: z.string().trim().min(1).max(2000) }),
  z.object({
    role: z.literal("assistant"),
    content: z.string().max(8000).nullable(),
    tool_calls: z.array(ToolCall).max(8).optional(),
  }),
  z.object({ role: z.literal("tool"), tool_call_id: z.string().max(100), content: z.string().max(8000) }),
]);
const Body = z.object({ messages: z.array(Message).min(1).max(80) });

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid conversation.");
  const last = parsed.data.messages.at(-1);
  if (last?.role !== "user") return jsonError("The last message must come from the user.");

  const userId = await getSessionUserId();
  if (!userId) return jsonError("Please start the demo first.", 401);
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return jsonError("Your demo session has expired. Start a new demo.", 401);
  const now = new Date();
  const encoder = new TextEncoder();

  if (!(await consumeAiMessage(user.id, now))) {
    const body = [
      { t: "text", d: `You've reached today's limit of ${dailyLimit()} Finpal AI messages. Everything else in the app keeps working, and the assistant will be back tomorrow.` },
      { t: "done" },
    ] satisfies AssistantEvent[];
    return new Response(body.map((e) => `${JSON.stringify(e)}\n`).join(""), {
      headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (e: AssistantEvent) => controller.enqueue(encoder.encode(`${JSON.stringify(e)}\n`));
      try {
        const added = await runAgent(
          parsed.data.messages as ChatCompletionMessageParam[],
          { userId: user.id, now, system: systemPrompt(user, now) },
          emit,
          req.signal,
        );
        emit({ t: "history", messages: added });
        emit({ t: "done" });
      } catch (err) {
        console.error("assistant failed", err);
        const message =
          err instanceof Error && err.message.startsWith("The assistant is not configured")
            ? err.message
            : "Finpal AI is having trouble right now. Please try again.";
        emit({ t: "error", message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" },
  });
}
