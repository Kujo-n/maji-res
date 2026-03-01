# Issue 007: 新規ログイン時の権限エラーおよび無限ローディングの発生と修正

## 概要
利用者を限定する機能（`status: active/pending` の判定）を導入後、新規のGoogleアカウント（未登録アカウント）でログインを行おうとすると、以下の2点の問題が発生しました。
1. `Login failed: Missing or insufficient permissions.` というエラーが出てログイン処理が中断される。
2. 同時に、ログイン画面のローディングインジケーター（「Signing in...」表示）が解除されず、進行不能（無限ロード）に陥る。
また、エラーによって Firestore の `users` コレクションには、該当アカウントの `status: "pending"` ドキュメント自体が作成されていない状態でした。

## 原因の特定
本インシデントは、以下の **「Firestoreのセキュリティルールの不備」** と、**「認証状態を監視するコンポーネント間の競合（レースコンディション）」** の2つの要因が複合して発生していました。

### 1. Firestore セキュリティルールの不備
`users` コレクションのドキュメントのキー（ID）を、システム改修の過程で「Firebase UID」から「メールアドレス」に変更していました。
しかし、バックエンドである `firestore.rules` 側は依然として「ドキュメントID＝リクエスト送信者のUID」の場合のみ書き込みを許可する仕様（`isOwner` による判定）のままであったため、メールアドレスをIDとして新しくドキュメントを作成しようとする処理が根本から弾かれていました（Permission Denied）。

### 2. 認証状態の監視（auth-context）と手動ログイン（login-button）の競合
ユーザーがGoogleポップアップログインに成功した直後、システム全体を監視する `auth-context.tsx`（の `onAuthStateChanged` イベント）と、ログインボタンが持つ `createPendingUser` の手続きが並列に走り出します。
1. `auth-context.tsx` 側が「この新規アカウントはFirestore上にデータが無い（またはPendingである）」ことを高速に検出し、**直ちに裏側で強制ログアウト処理（`signOut`）を発動**してしまう。
2. それより一瞬遅れて、前述の `login-button` 側のプログラムが「未登録なので `users` にPendingの初期データを作成（`setDoc`）しよう」とする。
3. しかし、その時点ではすでに `auth-context` によって認証トークンを破棄（ログアウト済み）されているため、未認証ユーザーとみなされて権限エラーで書き込みが失敗する。
4. この内部エラーが適切にハンドリングされていなかったことで、結果として強制終了し `setLoading(false)` 等の後処理が実行されず、ローディングがフリーズする事態となっていました。

## 修正内容

### 1. セキュリティルールの更新 (`firestore.rules`)
書き込みや読み取りのアクストークンを持つ場合、「自身のUIDが一致する」ことに加え、**「トークンの `email` が、アクセス先のドキュメントIDと一致する場合」** も許可するようにルールを追加しました。
```javascript
allow read, write: if isOwner(userId) || (request.auth != null && request.auth.token.email == userId);
```

### 2. コンポーネントの責任分解 (`auth-context.tsx`, `auth-guard.tsx`)
`auth-context.tsx` で行われていた「不正な（非Active）ユーザーへの強制ログアウトとリダイレクト処理」をすべて削除し、コンテキストは純粋に **今のユーザーの認証状態（TokenやUserData）を各コンポーネントに伝播するだけの役割** に留めました。

ログアウト機能やアクセスブロックは、フロントエンドのルーティング制御を担う `AuthGuard` コンポーネント（「`status` が `active` でなければ `/login` に弾き返す」）に一任するように設計を変更。
これにより、ログイン完了直後に「Pendingデータ作成」から「管理者への承認メール送信」、そして最終的に「意図してログアウトさせる」までの一連のログイン処理フローが、安全に最後まで実行されるように解消しました。

## 関連ファイル
*   `firestore.rules`
*   `src/lib/auth-context.tsx`
*   `src/components/auth/auth-guard.tsx`
