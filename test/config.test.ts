import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { loadConfig } from '../src/config.js';

const TEST_DIR = join(tmpdir(), 'redline-test-config');

function createToml(content: string, name = 'redline.toml'): string {
  const filePath = join(TEST_DIR, name);
  writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

before(() => {
  mkdirSync(TEST_DIR, { recursive: true });
});

after(() => {
  rmSync(TEST_DIR, { recursive: true, force: true });
});

describe('loadConfig', () => {
  it('正常なTOMLからProxyConfigを返す', () => {
    const configPath = createToml(`
[proxy]
target = "http://localhost:8080"
root = "./content"

[[proxy.routes]]
pattern = "/blog/:slug"
file = "blog/:slug"
`);
    const config = loadConfig(configPath);
    assert.ok(config);
    assert.equal(config.proxy.target, 'http://localhost:8080');
    assert.equal(config.proxy.root, resolve(TEST_DIR, 'content'));
    assert.equal(config.proxy.routes.length, 1);
    assert.equal(config.proxy.routes[0]!.pattern, '/blog/:slug');
    assert.equal(config.proxy.routes[0]!.file, 'blog/:slug');
  });

  it('存在しないファイルはnullを返す', () => {
    const result = loadConfig(join(TEST_DIR, 'nonexistent.toml'));
    assert.equal(result, null);
  });

  it('rootがconfigファイル基準で解決される', () => {
    const configPath = createToml(`
[proxy]
target = "http://localhost:3000"
root = "../sibling"
`);
    const config = loadConfig(configPath);
    assert.ok(config);
    assert.equal(config.proxy.root, resolve(TEST_DIR, '..', 'sibling'));
  });

  it('proxyセクションなしでデフォルト値を返す', () => {
    const configPath = createToml('# empty config\n');
    const config = loadConfig(configPath);
    assert.ok(config);
    assert.equal(config.proxy.target, 'http://localhost:3000');
    assert.equal(config.proxy.root, resolve(TEST_DIR));
    assert.deepEqual(config.proxy.routes, []);
  });

  it('複数routesを正しくパースする', () => {
    const configPath = createToml(`
[proxy]
target = "http://localhost:4000"
root = "."

[[proxy.routes]]
pattern = "/blog/:slug"
file = "blog/:slug"

[[proxy.routes]]
pattern = "/docs/:path*"
file = "docs/:path"
`);
    const config = loadConfig(configPath);
    assert.ok(config);
    assert.equal(config.proxy.routes.length, 2);
    assert.equal(config.proxy.routes[1]!.pattern, '/docs/:path*');
    assert.equal(config.proxy.routes[1]!.file, 'docs/:path');
  });

  it('agentセクションのプロンプトをパースする', () => {
    const configPath = createToml(`
[agent]
prompt_first_call = "カスタム初回: {{fullSource}}"
prompt_subsequent_call = "カスタム2回目: {{instruction}}"
`);
    const config = loadConfig(configPath);
    assert.ok(config);
    assert.equal(config.agent.prompt_first_call, 'カスタム初回: {{fullSource}}');
    assert.equal(config.agent.prompt_subsequent_call, 'カスタム2回目: {{instruction}}');
  });

  it('agentセクションなしでundefinedを返す', () => {
    const configPath = createToml(`
[proxy]
target = "http://localhost:3000"
`);
    const config = loadConfig(configPath);
    assert.ok(config);
    assert.equal(config.agent.prompt_first_call, undefined);
    assert.equal(config.agent.prompt_subsequent_call, undefined);
  });

  it('agentセクションで片方だけ設定できる', () => {
    const configPath = createToml(`
[agent]
prompt_first_call = "初回のみカスタム"
`);
    const config = loadConfig(configPath);
    assert.ok(config);
    assert.equal(config.agent.prompt_first_call, '初回のみカスタム');
    assert.equal(config.agent.prompt_subsequent_call, undefined);
  });
});
