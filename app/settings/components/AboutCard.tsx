import { APP_VERSION } from "@/lib/version";

export function AboutCard() {
  return (
    <div className="border-t border-border pt-6 mt-4 text-center">
      <p className="text-xs text-muted-foreground/70">
        ScholarFlow{" "}
        <span className="font-mono text-xs bg-muted rounded-md px-2 py-0.5">
          v{APP_VERSION}
        </span>
      </p>
    </div>
  );
}
