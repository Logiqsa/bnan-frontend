import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiError } from "@/api/client";
import GlobalNotificationAdmin, { audienceDetails } from "./GlobalNotificationAdmin";
import { roleNavItems } from "@/components/DashboardSidebar";

const mocks = vi.hoisted(() => ({ send: vi.fn(), curriculums: vi.fn(), success: vi.fn(), warning: vi.fn(), error: vi.fn() }));
vi.mock("@/api/globalNotificationsApi", async (importOriginal) => ({ ...(await importOriginal<typeof import("@/api/globalNotificationsApi")>()), globalNotificationsApi: { sendGlobalNotification: mocks.send } }));
vi.mock("@/api/catalogApi", () => ({ catalogApi: { curriculums: mocks.curriculums } }));
vi.mock("sonner", () => ({ toast: { success: mocks.success, warning: mocks.warning, error: mocks.error } }));
vi.mock("@/layouts/DashboardLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));

const response = { success: true as const, data: { audience: "all" as const, curriculumId: "curriculum-1", title: "إعلان", status: "completed", usersTargeted: 10, notificationsCreated: 10, pushSuccessCount: 9, pushFailureCount: 1 } };
const renderPage = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}><LanguageProvider><GlobalNotificationAdmin /></LanguageProvider></QueryClientProvider>);
};
const title = () => screen.getByLabelText(/عنوان الإشعار/);
const content = () => screen.getByLabelText(/محتوى الإشعار/);
const image = () => screen.getByLabelText(/صورة الإشعار/, { selector: "input" });
const makeFile = (type = "image/png", size = 20, name = "banner.png") => new File([new Uint8Array(size)], name, { type });
const choose = (value: File) => fireEvent.change(image(), { target: { files: [value] } });
const chooseCurriculum = async () => {
  const button = await screen.findByRole("button", { name: "المنهج المصري" });
  await waitFor(() => expect(button).not.toBeDisabled());
  fireEvent.click(button);
};
const openConfirm = async (value = "إعلان مهم") => { await chooseCurriculum(); fireEvent.change(title(), { target: { value } }); fireEvent.click(screen.getByRole("button", { name: /إرسال الإشعار/ })); };
const confirm = () => fireEvent.click(screen.getByRole("button", { name: "إرسال" }));

