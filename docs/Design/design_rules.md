# Design Rules & Best Practices: MAJI-RES System

## 1. ディレクトリ構造 (Feature-first Architecture)

機能単位でフォルダを分割し、関連するコンポーネントやロジックを凝集させる「Colocation」を原則とする。

```
app/
  (auth)/           # 認証関連（Route Groups）
    login/
      page.tsx
  (chat)/           # チャット機能
    page.tsx        # メインチャット画面
    _components/    # チャット専用コンポーネント (Client Components)
      chat-input.tsx
      message-bubble.tsx
    _lib/           # チャット専用ロジック
      use-chat-sync.ts
    _actions.ts     # Server Actions
  api/              # Route Handlers (Webhook, System API)
components/         # 汎用共通コンポーネント (Shadcn/UIなど)
  ui/
lib/                # 共通ユーティリティ
  firebase/         # Firebase初期化・型定義
  utils.ts          # cn() など
```

## 2. Next.js & React パターン

### Server Components (RSC) vs Client Components

- **デフォルトは Server Component**: データのフェッチ、機密情報（API Key）の扱いはRSCで行う。
- **Client Component**: `useState`, `useEffect`, ブラウザAPI (`navigator.vibrate`), イベントリスナーが必要な場合のみ `'use client'` を付与する。
- **Composition**: Client Componentの下に直接Server Componentをimportせず、`children` propとして渡すパターンを推奨（再レンダリング抑制）。

### Server Actions

- データの更新（Mutation）は基本的に **Server Actions** を使用する。
- API Route (`app/api/...`) は外部Webhook受信や、Streaming以外の複雑なバックエンド処理が必要な場合に限定する。

## 3. Vercel AI SDK 実装ルール

### ストリーミングとステート管理

- **useChat / useCompletion**: フロントエンドでのチャット状態管理には、Vercel AI SDKのフック (`useChat`) を標準として利用する。
- **StreamData**: エージェントの思考プロセスやメタデータ（シンクロ率など）は、テキストストリームとは別の `StreamData` として送信し、クライアント側でパースする。

### エージェントロジック

- **Edge Runtime**: 可能な限りVercel Edge FunctionsでLLMを呼び出し、レイテンシを最小化する。ただしFirebase Admin SDKなどNode.js依存がある場合はServerless Functionsを利用する。

## 4. Firebase & データ管理

### クライアントサイド (Client SDK)

- **リアルタイム同期**: ユーザーへの即時フィードバックが必要な箇所（チャットログ、他エージェントの反応）は `onSnapshot` を使用する。
- **Firebase Auth**: `useAuth` フックを作成し、認証状態をContextで管理する。

### サーバーサイド (Admin SDK)

- **特権アクセス**: Server Actions内でのDB操作は `firebase-admin` を使用し、Security Rulesをバイパスして確実な書き込みを行う。

### 環境変数

- `NEXT_PUBLIC_FIREBASE_...`: クライアント用設定のみ。
- `FIREBASE_SERVICE_ACCOUNT_...`: サーバー用（秘密鍵など）。絶対に `NEXT_PUBLIC_` を付けない。

## 5. Styling & UI (Tailwind + Shadcn)

### コンポーネント設計

- **Shadcn/UI**: `components/ui` 配下のコンポーネントを基本要素として組み立てる。カスタマイズは直書きせず、`variants` (cva) を拡張する形で行う。
- **Tailwind CSS**:
  - スタイルはクラス名で完結させる。
  - 条件付きスタイルには `cn()` ユーティリティ（clsx + tailwind-merge）を必ず使用する。
  - マジックナンバー（`w-[123px]`など）を避け、デザインシステムのトークン（`w-4`, `p-6`）を使用する。

### モバイル最適化

- **Touch Action**: モバイルでのスワイプ誤爆を防ぐため、必要な要素には `touch-action-manipulation` などを適用する。
- **Dvh (Dynamic Viewport Height)**: モバイルブラウザのアドレスバー考慮のため、`h-screen` の代わりに `h-dvh` (small `s` or dynamic `d` viewport height classes) を適宜利用する。

## 6. コーディング規約

- **TypeScript**: `any` 型の使用を原則禁止。Zodを使って外部データのバリデーションと型推論を行う。
- **Naming**:
  - Component: `PascalCase` (e.g. `ChatBubble`)
  - File: `kebab-case` (e.g. `chat-bubble.tsx`)
  - Function/Variable: `camelCase`
- **Error Handling**: 非同期処理は `try-catch` で囲み、エラー時はUIにToast (`sonner`) でフィードバックを表示する。
