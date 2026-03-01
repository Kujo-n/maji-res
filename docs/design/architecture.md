# MAJI-RES Architecture

## Overview

MAJI-RES は、3つの異なるAIエージェントによる合議制システムを採用したチャットアプリケーションです。 Next.js, Firebase, Vercel AI SDK を組み合わせ、リアルタイム性と堅牢性を両立させています。

## System Architecture

```mermaid
graph TD
    Client["Client (PWA)"]
    Vercel["Vercel Serverless Function"]
    Firebase["Firebase (BaaS)"]
    Gemini["Google Gemini API"]

    subgraph "Frontend Layer (Next.js)"
        Client -- "HTTPS / WebSocket" --> Vercel
        Client -- "Read/Write" --> Firebase
    end

    subgraph "Orchestration Layer"
        Vercel -- "Agent Prompts" --> Gemini
        Gemini -- "Stream Response" --> Vercel
        Vercel -- "Stream Response" --> Client
    end

    subgraph "Persistence Layer"
        Firebase -- "Auth" --> Client
        Firebase -- "Firestore (Decisions)" --> Vercel
    end
```

## Agent System Logic

MAJI-RES の中核となるエージェントシステムの内部ロジックです。

> **Note**: エージェントの構成は `src/lib/agents/prompts/<preset>/config.json` で定義されており、
> 環境変数 `AGENT_PRESET` でプリセットを切り替えることで、エージェントの名前・ロール・プロンプトを変更できます。
> `defaultModel` でLLMモデルを一括指定し、エージェント個別の `model` で上書きすることも可能です。
> 統合プロンプト（`synthesize.md`, `stream-synthesize.md`）もプリセットごとに個別定義されています。

```mermaid
sequenceDiagram
    participant U as User
    participant O as Orchestrator
    participant M as Agent A
    participant B as Agent B
    participant C as Agent C
    participant I as Integrator
    participant DB as Firestore

    U->>O: Send Message
    
    rect rgb(200, 220, 240)
    Note over O, C: Rate Limit Avoidance (Serial Execution)<br/>See Issue 003 for future parallelization
    O->>M: Analyze (Logic)
    M-->>O: Text Stream (Chunks)
    O-->>U: Protocol 2: Partial Text Updates
    M-->>O: Final Response + Vote
    O->>B: Analyze (Ethics)
    B-->>O: Text Stream (Chunks)
    O-->>U: Protocol 2: Partial Text Updates
    B-->>O: Final Response + Vote
    O->>C: Analyze (Intuition)
    C-->>O: Text Stream (Chunks)
    O-->>U: Protocol 2: Partial Text Updates
    C-->>O: Final Response + Vote
    end
    
    O->>I: Synthesize Responses (Start)
    I->>I: Calculated Sync Rate
    I->>I: Determine Verdict (Majority Vote)
    O-->>U: Protocol 2: Final AgentResponses + SyncRate

    alt Verdict is CONDITIONAL
        I-->>O: Skip Synthesis
        O-->>U: Protocol 0: VERDICT: CONDITIONAL
    else Verdict is APPROVE or DENY
        I-->>O: Synthesis Stream
        O-->>U: Protocol 0: Text Stream + VERDICT
    end
    
    O->>DB: Save Transaction (Async)
```

## Data Flow & State Management

### 1. Chat State Machine (Client-Side)

```mermaid
stateDiagram-v2
    [*] --> Idle
    Idle --> Sending: User Input
    Sending --> Streaming: API Request
    
    state Streaming {
        [*] --> ReceivingStream
        ReceivingStream --> ReceivingData: Protocol 2 (Partial AgentResponses)
        ReceivingData --> ReceivingStream
        ReceivingStream --> ReceivingText: Protocol 0 (Synthesis Text)
        ReceivingText --> ReceivingStream
        ReceivingText --> Rendering
        ReceivingData --> Rendering
    }
    
    Streaming --> Verification: Stream Complete
    Verification --> DisplayVerdict: Verdict Found
    Verification --> DisplayError: No Verdict / Error
    
    DisplayVerdict --> Idle: Transaction Saved
    DisplayError --> Idle
```

### 2. Data Flow Diagram (DFD)

