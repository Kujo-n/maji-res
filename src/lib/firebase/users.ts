import { db } from "./client";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";

export type UserRole = "user" | "admin";
export type UserStatus = "pending" | "active";

export interface UserData {
  status: UserStatus;
  role: UserRole;
  name: string | null;
  createdAt: any;
  activatedAt?: any;
}

/**
 * ユーザーのメールアドレスで Firestoreのユーザードキュメントを取得
 */
export async function getUserData(email: string): Promise<UserData | null> {
  if (!email) return null;
  const userRef = doc(db, "users", email);
  const snap = await getDoc(userRef);
  if (snap.exists()) {
    return snap.data() as UserData;
  }
  return null;
}
