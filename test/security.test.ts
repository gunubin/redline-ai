import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { validateFilePath } from '../src/security.js';

const ROOT_DIR = '/tmp/redline-security-test';

describe('validateFilePath', () => {
  it('正常なファイルパスは絶対パスを返す', () => {
    const result = validateFilePath(ROOT_DIR, 'hello.md');
    assert.equal(result, resolve(ROOT_DIR, 'hello.md'));
  });

  it('パストラバーサルを拒否してnullを返す', () => {
    const result = validateFilePath(ROOT_DIR, '../../etc/passwd');
    assert.equal(result, null);
  });

  it('rootDir自体を指すパスを許可する', () => {
    const result = validateFilePath(ROOT_DIR, '');
    assert.equal(result, resolve(ROOT_DIR));
  });

  it('相対パスを正しく解決する', () => {
    const result = validateFilePath(ROOT_DIR, 'docs/hello.md');
    assert.equal(result, resolve(ROOT_DIR, 'docs/hello.md'));
  });

  it('ネストされた相対パスを正しく解決する', () => {
    const result = validateFilePath(ROOT_DIR, 'a/b/c/file.md');
    assert.equal(result, resolve(ROOT_DIR, 'a/b/c/file.md'));
  });

  it('rootDir外に出るシンボリック的パスを拒否する', () => {
    const result = validateFilePath(ROOT_DIR, '../other-dir/file.md');
    assert.equal(result, null);
  });
});
