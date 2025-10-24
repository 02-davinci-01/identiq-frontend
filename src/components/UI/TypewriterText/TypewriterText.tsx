// src/components/TypewriterText.tsx
"use client";

import { useEffect, useState } from "react";

interface TypewriterTextProps {
  text: string;
  speed?: number; // milliseconds per character
}

export default function TypewriterText({
  text,
  speed = 80,
}: TypewriterTextProps) {
  const [displayedText, setDisplayedText] = useState("");

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      setDisplayedText(text.slice(0, i + 1));
      i++;
      if (i === text.length) clearInterval(interval);
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  return (
    <span className="typewriter">
      {displayedText}
      <span className="cursor">|</span>
    </span>
  );
}
