import { signIn } from "@/auth";
import { isValidRecordingKey } from "@/lib/demo/accounts";

export const dynamic = "force-dynamic";

/**
 * Secret entry to the reserved Laura account used to record the pitch video:
 *   /demo/laura?key=DEMO_RECORDING_KEY
 * Not linked anywhere in the UI. Wrong or missing key -> 404.
 */
export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("key");
  if (!isValidRecordingKey(key)) return new Response("Not found", { status: 404 });
  // Redirects to "/" with the session cookie set (throws NEXT_REDIRECT).
  await signIn("recording", { key, redirectTo: "/" });
}
