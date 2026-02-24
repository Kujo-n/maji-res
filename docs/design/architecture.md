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
    
    par Parallel Processing
        O->>M: Analyze (Logic)
        O->>B: Analyze (Ethics)
        O->>C: Analyze (Intuition)
    end
    
    M-->>O: Response + Vote
    B-->>O: Response + Vote
    C-->>O: Response + Vote
    
    O->>I: Synthesize Responses
    I->>I: Calculated Sync Rate
    I->>I: Determine Verdict (Majority Vote)
    I-->>O: Final Response + Verdict
    
    O-->>U: Stream Result
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
        [*] --> ReceivingText
        ReceivingText --> ReceivingData: Protocol 2 (Data)
        ReceivingData --> ReceivingText: Protocol 0 (Text)
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
    
    Orch -- "Parallel Exec" --> Agents
    Agents -- "Thoughts & Votes" --> Integ
    Integ -- "Synthesized Response" --> Orch
    
    Orch -- "Stream (Text + JSON)" --> Hook
    Hook -- "Update State" --> UI
    
    Orch -- "Async Write" --> DB
    Hook -.-> |"Load History"| DB
```

### 3. Persistence (Firestore Structure)

```
users/{userId}/
  threads/{threadId}/
    title: string
    createdAt: Timestamp
    updatedAt: Timestamp
    messages/{messageId}/
      role: "user" | "assistant"
      content: string
      timestamp: Timestamp
      metadata?: { syncRate, decision, agentResponses }
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

APIエンドポイントに対する多層防御を実装。

```mermaid
flowchart LR
    Req["Client Request"] --> RL["Rate Limiter<br/>(10req/min per IP)"]
    RL -->|Pass| Auth["Auth Guard<br/>(Firebase ID Token)"]
    RL -->|Reject| R429["429 Too Many Requests"]
    Auth -->|Pass| Val["Input Validation<br/>(type, length, sanitize)"]
    Auth -->|Reject| R401["401 Unauthorized"]
    Val -->|Pass| API["API Handler"]
    Val -->|Reject| R400["400 Bad Request"]
```

| レイヤー | 実装 | 内容 |
|:---|:---|:---|
| **レート制限** | `rate-limiter.ts` | IP+パスごとに 10req/min（インメモリ） |
| **認証** | `auth-guard.ts` | Firebase Auth IDトークン検証 |
| **入力検証** | 各 API route | メッセージ型・長さ（10,000文字上限） |
| **パストラバーサル防止** | `prompt-loader.ts` | プリセット名・ファイル名のサニタイズ |
| **情報漏洩防止** | `stream/route.ts` | 本番環境でスタックトレースを除外 |
