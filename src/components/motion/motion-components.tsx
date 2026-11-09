"use client";

import { motion, type HTMLMotionProps } from "motion/react";
import React, { type ReactNode } from "react";

interface StaggerContainerProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  delayChildren?: number;
  staggerChildren?: number;
}

export function StaggerContainer({
  children,
  delayChildren = 0.05,
  staggerChildren = 0.1,
  className,
  ...props
}: StaggerContainerProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            delayChildren,
            staggerChildren,
          },
        },
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function FadeInItem({
  children,
  className,
  yOffset = 16,
  duration = 0.5,
  ...props
}: HTMLMotionProps<"div"> & { yOffset?: number; duration?: number }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: yOffset },
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            duration,
            ease: [0.22, 1, 0.36, 1], // Custom cubic bezier for smooth, professional deceleration
          },
        },
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function ViewportFadeIn({
  children,
  className,
  delay = 0,
  yOffset = 18,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  yOffset?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: yOffset }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{
        duration: 0.55,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function InteractiveCard({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{
        duration: 0.5,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={{ y: -3 }}
      transition-hover={{
        type: "spring",
        stiffness: 400,
        damping: 30,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

