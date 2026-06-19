"use client";

import { Clock, Database, GraduationCap, ShieldCheck } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { InfoRow } from "./InfoRow";

export function StorageInfoCard() {
  return (
    <Card className="mb-4 hover:translate-y-0 hover:shadow-sm">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-primary" />
          <CardTitle className="text-[13px] font-semibold">存储信息</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-[11px]">
          <InfoRow
            icon={<ShieldCheck className="w-3 h-3" />}
            label="数据存储"
            value="SQLite 本地数据库"
          />
          <InfoRow
            icon={<Clock className="w-3 h-3" />}
            label="课表/作业/跑步"
            value="本地优先，自动持久化"
          />
          <InfoRow
            icon={<GraduationCap className="w-3 h-3" />}
            label="学校凭证"
            value="安全加密存储"
          />
        </div>
      </CardContent>
    </Card>
  );
}
