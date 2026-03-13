import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

export interface TokenUsageRecord {
  month: string; // YYYY-MM format
  totalTokens: number;
  updatedAt: any;
}

export const TokenUsageService = {
  /**
   * 現在の年月(YYYY-MM)文字列を取得します。
   */
  getCurrentMonthKey(): string {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    return `${year}-${month}`;
  },

  /**
   * 指定ユーザーの当月のトークン使用量を加算します。
   * Admin SDKを使用してサーバーサイドからFirestoreに書き込みます。
   * @param userId ユーザー（Firebase Auth UID または Email）
   * @param extraTokens 消費されたトークン数
   */
  async recordUsage(userId: string, extraTokens: number): Promise<void> {
    if (!userId || isNaN(extraTokens) || extraTokens <= 0) return;

    const monthKey = this.getCurrentMonthKey();
    const usageDocRef = adminDb.collection("users").doc(userId).collection("tokenUsage").doc(monthKey);

    await usageDocRef.set({
      month: monthKey,
      totalTokens: FieldValue.increment(extraTokens),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
  },

  /**
   * 指定ユーザーの特定月のトークン使用量を取得します（主に表示・検証用）。
   * 管理画面の一括取得は Admin SDK 側 (admin-users.ts) に実装します。
   * @param userId ユーザーID
   * @param monthKey YYYY-MM
   */
  async getUsage(userId: string, monthKey: string): Promise<number> {
    const usageDocRef = adminDb.collection("users").doc(userId).collection("tokenUsage").doc(monthKey);
    const snapshot = await usageDocRef.get();
    if (snapshot.exists) {
      const data = snapshot.data();
      return data?.totalTokens || 0;
    }
    return 0;
  }
};
