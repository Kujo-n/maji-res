# Changelog

All notable changes to this project will be documented in this file.

## [1.2.0] - 2026-02-15

### Added
- エージェント定義をプリセットフォルダ方式 (`config.json`) で設定可能に。
- 環境変数 `AGENT_PRESET` によるプリセット切り替え機能。
- `ConfigurableAgent` 汎用クラスによる動的エージェント生成。
- `prompt-loader.ts` にエラーハンドリング・バリデーション・プリセット対応を追加。

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
