import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sendActivationRequestEmail } from "./nodemailer";
import nodemailer from "nodemailer";

vi.mock("nodemailer");

describe("nodemailer - sendActivationRequestEmail", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  it("returns early and dummy object if environment variables are missing", async () => {
    delete process.env.ADMIN_EMAIL;
    const result = await sendActivationRequestEmail("test@example.com", "Test User");
    expect(result.success).toBe(true);
    // @ts-ignore
    expect(result.dummy).toBe(true);
  });

  it("configures transporter and sends email when config is present", async () => {
    process.env.ADMIN_EMAIL = "admin@example.com";
    process.env.GMAIL_USER = "sender@example.com";
    process.env.GMAIL_APP_PASSWORD = "password";
    process.env.NEXT_PUBLIC_SITE_URL = "http://localhost:3000";

    const sendMailMock = vi.fn().mockResolvedValue({ messageId: "12345" });
    vi.mocked(nodemailer.createTransport).mockReturnValue({
      sendMail: sendMailMock,
    } as any);

    const result = await sendActivationRequestEmail("req@example.com", "Req User");
    expect(result.success).toBe(true);
    // @ts-ignore
    expect(result.data.messageId).toBe("12345");
    
    expect(nodemailer.createTransport).toHaveBeenCalledWith({
      service: "gmail",
      auth: {
        user: "sender@example.com",
        pass: "password",
      },
    });

    expect(sendMailMock).toHaveBeenCalledWith(expect.objectContaining({
      from: '"MAJI-RES System" <sender@example.com>',
      to: "admin@example.com",
      subject: "[MAJI-RES] 新規ユーザーの利用承認リクエスト",
    }));
  });

  it("handles email sending errors gracefully", async () => {
    process.env.ADMIN_EMAIL = "admin@example.com";
    process.env.GMAIL_USER = "sender@example.com";
    process.env.GMAIL_APP_PASSWORD = "password";

    const sendMailMock = vi.fn().mockRejectedValue(new Error("SMTP Error"));
    vi.mocked(nodemailer.createTransport).mockReturnValue({
      sendMail: sendMailMock,
    } as any);

    const result = await sendActivationRequestEmail("req@example.com", "Req User");
    expect(result.success).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
  });
});
