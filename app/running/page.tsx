import { RunningClient } from "@/components/running/RunningClient";
import { getRunningServerData } from "@/lib/running/server-data";

export default async function RunningPage() {
  const { records } = await getRunningServerData();
  return <RunningClient initialRecords={records} />;
}
