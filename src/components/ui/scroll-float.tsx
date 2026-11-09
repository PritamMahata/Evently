"use client";

import ScrollFloat from "@/components/ScrollFloat";

export function FloatingHeading({
  children,
  className = "",
}: {
  children: string;
  className?: string;
}) {
  return (
    <ScrollFloat
      animationDuration={0.8}
      ease="power2.out"
      stagger={0.015}
      distance={28}
      scrollStart="top bottom-=15%"
      scrollEnd="bottom center"
      textClassName={className}
    >
      {children}
    </ScrollFloat>
  );
}

export { ScrollFloat };
