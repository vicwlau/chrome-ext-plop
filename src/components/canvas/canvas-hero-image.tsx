"use client";

import clsx from "clsx";

interface CanvasHeroImageProps {
  src: string;
  alt: string;
  objectFit: "contain" | "cover";
  draggable?: boolean;
}
export default function CanvasHeroImage({
  src,
  alt,
  objectFit,
  draggable,
}: CanvasHeroImageProps) {
  return (
    <div className={clsx("w-full h-full flex items-center justify-center")}>
      <img
        src={src}
        alt={alt}
        // original
        // className={`w-full h-auto object-${objectFit}`}
        // letter box
        className={`max-w-full max-h-full object-contain`}
        draggable={draggable}
      />
    </div>
  );
}
/*
  <div className="w-full h-full flex items-center justify-center">
      <img
        src={src}
        alt={alt}
        className={`max-w-full max-h-full w-auto h-auto object-${objectFit}`}
        draggable={draggable}
      />
    </div>
*/
