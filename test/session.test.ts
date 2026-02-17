import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getSession,
  setSession,
  deleteSession,
  hasSession,
} from '../src/agent/session.js';

describe('session CRUD', () => {
  const KEY = 'test-file-key';
  const SESSION_ID = 'session-abc-123';

  it('set → get で取得できる', () => {
    setSession(KEY, SESSION_ID);
    assert.equal(getSession(KEY), SESSION_ID);
    deleteSession(KEY);
  });

  it('未設定キーはundefinedを返す', () => {
    assert.equal(getSession('nonexistent-key'), undefined);
  });

  it('hasSessionが設定済みキーにtrueを返す', () => {
    setSession(KEY, SESSION_ID);
    assert.equal(hasSession(KEY), true);
    deleteSession(KEY);
  });

  it('hasSessionが未設定キーにfalseを返す', () => {
    assert.equal(hasSession('nonexistent-key'), false);
  });

  it('deleteSession後にgetで取得不可になる', () => {
    setSession(KEY, SESSION_ID);
    deleteSession(KEY);
    assert.equal(getSession(KEY), undefined);
    assert.equal(hasSession(KEY), false);
  });

  it('異なるキーは独立して管理される', () => {
    setSession('key-a', 'session-a');
    setSession('key-b', 'session-b');
    assert.equal(getSession('key-a'), 'session-a');
    assert.equal(getSession('key-b'), 'session-b');
    deleteSession('key-a');
    deleteSession('key-b');
  });

  it('同じキーに上書きsetできる', () => {
    setSession(KEY, 'old');
    setSession(KEY, 'new');
    assert.equal(getSession(KEY), 'new');
    deleteSession(KEY);
  });
});
