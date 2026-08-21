import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

interface LiveLessonTimerProps {
  startedAt: string; // ISO
  className?: string;
}

const LiveLessonTimer = ({ startedAt, className = "" }: LiveLessonTimerProps) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const compute = () => {
      const start = new Date(startedAt).getTime();
      setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    };
    compute();
    const id = setInterval(compute, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;

  return (
    <div
      className={`inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-3 py-1 font-mono text-sm font-bold ${className}`}
    >
      <Clock className="w-4 h-4 animate-pulse" />
      {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
    </div>
  );
};

export default LiveLessonTimer;
