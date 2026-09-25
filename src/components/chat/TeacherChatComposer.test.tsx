import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "@/i18n/LanguageContext";
import TeacherChatComposer from "./TeacherChatComposer";

const mocks = vi.hoisted(() => ({ toastError: vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: mocks.toastError } }));

const file = (name: string, type = "text/plain", size = 3) =>
  new File([new Uint8Array(size)], name, { type });

const renderComposer = (onSend = vi.fn().mockResolvedValue(undefined)) => {
  localStorage.setItem("bnan_language", "en");
  const view = render(<LanguageProvider><TeacherChatComposer onSend={onSend} /></LanguageProvider>);
  const input = view.container.querySelector('input[type="file"]') as HTMLInputElement;
  return { ...view, input, onSend };
};

describe("TeacherChatComposer", () => {
  beforeEach(() => mocks.toastError.mockReset());

  it("keeps text-only sending working", async () => {
    const { onSend } = renderComposer();
    fireEvent.change(screen.getByLabelText("Message text"), { target: { value: " hello " } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    await waitFor(() => expect(onSend).toHaveBeenCalledWith("hello", []));
  });

  it("selects files in order and removes an individual attachment", () => {
    const { input } = renderComposer();
    const first = file("first.txt");
    const second = file("second.pdf", "application/pdf");
    fireEvent.change(input, { target: { files: [first, second] } });

    const list = screen.getByLabelText("Selected attachments");
    expect(list).toHaveTextContent("first.txt");
    expect(list).toHaveTextContent("second.pdf");
    fireEvent.click(screen.getByRole("button", { name: "Remove first.txt" }));
    expect(screen.queryByText("first.txt")).not.toBeInTheDocument();
    expect(screen.getByText("second.pdf")).toBeInTheDocument();
  });

  it("rejects selections above the 10-attachment maximum without partially adding them", () => {
    const { input } = renderComposer();
    const files = Array.from({ length: 11 }, (_, index) => file(`${index}.txt`));
    fireEvent.change(input, { target: { files } });
    expect(screen.getByRole("alert")).toHaveTextContent("up to 10 files");
    expect(screen.queryByLabelText("Selected attachments")).not.toBeInTheDocument();
  });

  it("rejects unsupported file types before sending", () => {
    const { input, onSend } = renderComposer();
    fireEvent.change(input, { target: { files: [file("archive.zip", "application/zip")] } });
    expect(screen.getByRole("alert")).toHaveTextContent("Unsupported file type: archive.zip");
    expect(onSend).not.toHaveBeenCalled();
  });

  it("rejects files above the backend 20MB per-file limit", () => {
    const { input, onSend } = renderComposer();
    const oversized = file("large.pdf", "application/pdf");
    Object.defineProperty(oversized, "size", { value: 20 * 1024 * 1024 + 1 });
    fireEvent.change(input, { target: { files: [oversized] } });
    expect(screen.getByRole("alert")).toHaveTextContent("exceeds the 20MB file limit");
    expect(onSend).not.toHaveBeenCalled();
  });

  it("sends selected attachments and clears them only after success", async () => {
    const { input, onSend } = renderComposer();
    const attachment = file("lesson.pdf", "application/pdf");
    fireEvent.change(input, { target: { files: [attachment] } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => expect(onSend).toHaveBeenCalledWith("", [attachment]));
    await waitFor(() => expect(screen.queryByText("lesson.pdf")).not.toBeInTheDocument());
  });

  it("keeps retryable text and attachments after a send failure", async () => {
    const onSend = vi.fn().mockRejectedValue(new Error("Upload failed"));
    const { input } = renderComposer(onSend);
    fireEvent.change(screen.getByLabelText("Message text"), { target: { value: "caption" } });
    fireEvent.change(input, { target: { files: [file("lesson.pdf", "application/pdf")] } });
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));

    await waitFor(() => expect(mocks.toastError).toHaveBeenCalled());
    expect(screen.getByLabelText("Message text")).toHaveValue("caption");
    expect(screen.getByText("lesson.pdf")).toBeInTheDocument();
  });

  it("prevents duplicate sends while an upload is pending", async () => {
    let resolveSend: () => void = () => undefined;
    const onSend = vi.fn().mockReturnValue(new Promise<void>((resolve) => { resolveSend = resolve; }));
    const { input } = renderComposer(onSend);
    fireEvent.change(input, { target: { files: [file("lesson.pdf", "application/pdf")] } });
    const sendButton = screen.getByRole("button", { name: "Send message" });
    fireEvent.click(sendButton);
    fireEvent.click(sendButton);
    expect(onSend).toHaveBeenCalledTimes(1);
    await act(async () => resolveSend());
  });
});
