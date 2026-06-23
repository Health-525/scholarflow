"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DailyReportPage() {
  const params = useParams();
  const router = useRouter();
  const date = params.date as string;

  useEffect(() => {
    if (date) {
      router.replace(`/reports/daily?date=${encodeURIComponent(date)}`);
    } else {
      router.replace("/reports/daily");
    }
  }, [date, router]);

  return null;
}
