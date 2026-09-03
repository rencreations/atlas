"use client";

import { motion, useAnimation, useReducedMotion } from "framer-motion";
import type { HTMLAttributes } from "react";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react";

import { cn } from "@/lib/utils";

export interface WandSparklesIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface WandSparklesIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

// Generic gentle wiggle for icons the animated registry does not ship.
const VARIANTS = {
  normal: { rotate: 0, scale: 1 },
  animate: { rotate: [0, -8, 8, 0], scale: [1, 1.12, 1], transition: { duration: 0.45, ease: "easeInOut" } },
};

const WandSparklesIcon = forwardRef<WandSparklesIconHandle, WandSparklesIconProps>(
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
          <motion.path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72" key="ul74o6" />
          <motion.path d="m14 7 3 3" key="1r5n42" />
          <motion.path d="M5 6v4" key="ilb8ba" />
          <motion.path d="M19 14v4" key="blhpug" />
          <motion.path d="M10 2v2" key="7u0qdc" />
          <motion.path d="M7 8H3" key="zfb6yr" />
          <motion.path d="M21 16h-4" key="1cnmox" />
          <motion.path d="M11 3H9" key="1obp7u" />
          </motion.g>
        </svg>
      </div>
    );
  }
);

WandSparklesIcon.displayName = "WandSparklesIcon";

export { WandSparklesIcon };
