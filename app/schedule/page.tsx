import { ScheduleClient } from "@/components/schedule/ScheduleClient";
import { getScheduleServerData } from "@/lib/schedule/server-data";

export default async function SchedulePage() {
  const { schedule, adjustments } = await getScheduleServerData();
  return (
    <ScheduleClient
      initialSchedule={schedule}
      initialAdjustments={adjustments}
    />
  );
}
