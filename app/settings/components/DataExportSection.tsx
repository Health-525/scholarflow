"use client";

import {
  BarChart3,
  Calendar,
  ClipboardList,
  Download,
  Trash2,
} from "lucide-react";

import { SettingsSection } from "@/components/ui/settings-section";
import type { Assignment } from "@/types";

import { SettingsMenuItem } from "./SettingsMenuItem";

interface DataExportSectionProps {
  scheduleData?: { schedule: unknown };
  assignments: Assignment[];
  onExportICS: () => void;
  onExportAssignments: () => void;
  onExportActivity: () => void;
  onConfirmClearActivity: () => void;
}

export function DataExportSection({
  scheduleData,
  assignments,
  onExportICS,
  onExportAssignments,
  onExportActivity,
  onConfirmClearActivity,
}: DataExportSectionProps) {
  return (
    <SettingsSection icon={<Download className="w-4 h-4" />} title="数据导出">
      <SettingsMenuItem
        icon={Calendar}
        label="导出课表 (ICS)"
        onClick={onExportICS}
        disabled={!scheduleData?.schedule}
      />
      <SettingsMenuItem
        icon={ClipboardList}
        label="导出作业 (CSV)"
        onClick={onExportAssignments}
        disabled={!assignments.length}
      />
      <SettingsMenuItem
        icon={BarChart3}
        label="导出屏幕时间 (CSV)"
        onClick={onExportActivity}
      />
      <SettingsMenuItem
        icon={Trash2}
        label="清除屏幕时间数据"
        onClick={onConfirmClearActivity}
        danger
        last
      />
    </SettingsSection>
  );
}
