"use client";

import { motion, useAnimation } from "framer-motion";
import { useReducedMotion } from "framer-motion";
import type { HTMLAttributes } from "react";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react";

import { cn } from "@/lib/utils";

export interface KeyIconHandle {
  startAnimation: () => void;
  stopAnimation: () => void;
}

interface KeyIconProps extends HTMLAttributes<HTMLDivElement> {
  size?: number;
}

const KeyIcon = forwardRef<KeyIconHandle, KeyIconProps>(
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
        <motion.svg
          animate={controls}
          fill="none"
          height={size}
          initial="normal"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.25"
          style={{ originX: 0.3, originY: 0.7 }}
          variants={{
            normal: {
              rotate: 0,
              transition: {
                type: "spring",
                stiffness: 120,
                damping: 14,
                duration: 0.8,
              },
            },
            animate: {
              rotate: [-3, -33, -25, -28],
              transition: {
                duration: 0.6,
                times: [0, 0.6, 0.8, 1],
                ease: "easeInOut",
              },
            },
          }}
          viewBox="0 0 24 24"
          width={size}
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4" />
          <path d="m21 2-9.6 9.6" />
          <circle cx="7.5" cy="15.5" r="5.5" />
        </motion.svg>
      </div>
    );
  }
);

KeyIcon.displayName = "KeyIcon";

export { KeyIcon };
