# Changelog

All notable changes to this project will be documented in this file.

## [1.7.0] - 2026-03-07

### Added
- **ユーザーごとの月間APIトークン使用量トラッキング・表示機能**:
  - Vercel AI SDK の `usage` プロパティを活用し、各エージェントおよび統合エージェントのトークン消費量を抽出する仕組みを `base-agent.ts`, `integrator.ts` に実装。
  - Firestore に `users/{uid}/tokenUsage/{YYYY-MM}` サブコレクションを作成し、月単位の消費トークン量を記録する `TokenUsageService` を追加。並行処理の競合を防ぐため `FieldValue.increment` を採用してアトミック性を確保。
  - バックエンドAPIルート（`/api/magi/stream`）にて合算処理とFirestoreへの非同期ログ記録処理を追加。
  - Firestore セキュリティルール（`firestore.rules`）を更新し、`tokenUsage` のクライアント側書き込みを禁止、読み取りは本人のみに制限することでセキュアな設計を遵守。
  - 管理用ダッシュボード（`/admin`）にて、ユーザー一覧と共に「今月のトークン使用量」を一覧表示可能にするUIならびにAPI（`getAllUsersAdmin`）の拡張を追加。
  - 関連するユニットテスト (`token-usage-service.test.ts`) を追加。

### Fixed
- **プリセット選択エラーの修正**: `src/components/preset/preset-context.tsx` からの `/api/presets` リクエスト時、Firebase Auth トークン（`Authorization: Bearer <token>`）が付与されず 401 Unauthorized になり、プリセットが空欄となるUIバグを修正。

## [1.6.0] - 2026-03-07

### Added
- **課金/無料ユーザーによるエージェント処理モード切替機能** (Issue 003 部分対応):
  - `ProcessingMode` 型（`"serial"` | `"parallel"`）を `types.ts` に追加。
  - `AgentIntegrator.process` メソッドに `mode` 引数を追加し、`processParallel`（`Promise.all` による同時実行）と `processSerial`（forループ + 2000ms遅延）に処理を分離。
  - `route.ts` でユーザーの `role`（`admin` → `parallel`, `user` → `serial`）に基づくサーバーサイドでのモード自動判定を実装。
  - `integrator.test.ts` にモード切替テスト4件（デフォルトserial、明示serial、parallel、parallelエラーハンドリング）を追加。

### Changed
- `AgentIntegrator.parallelProcess` メソッドを `process` にリネーム（直列/並列の両方を扱うため命名を改善）。
- `processSerial` メソッドのインデントを2スペースに統一（コードスタイル修正）。

## [1.5.2] - 2026-03-03

### Added
- **管理者画面からのロール変更機能**:
  - Active Usersセクションに「Admin に昇格」/「User に降格」ボタンを追加。自分自身のロール変更は不可（ボタン非表示）。
  - ダウングレード（`admin` → `user`）時にサーバーサイド（Admin SDK）で超過スレッド・メッセージを自動削除する機能を実装。
  - 降格時は確認ダイアログで上限変更内容とデータ削除の警告を表示。削除結果（件数）をアラートで通知。
  - Firestoreバッチ書き込みの500件制限に対応したチャンク分割処理を実装。
  - `admin-users.ts` に `updateUserRoleAdmin()` 関数を追加。
  - `/api/admin/users` PATCH エンドポイントに `action: "updateRole"` 対応を追加（既存のステータス変更と後方互換）。
  - ロール変更中のボタン無効化（ローディング状態）でダブルクリック防止。

## [1.5.1] - 2026-03-02

### Added
- **スレッドのプリセット紐づけ・自動復元**:
  - 新規チャット作成時に選択されたプリセット構成をFirestoreのスレッドデータ(`presetId`)として永続化する機能を追加。
  - 過去のスレッド（履歴）を開いた際、そのスレッドを作成した当時のプリセットに自動で切り替わる「コンテキスト同期」を実装。

