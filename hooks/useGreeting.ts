"use client";

import { useEffect, useState } from "react";

export interface GreetingResult {
  text: string; // 时段问候语
  date: string; // 当前日期字符串
}

function getGreeting(now: Date): GreetingResult {
  const h = now.getHours();

  const text =
    h < 6
      ? "夜深了"
      : h < 9
        ? "早安"
        : h < 12
          ? "上午好"
          : h < 14
            ? "中午好"
            : h < 18
              ? "下午好"
              : h < 22
                ? "晚上好"
                : "夜深了";

  const date = now.toLocaleDateString("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long",
  });

  return { text, date };
}

export function useGreeting(): GreetingResult {
  const [greeting, setGreeting] = useState<GreetingResult>({
    text: "你好",
    date: "",
  });

  useEffect(() => {
    const update = () => {
      const next = getGreeting(new Date());
      setGreeting((prev) => {
        if (prev.text === next.text && prev.date === next.date) {
          return prev;
        }
        return next;
      });
    };

    update();
    const timer = setInterval(update, 60000);
    return () => clearInterval(timer);
  }, []);

  return greeting;
}
