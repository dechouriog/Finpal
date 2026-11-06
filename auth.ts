import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { createDemoAccount, getReservedLaura, isValidRecordingKey } from "@/lib/demo/accounts";
import { clientIp, rateLimit } from "@/lib/rate-limit";

class DemoRateLimited extends CredentialsSignin {
  code = "rate_limited";
}

/** Max new demo accounts per IP per hour. */
const DEMO_PER_IP_PER_HOUR = 5;

/**
 * Auth.js (v5). Finpal has no passwords: "Try the demo" creates an isolated demo
 * account and signs it in. Sessions are JWTs in a secure, httpOnly cookie.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/welcome", error: "/welcome" },
  providers: [
    Credentials({
      id: "demo",
      name: "Try the demo",
      credentials: {},
      async authorize(_credentials, request) {
        const ip = clientIp(request.headers);
        if (!rateLimit(`demo:${ip}`, DEMO_PER_IP_PER_HOUR, 60 * 60 * 1000).ok) throw new DemoRateLimited();
        const user = await createDemoAccount();
        return { id: user.id, name: user.name, email: user.email };
      },
    }),
    Credentials({
      // Reserved account for recording the pitch video. Only reachable via /demo/laura?key=...
      id: "recording",
      name: "Recording",
      credentials: { key: {} },
      async authorize(credentials) {
        if (!isValidRecordingKey(credentials?.key)) return null;
        const laura = await getReservedLaura();
        return laura ? { id: laura.id, name: laura.name, email: laura.email } : null;
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.uid = user.id;
      return token;
    },
    session({ session, token }) {
      if (typeof token.uid === "string") session.user.id = token.uid;
      return session;
    },
  },
});
