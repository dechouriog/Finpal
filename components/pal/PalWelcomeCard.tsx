"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { OPEN_ASSISTANT_EVENT } from "@/components/home/AskAiBanner";
import { Button } from "@/components/ui/button";
import { UserPal } from "./PalStageContext";

const key = (userId: string) => `finpal:pal-welcome:${userId}`;

/**
 * Onboarding: the first time a demo account opens Home, Pal waves and offers the
 * guided flow. Dismissed per account (localStorage, with try/catch).
 */
export function PalWelcomeCard({ userId, name }: { userId: string; name: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    try {
      setShow(window.localStorage.getItem(key(userId)) !== "1");
    } catch {
      setShow(false);
    }
  }, [userId]);

  const dismiss = () => {
    setShow(false);
    try {
      window.localStorage.setItem(key(userId), "1");
    } catch {
      /* storage unavailable: the card may show again next time */
    }
  };

  const start = () => {
    dismiss();
    window.dispatchEvent(new CustomEvent(OPEN_ASSISTANT_EVENT, { detail: { prompt: "Help me start investing" } }));
  };

  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.section
          aria-labelledby="pal-welcome-title"
          data-pal-welcome
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col items-center gap-4 overflow-hidden rounded-3xl bg-teal-soft p-5 text-center ring-1 ring-teal/25 @lg/app:flex-row @lg/app:text-left"
        >
          <UserPal mood="wave" size={140} />
          <div className="min-w-0 flex-1">
            <h2 id="pal-welcome-title" className="font-display text-xl font-extrabold text-deep">
              Hey {name}, I&apos;m Pal.
            </h2>
            <p className="mt-1 text-sm text-ink">
              I get way too excited about long-term investing, so fair warning. Want to see what your savings could be
              doing? I&apos;ll keep your safety net safe, and nothing moves without your OK.
            </p>
            <div className="mt-4 flex flex-col gap-2 @lg/app:flex-row">
              <Button size="lg" onClick={start}>
                Help me start investing
              </Button>
              <Button size="lg" variant="ghost" onClick={dismiss}>
                Maybe later
              </Button>
            </div>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}
