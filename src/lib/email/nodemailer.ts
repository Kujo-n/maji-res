import nodemailer from "nodemailer";

export async function sendActivationRequestEmail(
  requestingUserEmail: string,
  requestingUserName: string | null
) {
  const adminEmail = process.env.ADMIN_EMAIL;
  // GmailのSMTPを利用する場合、ご自身のGmailアドレスとそのアプリパスワードを設定します
  const userEmail = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!adminEmail || !userEmail || !pass) {
    console.warn(
      "Email configuration is missing (ADMIN_EMAIL, GMAIL_USER, or GMAIL_APP_PASSWORD). Skipping real notification email."
    );
    return { success: true, dummy: true, message: "Email triggered (dummy - no config)" };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  // 管理画面の承認URL
  const adminUrl = `${siteUrl}/admin?user=${encodeURIComponent(requestingUserEmail)}`;

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: userEmail,
        pass: pass,
      },
    });

    const info = await transporter.sendMail({
      from: `"MAJI-RES System" <${userEmail}>`,
      to: adminEmail,
      subject: "[MAJI-RES] 新規ユーザーの利用承認リクエスト",
      html: `
        <h2>MAJI-RES 利用承認リクエスト</h2>
        <p>新規ユーザーからシステムの利用リクエストがありました。</p>
        <ul>
          <li><strong>お名前:</strong> ${requestingUserName || "未設定"}</li>
          <li><strong>メールアドレス:</strong> ${requestingUserEmail}</li>
        </ul>
        <p>以下の管理画面リンクから対象ユーザーを「Active」に承認してください。</p>
        <p><a href="${adminUrl}" style="display:inline-block;padding:10px 20px;background-color:#007bff;color:white;text-decoration:none;border-radius:5px;">管理画面を開いて承認する</a></p>
        <p style="font-size:0.8em;color:gray;">このメールはMAJI-RESシステムから自動送信されています。</p>
      `,
    });

    console.log("Email sent successfully", info.messageId);
    return { success: true, data: info };
  } catch (error) {
    console.error("Failed to send email", error);
    return { success: false, error };
  }
}
