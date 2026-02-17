import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  renderPrompt,
  DEFAULT_FIRST_CALL,
  DEFAULT_SUBSEQUENT_CALL,
  TEMPLATE_VARIABLES,
} from '../src/agent/prompt.js';

describe('renderPrompt', () => {
  it('プレースホルダーを正しく置換する', () => {
    const template = 'Hello {{name}}, you are {{age}} years old.';
    const result = renderPrompt(template, { name: 'Alice', age: '30' });
    assert.equal(result, 'Hello Alice, you are 30 years old.');
  });

  it('未知の変数はそのまま残す', () => {
    const template = '{{known}} and {{unknown}}';
    const result = renderPrompt(template, { known: 'yes' });
    assert.equal(result, 'yes and {{unknown}}');
  });

  it('同じ変数の複数出現を全て置換する', () => {
    const template = '{{x}} + {{x}} = {{result}}';
    const result = renderPrompt(template, { x: '2', result: '4' });
    assert.equal(result, '2 + 2 = 4');
  });

  it('変数が空文字列でも置換する', () => {
    const template = 'before{{empty}}after';
    const result = renderPrompt(template, { empty: '' });
    assert.equal(result, 'beforeafter');
  });

  it('プレースホルダーがないテンプレートはそのまま返す', () => {
    const template = 'no placeholders here';
    const result = renderPrompt(template, { foo: 'bar' });
    assert.equal(result, 'no placeholders here');
  });
});

describe('DEFAULT_FIRST_CALL', () => {
  it('全テンプレート変数のプレースホルダーを含む', () => {
    for (const v of TEMPLATE_VARIABLES) {
      assert.ok(
        DEFAULT_FIRST_CALL.includes(`{{${v}}}`),
        `DEFAULT_FIRST_CALL should contain {{${v}}}`,
      );
    }
  });

  it('renderPromptで全変数が置換される', () => {
    const vars: Record<string, string> = {
      fullSource: 'SOURCE',
      target: 'TARGET',
      startLine: '1',
      endLine: '5',
      instruction: 'INSTR',
      selectionContext: 'CTX',
    };
    const result = renderPrompt(DEFAULT_FIRST_CALL, vars);
    assert.ok(!result.includes('{{'), `Unresolved placeholder found: ${result.match(/\{\{\w+\}\}/)}`);
  });
});

describe('DEFAULT_SUBSEQUENT_CALL', () => {
  it('fullSourceを含まない', () => {
    assert.ok(!DEFAULT_SUBSEQUENT_CALL.includes('{{fullSource}}'));
  });

  it('renderPromptで全変数が置換される', () => {
    const vars: Record<string, string> = {
      fullSource: 'SOURCE',
      target: 'TARGET',
      startLine: '1',
      endLine: '5',
      instruction: 'INSTR',
      selectionContext: 'CTX',
    };
    const result = renderPrompt(DEFAULT_SUBSEQUENT_CALL, vars);
    assert.ok(!result.includes('{{'), `Unresolved placeholder found: ${result.match(/\{\{\w+\}\}/)}`);
  });
});
