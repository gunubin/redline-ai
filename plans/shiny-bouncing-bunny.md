# ユニットテスト追加プラン（簡単なモジュール4つ）

## Context

redline-ai は matcher のテスト（39件）のみ。security, session, route-map, config の4モジュールは純粋関数/シンプルなロジックでモック不要。既存の `node:test` パターンに合わせて追加する。

## 対象ファイルと新規テストファイル

### 1. `test/security.test.ts` ← `src/security.ts`

`validateFilePath(rootDir, filePath)` のテスト:
- 正常パス → 絶対パスを返す
- `../../etc/passwd` → null（トラバーサル拒否）
- rootDir自体を指定 → null
- 相対パス（`docs/hello.md`） → 正しく解決
- 空文字 → rootDir自体になるケース

### 2. `test/session.test.ts` ← `src/agent/session.ts`

`getSession`, `setSession`, `deleteSession`, `hasSession` のCRUD:
- set → get で取得できる
- 未設定キー → undefined
- has → true/false
- delete → 取得不可になる
- 異なるキーは独立

注意: グローバル Map なのでテスト間で状態が共有される → 各テストで `deleteSession` してクリーンアップ

### 3. `test/route-map.test.ts` ← `src/route-map.ts`

`RouteMap.resolve(urlPath)` のテスト:
- `/blog/my-post` → `blog/my-post`（`:slug` パターン）
- `/docs/guide/intro` → `guide/intro`（`:path*` ワイルドカード）
- `/about` → null（マッチしないURL）
- `/blog/my-post/` → 末尾スラッシュでもマッチ
- 複数ルート定義 → 最初にマッチしたものを返す
- 空ルート → 常にnull

### 4. `test/config.test.ts` ← `src/config.ts`

`loadConfig(configPath)` のテスト（tmpファイル使用）:
- 正常TOML → ProxyConfig を返す
- 存在しないファイル → null
- root がconfigファイル基準で解決される
- proxy セクションなし → デフォルト値
- routes 定義あり → 正しくパース

tmpDir に TOML fixture を書き出す（matcher.test.ts と同じパターン）

## 実装方針

- フレームワーク: `node:test`（`describe`, `it`, `before`, `after`）
- アサーション: `node:assert/strict`
- fixture: `os.tmpdir()` + `before`/`after` で作成/削除（既存パターン踏襲）
- 実行: `npm test`（既存の `node --import tsx --test test/**/*.test.ts`）

## 検証

```bash
npm test
```

全テスト（既存39 + 新規約20件）がパスすること
