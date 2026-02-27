---
title: "MAGIストリーミング回答の消失と認証トークンエラー"
status: closed
created_at: 2026-02-24T23:54:00+09:00
---

# 概要
統合エージェント（MAGI）の回答が画面に表示されないデータ欠損問題と、その修正後のローカルテスト中に発生した「Invalid or expired authentication token」エラーについて、それぞれの原因と解決策を記録します。

# Issue 1: ストリーミングチャンクの分割による回答データの消失
## 症状
フロントエンドでMAGIの回答を受信中、回答テキストやVERDICTの判定結果が部分的に、もしくは完全に画面にレンダリングされない。

## 原因
`src/hooks/use-magi-chat.ts` において、APIからのストリーミング結果（`0:"テキスト"\n` 等の形式）を受信する際、ネットワークのパケット（チャンク）が任意のサイズで不規則に分割されて届く状態でした。
従来のコードではチャンクを受け取るたびに即座に `\n` で分割して `JSON.parse` を行っていたため、行の途中で分割された不完全なJSON文字列がパースエラーとなり、エラーとなったテキストデータが静かに破棄（消失）されていました。

## 対応方針と結論
**ストリームバッファの実装（解決済）**
パケットの分断耐性を持たせるため、不完全な行（チャンクの尻切れ）を一時的に保持する `streamBuffer` 変数を導入しました。
改行コード（`\n`）が届くまでバッファにデータを蓄積し、完全な1行のデータになってから `JSON.parse` を実行するように処理を修正。これによりデータのサイレントな欠損を完全に防ぐことができました。

---

# Issue 2: Firebase Admin SDK初期化失敗に伴うAPI認証エラー
## 症状
ローカル環境で開発サーバー起動時およびチャット送信時に、コンソールに以下のエラーが表示され、APIの呼び出しが401 (Unauthorized) となる。
- `Firebase Admin initialization failed: SyntaxError: Expected property name or '}' in JSON`
- `[auth] Token verification failed: ...`
- `Error: MAGIとの通信に失敗しました。({"error":"Invalid or expired authentication token"})`

## 原因
マシンのローカル環境変数ファイル（`.env.local`）に記述された `FIREBASE_SERVICE_ACCOUNT_KEY` の値が、改行を含む複数行のJSONフォーマットで記述されていたり、全体がクォーテーションで適切に囲まれていなかったことが原因です。
これにより、サーバー起動時（`src/lib/firebase/admin.ts`）に環境変数の `JSON.parse()` が失敗し、Firebase Admin SDK が正常に初期化されていませんでした。結果として、APIルートでのトークン検証処理（`verifyIdToken`）が軒並みエラーとなっていました。

## 対応方針と結論
**環境変数の記述フォーマット修正（解決済）**
`.env.local` の `FIREBASE_SERVICE_ACCOUNT_KEY` の値を、**改行を全て削除した「1行のJSON文字列」とし、値全体をシングルクォート（`'`）で囲む**形式に修正しました。（例: `FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account", ...}'`）
サーバーの再起動後、Admin SDK の初期化処理が正常に通過するようになり、APIの認証エラーも解消されました。

## 関連ファイル
- `src/hooks/use-magi-chat.ts`
- `src/lib/firebase/admin.ts`
- `src/lib/security/auth-guard.ts`
