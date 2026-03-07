import { db } from "@/lib/firebase/client";
import { doc, setDoc, increment, serverTimestamp, getDoc } from "firebase/firestore";

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
   * @param userId ユーザー（Firebase Auth UID または Email）
   * @param extraTokens 消費されたトークン数
   */
  async recordUsage(userId: string, extraTokens: number): Promise<void> {
    if (!userId || isNaN(extraTokens) || extraTokens <= 0) return;

    const monthKey = this.getCurrentMonthKey();
    const usageDocRef = doc(db, "users", userId, "tokenUsage", monthKey);

    // merge: true を指定することで、ドキュメントが存在しない場合は新規作成され、
    // 存在する場合は既存の totalTokens フィールドに increment() された値が加算されます。
    await setDoc(usageDocRef, {
      month: monthKey,
      totalTokens: increment(extraTokens),
      updatedAt: serverTimestamp(),
    }, { merge: true });
  },

  /**
   * 指定ユーザーの特定月のトークン使用量を取得します（主に見表示・検証用）。
   * 管理画面の一括取得は Admin SDK 側 (admin-users.ts) に実装します。
   * @param userId ユーザーID
   * @param monthKey YYYY-MM
   */
  async getUsage(userId: string, monthKey: string): Promise<number> {
    const usageDocRef = doc(db, "users", userId, "tokenUsage", monthKey);
    const snapshot = await getDoc(usageDocRef);
    if (snapshot.exists()) {
      const data = snapshot.data();
      return data.totalTokens || 0;
    }
    return 0;
  }
};
