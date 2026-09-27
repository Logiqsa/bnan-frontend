import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, ClipboardCopy, RefreshCw } from "lucide-react";
import { ApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type RuntimeErrorSource = "render" | "window" | "unhandled-rejection";

type RuntimeErrorState = {
  error: Error | null;
  componentStack: string;
  source: RuntimeErrorSource | null;
};

type GlobalRuntimeErrorBoundaryProps = {
  children: ReactNode;
  onReload?: () => void;
};

const REDACTED = "[REDACTED]";

const redactSensitiveDetails = (value: string) => value
  .replace(/(bearer\s+)[^\s,;]+/gi, `$1${REDACTED}`)
  .replace(/((?:authorization|cookie|set-cookie|password|passcode|otp|token|access[_-]?token|refresh[_-]?token|api[_-]?key|secret)\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^\s,;]+)/gi, `$1${REDACTED}`)
  .replace(/([?&](?:token|access_token|refresh_token|api_key|password|otp)=)[^&#\s]+/gi, `$1${REDACTED}`)
  .replace(/\b[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, REDACTED);

const toError = (reason: unknown, fallbackMessage: string) => {
  if (reason instanceof Error) return reason;
  if (typeof reason === "string" && reason.trim()) return new Error(reason);
  return new Error(fallbackMessage);
};

const isExpectedRequestFailure = (reason: unknown) => {
  if (reason instanceof ApiError) return true;
  if (reason && typeof reason === "object") {
    const candidate = reason as { name?: unknown; code?: unknown; status?: unknown };
    if (candidate.name === "AbortError" || candidate.name === "ApiError") return true;
    if (typeof candidate.status === "number" && typeof candidate.code === "string") return true;
  }
  return false;
};

const currentPage = () => typeof window === "undefined" ? "غير متاح" : window.location.pathname;

export class GlobalRuntimeErrorBoundary extends Component<GlobalRuntimeErrorBoundaryProps, RuntimeErrorState> {
  state: RuntimeErrorState = { error: null, componentStack: "", source: null };

  static getDerivedStateFromError(error: Error): Partial<RuntimeErrorState> {
    return { error, source: "render" };
  }

  componentDidMount() {
    window.addEventListener("error", this.handleWindowError);
    window.addEventListener("unhandledrejection", this.handleUnhandledRejection);
  }

  componentWillUnmount() {
    window.removeEventListener("error", this.handleWindowError);
    window.removeEventListener("unhandledrejection", this.handleUnhandledRejection);
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ error, componentStack: errorInfo.componentStack || "", source: "render" });
  }

  private showUnexpectedError(error: Error, source: RuntimeErrorSource) {
    this.setState((state) => state.error ? null : { error, componentStack: "", source });
  }

  private handleWindowError = (event: ErrorEvent) => {
    if (event.error && isExpectedRequestFailure(event.error)) return;
    const error = toError(event.error ?? event.message, "حدث خطأ غير متوقع أثناء تشغيل الصفحة.");
    this.showUnexpectedError(error, "window");
  };

  private handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    if (isExpectedRequestFailure(event.reason)) return;
    this.showUnexpectedError(toError(event.reason, "حدث خطأ غير متوقع أثناء تنفيذ العملية."), "unhandled-rejection");
  };

  private reloadPage = () => {
    if (this.props.onReload) {
      this.props.onReload();
      return;
    }
    window.location.reload();
  };

  private copyDetails = async () => {
    const details = this.diagnosticDetails();
    await navigator.clipboard?.writeText(details).catch(() => undefined);
  };

  private diagnosticDetails() {
    const { error, componentStack, source } = this.state;
    return redactSensitiveDetails([
      `الخطأ: ${error?.message || "غير متاح"}`,
      `الصفحة: ${currentPage()}`,
      `المصدر: ${source || "غير متاح"}`,
      error?.stack ? `Stack:\n${error.stack}` : "",
      componentStack ? `Component Stack:\n${componentStack}` : "",
    ].filter(Boolean).join("\n\n"));
  }

  render() {
    const { error, componentStack, source } = this.state;
    if (!error) return this.props.children;

    const message = redactSensitiveDetails(error.message || "حدث خطأ غير متوقع أثناء تشغيل الصفحة.");
    const technicalDetails = this.diagnosticDetails();
    const componentOrPage = componentStack.trim().split("\n")[0]?.trim() || `الصفحة الحالية: ${currentPage()}`;

    return (
      <main className="grid min-h-screen place-items-center bg-background p-4" dir="rtl">
        <Card className="w-full max-w-3xl border-destructive/30 shadow-lg">
          <CardHeader className="space-y-3 p-5 sm:p-7">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-destructive/10 text-destructive">
              <AlertTriangle className="h-6 w-6" aria-hidden="true" />
            </span>
            <div>
              <CardTitle className="text-2xl">حدث خطأ غير متوقع</CardTitle>
              <p className="mt-2 text-sm text-muted-foreground">تعذر عرض هذه الصفحة بأمان. يمكنك نسخ التفاصيل أو إعادة تحميل الصفحة.</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 p-5 pt-0 sm:p-7 sm:pt-0">
            <section className="rounded-xl border border-destructive/20 bg-destructive/5 p-4" aria-label="تفاصيل الخطأ">
              <p className="text-sm font-semibold">الخطأ</p>
              <p className="mt-1 break-words font-mono text-sm" data-testid="runtime-error-message">{message}</p>
              <p className="mt-3 text-xs text-muted-foreground">المكوّن أو الصفحة: <span data-testid="runtime-error-component">{redactSensitiveDetails(componentOrPage)}</span></p>
            </section>

            <details className="rounded-xl border p-4">
              <summary className="cursor-pointer font-semibold">التفاصيل التقنية</summary>
              <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-muted p-3 text-left text-xs" dir="ltr" data-testid="runtime-error-details">{technicalDetails}</pre>
            </details>

            <div className="flex flex-wrap gap-3">
              <Button type="button" onClick={this.reloadPage}><RefreshCw className="h-4 w-4" />إعادة تحميل الصفحة</Button>
              <Button type="button" variant="outline" onClick={() => void this.copyDetails()}><ClipboardCopy className="h-4 w-4" />نسخ تفاصيل الخطأ</Button>
            </div>
            {source && <p className="text-xs text-muted-foreground">مصدر التشخيص: {source}</p>}
          </CardContent>
        </Card>
      </main>
    );
  }
}
