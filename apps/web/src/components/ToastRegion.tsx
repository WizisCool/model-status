import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import { createPortal } from "react-dom";

export type ToastTone = "success" | "error" | "info";

export type ToastNotice = {
  id: number;
  tone: ToastTone;
  title: string;
  description: string;
};

function getToastStyles(tone: ToastTone): { icon: typeof CheckCircle2; panelClassName: string; iconClassName: string } {
  switch (tone) {
    case "success":
      return {
        icon: CheckCircle2,
        panelClassName: "border-success/30 bg-surface/95",
        iconClassName: "text-success",
      };
    case "error":
      return {
        icon: AlertCircle,
        panelClassName: "border-error/30 bg-surface/95",
        iconClassName: "text-error",
      };
    default:
      return {
        icon: Info,
        panelClassName: "border-border bg-surface/95",
        iconClassName: "text-textSecondary",
      };
  }
}

export function ToastRegion({ notices, onDismiss }: { notices: ToastNotice[]; onDismiss: (id: number) => void }) {
  if (notices.length === 0 || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="pointer-events-none fixed inset-x-4 top-4 z-50 flex flex-col gap-3 md:left-auto md:right-4 md:w-full md:max-w-sm" aria-live="polite" aria-atomic="true">
      {notices.map((notice) => {
        const { icon: Icon, panelClassName, iconClassName } = getToastStyles(notice.tone);
        return (
          <div key={notice.id} className={`glass-panel pointer-events-auto rounded-xl border px-4 py-3 shadow-lg ${panelClassName}`} role={notice.tone === "error" ? "alert" : "status"}>
            <div className="flex items-start gap-3">
              <Icon size={18} className={`mt-0.5 flex-shrink-0 ${iconClassName}`} />
              <div className="min-w-0 flex-1">
                <div className="font-mono text-sm text-textPrimary">{notice.title}</div>
                <div className="mt-1 text-sm text-textSecondary break-words">{notice.description}</div>
              </div>
              <button
                type="button"
                onClick={() => onDismiss(notice.id)}
                className="rounded-md p-1 text-textMuted transition-colors hover:bg-surfaceHover hover:text-textPrimary"
                aria-label="Dismiss notification"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        );
      })}
    </div>,
    document.body,
  );
}
