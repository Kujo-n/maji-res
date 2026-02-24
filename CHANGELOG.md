# Changelog

All notable changes to this project will be documented in this file.

## [1.3.1] - 2026-02-24

### Fixed
- チャット送信時にMELCHIOR/BALTHASAR/CASPERの回答・VERDICT・シンクロ率が消える不具合を修正。MAGI審議情報を各アシスタントメッセージに紐づけて永続表示する構造に変更。

### Changed
- `Message` 型に `syncRate`, `contradiction` フィールドを追加。
- `ContradictionInfo` 型を `types/index.ts` に共通定義し、`contradiction-display.tsx` および `chat-service.ts` から参照（DRY原則）。
- MAGI審議結果の表示ロジックを `MagiDeliberation` コンポーネント（`React.memo`）に抽出。
- `useMagiChat` のトップレベルステートを6個→2個に削減し、派生データは `useMemo` で導出。
- `ChatService` で `syncRate`/`contradiction` をFirestoreに永続化。

### Added
- `findLastAssistantMessage` 純粋関数のユニットテスト（5ケース）。

## [1.3.0] - 2026-02-24

### Added
- 新プリセット `MAJI-RES`（肯定的・批判的・中立的の3視点構成）を追加。
- `prompt-loader.ts` に `loadPresetPromptTemplate` 関数を追加。
- `rate-limiter.ts`: IPベースのAPIレート制限（10req/min）を追加。
- `auth-guard.ts`: Firebase Auth IDトークンによるAPI認証を追加。

### Changed
- 統合プロンプト（`synthesize.md`, `stream-synthesize.md`）を共有ファイルから各プリセットフォルダへ移動し、プリセットごとに個別定義する構成に変更。
- `integrator.ts` をプリセット対応の統合プロンプト読み込みに変更。
- デフォルトプリセットフォルダ名を `default` → `MAGI` に変更。

### Security
- パストラバーサル対策: プリセット名・ファイル名のサニタイズ関数を追加（`sanitizeName`, `sanitizeFilename`）。
- スタックトレース漏洩防止: 本番環境でエラー詳細をレスポンスから除外。
- メッセージ長制限: API入力を最大10,000文字に制限。
- APIレート制限: IPアドレスごとの リクエスト数制限を導入。
- API認証: Firebase Auth IDトークン検証を全APIルートに適用。

## [1.2.0] - 2026-02-15

### Added
- エージェント定義をプリセットフォルダ方式 (`config.json`) で設定可能に。
- 環境変数 `AGENT_PRESET` によるプリセット切り替え機能。
- `ConfigurableAgent` 汎用クラスによる動的エージェント生成。
- `prompt-loader.ts` にエラーハンドリング・バリデーション・プリセット対応を追加。
- `config.json` の `defaultModel` フィールドで使用LLMモデルを一括変更可能に。エージェント個別の `model` 指定によるオーバーライドにも対応。
- マルチプロバイダー対応: `config.json` の `provider` フィールドで Google / OpenAI / Anthropic を切り替え可能に。

### Changed
- `AgentRole` 型を `WellKnownRole | (string & {})` に変更し、拡張性を確保。
- `integrator.ts` のエージェント数依存ロジックを動的化（`this.agents.length` ベース）。

### Removed
- 個別エージェントクラス (`MelchiorAgent`, `BalthasarAgent`, `CasperAgent`) を廃止。`ConfigurableAgent` に統一。

## [1.1.0] - 2026-02-15

### Added
- エージェントプロンプトをマークダウン外部ファイル化 (`src/lib/agents/prompts/*.md`)。
- プロンプトローダーユーティリティ (`prompt-loader.ts`) を新規作成。
- 全プロンプトおよび投票ルールを日本語化。

### Changed
- `stream/route.ts` のランタイムを Edge から Node.js に変更（ファイルシステムアクセス対応）。
- エージェント・Integrator を外部プロンプト読み込みに変更。

### Fixed
- NewChat画面の入力欄がスクロールせず表示されるよう修正 (`h-dvh` → `h-full`)。

## [1.0.0] - 2026-02-10

### Added

#### Phase 1: Project Setup & UI Foundation
- Initialized Next.js 15 project with TypeScript and Tailwind CSS.
- Integrated Shadcn/UI components (Button, Card, ScrollArea, Avatar, etc.).
- Set up Vercel AI SDK for LLM communication.
- Configured Google Gemini API integration.

#### Phase 2: Agent System Foundation
- Implemented MAGI architecture with 3 distinct agents:
  - **MELCHIOR** (Scientific/Logical)
  - **BALTHASAR** (Motherly/Ethical)
  - **CASPER** (Intuitive/Lateral)
- Created `MagiOrchestrator` to manage parallel agent execution.
- Implemented `AgentIntegrator` for response synthesis.

#### Phase 3: Chat Interface & Streaming
- Developed real-time chat UI with `useMagiChat` hook.
- Implemented `LayeredStack` to visualize agent thought processes.
- Added support for Markdown rendering in responses.
- Implemented streaming response handling (Text & Data streams).

#### Phase 4: Decision System & Persistence
- Integrated Firebase (Firestore) for data persistence.
- Implemented decision voting logic (Approve/Deny/Conditional).
- Added `SyncRateDisplay` to visualize agent consensus.
- Implemented `DecisionService` to save and retrieve chat history and verdicts.

#### Phase 5: Mobile Optimization & PWA
- Optimized UI for mobile devices (Responsive Design).
- Configured PWA manifest (`manifest.json`) and icons.
- Implemented Service Worker using `next-pwa` for offline capabilities.
- Added Haptic Feedback API integration for mobile interactions.
- Optimized touch gestures and tap targets.

#### Phase 6: Quality Assurance & Release
- Comprehensive linting and type checking (Fixed issues in `decision-service.ts`, `use-magi-chat.ts`, etc.).
- Verified production build (`npm run build`).
- Prepared for deployment on Vercel.

### Fixed
- Resolved linting errors in API routes and UI components.
- Fixed `useEffect` dependency warnings in custom hooks.
- Corrected type definitions for agent responses and orchestrator.
