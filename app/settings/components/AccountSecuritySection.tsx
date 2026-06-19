"use client";

import { KeyRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SettingsSection } from "@/components/ui/settings-section";

interface AccountSecuritySectionProps {
  clearingPassword: boolean;
  onClearPassword: () => void;
}

export function AccountSecuritySection({
  clearingPassword,
  onClearPassword,
}: AccountSecuritySectionProps) {
  return (
    <SettingsSection
      icon={<KeyRound className="w-4 h-4" />}
      title="账户安全"
    >
      <p className="text-[11px] mb-3 text-muted-foreground">
        清除本地加密存储的教务密码，并停止后台自动刷新
      </p>
      <Button
        variant="destructive"
        onClick={onClearPassword}
        disabled={clearingPassword}
        className="w-full justify-start gap-3 px-4 py-3 h-auto rounded-xl text-left text-[13px] font-medium active:translate-y-0.5 disabled:opacity-60"
      >
        <KeyRound className="w-4 h-4 shrink-0" />
        <span>{clearingPassword ? "清除中..." : "清除已记住的密码"}</span>
      </Button>
    </SettingsSection>
  );
}
