#!/usr/bin/env node
/**
 * 内容质量门禁：校验 Wikifactory-Content 的目录结构与 frontmatter
 * ---------------------------------------------------------------------------
 * 用法：
 *   npm run content:validate                 # Core：校验 ./content
 *   node scripts/validate-content.mjs [dir]  # 指定内容根目录（含 games/）
 *
 * 环境变量：
 *   CONTENT_DIR   内容根目录（默认自动探测，见 resolveRoot）
 *
 * 兼容两种仓库布局（脚本文件在两边保持一致，零外部依赖）：
 *   - Wikifactory-Core   ：<repo>/content/games/...   （content:sync 检出到 ./content）
 *   - Wikifactory-Content：<repo>/games/...           （games 直接位于仓库根）
 *
 * 校验项：
 *   [结构] 文件必须位于 games/<game>/<category>/<...>/<page>.md|.mdx
 *          —— 是否位于 games/、游戏/分类/文件名是否合法（宽松：仅拦真非法字符）
 *   [冲突] 重复 URL（如 Foo.md 与 Foo.mdx → 同一 URL）、大小写冲突
 *   [元数据] title/description/tags/order/draft/updated/toc 的类型与取值
 *
 * 退出码：0 = 通过；1 = 存在错误（打印 ❌ Content validation failed）
 *
 * ⚠️ 本文件在 Wikifactory-Core（scripts/）与 Wikifactory-Content（tools/）各存一份，
 *    修改时请同步两边，保持内容一致。
 */
import fs from 'node:fs';
import path from 'node:path';

// ---------------------------------------------------------------------------
// 内容根目录定位
// ---------------------------------------------------------------------------
function resolveRoot() {
  const explicit = process.argv[2] ?? process.env.CONTENT_DIR;
  if (explicit) return path.resolve(explicit);

  const cwd = process.cwd();
  // Core 布局：./content/games 存在
  if (fs.existsSync(path.join(cwd, 'content', 'games'))) return path.join(cwd, 'content');
  // Content 仓库布局：./games 存在
  return cwd;
}

const root = resolveRoot();
const gamesDir = path.join(root, 'games');

// ---------------------------------------------------------------------------
// 小工具
// ---------------------------------------------------------------------------
const errors = [];
function fail(message) {
  errors.push(message);
}

const SKIP_DIRS = new Set(['.git', '.github', 'node_modules', '.astro', 'dist', '.cache']);
/** 允许放在 games/ 之外的 Markdown 元文件 */
const ROOT_META_RE = /^(README|LICENSE|CONTRIBUTING|CHANGELOG|CODE_OF_CONDUCT)\.(md|mdx)$/i;

const PAGE_EXT_RE = /\.(md|mdx)$/i;

/** 宽松命名规则：仅拦真正破坏 URL / 文件系统的字符 */
const ILLEGAL_CHARS = ['/', '\\', ':', '*', '?', '"', '<', '>', '|'];
const CONTROL_RE = /[\u0000-\u001f\u007f]/;

function nameProblem(name, { isFile = false } = {}) {
  if (name.length === 0) return '名称为空';
  const bad = ILLEGAL_CHARS.find((c) => name.includes(c));
  if (bad) return `包含非法字符 “${bad}”`;
  if (CONTROL_RE.test(name)) return '包含控制字符';
  if (name !== name.trim()) return '首尾含空白';
  if (name.startsWith('.')) return '以点开头';
  if (isFile) {
    const base = name.replace(PAGE_EXT_RE, '');
    if (base.length === 0) return '文件名为空';
    if (base.endsWith('.')) return '主文件名以点结尾';
  }
  return null;
}

// ---------------------------------------------------------------------------
// frontmatter：极简 YAML 子集解析（零依赖，仅覆盖 frontmatter 常见写法）
// ---------------------------------------------------------------------------
function extractFrontmatter(text) {
  const m = /^\uFEFF?---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(text);
  return m ? m[1] : null;
}

