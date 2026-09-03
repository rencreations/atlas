"use client";

import { motion, useAnimation, useReducedMotion } from "framer-motion";
import type { HTMLAttributes } from "react";
import { forwardRef, useCallback, useImperativeHandle, useRef } from "react";

import { cn } from "@/lib/utils";

export interface MailIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface MailIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

// Generic gentle wiggle for icons the animated registry does not ship.
const VARIANTS = {
  normal: { rotate: 0, scale: 1 },
  animate: { rotate: [0, -8, 8, 0], scale: [1, 1.12, 1], transition: { duration: 0.45, ease: "easeInOut" } },
};

const MailIcon = forwardRef<MailIconHandle, MailIconProps>(
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
        className={cn(className)}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        {...props}
      >
        <motion.svg
          animate={controls}
          initial="normal"
          fill="none"
          height={size}
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.25"
          viewBox="0 0 24 24"
          width={size}
          xmlns="http://www.w3.org/2000/svg"
          variants={VARIANTS}
        >
          <motion.rect width="20" height="16" x="2" y="4" rx="2" key="18n3k1" />
          <motion.path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" key="1ocrg3" />
        </motion.svg>
      </div>
    );
  }
);

MailIcon.displayName = "MailIcon";

export { MailIcon };
