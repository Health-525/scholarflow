"use client";

import { Toaster, toast } from "sonner";

export type ToastType = "success" | "error" | "info" | "warning";

export function showToast(type: ToastType, message: string, duration = 3000) {
  const options = duration > 0 ? { duration } : { duration: Infinity };
  switch (type) {
    case "success":
      toast.success(message, options);
      break;
    case "error":
      toast.error(message, options);
      break;
    case "info":
      toast.info(message, options);
      break;
    case "warning":
      toast.warning(message, options);
      break;
    default:
      toast(message, options);
  }
}

export function ToastContainer() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        className: "rounded-xl border border-border bg-card text-foreground",
      }}
      richColors
      closeButton
    />
  );
}

export default ToastContainer;