function stripQuotes(value) {
  if (value.length >= 2) {
    const first = value[0];
    const last = value[value.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return value.slice(1, -1).replace(/''/g, "'").replace(/\\"/g, '"');
    }
  }
  return value;
}

function scalar(value) {
  const v = value.trim();
  // 带引号的值一律按字符串处理（如 order: "5"、draft: "false" 不应被当作数字/布尔）
  const quoted =
    v.length >= 2 &&
    ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")));
  if (quoted) return stripQuotes(v);
  if (v === '' || v === '~' || v === 'null') return null;
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (/^-?\d+$/.test(v)) return Number.parseInt(v, 10);
  if (/^-?\d*\.\d+$/.test(v)) return Number.parseFloat(v);
  return v;
}

function parseInlineArray(value) {
  const inner = value.slice(1, value.lastIndexOf(']')).trim();
  if (inner === '') return [];
  return inner.split(',').map((item) => scalar(item.trim()));
}

/** 解析 frontmatter 文本为扁平对象；失败时抛出带说明的 Error */
function parseFrontmatter(src) {
  const data = {};
  const lines = src.split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    const raw = lines[i];
    if (raw.trim() === '' || raw.trimStart().startsWith('#')) {
      i += 1;
      continue;
    }
    if (/^\s/.test(raw)) {
      throw new Error(`不支持嵌套 / 缩进结构（第 ${i + 1} 行）：${raw.trim()}`);
    }
    const idx = raw.indexOf(':');
    if (idx === -1) throw new Error(`无法解析（第 ${i + 1} 行）：${raw.trim()}`);
    const key = raw.slice(0, idx).trim();
    const rest = raw.slice(idx + 1).trim();

    if (rest === '' || rest === '>' || rest === '|') {
      // 块列表 / 块标量：收集后续缩进行
      const isBlock = rest === '' || rest === '>' || rest === '|';
      const items = [];
      const textParts = [];
      let j = i + 1;
      let sawList = false;
      while (j < lines.length) {
        const line = lines[j];
        if (line.trim() === '') {
          textParts.push('');
          j += 1;
          continue;
        }
        if (/^\s*-\s+/.test(line) || /^\s*-\s*$/.test(line)) {
          sawList = true;
          items.push(scalar(line.replace(/^\s*-\s*/, '').trim()));
          j += 1;
          continue;
        }
        if (/^\s/.test(line)) {
          textParts.push(line.trim());
          j += 1;
          continue;
        }
        break;
      }
      if (isBlock && rest === '') {
        data[key] = sawList ? items : null;
      } else {
        data[key] = textParts.join(rest === '|' ? '\n' : ' ').trim();
      }
      i = j;
      continue;
    }

    data[key] = rest.startsWith('[') ? parseInlineArray(rest) : scalar(rest);
    i += 1;
  }
  return data;
}

const DATE_RE =
  /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;

function isValidDate(value) {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
  if (Number.isNaN(new Date(value).getTime())) return false;
  const [y, m, d] = value.slice(0, 10).split('-').map(Number);
  if (m < 1 || m > 12) return false;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return d >= 1 && d <= lastDay;
}

/** 校验 frontmatter 字段类型；返回错误说明数组 */
function checkFrontmatter(data) {
  const problems = [];
  const typeOf = (v) =>
    Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v;

  if ('title' in data && data.title !== null && typeof data.title !== 'string') {
    problems.push(`"title" 必须是字符串（当前为 ${typeOf(data.title)}）`);
  }
  if ('description' in data && data.description !== null && typeof data.description !== 'string') {
    problems.push(`"description" 必须是字符串（当前为 ${typeOf(data.description)}）`);
  }
  if ('tags' in data && data.tags !== null) {
    if (!Array.isArray(data.tags)) {
      problems.push(`"tags" 必须是数组（当前为 ${typeOf(data.tags)}）`);
    } else if (data.tags.some((t) => typeof t !== 'string')) {
      problems.push('"tags" 的数组元素必须全部是字符串');
    }
  }
  if ('order' in data && data.order !== null && typeof data.order !== 'number') {
    problems.push(`"order" 必须是数字（当前为 ${typeOf(data.order)}）`);
  }
  if ('draft' in data && data.draft !== null && typeof data.draft !== 'boolean') {
    problems.push(`"draft" 必须是布尔值（当前为 ${typeOf(data.draft)}）`);
  }
  if ('toc' in data && data.toc !== null && typeof data.toc !== 'boolean') {
    problems.push(`"toc" 必须是布尔值（当前为 ${typeOf(data.toc)}）`);
  }
  if ('updated' in data && data.updated !== null && !isValidDate(data.updated)) {
    problems.push(
      `"updated" 必须是合法日期（YYYY-MM-DD 或 ISO 时间，当前为 ${JSON.stringify(data.updated)}）`,
    );
  }
  return problems;
}

// ---------------------------------------------------------------------------
// 扫描内容文件
// ---------------------------------------------------------------------------
function walk(dir, baseRel, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') && SKIP_DIRS.has(entry.name)) continue;
    if (SKIP_DIRS.has(entry.name)) continue;
    const abs = path.join(dir, entry.name);
    const rel = baseRel ? `${baseRel}/${entry.name}` : entry.name;
    if (entry.isDirectory()) walk(abs, rel, out);
    else out.push({ abs, rel, name: entry.name });
  }
}

if (!fs.existsSync(gamesDir)) {
  console.error('❌ Content validation failed');
  console.error(`\n找不到内容目录：${gamesDir}`);
  console.error('请先运行 `npm run content:sync`，或用 CONTENT_DIR / 命令行参数指定内容根目录。');
  process.exit(1);
}

const allFiles = [];
walk(root, '', allFiles);

// ---------------------------------------------------------------------------
// 逐文件结构校验
// ---------------------------------------------------------------------------
const pages = []; // { rel, game, category, id, ext }

