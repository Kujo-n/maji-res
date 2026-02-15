# Ticket: [I-001] Vercel環境で履歴が表示されない

## 基本情報

- **ID**: I-001
- **作成日**: 2026-02-15
- **解決日**: 2026-02-15
- **ステータス**: ✅ 解決済
- **重要度**: 🔴 高
- **カテゴリー**: バグ / 環境依存

## 概要

ローカル環境（`npm run dev`）ではチャット履歴がサイドバーに正常に表示され、クリックして過去の会話をロードできるが、Vercelにデプロイされた環境では履歴が表示されない（空になる）。

## 原因調査

### 仮説
1. **環境変数の欠落**: `NEXT_PUBLIC_FIREBASE_...` がVercelに設定されていない。
2. **認証ドメイン許可 (Authorized Domains)**: Firebase Authentication の設定で、Vercelのデプロイドメインが許可されていない。
3. **DBの参照先違い**: ローカルがEmulator、VercelがProductionを見ている（実際は両方Production設定だった）。

### 調査結果
ユーザーによる確認の結果、**仮説2（認証ドメイン許可）** が原因であることが判明した。
Authorized Domains に Vercel のドメインが含まれていなかったため、ログインセッションが正常に確立されず（あるいはFirestoreへのアクセス権限が拒否され）、データが取得できていなかった。

## 対応内容

- Firebase Console > Authentication > Settings > Authorized domains にて、Vercelのドメインを追加。

## 確認

ご報告により、設定追加後に履歴が表示されるようになったことを確認。

---
**関連ファイル**:
- `src/lib/firebase/client.ts`
- `src/components/layout/sidebar.tsx`
