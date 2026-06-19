"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarDays, Plus } from "lucide-react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SubjectSelector } from "@/components/ui/subject-selector";
import { showToast } from "@/components/ui/ToastContainer";
import { assignmentSchema, type AssignmentInput } from "@/lib/schemas";
import type { Assignment, AssignmentDraft } from "@/types";

import { tomorrowDate, dateToDeadline } from "../utils";

type FormValues = AssignmentInput;

export function QuickCaptureForm({
  subjects,
  onAdd,
}: {
  subjects: string[];
  onAdd: (d: AssignmentDraft) => Promise<Assignment[]>;
}) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(assignmentSchema),
    mode: "onChange",
    defaultValues: {
      subject: subjects[0] || "",
      title: "",
      deadline: tomorrowDate(),
    },
  });

  const subjectValue = watch("subject");

  const onSubmit = async (data: FormValues) => {
    try {
      await onAdd({
        subject: data.subject.trim(),
        title: data.title.trim(),
        deadline: dateToDeadline(data.deadline),
      });
      showToast("success", "作业已添加");
      reset({
        subject: subjects[0] || "",
        title: "",
        deadline: tomorrowDate(),
      });
      const el = document.getElementById("title") as HTMLInputElement | null;
      el?.focus();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "添加失败");
    }
  };

  return (
    <Card className="!overflow-visible">
      <CardContent className="p-4">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div>
            <label
              htmlFor="title"
              className="mb-1.5 block text-sm font-medium text-foreground"
            >
              作业标题
            </label>
            <Input
              id="title"
              {...register("title")}
              placeholder="请输入作业名称"
              className="h-10"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(onSubmit)();
                }
              }}
            />
            {errors.title && (
              <p className="mt-1 text-[12px] text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <span className="mb-1.5 block text-sm font-medium text-foreground">科目</span>
              <SubjectSelector
                subjects={subjects}
                value={subjectValue}
                onChange={(v) => setValue("subject", v, { shouldValidate: true })}
                className="max-h-32 overflow-y-auto"
              />
              {errors.subject && (
                <p className="mt-1 text-[12px] text-destructive">{errors.subject.message}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="deadline"
                className="mb-1.5 block text-sm font-medium text-foreground"
              >
                截止日期
              </label>
              <div className="relative">
                <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                <Input
                  id="deadline"
                  type="date"
                  {...register("deadline")}
                  className="h-10 pl-9"
                />
              </div>
              {errors.deadline && (
                <p className="mt-1 text-[12px] text-destructive">{errors.deadline.message}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting} className="h-10 gap-1">
              <Plus className="size-4" />
              添加
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
