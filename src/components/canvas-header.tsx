"use client";

import clsx from "clsx";

export default function CanvasHeader({
  title,
  className,
}: {
  title: string;
  className?: string;
}) {
  return null;
  return (
    <div
      className={clsx(
        className,
        `text-xl w-full border-slate-300 border-b-1  tracking-widest pl-6 pb-4 hover:font-semibold hover:border-slate-600 transition-all duration-200 select-none`
      )}
    >
      {title}
    </div>
  );
}
