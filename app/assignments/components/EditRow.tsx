"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarDays, CheckCircle2 } from "lucide-react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SubjectSelector } from "@/components/ui/subject-selector";
import { showToast } from "@/components/ui/ToastContainer";
import { assignmentSchema, type AssignmentInput } from "@/lib/schemas";
import type { Assignment, AssignmentDraft } from "@/types";

import { dateToDeadline } from "../utils";

type FormValues = AssignmentInput;

export function EditRow({
  a,
  subjects,
  onSave,
  onCancel,
}: {
  a: Assignment;
  subjects: string[];
  onSave: (draft: AssignmentDraft) => Promise<unknown>;
  onCancel: () => void;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(assignmentSchema),
    mode: "onChange",
    defaultValues: {
      title: a.title,
      subject: a.subject,
      deadline: a.deadline.slice(0, 10),
    },
  });

  const subjectValue = watch("subject");

  const onSubmit = async (data: FormValues) => {
    await onSave({
      subject: data.subject.trim(),
      title: data.title.trim(),
      deadline: dateToDeadline(data.deadline),
      note: a.note,
    });
    showToast("success", "作业已更新");
  };

  return (
    <Card className="!overflow-visible bg-muted/30">
      <CardContent className="p-3">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3" noValidate>
          <Input {...register("title")} placeholder="作业标题" className="h-10" />
          {errors.title && (
            <p className="text-[12px] text-destructive">{errors.title.message}</p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <SubjectSelector
              subjects={subjects}
              value={subjectValue}
              onChange={(v) => setValue("subject", v, { shouldValidate: true })}
              className="max-h-32 overflow-y-auto"
            />
            <div className="relative">
              <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
              <Input type="date" {...register("deadline")} className="h-10 pl-9" />
            </div>
          </div>
          {(errors.subject || errors.deadline) && (
            <p className="text-[12px] text-destructive">
              {errors.subject?.message || errors.deadline?.message}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onCancel} className="h-9">
              取消
            </Button>
            <Button type="submit" disabled={isSubmitting} size="sm" className="h-9 gap-1">
              <CheckCircle2 className="size-4" /> 保存
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
