# MAJI-RES 環境構築・デプロイガイド

このドキュメントでは、MAJI-RES システムをゼロから構築し、本番環境（Vercel）にデプロイするまでの手順を詳述します。

## 目次

1. [前提条件](#1-前提条件)
2. [Firebaseのセットアップ](#2-firebaseのセットアップ)
3. [Gemini APIキーの取得](#3-gemini-apiキーの取得)
4. [プロジェクトのセットアップ（ローカル）](#4-プロジェクトのセットアップローカル)
5. [動作確認](#5-動作確認)
6. [本番デプロイ (Vercel)](#6-本番デプロイ-vercel)

---

## 1. 前提条件

以下のツール・アカウントが必要です。

- **Node.js**: v18.17 以降 (推奨: v20 LTS)
- **npm**: Node.jsに同梱
- **Git**: バージョン管理用
- **Google アカウント**: Firebase, Gemini API用
- **GitHub アカウント**: リポジトリ管理・Vercel連携用
- **Vercel アカウント**: ホスティング用

---

## 2. Firebaseのセットアップ

MAJI-RESは、認証(Auth)とデータベース(Firestore)にFirebaseを使用します。

### 2-1. プロジェクト作成
1. [Firebase Console](https://console.firebase.google.com/) にアクセスし、「プロジェクトを追加」をクリックします。
2. プロジェクト名（例: `maji-response-prod`）を入力し、続行します。
3. Google アナリティクスは任意で設定し、プロジェクトを作成します。

### 2-2. Authentication (認証) の有効化
1. 左メニューから **Build** > **Authentication** を選択し、「始める」をクリックします。
2. **Sign-in method** タブで **Google** を選択し、「有効にする」をONにします。
3. プロジェクトのサポートメールアドレスを選択し「保存」します。

### 2-3. Cloud Firestore の有効化
1. 左メニューから **Build** > **Firestore Database** を選択し、「データベースの作成」をクリックします。
2. ロケーション（例: `asia-northeast1` (東京)）を選択します。
3. セキュリティルールはひとまず「本番環境モードで開始」を選択し作成します。

> **注意**: 開発中は以下のルールを適用することで、認証済みユーザーのみ読み書きを許可できます。
> [ルールタブ]で編集:
> ```
> rules_version = '2';
> service cloud.firestore {
>   match /databases/{database}/documents {
>     match /users/{userId}/{document=**} {
>       allow read, write: if request.auth != null && request.auth.uid == userId;
>     }
>   }
> }
> ```

### 2-3-1. セキュリティルールのデプロイ

`firestore.rules` ファイルを本番環境に適用します。2つの方法があります。

**方法A: Firebase CLIを使用する場合（推奨）**

```bash
# firebase-tools のインストール
npm install -g firebase-tools

# ログイン
firebase login

# プロジェクトの初期化（Firestoreのみ選択）
firebase init firestore
# -> "Use an existing project" を選択
# -> 手順2-1で作成したプロジェクトを選択
# -> "firestore.rules" を使用

# ルールのデプロイ
firebase deploy --only firestore:rules
```

**方法B: Firebase Consoleを使用する場合**

1. Firebase Console > **Build** > **Firestore Database** > **ルール** を開きます。
2. リポジトリ内の `firestore.rules` の内容をすべてコピーし、エディタに貼り付けます。
3. 「公開」をクリックします。

### 2-4. クライアントSDK設定の取得
1. 左上の「プロジェクトの概要」横の歯車アイコン > **プロジェクトの設定** を開きます。
2. 「マイアプリ」セクションまでスクロールし、`</>` (Web) アイコンをクリックします。
3. アプリのニックネームを入力し「アプリを登録」します。
4. **npm** を選択すると表示される `firebaseConfig` オブジェクトの内容（`apiKey`, `authDomain` 等）を控えておきます（後ほど `.env.local` で使用）。

### 2-5. サーバー用サービスアカウントの取得
1. **プロジェクトの設定** > **サービスアカウント** タブを開きます。
2. 「新しい秘密鍵の生成」をクリックし、JSONファイルをダウンロードします。
3. このファイル内の情報（`project_id`, `client_email`, `private_key`）も `.env.local` で使用します。

---

## 3. Gemini APIキーの取得

1. [Google AI Studio](https://aistudio.google.com/) にアクセスします。
2. **Get API key** をクリックし、新しくキーを作成します。

---

## 4. プロジェクトのセットアップ（ローカル）

### 4-1. リポジトリのクローン
```bash
git clone https://github.com/YOUR_USERNAME/maji-response.git
cd maji-response
```

### 4-2. 依存関係のインストール
```bash
npm install
```

### 4-3. 環境変数の設定
ルートディレクトリに `.env.local` ファイルを作成し、以下の内容を記述します。`...` の部分を取得した値に置き換えてください。

```env
# ------------------------------
# Google Gemini API
# ------------------------------
GOOGLE_GENERATIVE_AI_API_KEY=AIzaSy...

# ------------------------------
# Firebase Client SDK (Web用)
# 手順2-4で取得した値
# ------------------------------
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=maji-response-xxxx.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=maji-response-xxxx
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=maji-response-xxxx.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456...
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456...

# ------------------------------
# Firestore Admin SDK (Server Action用)
# 手順2-5で取得したjsonの値
# ------------------------------
FIREBASE_SERVICE_ACCOUNT_PROJECT_ID=maji-response-xxxx
FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL=firebase-adminsdk-xxxx@maji-response-xxxx.iam.gserviceaccount.com
# 改行コード(\n)を含む秘密鍵は、そのまま貼り付けるか、ダブルクォートで囲んでください
FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
```

---

## 5. 動作確認

開発サーバーを起動します。

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) にアクセスし、以下の動作を確認してください。
1. **ログイン**: 「Sign in with Google」でログインできること。
2. **チャット**: メッセージを送信し、3賢者が応答すること。
3. **履歴**: ページをリロードしてもチャット履歴が残っていること（Firestore連携確認）。

---

## 6. 本番デプロイ (Vercel)

### 6-1. GitHubへのプッシュ
ローカルの変更をGitHubリポジトリにプッシュします。

### 6-2. Vercelプロジェクト作成
1. [Vercel Dashboard](https://vercel.com/dashboard) で **Add New ...** > **Project** を選択。
2. GitHubリポジトリ `maji-response` をインポートします。

### 6-3. 環境変数の設定
1. **Environment Variables** セクションを開きます。
2. `.env.local` の内容をすべてコピーし、Vercelの環境変数設定に貼り付けます（Vercelは `.env` 形式のテキスト貼り付けを一括で行える機能があります）。
3. **Deploy** をクリックします。

### 6-4. 動作確認
デプロイ完了後、発行されたURL（例: `https://maji-response.vercel.app`）にアクセスし、Firebase認証（OAuth）の設定を行います。

#### Firebase Auth 承認済みドメインの追加
1. Firebase Console > **Authentication** > **Settings** > **Authorized domains** を開きます。
2. Vercelで発行されたドメイン（`maji-response.vercel.app` 等）を追加します。
3. これで本番環境でのGoogleログインが可能になります。



以上で構築は完了です。
