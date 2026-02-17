# エージェントプロンプトの設定化

## Context

現在 `src/agent/claude.ts` にハードコードされているプロンプトをユーザーが `redline.toml` から変更可能にする。`{{variable}}` プレースホルダーでテンプレート化し、初回/2回目以降の2テンプレートを設定可能にする。

## 変更ファイル

### 1. `src/config.ts` — AgentConfig 追加

```typescript
export interface AgentConfig {
  prompt_first_call?: string;
  prompt_subsequent_call?: string;
}

export interface RedlineConfig {
  proxy: ProxyConfig;
  agent: AgentConfig;
}
```

`loadConfig` で `parsed.agent?.prompt_first_call` 等をパースし、`agent` フィールドにセット。未設定なら `{}` を返す。

### 2. `src/agent/prompt.ts` — 新規: テンプレートエンジン + デフォルトプロンプト

- `DEFAULT_FIRST_CALL` / `DEFAULT_SUBSEQUENT_CALL` 定数（現在のハードコード内容）
- `renderPrompt(template, vars)`: `{{fullSource}}`, `{{target}}`, `{{startLine}}`, `{{endLine}}`, `{{instruction}}`, `{{selectionContext}}` を置換
- 利用可能な変数一覧をexport（ドキュメント用）

### 3. `src/agent/claude.ts` — テンプレート利用に変更

- コンストラクタで `AgentConfig` を受け取る
- `config.prompt_first_call ?? DEFAULT_FIRST_CALL` を使用
- `renderPrompt()` でプレースホルダーを埋めてプロンプト生成

### 4. `src/server/api.ts` — config 受け渡し

`registerApiRoutes(app, rootDir, agentConfig?)` → `new ClaudeCodeAgent(agentConfig)`

### 5. `src/server/index.ts` / `serve.ts` / `proxy.ts` — config 伝播

`createApp(rootDir, agentConfig?)` → `registerApiRoutes` へ中継。`startServeMode`/`startProxyMode` で `loadConfig` 結果から `agent` を取得して渡す。

### 6. `redline.toml.example` — 設定例追加

```toml
[agent]
prompt_first_call = """
あなたは{{role}}です。以下は編集対象のドキュメント全体です:
<article>
{{fullSource}}
</article>
...
"""
```

### 7. `test/prompt.test.ts` — テンプレートエンジンのテスト

- プレースホルダー置換の正確性
- 未知の変数はそのまま残す
- デフォルトテンプレートでの動作確認

## 検証

```bash
npm run build && npm test
```
