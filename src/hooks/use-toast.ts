import { toast as sonnerToast } from "@/components/ui/sonner";
import type { ReactNode } from "react";

type ToastInput = {
  title?: ReactNode;
  description?: ReactNode;
  variant?: "default" | "destructive";
};

const getToastMessage = (title?: ReactNode) => {
  if (typeof title === "string") return title;
  if (typeof title === "number") return String(title);
  return title ? String(title) : "";
};

function toast({ title, description, variant }: ToastInput) {
  const message = getToastMessage(title);
  const options = {
    description,
  };

  if (variant === "destructive") {
    return sonnerToast.error(message || "حدث خطأ", options);
  }

  if (message) {
    return sonnerToast(message, options);
  }

  return sonnerToast("تمت العملية بنجاح", options);
}

function useToast() {
  return {
    toast,
    dismiss: (toastId?: string | number) => sonnerToast.dismiss(toastId),
    toasts: [],
  };
}

export { useToast, toast };
