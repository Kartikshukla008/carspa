"use client";

import Image from "next/image";

interface CarSpaLogoProps {
  className?: string;
  variant?: "horizontal" | "mark-only" | "full";
  size?: "sm" | "md" | "lg";
  theme?: "light" | "dark";
}

export default function CarSpaLogo({
  className = "",
  size = "md",
  theme = "light",
}: CarSpaLogoProps) {
  const iconDimensions = {
    sm: { w: 32, h: 23, text: "text-lg", sub: "text-[8px]" },
    md: { w: 42, h: 30, text: "text-2xl", sub: "text-[9px]" },
    lg: { w: 56, h: 40, text: "text-3xl", sub: "text-[11px]" },
  }[size];

  const carColor = theme === "dark" ? "text-white" : "text-slate-900";
  const subColor = theme === "dark" ? "text-slate-400" : "text-slate-500";

  return (
    <div className={`flex items-center gap-2.5 group select-none ${className}`}>
      {/* Official CARSPA Emblem */}
      <div className="relative shrink-0 transition-transform duration-300 group-hover:scale-105">
        <Image
          src="/logo-mark@2x.png"
          alt="CARSPA Official Emblem"
          width={iconDimensions.w}
          height={iconDimensions.h}
          className="object-contain filter drop-shadow-[0_2px_8px_rgba(2,132,199,0.25)]"
          priority
        />
      </div>

      {/* Official Wordmark */}
      <div className="flex flex-col">
        <div className="flex items-baseline tracking-tight font-black leading-none">
          <span className={`${iconDimensions.text} font-black ${carColor} tracking-tight`}>
            CAR
          </span>
          <span className={`${iconDimensions.text} font-black text-[#0284C7] tracking-tight`}>
            SPA
          </span>
        </div>
        <span
          className={`${iconDimensions.sub} font-bold uppercase tracking-[0.28em] ${subColor} leading-none mt-1`}
        >
          Doorstep Detailing
        </span>
      </div>
    </div>
  );
}
