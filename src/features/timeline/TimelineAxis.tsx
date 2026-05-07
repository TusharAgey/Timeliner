import { fullDate } from "../../lib/date";

type TimelineAxisProps = {
  markers: Array<{ offset: number; label: string; y: number }>;
  todayY: number;
  axisLabelOffset?: number;
};

export const TimelineAxis = ({
  markers,
  todayY,
  axisLabelOffset = 40,
}: TimelineAxisProps) => (
  <div className="sticky top-0 z-10 h-full min-h-screen">
    <div className="absolute bottom-0 left-1/2 top-0 z-0 w-px -translate-x-1/2 bg-gradient-to-b from-white/10 via-white/10 to-white/10" />
    {markers.map((marker) => (
      <div
        key={marker.label}
        className="absolute left-1/2 z-10 flex -translate-x-1/2 flex-col items-center"
        style={{
          top: (() => {
            const markerY = marker.y;
            return (
              markerY +
              (Math.abs(markerY - todayY) < axisLabelOffset
                ? marker.offset <= 0
                  ? -26
                  : 26
                : 0)
            );
          })(),
        }}
      >
        <div className="h-2.5 w-2.5 rounded-full border border-white/15 bg-[#0f1b2d]" />
        <div className="mt-1 h-3 w-px bg-white/10" />
        <div className="mt-2 rounded-full bg-[#0f1b2d]/90 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-400 ring-1 ring-white/8">
          {marker.label}
        </div>
      </div>
    ))}
    <div className="pointer-events-none absolute left-1/2 top-2 -translate-x-1/2 rounded-full bg-[#0f1b2d]/90 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-500 ring-1 ring-white/8">
      {fullDate(new Date().toISOString().slice(0, 10))}
    </div>
  </div>
);
