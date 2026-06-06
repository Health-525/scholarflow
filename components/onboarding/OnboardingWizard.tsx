"use client";

import { useState, useEffect } from "react";
import { ArrowRight, Check, GraduationCap, BookOpen, Target, Sparkles } from "lucide-react";

const STEPS = [
  {
    icon: GraduationCap,
    title: "欢迎来到 ScholarFlow",
    subtitle: "你的AI学习伙伴，一站式管理大学生活",
    tips: ["课表自动化 ✦ 作业倒计时 ✦ 绩点计算", "AI分析学习数据 ✦ 屏幕时间追踪"],
  },
  {
    icon: BookOpen,
    title: "你的课程",
    subtitle: "把课表录入，开始自动管理",
    tips: ["去「课表」页面查看或导入课程", "课程变动会自动更新到课表"],
    action: { label: "去课表页面", href: "/schedule" },
  },
  {
    icon: Target,
    title: "设定本周目标",
    subtitle: "66% 的大学生做计划但放弃。设定小目标，从今天开始",
    tips: ["每天 3 个目标就够了，别贪多", "完成率 >70% 就是优秀的一周"],
    action: { label: "设定目标", href: "/notes" },
  },
  {
    icon: Sparkles,
    title: "自动记录",
    subtitle: "ScholarFlow 在后台自动追踪你的学习",
    tips: ["右下角按钮实时显示你在做什么", "下载 Electron 桌面版可追踪所有App使用"],
    action: { label: "下载桌面版", href: "/activity" },
  },
  {
    icon: Check,
    title: "一切就绪",
    subtitle: "你已经准备好了，开始你的学习之旅吧",
    tips: ["随时修改侧边栏的设置", "数据仅存储在本地，完全隐私"],
  },
];

const LS_KEY = "sf_onboarded";

export function isOnboarded(): boolean {
  try { return localStorage.getItem(LS_KEY) === "true"; } catch { return false; }
}

export function OnboardingWizard() {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isOnboarded()) setVisible(true);
  }, []);

  const finish = () => {
    localStorage.setItem(LS_KEY, "true");
    setVisible(false);
  };

  if (!visible) return null;

  const s = STEPS[step];
  const Icon = s.icon;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}>
      <div
        className="w-[360px] max-w-[90vw] rounded-3xl p-8 text-center animate-in"
        style={{
          backgroundColor: "var(--surface-card)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-lg)",
          animation: "fadeInUp 0.4s ease",
        }}
      >
        {/* Icon */}
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl flex items-center justify-center" style={{ backgroundColor: "var(--accent-soft)" }}>
          <Icon className="w-7 h-7" style={{ color: "var(--accent)" }} />
        </div>

        {/* Title */}
        <h2 className="text-[18px] font-bold mb-1" style={{ color: "var(--text-primary)" }}>{s.title}</h2>
        <p className="text-[13px] mb-6" style={{ color: "var(--text-tertiary)" }}>{s.subtitle}</p>

        {/* Tips */}
        <div className="text-left space-y-2 mb-6">
          {s.tips.map((tip, i) => (
            <div key={i} className="flex items-start gap-2 text-[12px]" style={{ color: "var(--text-secondary)" }}>
              <span style={{ color: "var(--accent)", marginTop: 2 }}>•</span>
              <span>{tip}</span>
            </div>
          ))}
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-3">
          {step > 0 && (
            <button
              onClick={() => setStep(step - 1)}
              className="flex-1 py-2.5 rounded-xl text-[13px] font-medium transition-colors"
              style={{ backgroundColor: "var(--surface)", color: "var(--text-secondary)" }}
            >
              上一步
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="flex-1 py-2.5 rounded-xl text-[13px] font-medium flex items-center justify-center gap-1 transition-colors"
              style={{ backgroundColor: "var(--accent)", color: "#fff" }}
            >
              {s.action?.label || "继续"}
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={finish}
              className="flex-1 py-2.5 rounded-xl text-[13px] font-medium flex items-center justify-center gap-1 transition-colors"
              style={{ backgroundColor: "var(--accent)", color: "#fff" }}
            >
              开始使用
              <Check className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Step dots */}
        <div className="flex items-center justify-center gap-1.5 mt-4">
          {STEPS.map((_, i) => (
            <div key={i} className="w-1.5 h-1.5 rounded-full transition-colors" style={{ backgroundColor: i === step ? "var(--accent)" : "var(--border)" }} />
          ))}
        </div>
      </div>
    </div>
  );
}
