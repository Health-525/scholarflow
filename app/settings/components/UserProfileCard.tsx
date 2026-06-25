"use client";

import { LogOut, School } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
  recordsCount: number;
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
  recordsCount,
  onLogout,
}: UserProfileCardProps) {
  return (
    <Card className="rounded-3xl p-0 mb-5 relative overflow-hidden hover:translate-y-0 hover:shadow-sm">
        <CardHeader className="relative px-6 pt-6 pb-0">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="relative shrink-0">
              <div className="relative w-14 h-14 rounded-2xl flex items-center justify-center bg-primary text-primary-foreground font-display text-2xl font-bold shadow-sm">
                {avatarLetter}
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base font-semibold tabular-nums text-foreground truncate">
                {displayName}
              </CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1 text-xs">
                <Badge
                  variant="secondary"
                  aria-hidden="true"
                  className={cn(
                    "w-1.5 h-1.5 rounded-full p-0 border-0 shrink-0",
                    isSynced
                      ? "bg-statusSuccess"
                      : "bg-muted-foreground/40",
                  )}
                />
                <span>
                  {isSynced ? "已同步教务系统" : "未同步教务系统"}
                </span>
              </CardDescription>
              {schoolId && (
                <CardDescription className="flex items-center gap-1.5 mt-0.5 text-xs">
                  <School className="w-3 h-3 text-primary/60" />
                  <span>{schoolName}</span>
                </CardDescription>
              )}
            </div>

            {/* Logout button — always visible */}
            <Button
              variant="destructive"
              size="sm"
              onClick={onLogout}
              className="shrink-0 rounded-xl"
              aria-label="退出登录"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="text-xs">退出</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="relative px-6 pb-6 pt-5">
          {/* Stats grid */}
          <div className="grid grid-cols-4 gap-2">
            {studentInfo ? (
              <>
                <StatChip value={studentInfo.gpa} label="GPA" accent />
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
              </>
            )}
            <StatChip value={String(recordsCount)} label="跑步" />
          </div>
        </CardContent>
      </Card>
  );
}
