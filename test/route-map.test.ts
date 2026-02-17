import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RouteMap } from '../src/route-map.js';

describe('RouteMap.resolve', () => {
  const routes = new RouteMap([
    { pattern: '/blog/:slug', file: 'blog/:slug' },
    { pattern: '/docs/:path*', file: ':path' },
  ]);

  it(':slug パターンでマッチする', () => {
    const result = routes.resolve('/blog/my-post');
    assert.equal(result, 'blog/my-post');
  });

  it(':path* ワイルドカードでマッチする', () => {
    const result = routes.resolve('/docs/guide/intro');
    assert.equal(result, 'guide/intro');
  });

  it('マッチしないURLはnullを返す', () => {
    const result = routes.resolve('/about');
    assert.equal(result, null);
  });

  it('末尾スラッシュでもマッチする', () => {
    const result = routes.resolve('/blog/my-post/');
    assert.equal(result, 'blog/my-post');
  });

  it('複数ルートでは最初にマッチしたものを返す', () => {
    const multi = new RouteMap([
      { pattern: '/page/:slug', file: 'first/:slug' },
      { pattern: '/page/:slug', file: 'second/:slug' },
    ]);
    const result = multi.resolve('/page/hello');
    assert.equal(result, 'first/hello');
  });

  it('空ルートは常にnullを返す', () => {
    const empty = new RouteMap([]);
    assert.equal(empty.resolve('/any/path'), null);
    assert.equal(empty.resolve('/'), null);
  });
});
