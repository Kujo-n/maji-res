---
name: "Create Tests"
description: "Guidelines and procedures for creating robust Vitest unit tests for the MAJI-RES project"
---

# テスト作成スキル (Create Tests)

このスキルは、MAJI-RES プロジェクトにおいて堅牢で保守性の高い Vitest ベースのユニットテストを作成・修正するための手順とベストプラクティスを定義します。テストのカバレッジ目標（90%）を維持・達成するための指針となります。

## 1. テストフレームワークと基本構成

- **フレームワーク**: Vitest
- **対象**: 主に Next.js App Router の API Route (`route.ts`) や共通ライブラリ (`lib/*.ts`)
- **ファイル命名規則**: テスト対象ファイルの隣に `<ファイル名>.test.ts` を配置します。(例: `route.ts` のテストは `[該当エンドポイント名]-route.test.ts` など文脈に応じて命名しますが、基本は機能名を含めます)

## 2. モック(Mock)作成のベストプラクティス

テスト間の状態汚染（State Leakage）を防ぐための重要なルールです。

### 2.1 モックの初期化とリセット

テスト開始前に必ずモックの状態をクリーンにしてください。

```typescript
import { vi, beforeEach } from "vitest";

beforeEach(() => {
  vi.clearAllMocks();
  // 共通のデフォルトモックの返り値をここで設定する
  vi.mocked(checkRateLimit).mockReturnValue(null);
  vi.mocked(verifyAuth).mockResolvedValue({ uid: "test-user" });
});
```

- `afterEach` 内で `vi.restoreAllMocks()` を不用意に使うと、`vi.mock()` での初期化ごと吹き飛ぶ挙動の原因になることがあります。基本は `beforeEach` で `vi.clearAllMocks()` を呼び、都度必要なデフォルト返り値を再設定するスタイルを推奨します。

### 2.2 mockResolvedValueOnce の取り扱い注意

`mockResolvedValueOnce` は強力ですが、1つのテスト(itブロック)内で複数回呼び出される関数の処理順序を誤ると、次のテストにモックが「漏れる」原因となります。
対象の関数が内部で何回呼び出されるか（例：`verifyAuth` 用チェックと実処理用など）を正確に把握してモック定義を行ってください。

```typescript
// 悪い例: route.ts 内部で2回呼ばれているのに1回しかOnce指定していない場合、次のテストの1回目の呼び出しにおかしな値が返る。

// 良い例: まとめて連続指定する（チェイン）か、恒久的な mockResolvedValue を使う。
vi.mocked(getAdminUserData)
  .mockResolvedValueOnce({ email: "admin@example.com", role: "admin" })  // 1回目 (auth)
  .mockResolvedValueOnce({ email: "target@example.com", role: "user" }); // 2回目 (target)
```

## 3. NextRequest のモック方法

API Route のテストでは、NextRequest を簡単に生成できるヘルパー関数を各テストファイル内に作成します。

```typescript
import { NextRequest } from "next/server";

function createRequest(method: string = "GET", body?: object): NextRequest {
  const init: RequestInit = { method };
  if (body) {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(body);
  }
  return new NextRequest(new URL("http://localhost/api/test"), init);
}
```

## 4. エラーケース（例外ルート）のカバレッジ

カバレッジ目標 90% を達成するためには、API ルートの外側の `catch (error)` ブロックや内部関数での `throw Error` もテストする必要があります。

- **Outer Catch のテスト**: ルートの最初にある `req.json()` が失敗（パースエラー等）するようにモックすることで、大外の HTTP 500 Route エラーを簡潔にテスト可能です。
  ```typescript
  it("returns 500 on outer internal error", async () => {
    const req = createRequest("POST", { message: "Hello" });
    req.json = vi.fn().mockRejectedValueOnce(new Error("Parse error"));
    
    const response = await POST(req);
    expect(response.status).toBe(500);
  });
  ```
- **Stream/Generator 内部エラーのテスト**: 例外が ReadableStream の内部 `start()` コントローラに渡される場合などは、実際にレスポンスの Body を ReadableStream として読み出そうとしたときに Promise が Reject するかをアサーションします。
  ```typescript
  const reader = response.body!.getReader();
  await expect(reader.read()).rejects.toThrow();
  ```

## 5. テスト実行とカバレッジ測定コマンド

1. **個別ファイルのデバッグ実行**:
   ```bash
   npx vitest run src/path/to/some.test.ts
   ```
2. **全体テストとカバレッジの算出**:
   ```bash
   npx vitest run --coverage
   ```
   ※ 本プロジェクトでは Statements, Functions, Lines, Branches いずれも 90% 以上のカバレッジを目標とします（ただし設定上 75% 特例のファイルなどもありますので `vitest.config.ts` に従う）。
