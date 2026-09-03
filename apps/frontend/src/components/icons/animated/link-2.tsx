"use client";

import type { Variants } from "framer-motion";
import { motion, useAnimation } from "framer-motion";
import { useReducedMotion } from "framer-motion";
import type { HTMLAttributes } from "react";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react";

import { cn } from "@/lib/utils";

export interface Link2IconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface Link2IconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const LEFT_VARIANTS: Variants = {
  normal: { x: 0 },
  animate: {
    x: [0, -0.7, 0.3, 0],
    transition: {
      duration: 0.6,
      times: [0, 0.4, 0.75, 1],
      ease: "easeInOut",
    },
  },
};

const RIGHT_VARIANTS: Variants = {
  normal: { x: 0 },
  animate: {
    x: [0, 0.7, -0.3, 0],
    transition: {
      duration: 0.6,
      times: [0, 0.4, 0.75, 1],
      ease: "easeInOut",
    },
  },
};

const Link2Icon = forwardRef<Link2IconHandle, Link2IconProps>(
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
          <motion.g animate={controls} variants={LEFT_VARIANTS}>
            <path d="M9 17H7A5 5 0 0 1 7 7h2" />
            <line x1="8" x2="12" y1="12" y2="12" />
          </motion.g>
          <motion.g animate={controls} variants={RIGHT_VARIANTS}>
            <path d="M15 7h2a5 5 0 1 1 0 10h-2" />
            <line x1="16" x2="12" y1="12" y2="12" />
          </motion.g>
        </svg>
      </div>
    );
  }
);

Link2Icon.displayName = "Link2Icon";

export { Link2Icon };