for (const file of allFiles) {
  if (!PAGE_EXT_RE.test(file.name)) continue;

  const relFromRoot = file.rel;
  // —— 是否位于 games/ ——
  if (!relFromRoot.startsWith('games/')) {
    const topLevelName = relFromRoot.split('/')[0];
    if (relFromRoot.includes('/') || !ROOT_META_RE.test(topLevelName)) {
      fail(`页面不在 games/ 目录下：${relFromRoot}`);
    }
    continue;
  }

  const relFromGames = relFromRoot.slice('games/'.length);
  const segs = relFromGames.split('/');
  const fileName = segs[segs.length - 1];

  // —— 扩展名大小写 ——
  const extMatch = fileName.match(PAGE_EXT_RE);
  const ext = extMatch[0];
  if (ext !== '.md' && ext !== '.mdx') {
    fail(`扩展名必须是小写 .md / .mdx：${relFromRoot}（当前为 ${ext}）`);
    continue;
  }

  // —— 结构层级：至少 games/<game>/<category>/<page> ——
  if (segs.length < 3) {
    fail(`目录结构不符合 games/<game>/<category>/<page>：${relFromRoot}`);
    continue;
  }

  // —— 命名合法性（宽松） ——
  const dirSegs = segs.slice(0, -1);
  for (const seg of dirSegs) {
    const problem = nameProblem(seg);
    if (problem) fail(`目录名不合法（${problem}）：${relFromRoot}`);
  }
  const fileProblem = nameProblem(fileName, { isFile: true });
  if (fileProblem) fail(`文件名不合法（${fileProblem}）：${relFromRoot}`);

  pages.push({
    rel: relFromRoot,
    game: segs[0],
    category: segs[1],
    id: relFromGames.replace(PAGE_EXT_RE, ''),
    ext,
  });
}

// ---------------------------------------------------------------------------
// 冲突校验：重复 URL / 大小写冲突
// ---------------------------------------------------------------------------
function urlKeyOf(id) {
  // 归一化编码，捕捉 “空格 vs %20” 之类的隐性同 URL
  try {
    return decodeURIComponent(encodeURI(id));
  } catch {
    return id;
  }
}

const byExactId = new Map(); // id -> pages
const byUrlKey = new Map(); // urlKey -> pages（区分大小写）
const byLowerUrlKey = new Map(); // 小写 urlKey -> pages（大小写冲突）
const dirCase = new Map(); // 小写目录路径 -> 原始目录路径集合

for (const page of pages) {
  const key = urlKeyOf(page.id);
  (byExactId.get(page.id) ?? byExactId.set(page.id, []).get(page.id)).push(page);
  (byUrlKey.get(key) ?? byUrlKey.set(key, []).get(key)).push(page);
  const lower = key.toLowerCase();
  (byLowerUrlKey.get(lower) ?? byLowerUrlKey.set(lower, []).get(lower)).push(page);

  const segs = page.id.split('/');
  for (let i = 1; i <= segs.length - 1; i += 1) {
    const dirPath = segs.slice(0, i).join('/');
    const set = dirCase.get(dirPath.toLowerCase()) ?? new Set();
    set.add(dirPath);
    dirCase.set(dirPath.toLowerCase(), set);
  }
}

// 重复 page ID（含 .md/.mdx 同 URL）
for (const [id, list] of byExactId) {
  if (list.length > 1) {
    const files = list.map((p) => p.rel).sort();
    fail(`Duplicate page ID: ${id} → ${files.join(', ')}`);
  }
}

// URL 冲突（编码归一化后同 URL）
for (const [key, list] of byUrlKey) {
  if (list.length > 1) {
    const ids = [...new Set(list.map((p) => p.id))];
    if (ids.length > 1) {
      fail(`URL 冲突：/ ${key} / ← ${ids.sort().join(' / ')}`);
    }
  }
}

// 大小写冲突（文件 / 目录）
for (const [lower, list] of byLowerUrlKey) {
  const ids = [...new Set(list.map((p) => p.id))];
  if (ids.length > 1) {
    fail(`大小写冲突（URL）：${ids.sort().join(' vs ')}`);
  }
}
for (const [lower, originals] of dirCase) {
  if (originals.size > 1) {
    fail(`大小写冲突（目录）：${[...originals].sort().join(' vs ')}`);
  }
}

// ---------------------------------------------------------------------------
// frontmatter 校验
// ---------------------------------------------------------------------------
for (const page of pages) {
  const text = fs.readFileSync(path.join(root, page.rel), 'utf8');
  const fm = extractFrontmatter(text);
  if (fm === null) continue; // 无 frontmatter：字段均为默认值，合法

  let data;
  try {
    data = parseFrontmatter(fm);
  } catch (error) {
    fail(`frontmatter 解析失败：${page.rel}（${error.message}）`);
    continue;
  }
  for (const problem of checkFrontmatter(data)) {
    fail(`frontmatter 字段错误：${page.rel} → ${problem}`);
  }
}

// ---------------------------------------------------------------------------
// 汇总输出
// ---------------------------------------------------------------------------
const games = new Set(pages.map((p) => p.game)).size;
const categories = new Set(pages.map((p) => `${p.game}/${p.category}`)).size;

if (errors.length > 0) {
  errors.sort();
  console.error('❌ Content validation failed');
  console.error(`\n共 ${errors.length} 个问题：\n`);
  for (const message of errors) console.error(`  • ${message}`);
  console.error('');
  process.exit(1);
}

console.log(
  `✅ Content validation passed：${pages.length} 个页面，${games} 个游戏，${categories} 个分类`,
);
