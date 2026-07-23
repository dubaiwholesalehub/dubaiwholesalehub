import {
  Award,
  CheckCircle2,
  CircleDot,
  FilePlus2,
  Send,
} from "lucide-react";

import type {
  RfqTimelineEvent,
  TimelineEventType,
} from "@/lib/repositories/rfq";

interface TimelineItemProps {
  event: RfqTimelineEvent;
  isLast: boolean;
}

function TimelineEventIcon({
  type,
}: {
  type: TimelineEventType;
}) {
  const iconClassName = "size-4";

  switch (type) {
    case "created":
      return <FilePlus2 className={iconClassName} />;

    case "sent":
      return <Send className={iconClassName} />;

    case "quotation_received":
      return <CircleDot className={iconClassName} />;

    case "awarded":
      return <Award className={iconClassName} />;

    case "closed":
      return <CheckCircle2 className={iconClassName} />;
  }
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-AE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function TimelineItem({
  event,
  isLast,
}: TimelineItemProps) {
  return (
    <li className="relative flex gap-4">
      {!isLast ? (
        <span
          aria-hidden="true"
          className="absolute left-4 top-8 h-full w-px bg-border"
        />
      ) : null}

      <div className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full border bg-background text-muted-foreground">
        <TimelineEventIcon type={event.type} />
      </div>

      <div className="min-w-0 flex-1 pb-8">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="font-medium">{event.title}</p>

            {event.description ? (
              <p className="mt-1 text-sm text-muted-foreground">
                {event.description}
              </p>
            ) : null}

            {event.userName ? (
              <p className="mt-1 text-xs text-muted-foreground">
                By {event.userName}
              </p>
            ) : null}
          </div>

          <time
            dateTime={event.createdAt}
            className="shrink-0 text-xs text-muted-foreground"
          >
            {formatDateTime(event.createdAt)}
          </time>
        </div>
      </div>
    </li>
  );
}