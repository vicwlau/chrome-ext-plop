"use client";

const letterHoverScale = 130;

export default function CoreTitle({ className }: { className?: string }) {
  return (
    <div className="absolute top-6 left-8 z-50">
      {/* <div className="font-gravitas text-6xl text-blue-950"> p l o p</div> */}
      <div className="font-gravitas text-5xl text-blue-950">
        <span
          className="inline-block -rotate-0 transition-transform cursor-pointer"
          style={
            {
              ["--hover-scale" as string]: letterHoverScale / 100,
            } as React.CSSProperties
          }
          onMouseEnter={(e) =>
            (e.currentTarget.style.transform = `rotate(-9deg) scale(${
              letterHoverScale / 100
            })`)
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.transform = `rotate(0deg) scale(1)`)
          }
        >
          p
        </span>
        <span> </span>
        <span
          className="inline-block rotate-0 transition-transform cursor-pointer"
          onMouseEnter={(e) =>
            (e.currentTarget.style.transform = `rotate(9deg) scale(${
              letterHoverScale / 100
            })`)
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.transform = `rotate(0deg) scale(1)`)
          }
        >
          l
        </span>
        <span> </span>
        <span
          className="inline-block -rotate-0 transition-transform cursor-pointer"
          onMouseEnter={(e) =>
            (e.currentTarget.style.transform = `rotate(-20deg) scale(${
              letterHoverScale / 100
            })`)
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.transform = `rotate(0deg) scale(1)`)
          }
        >
          o
        </span>
        <span> </span>
        <span
          className="inline-block transition-transform cursor-pointer"
          onMouseEnter={(e) =>
            (e.currentTarget.style.transform = `rotate(8deg) translateY(0.75rem) scale(${
              letterHoverScale / 100
            })`)
          }
          onMouseLeave={(e) => (e.currentTarget.style.transform = ``)}
        >
          p
        </span>
      </div>
    </div>
  );
}
