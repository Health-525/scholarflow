"use client";

import { useState, useEffect, useCallback } from "react";

import { requestPermission } from "@/lib/notification";

export function useNotification() {
  const [permission, setPermission] = useState<NotificationPermission>("default");

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const request = useCallback(async () => {
    const perm = await requestPermission();
    setPermission(perm);
    return perm;
  }, []);

  return {
    permission,
    isGranted: permission === "granted",
    isDenied: permission === "denied",
    request,
  };
}
