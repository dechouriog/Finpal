"use client";

import { useEffect, useState } from "react";

function greetingFor(hour: number) {
  if (hour < 12) return "Good morning,";
  if (hour < 18) return "Good afternoon,";
  return "Good evening,";
}

/** Uses the viewer's local time; renders "Good morning," until mounted. */
export function Greeting() {
  const [text, setText] = useState("Good morning,");
  useEffect(() => setText(greetingFor(new Date().getHours())), []);
  return <span>{text}</span>;
}
