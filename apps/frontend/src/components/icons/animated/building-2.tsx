"use client";

import { motion, useAnimation, useReducedMotion } from "framer-motion";
import type { HTMLAttributes } from "react";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react";

import { cn } from "@/lib/utils";

export interface Building2IconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface Building2IconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

// Generic gentle wiggle for icons the animated registry does not ship.
const VARIANTS = {
  normal: { rotate: 0, scale: 1 },
  animate: { rotate: [0, -8, 8, 0], scale: [1, 1.12, 1], transition: { duration: 0.45, ease: "easeInOut" } },
};

const Building2Icon = forwardRef<Building2IconHandle, Building2IconProps>(
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
          <motion.path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" key="1b4qmf" />
          <motion.path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" key="i71pzd" />
          <motion.path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" key="10jefs" />
          <motion.path d="M10 6h4" key="1itunk" />
          <motion.path d="M10 10h4" key="tcdvrf" />
          <motion.path d="M10 14h4" key="kelpxr" />
          <motion.path d="M10 18h4" key="1ulq68" />
          </motion.g>
        </svg>
      </div>
    );
  }
);

Building2Icon.displayName = "Building2Icon";

export { Building2Icon };
