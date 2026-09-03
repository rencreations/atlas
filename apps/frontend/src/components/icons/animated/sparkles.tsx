"use client";

import { motion, useAnimation, useReducedMotion } from "framer-motion";
import type { HTMLAttributes } from "react";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react";

import { cn } from "@/lib/utils";

export interface SparklesIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface SparklesIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

// Generic gentle wiggle for icons the animated registry does not ship.
const VARIANTS = {
  normal: { rotate: 0, scale: 1 },
  animate: { rotate: [0, -8, 8, 0], scale: [1, 1.12, 1], transition: { duration: 0.45, ease: "easeInOut" } },
};

const SparklesIcon = forwardRef<SparklesIconHandle, SparklesIconProps>(
  ({ onMouseEnter, onMouseLeave, className, size = 28, ...props }, ref) => {
    const controls = useAnimation();
    const reducedMotion = useReducedMotion();
    const isControlledRef = useRef(false);

    useImperativeHandle(ref, () => {
      isControlledRef.current = true;
      return {
        startAnimation: () => controls.start("animate"),
        stopAnimation: () => controls.start("normal"),
      };
    });

    // Play when any part of the surrounding button or link is hovered,
    // not just the icon itself (the host is the interactive element).
    const containerRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
      const host = containerRef.current?.closest("button, a, [role=button]");
      if (!host || reducedMotion || isControlledRef.current) return;
      const enter = () => controls.start("animate");
      const leave = () => controls.start("normal");
      host.addEventListener("mouseenter", enter);
      host.addEventListener("mouseleave", leave);
      return () => {
        host.removeEventListener("mouseenter", enter);
        host.removeEventListener("mouseleave", leave);
      };
    }, [controls, reducedMotion]);

    const handleMouseEnter = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (reducedMotion) return;
        if (isControlledRef.current) {
          onMouseEnter?.(e);
        } else {
          controls.start("animate");
        }
      },
      [controls, onMouseEnter, reducedMotion]
    );

    const handleMouseLeave = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        if (reducedMotion) return;
        if (isControlledRef.current) {
          onMouseLeave?.(e);
        } else {
          controls.start("normal");
        }
      },
      [controls, onMouseLeave, reducedMotion]
    );

    return (
      <div
        ref={containerRef}
        className={cn(className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        <svg
          fill="none"
          height={size}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.25"
          viewBox="0 0 24 24"
          width={size}
          xmlns="http://www.w3.org/2000/svg"
        >
          <motion.g animate={controls} initial="normal" variants={VARIANTS}>
          <motion.path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" key="4pj2yx" />
          <motion.path d="M20 3v4" key="1olli1" />
          <motion.path d="M22 5h-4" key="1gvqau" />
          <motion.path d="M4 17v2" key="vumght" />
          <motion.path d="M5 18H3" key="zchphs" />
          </motion.g>
        </svg>
      </div>
    );
  }
);

SparklesIcon.displayName = "SparklesIcon";

export { SparklesIcon };
