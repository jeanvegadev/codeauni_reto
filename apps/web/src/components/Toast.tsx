import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import { useEffect } from "react";

export type ToastKind = "success" | "error";

type ToastProps = {
  message: string;
  kind: ToastKind;
  onClose: () => void;
};

export function Toast({ message, kind, onClose }: ToastProps) {
  useEffect(() => {
    const timeout = window.setTimeout(onClose, 4500);
    return () => window.clearTimeout(timeout);
  }, [message, onClose]);

  const isSuccess = kind === "success";

  return (
    <div
      role="status"
      className={`fixed bottom-4 left-4 right-4 z-[60] flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-2xl shadow-slate-950/60 sm:left-auto sm:w-96 ${
        isSuccess
          ? "border-emerald-400/30 bg-emerald-950/95 text-emerald-100"
          : "border-red-400/30 bg-red-950/95 text-red-100"
      }`}
    >
      {isSuccess ? (
        <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      ) : (
        <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
      )}
      <p className="flex-1 text-sm">{message}</p>
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar notificación"
        className="rounded-lg p-1 opacity-70 transition hover:bg-white/10 hover:opacity-100"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
