import { useEffect, useMemo, useState } from "react";
import { useAppLocale } from "@/context/LanguageContext";

type LiveDateTimeBadgeProps = {
  compact?: boolean;
};

const LiveDateTimeBadge = ({ compact = false }: LiveDateTimeBadgeProps) => {
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const locale = useAppLocale();

  const timeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }),
    [locale],
  );

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  const timeLabel = timeFormatter.format(currentTime);

  return (
    <div className="shrink-0 text-right">
      <div className="flex flex-col items-end leading-tight">
        <div className={compact ? "text-sm font-medium text-foreground" : "text-lg font-semibold text-foreground md:text-xl"}>
          {timeLabel}
        </div>
      </div>
    </div>
  );
};

export default LiveDateTimeBadge;
