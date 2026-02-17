# オーバーレイ拡張: リプライ・ファイル・セクション編集

## Context

現在のオーバーレイはテキスト選択→指示→diff→Apply/Rejectの一方通行フロー。以下4機能を追加する:
1. **Diff リプライ**: diff表示後に追加指示で修正を繰り返せる会話ループ
2. **ファイル全体プロンプト**: ファイル全体に対する指示（翻訳、敬語化等）
3. **セクション編集**: H1-H3見出しに編集ボタン表示
4. **モバイル対応**: 全機能をタッチ操作で快適に使える

## Phase 1: API拡張

### `src/server/api.ts` — `POST /api/edit` にモード追加
- リクエストbodyに `mode` フィールド追加: `"selection"` (既存) | `"file"` | `"section"`
- `mode: "file"`: `selectedText` 不要、ファイル全体を `matchedSource` として扱う。startLine=1, endLine=最終行
- `mode: "section"`: `sectionHeading` パラメータで対象セクション特定。matcherの `findSection` で範囲取得

### `src/matcher/index.ts` — `findSection()` 追加
- `findSection(filePath, headingText, headingLevel)` → `MatchResult`
- headingからのテキスト: 同レベル以上の次のheadingまで、またはファイル末尾
- frontmatterスキップは既存の `findInSource` と同じロジック

## Phase 2: リプライUI (`overlay/ai-edit-overlay.ts`)

### `showDiff()` 変更
- Apply/Rejectボタンの横に「Reply」ボタン追加
- Reply押下→diff下部にtextarea表示（既存のinline editorと同じスタイル）
- 送信時: `POST /api/edit` に同じ `selectedText` + 新しい `instruction` を送信（セッション継続で会話コンテキスト維持）
- 新しいdiffは既存diffの下に追加表示。前回diffはグレーアウト (`opacity-50`)
- 履歴は DOM に残る（Apply は最新の modified を適用）

### 状態管理
- `showDiff` が `data` (最新レスポンス) と `marks` を保持 → Reply時に再利用
- 最新の `modified` を追跡して Apply 時に使用

## Phase 3: ファイル全体プロンプト

### `overlay/ai-edit-overlay.ts` — FABボタン
- 画面右下に固定ボタン「AI Edit File」(position: fixed, bottom-right)
- クリック→フルスクリーンモーダル: textarea + 送信/キャンセル
- `POST /api/edit` に `{ filePath, instruction, mode: "file" }` 送信

### diff表示: コンパクトモード
- ファイル全体diffは変更箇所のみ表示 (context: 前後3行)
- 未変更行は `... N lines unchanged ...` で折りたたみ
- `buildDiffDom` にコンパクトモード引数追加

## Phase 4: セクション編集

### `src/render/template.ts` — 見出しにボタン注入
- `wrapInHtml` のCSS追記: h1-h3に `position: relative` + hover時にボタン表示
- 実際のボタン挿入はオーバーレイ側で動的に行う（SSRのHTMLを汚さない）

### `overlay/ai-edit-overlay.ts` — セクションボタン
- DOMContentLoaded時に `#article-body` 内のh1-h3を走査
- 各見出しに編集アイコンボタン追加（hover/タップで表示）
- クリック→inline editor表示（見出しの下に展開）
- `POST /api/edit` に `{ filePath, sectionHeading, instruction, mode: "section" }` 送信

## Phase 5: モバイル対応

### タッチ対応
- 全ボタン: `min-h-[44px] min-w-[44px]` (Apple HIG準拠)
- inline editor / diff panel: `width: 100%`、固定位置なし（モバイルでは `position: fixed; inset: 0` のフルスクリーン）
- セクション編集ボタン: 常時表示（hover不可のため）、サイズ44px
- FABボタン: 右下固定、56px

### レスポンシブ判定
- `window.matchMedia('(max-width: 768px)')` でモバイル判定
- モバイル時: パネルは画面下部からスライドアップ（bottom sheet風）

## Phase 6: テスト

### `test/matcher.test.ts` — findSection テスト
- H1/H2/H3 各レベルのセクション範囲取得
- 最後のセクション（ファイル末尾まで）
- 該当見出しなしの場合

### `test/api.test.ts` or 手動テスト
- `mode: "file"` / `mode: "section"` の API 動作確認

## 変更ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `src/matcher/index.ts` | `findSection()` 追加 |
| `src/server/api.ts` | mode パラメータ対応 |
| `overlay/ai-edit-overlay.ts` | Reply UI, FAB, セクションボタン, モバイル対応 |
| `src/render/template.ts` | h1-h3 の CSS 微調整 |
| `test/matcher.test.ts` | findSection テスト追加 |

## 検証

```bash
npm run build && npm test
# ブラウザで手動確認:
# 1. テキスト選択→AI Edit→diff→Reply→追加diff表示
# 2. FAB→ファイル全体指示→コンパクトdiff
# 3. H1-H3ホバー→編集ボタン→セクション編集
# 4. モバイル幅でリサイズして全操作確認
```
