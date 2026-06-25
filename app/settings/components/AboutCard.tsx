import { APP_VERSION } from "@/lib/version";

export function AboutCard() {
  return (
    <div className="py-6 text-center">
      <p className="text-xs text-muted-foreground/70">
        ScholarFlow v{APP_VERSION}
      </p>
    </div>
  );
}