describe("GlobalNotificationAdmin", () => {
  beforeAll(() => {
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn(() => "blob:preview") });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: vi.fn() });
  });
  beforeEach(() => {
    localStorage.setItem("bnan_language", "ar");
    mocks.send.mockReset().mockResolvedValue(response);
    mocks.curriculums.mockReset().mockResolvedValue({ success: true, data: [{ id: "curriculum-1", name: "المنهج المصري", registrationMode: "open" }] });
    mocks.success.mockReset(); mocks.warning.mockReset(); mocks.error.mockReset();
    vi.mocked(URL.createObjectURL).mockClear(); vi.mocked(URL.revokeObjectURL).mockClear();
  });

  it("renders the Admin form, defaults to all, and defines all four audience mappings", () => {
    renderPage();
    expect(screen.getByRole("heading", { name: /إرسال إشعار جديد/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "الجميع" })).toHaveAttribute("aria-pressed", "true");
    expect(Object.fromEntries(Object.entries(audienceDetails).map(([key, value]) => [value.ar, key]))).toEqual({ "الجميع": "all", "الطلاب": "student", "المعلمين": "teacher", "أولياء الأمور": "parent" });
  });

  it("keeps navigation Admin-only", () => {
    expect(roleNavItems.admin.some((item) => item.path === "/admin/notifications")).toBe(true);
    expect(roleNavItems.admin.some((item) => item.path === "/admin?tab=admins")).toBe(true);
    for (const role of ["teacher", "student", "supervisor"]) expect(roleNavItems[role].some((item) => item.path === "/admin/notifications")).toBe(false);
  });

  it("blocks missing and whitespace-only titles and applies text limits", () => {
    renderPage(); const submit = screen.getByRole("button", { name: /إرسال الإشعار/ });
    expect(submit).toBeDisabled(); fireEvent.change(title(), { target: { value: "   " } }); expect(submit).toBeDisabled();
    expect(title()).toHaveAttribute("maxlength", "200"); expect(content()).toHaveAttribute("maxlength", "5000");
  });

  it.each([["image/png", "a.png"], ["image/jpeg", "a.jpg"], ["image/jpg", "a.jpg"], ["image/webp", "a.webp"]])("accepts %s and previews it", async (type, name) => {
    renderPage(); choose(makeFile(type, 30, name));
    expect(await screen.findByRole("img", { name: /معاينة صورة الإشعار/ })).toHaveAttribute("src", "blob:preview");
    expect(screen.getByText(name)).toBeInTheDocument();
  });

  it("rejects an unsupported MIME type before submission", () => {
    renderPage(); choose(makeFile("image/gif", 20, "bad.gif"));
    expect(screen.getByRole("alert")).toHaveTextContent("صيغة الصورة غير مدعومة. استخدم PNG أو JPG أو WEBP."); expect(mocks.send).not.toHaveBeenCalled();
  });

  it("rejects an image over 5 MiB before submission", () => {
    renderPage(); choose(makeFile("image/png", 5 * 1024 * 1024 + 1));
    expect(screen.getByRole("alert")).toHaveTextContent("حجم الصورة يجب ألا يتجاوز 5 ميجابايت."); expect(mocks.send).not.toHaveBeenCalled();
  });

  it("removes and replaces images while revoking old object URLs", async () => {
    renderPage(); choose(makeFile("image/png", 10, "first.png")); await screen.findByText("first.png");
    choose(makeFile("image/webp", 10, "second.webp")); expect(await screen.findByText("second.webp")).toBeInTheDocument();
    expect(URL.revokeObjectURL).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "حذف" }));
    await waitFor(() => expect(screen.queryByRole("img", { name: /معاينة صورة الإشعار/ })).not.toBeInTheDocument());
  });

  it("requires confirmation and cancel never calls the API", async () => {
    renderPage(); await openConfirm(); expect(mocks.send).not.toHaveBeenCalled(); fireEvent.click(screen.getByRole("button", { name: "إلغاء" })); expect(mocks.send).not.toHaveBeenCalled();
  });

  it("sends title-only and title-content payloads without a file", async () => {
    const first = renderPage(); await openConfirm("  مرحباً  "); confirm();
    await waitFor(() => expect(mocks.send).toHaveBeenCalledWith({ title: "مرحباً", audiences: ["all"], curriculumIds: ["curriculum-1"] }, undefined));
    first.unmount(); mocks.send.mockClear(); renderPage(); fireEvent.change(content(), { target: { value: "  تفاصيل  " } }); await openConfirm(); confirm();
    await waitFor(() => expect(mocks.send).toHaveBeenCalledWith({ title: "إعلان مهم", audiences: ["all"], curriculumIds: ["curriculum-1"], content: "تفاصيل" }, undefined));
  });

  it("sends title-image and full payloads with the selected File", async () => {
    const selected = makeFile("image/webp", 20, "notice.webp"); const first = renderPage(); choose(selected); await openConfirm(); confirm();
    await waitFor(() => expect(mocks.send).toHaveBeenCalledWith({ title: "إعلان مهم", audiences: ["all"], curriculumIds: ["curriculum-1"] }, selected));
    first.unmount(); mocks.send.mockClear(); renderPage(); const full = makeFile("image/jpeg", 20, "full.jpg"); choose(full); fireEvent.change(content(), { target: { value: "تفاصيل" } }); await openConfirm(); confirm();
    await waitFor(() => expect(mocks.send).toHaveBeenCalledWith({ title: "إعلان مهم", audiences: ["all"], curriculumIds: ["curriculum-1"], content: "تفاصيل" }, full));
  });

  it("prevents duplicate submissions while loading", async () => {
    let resolve!: (value: typeof response) => void; mocks.send.mockReturnValue(new Promise((done) => { resolve = done; }));
    renderPage(); await openConfirm(); const send = screen.getByRole("button", { name: "إرسال" }); fireEvent.click(send); fireEvent.click(send);
    expect(mocks.send).toHaveBeenCalledTimes(1); resolve(response); await waitFor(() => expect(mocks.success).toHaveBeenCalled());
  });

  it("shows success and resets all fields including the image", async () => {
    renderPage(); choose(makeFile()); fireEvent.change(content(), { target: { value: "تفاصيل" } }); await openConfirm(); confirm();
    await waitFor(() => expect(screen.getByText("تم إرسال الإشعار", { selector: "h5" })).toBeInTheDocument());
    expect(title()).toHaveValue(""); expect(content()).toHaveValue(""); expect(image()).toHaveValue(""); expect(mocks.success).toHaveBeenCalled();
  });

  it("shows partial delivery as a warning rather than failure", async () => {
    mocks.send.mockResolvedValue({ ...response, data: { ...response.data, status: "partial" } }); renderPage(); await openConfirm(); confirm();
    await waitFor(() => expect(screen.getByText("تم الإرسال جزئيًا")).toBeInTheDocument()); expect(mocks.warning).toHaveBeenCalled(); expect(mocks.error).not.toHaveBeenCalled();
  });

  it.each([
    [new ApiError(413, "GLOBAL_NOTIFICATION_IMAGE_TOO_LARGE", "raw"), "حجم الصورة يجب ألا يتجاوز 5 ميجابايت."],
    [new ApiError(400, "INVALID_UPLOAD_FILE_TYPE", "raw"), "صيغة الصورة غير مدعومة. استخدم PNG أو JPG أو WEBP."],
    [new ApiError(0, "NETWORK_ERROR", "raw"), "تعذر إرسال الإشعار. حاول مرة أخرى."],
  ])("maps API errors cleanly and preserves every field", async (error, message) => {
    mocks.send.mockRejectedValue(error); renderPage(); const selected = makeFile(); choose(selected); fireEvent.change(content(), { target: { value: "محفوظ" } }); await openConfirm("عنوان محفوظ"); confirm();
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith(message));
    expect(title()).toHaveValue("عنوان محفوظ"); expect(content()).toHaveValue("محفوظ"); expect(screen.getByText(selected.name)).toBeInTheDocument();
  });
});
