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
      icon={<KeyRound className="size-4" />}
      title="账户安全"
    >
      <p className="text-xs mb-3 text-muted-foreground">
        清除本地加密存储的教务密码，并停止后台自动刷新
      </p>
      <Button
        variant="outline"
        onClick={onClearPassword}
        disabled={clearingPassword}
        className="w-full justify-start gap-3 px-3 py-2.5 h-auto text-left text-sm font-medium text-destructive hover:bg-destructive/10 hover:text-destructive"
      >
        <KeyRound className="size-4 shrink-0" />
        <span>{clearingPassword ? "清除中..." : "清除已记住的密码"}</span>
      </Button>
    </SettingsSection>
  );
}
