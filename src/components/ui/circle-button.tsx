import { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface CircleButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  onClick: () => void;
}

export function CircleButton({
  onClick,
  className,
  children,
  ...props
}: CircleButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "absolute bottom-4 right-4",
        "rounded-full bg-amber-300 hover:bg-yellow-500",
        "transition-colors duration-200",
        "flex items-center justify-center",
        "w-16 h-16",
        "shadow-md hover:shadow-lg",
        "focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
