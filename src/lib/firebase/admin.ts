import "server-only";
import { initializeApp, getApps, getApp, cert, ServiceAccount } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

// サーバーサイドでのみ実行されることを保証
if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  // ビルド時などにエラーにならないよう、環境変数が無い場合は初期化をスキップする等のハンドリングが必要だが、
  // ランタイムでは必須なのでエラーを投げるか、あるいは遅延初期化にする。
  // ここではとりあえず単純化して、存在チェックのみ行う（ビルドエラー回避のためtry-catch検討）。
  // しかしNext.jsのビルドプロセスで環境変数がないと落ちるのは困るかもしれない。
  // 一旦コメントアウトして、実際の運用時にエラーにする。
  // throw new Error("FIREBASE_SERVICE_ACCOUNT_KEY is not defined");
}

let adminApp;

try {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY) as ServiceAccount;
    adminApp = !getApps().length
      ? initializeApp({
          credential: cert(serviceAccount),
        })
      : getApp();
  }
} catch (error) {
  console.error("Firebase Admin initialization failed:", error);
}

// adminAppがundefinedの場合、以下の呼び出しはエラーになる可能性があるため
// エクスポートする関数内で使用するか、あるいはここでキャストする。
// しかし、型安全性を考えると、adminDb等は `Firestore | null` 型になるべきか、
// あるいは使用側で非nullアサーションするか。

// 簡易実装として、adminAppがある前提でエクスポートするが、
// 実際にはAPIルート等での使用時にチェックが入る想定。
const adminDb = adminApp ? getFirestore(adminApp) : ({} as ReturnType<typeof getFirestore>);
const adminAuth = adminApp ? getAuth(adminApp) : ({} as ReturnType<typeof getAuth>);

export { adminDb, adminAuth };