```mermaid
flowchart LR
    User[("User Input")]
    
    subgraph Client
        UI[Chat UI]
        Hook[useMagiChat]
    end
    
    subgraph Server["Next.js Handler"]
        Orch[Orchestrator]
        Agents[Melchior/Balthasar/Casper]
        Integ[Integrator]
    end
    
    subgraph Database
        DB[(Firestore)]
    end
    
    User --> UI
    UI --> Hook
    Hook -- "POST /api/magi/stream" --> Orch
    
    Orch -- "Serial Exec with Delay" --> Agents
    Agents -- "Text Chunks" --> Orch
    Orch -- "Protocol 2 (DataStream)" --> Hook
    Agents -- "Final Thoughts & Votes" --> Integ
    Integ -. "Synthesized Response (if APPROVE/DENY)" .-> Orch
    
    Orch -- "Protocol 0 (TextStream) / VERDICT only" --> Hook
    Hook -- "Update State progressively" --> UI
    
    Orch -- "Async Write" --> DB
    Hook -.-> |"Load History"| DB
```

> **Note on Future Parallelization**:
> 現在のAPIルートはGemini Flashの無償枠制限（RPM制限）を回避するため、直列処理と2000msの待機時間を設けています。この制限を撤廃し完全並列化する将来対応については [Issue 003](../issues/003_parallel_streaming_with_paid_api.md) を参照してください。

### 3. Persistence (Firestore Structure)

```
allowlist/
  {email}/
    status: "active" | "pending"
    role: "user" | "admin"
    name: string
    createdAt: Timestamp
    activatedAt?: Timestamp

users/{userId}/
  threads/{threadId}/
    title: string
    createdAt: Timestamp
    updatedAt: Timestamp
    messages/{messageId}/
      role: "user" | "assistant"
      content: string
      createdAt: Timestamp
      verdict?: "APPROVE" | "DENY" | "CONDITIONAL"
      agentResponses?: AgentResponse[]
      syncRate?: number
      contradiction?: ContradictionInfo
```

## PWA & Offline Strategy

- **Service Worker**: `next-pwa` を使用し、静的アセット（JS, CSS, Images）をキャッシュ。
- **Offline Indicator**: ネットワーク切断時にUI上で警告を表示。
- **Fallback**: オフライン時はキャッシュされたコンテンツを表示し、アプリの基本動作（履歴閲覧など）を維持。

## Haptic Feedback Support

モバイル体験向上のため、`navigator.vibrate` を使用した物理フィードバックを実装。
- **Send**: Medium vibration
- **Verdict (Approve)**: Success pattern (Triple pulse)
- **Verdict (Deny)**: Error pattern (Double pulse)

## Security

APIエンドポイントに対する多層防御および、BFF（Backend For Frontend）パターンを用いた管理者アクセスの保護を実装しています。

```mermaid
flowchart LR
    Req["Client Request"] --> RL["Rate Limiter<br/>(10req/min per IP)"]
    RL -->|Pass| Auth["Auth Guard<br/>(Firebase ID Token)"]
    RL -->|Reject| R429["429 Too Many Requests"]
    
    Auth -->|Pass /api/magi/*| DBCheck["Status Check<br/>(Firestore: isActive?)"]
    Auth -->|Pass /api/auth/register-pending| BFF["BFF<br/>(Generate Pending Data & Email)"]
    Auth -->|Pass /api/admin/*| AdminCheck["Role Check<br/>(Firestore: role:admin?)"]
    Auth -->|Reject| R401["401 Unauthorized"]
    
    DBCheck -->|Pass| Val["Input Validation<br/>(type, length, sanitize)"]
    DBCheck -->|Reject| R403["403 Forbidden<br/>(Pending User)"]
    
    AdminCheck -->|Pass| AdminAPI["Execute Admin Action"]
    AdminCheck -->|Reject| R403Admin["403 Forbidden"]
    
    Val -->|Pass| API["API Handler"]
    Val -->|Reject| R400["400 Bad Request"]
```

| レイヤー | 実装 | 内容 |
|:---|:---|:---|
| **レート制限** | `rate-limiter.ts` | IP+パスごとに 10req/min（インメモリ） |
| **認証** | `auth-guard.ts` | Firebase Client SDKの状態監視とフロントエンドでのアクセスブロック |
| **BFFによる一括処理** | `/api/auth/register-pending` | 未登録ユーザーへの初回登録時、IDトークン検証完了後にサーバー側でFirestoreデータ作成とNodemailer(Gmail SMTP)による管理者へのメール通知をセキュアに一括実行。 |
| **ユーザー状態** | `users.ts`, `admin-users.ts` | Firestoreから `status: active` および `role: admin` であるか検証（サーバーサイドとクライアントサイドの二重防御） |
| **入力検証** | 各 API route | メッセージ型・長さ（10,000文字上限） |
| **パストラバーサル防止** | `prompt-loader.ts` | プリセット名・ファイル名のサニタイズ |
| **情報漏洩防止** | `stream/route.ts` | 本番環境でスタックトレースを除外 |
