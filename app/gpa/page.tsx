import { GPAClient } from "@/components/gpa/GPAClient";
import { getGPAServerData } from "@/lib/gpa/server-data";

export default async function GPAPage() {
  const { grades } = await getGPAServerData();
  return <GPAClient grades={grades} />;
}
