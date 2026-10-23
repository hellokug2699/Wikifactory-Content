#!/usr/bin/env node
/**
 * 校验共享规则副本未被手改：
 * scripts/content-rules.mjs 必须与 scripts/content-rules.sha256 记录一致。
 * 同步命令（在 Wikifactory-Editor 仓库）：
 *   node scripts/rules-sync.mjs --write ../Wikifactory-Content
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const rulesFile = path.join(dir, 'content-rules.mjs');
const checksumFile = path.join(dir, 'content-rules.sha256');

if (!fs.existsSync(rulesFile) || !fs.existsSync(checksumFile)) {
  console.error('❌ 共享规则文件缺失：scripts/content-rules.mjs / content-rules.sha256');
  process.exit(1);
}

const actual = crypto.createHash('sha256').update(fs.readFileSync(rulesFile)).digest('hex');
const recorded = fs.readFileSync(checksumFile, 'utf8').trim().split(/\s+/)[0];

if (actual !== recorded) {
  console.error('❌ 共享规则校验失败：content-rules.mjs 与 content-rules.sha256 不一致');
  console.error(`  记录：${recorded}`);
  console.error(`  实际：${actual}`);
  console.error('  请勿手改该文件；在 Wikifactory-Editor 运行 rules-sync.mjs --write 重新同步。');
  process.exit(1);
}

console.log(`✅ 共享规则校验通过（${actual.slice(0, 12)}…）`);
