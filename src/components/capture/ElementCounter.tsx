interface ElementCounterProps {
  count: number;
  maxCount: number;
  variant?: "full" | "compact";
  showMessage?: boolean;
}

export default function ElementCounter({
  count,
  maxCount,
  variant = "full",
  showMessage = true,
}: ElementCounterProps) {
  const isMaxReached = count >= maxCount;
  const isCompact = variant === "compact";

  if (isCompact) {
    return (
      <div
        className={`text-xs font-semibold px-2 py-1 rounded ${
          isMaxReached
            ? "bg-red-100 text-red-600"
            : "bg-amber-100 text-amber-600"
        }`}
      >
        {count}/{maxCount}
      </div>
    );
  }

  return (
    <div
      className={`text-xs font-semibold ${
        isMaxReached ? "text-red-600" : "text-amber-600"
      }`}
    >
      {count} / {maxCount} elements
      {isMaxReached && showMessage && " (Remove elements to add more)"}
    </div>
  );
}