### Changed
- **`useMagiChat` フックの関心の分離 (リファクタリング)**:
  - 状態管理とREST API通信が肥大化していたため、責務ごとにフックを分割。
  - `useChatSession`: メッセージ配列のローカル状態管理、履歴からのスレッドデータ復元、MAGI情報（同期率など）の算出を担当。
  - `useMagiStream`: Server-Sent Eventsのパース処理、ストリーミングデータとプロトコルの解析を担当。
  - `useMagiChat`: 分割された上記2つの機能を合成（Compose）し、UIレイヤーにオーケストレーションを提供するだけの軽量なフックに変更。

## [1.5.0] - 2026-03-01

### Added
- **システムリソース保護のためのユーザー利用制限機能**:
  - 一般ユーザー（`user`）と管理者（`admin`）のロールに基づき、作成可能なスレッド数および1スレッドあたりのメッセージ数に上限を設定。
  - スレッド数が上限に達した状態で新規チャットを開始した場合、最も古いスレッド（最終更新日時が最古のもの）とそのメッセージを自動削除するクリーンアップ処理を実装。
  - メッセージ数が上限に達した場合はエラー（`MESSAGE_LIMIT_REACHED`）とし、トースト通知で新しい会話の作成を促すUIUXを追加。
  - 上限値の定義を `src/lib/constants/limits.ts` に集約し、環境変数（`NEXT_PUBLIC_ADMIN_THREAD_LIMIT` 等）から動的に設定可能な設計に変更（デフォルト値付き）。

## [1.4.0] - 2026-03-01

### Added
- **システム利用の制限（承認制）とAdminダッシュボードの追加**:
  - `role: "admin"` を持つユーザー専用の管理ダッシュボード（`/admin`）を実装。
  - 新規ログインしてきた未登録ユーザーを `status: "pending"` としてFirestoreに留め置き、自動ログアウトさせる機能を追加。
  - 管理画面から対象ユーザーを `active` に切り替えるステータス更新APIを実装。
- **管理者への自動承認リクエスト通知**:
  - Nodemailer と Gmail SMTP を用いて、新規登録時に管理者へ承認依頼メールを送信する機能を追加（外部サービス登録が不要な完全無料構成）。
  - メール内のリンク（`/?user=...`）から管理画面へ飛んだ際に、対象ユーザーへ自動スクロールするUIを追加。

### Changed
- 新規ユーザー作成とそれに伴うメール送信処理を、クライアント側からバックエンドのセキュアなエンドポイント（BFF：`/api/auth/register-pending`）に統合。
- ログインボタン（UI）が抱えていたビジネスロジックを `useLogin` カスタムフックとして抽出（関心の分離）。

### Fixed
- Firestoreのセキュリティルール（`firestore.rules`）を修正し、ドキュメントIDをメールアドレスとした際の `Permission Denied` エラーを解消。
- ログイン時の強制ログアウト処理の競合によって発生していたローディングのフリーズ（無限ロード）問題を解消（Issue 007）。

## [1.3.2] - 2026-02-27

### Added
- **条件付き(CONDITIONAL)判定時の統合エージェントスキップ機能を追加**: 3エージェントの投票結果で多数決が成立せず `CONDITIONAL` となった場合、統合エージェントの生成処理をスキップし、クラリフィケーション質問のみを即座に提示するように変更（レスポンス待ち時間の短縮と UX 向上）。
- Clarification（追加質問）UIに「回答する」インラインボタンを追加。クリックでチャット入力欄に質問がプリセットされる。
- 質問が2つ以上の場合に「すべてに回答する」一括プリセットボタンを追加。番号付きテンプレートで全質問を入力欄にセット。
- `clarification-display.test.ts`: `collectClarificationQuestions` 関数の8テストケースを追加。

### Changed
- 多数決判定ロジック(`determineDecision`)を `route.ts` などのハードコードから `Integrator` クラスへ抽出し、DRY原則を適用。

### Changed
- `ClarificationDisplay` の質問収集ロジックを `collectClarificationQuestions` 純粋関数に抽出（テスタビリティ向上）。
- `ChatView` の入力プリフィル＆フォーカスロジックを `setInputAndFocus` ヘルパーに統合（DRY改善）。
- `ChatInput` が外部 `textareaRef` を受け取れるよう Props 拡張。

### Improved
- Clarification ボタンに `aria-label` を追加（アクセシビリティ向上）。

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
