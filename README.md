# MAJI-RES: Multi-Agent Group Intelligence Response System

> **注意**: このプロジェクトは「新世紀エヴァンゲリオン」に登場するスーパーコンピュータ「MAGI」システムにインスパイアされた、3賢者合議AIチャットボットです。

## 概要

MAJI-RES は、3つの異なる人格を持つAIエージェント（Melchior, Balthasar, Casper）が並列で思考し、その結果を統合して最適な回答を導き出すシステムです。Next.js (App Router) と Vercel AI SDK を用いて構築され、リアルタイムのストリーミング応答と直感的なUIを提供します。

### 特徴

- 🧠 **3賢者エージェント**:
  - **MELCHIOR (科学者)**: 論理的・客観的な視点。
  - **BALTHASAR (母)**: 倫理的・道徳的な視点。
  - **CASPER (女)**: 直感的・側面的視点。
- ⚖️ **合議と統合**: 各エージェントの意見を集約し、矛盾を解決して最終的な結論（可決/否決/条件付き）を下します。
- 🌊 **ストリーミングUI**: 思考プロセスと回答生成をリアルタイムで可視化。
- 📱 **PWA対応**: モバイル（iOS/Android）でのインストールに対応し、ネイティブアプリのような操作感（ハプティクス、オフライン対応）。
- 💾 **履歴保存**: Firestoreによるチャット履歴の永続化と同期。

## 技術スタック

- **Frontend**: Next.js 15 (App Router), React, Tailwind CSS, Shadcn/UI
- **AI/LLM**: Vercel AI SDK, Google Gemini 1.5 Pro/Flash
- **Backend/DB**: Firebase (Firestore, Auth)
- **Deployment**: Vercel
- **Testing**: Playwright (E2E)

詳細な技術選定理由は [docs/design/tech_stack.md](docs/design/tech_stack.md) を参照してください。

## セットアップ

### 前提条件

- Node.js 18以上
- Firebase プロジェクト (Firestore, Authentication有効化)
- Google AI Studio API Key (GEMINI_API_KEY)

### インストール

```bash
# リポジトリのクローン
git clone https://github.com/your-username/maji-response.git
cd maji-response

# 依存関係のインストール
npm install
```

### 環境変数

`.env.local` ファイルを作成し、以下の変数を設定してください。

```env
# Google Gemini API
GOOGLE_GENERATIVE_AI_API_KEY=your_api_key_here

# Firebase Client SDK
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
# ... (その他のFirebase設定)

# Firestore Admin SDK (サーバーサイド用)
FIREBASE_SERVICE_ACCOUNT_PROJECT_ID=...
FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL=...
FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY=...
```

### 開発サーバー起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) にアクセスしてください。

## テスト

```bash
# E2Eテスト (Playwright)
npm run test:e2e
```

## ドキュメント

- [CHANGELOG.md](CHANGELOG.md): 更新履歴
- [docs/requirements/spec.md](docs/requirements/spec.md): 仕様書
- [docs/design/architecture.md](docs/design/architecture.md): アーキテクチャ構成
- [docs/design/design_rules.md](docs/design/design_rules.md): デザインルール・コーディング規約
- [docs/operations/setup_guide.md](docs/operations/setup_guide.md): 環境構築・デプロイ手順書

## ライセンス

MIT
