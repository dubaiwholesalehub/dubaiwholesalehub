import type { RfqTimelineEvent } from "@/lib/repositories/rfq";

import { DetailSection } from "../detail";
import { TimelineItem } from "./timeline-item";

interface RfqTimelineProps {
  events: RfqTimelineEvent[];
}

export function RfqTimeline({
  events,
}: RfqTimelineProps) {
  return (
    <DetailSection title="Activity Timeline">
      {events.length === 0 ? (
        <div className="py-8 text-center">
          <p className="text-sm font-medium">
            No activity recorded
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            Status changes and workflow events will appear here.
          </p>
        </div>
      ) : (
        <ol>
          {events.map((event, index) => (
            <TimelineItem
              key={event.id}
              event={event}
              isLast={index === events.length - 1}
            />
          ))}
        </ol>
      )}
    </DetailSection>
  );
}