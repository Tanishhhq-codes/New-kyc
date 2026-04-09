import { cn } from "@/lib/utils";
import React from "react";

type MeteorStyle = {
  top: string;
  left: string;
  animationDelay: string;
  animationDuration: string;
};

// Deterministic pseudo-random generator so SSR and client render identical styles.
const seededUnit = (seed: number) => {
  const x = Math.sin(seed * 9999.91) * 10000;
  return x - Math.floor(x);
};

const styleForMeteor = (idx: number): MeteorStyle => {
  const top = Math.floor(seededUnit(idx + 1) * 401) - 200;
  const left = Math.floor(seededUnit((idx + 1) * 2) * 801) - 400;
  const delay = 0.2 + seededUnit((idx + 1) * 3) * 0.6;
  const duration = Math.floor(seededUnit((idx + 1) * 4) * 8) + 2;

  return {
    top: `${top}px`,
    left: `${left}px`,
    animationDelay: `${delay.toFixed(6)}s`,
    animationDuration: `${duration}s`,
  };
};

export const Meteors = ({
  number,
  className,
}: {
  number?: number;
  className?: string;
}) => {
  const meteors = new Array(number || 20).fill(true);
  return (
    <>
      {meteors.map((_, idx) => (
        <span
          key={"meteor" + idx}
          className={cn(
            "animate-meteor-effect absolute top-1/2 left-1/2 h-1 w-1 rounded-full bg-sky-400 shadow-[0_0_0_2px_#38bdf840] rotate-[215deg]",
            "before:content-[''] before:absolute before:top-1/2 before:transform before:-translate-y-1/2 before:w-[80px] before:h-px before:bg-gradient-to-r before:from-sky-400 before:to-transparent",
            className
          )}
          style={styleForMeteor(idx)}
        ></span>
      ))}
    </>
  );
};
