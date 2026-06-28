"use client";

import { LogOut, School } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

import type { StudentInfo } from "../types";

import { StatChip } from "./StatChip";

interface UserProfileCardProps {
  displayName: string;
  avatarLetter: string;
  schoolName: string;
  isSynced: boolean;
  schoolId?: string | null;
  studentInfo: StudentInfo | null;
  scheduleCourseCount: number;
  pendingAssignmentsCount: number;
  onLogout: () => void;
}

export function UserProfileCard({
  displayName,
  avatarLetter,
  schoolName,
  isSynced,
  schoolId,
  studentInfo,
  scheduleCourseCount,
  pendingAssignmentsCount,
  onLogout,
}: UserProfileCardProps) {
  return (
    <Card className="mb-4 hover:shadow-sm transition-shadow duration-200 overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary text-foreground text-base font-semibold">
              {avatarLetter}
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-foreground truncate">
                {displayName}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge
                  variant="secondary"
                  className={cn(
                    "h-4 px-1.5 text-xs gap-1",
                    isSynced ? "text-statusSuccess" : "text-muted-foreground"
                  )}
                >
                  <span className={cn("size-1.5 rounded-full", isSynced ? "bg-statusSuccess" : "bg-muted-foreground/40")} />
                  {isSynced ? "已同步教务系统" : "未同步教务系统"}
                </Badge>
              </div>
              {schoolId && (
                <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                  <School className="size-3" />
                  <span>{schoolName}</span>
                </div>
              )}
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={onLogout}
            className="shrink-0 gap-1.5 text-muted-foreground hover:text-foreground"
            aria-label="退出登录"
          >
            <LogOut className="size-3.5" />
            <span className="text-xs">退出</span>
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-4">
          {studentInfo ? (
            <>
              <StatChip value={studentInfo.gpa} label="GPA" />
              <StatChip value={String(studentInfo.totalCredits)} label="学分" />
              <StatChip value={String(studentInfo.courseCount)} label="课程" />
            </>
          ) : (
            <>
              <StatChip
                value={String(scheduleCourseCount)}
                label="课程"
              />
              <StatChip
                value={String(pendingAssignmentsCount)}
                label="待办"
              />
              <StatChip value="—" label="GPA" />
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
