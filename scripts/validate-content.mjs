#!/usr/bin/env node
/**
 * 内容质量门禁：校验 Wikifactory-Content 的目录结构与 frontmatter
 * ---------------------------------------------------------------------------
 * 用法：
 *   npm run content:validate                 # 自动定位：Core → ./content，Content → ./games
 *   node scripts/validate-content.mjs [dir]  # 手动指定内容根目录（须包含 games/）
 *
 * 环境变量：
 *   CONTENT_DIR   内容根目录（默认自动探测，见 resolveRoot）
 *
 * 兼容两种仓库布局（脚本文件在两边保持一致；除 yaml 外无其他依赖，见 package.json）：
 *   - Wikifactory-Core   ：<repo>/content/games/...   （content:sync 检出到 ./content）
 *   - Wikifactory-Content：<repo>/games/...           （games 直接位于仓库根）
 *
 * 校验项：
 *   [结构] 文件必须位于 games/<game>/<category>/<...>/<page>.md|.mdx
 *          —— 是否位于 games/、游戏/分类/文件名是否合法（宽松：仅拦真非法字符）
 *   [保留] 游戏目录名不得与站点自身顶层路径同名（search / pagefind / _astro / 404）
 *   [冲突] 重复 URL（如 Foo.md 与 Foo.mdx → 同一 URL）、大小写冲突
 *   [元数据] title/description/tags/order/draft/updated/toc 的类型与取值
 *   [游戏元数据] _game.yml / _games.yml 的 YAML 解析与字段类型
 *
 * 退出码：0 = 通过；1 = 存在错误（打印 ❌ Content validation failed）
 *
 * ⚠️ 本文件在 Wikifactory-Core（scripts/）与 Wikifactory-Content（scripts/）各存一份，
 *    修改时请同步两边，保持内容一致（Core 的 tests/content.test.mjs 会校验两份是否逐字节一致）。
 *    两者都读取仓库根 config/reserved-paths.json（同源副本，亦须保持一致）。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

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

/**
 * 站点自身占用的顶层路径（唯一事实来源）：游戏目录（games/ 下的一级目录）不得与之同名，
 * 否则游戏主页会被静态页抢占或与产物目录冲突（如 games/search/ → /search/ 被搜索页占用）。
 *
 * 数据来自仓库根 config/reserved-paths.json —— 运行时的保留路径（src/lib/aliases.ts）
 * 与别名门禁（scripts/validate-aliases.mjs）读取同一份文件，避免各写一份导致漂移。
 */
const reservedConfigPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'config',
  'reserved-paths.json',
);

/** 读取 config/reserved-paths.json 的 reserved 列表为「小写路径 → 冲突说明」的 Map */
function loadReservedGameNames() {
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(reservedConfigPath, 'utf8'));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('❌ Content validation failed');
    console.error(`\n无法读取保留路径配置：${reservedConfigPath}\n（${message}）`);
    console.error('该文件应与 scripts/ 位于同一仓库（config/reserved-paths.json），请确认检出完整。');
    process.exit(1);
  }

  const entries = Array.isArray(parsed?.reserved) ? parsed.reserved : [];
  const map = new Map();
  for (const item of entries) {
    if (item && typeof item.path === 'string' && item.path.trim() !== '') {
      map.set(item.path.trim().toLowerCase(), typeof item.reason === 'string' ? item.reason : '');
    }
  }
  if (map.size === 0) {
    console.error('❌ Content validation failed');
    console.error(`\n保留路径配置为空或格式不正确：${reservedConfigPath}`);
    process.exit(1);
  }
  return map;
}

const RESERVED_GAME_NAMES = loadReservedGameNames();

/**
 * 缩略图标准（唯一事实来源）：封面约定文件名 / 图标目录与格式 / 尺寸预设。
 * 数据来自仓库根 config/thumbnails.json —— 运行时的 src/config/thumbnails.ts
 * 导入同一份，本脚本只用它校验 [icon=…] 引用与 cover 路径，避免规则漂移。
 */
const thumbnailsConfigPath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'config',
  'thumbnails.json',
);

function loadThumbnailStandard() {
  try {
    const parsed = JSON.parse(fs.readFileSync(thumbnailsConfigPath, 'utf8'));
    if (!parsed?.icon?.dir || !Array.isArray(parsed.icon.extensions)) throw new Error('结构不完整');
    return parsed;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('❌ Content validation failed');
    console.error(`\n无法读取缩略图标准配置：${thumbnailsConfigPath}\n（${message}）`);
    console.error('该文件应与 scripts/ 位于同一仓库（config/thumbnails.json），请确认检出完整。');
    process.exit(1);
  }
}

const thumbnails = loadThumbnailStandard();
const ICON_REF_RE = /\[icon=([^\]\n]+)\]/g;

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
// 保留字校验：游戏目录不得与站点自身顶层路径同名（否则失败是静默的）
// ---------------------------------------------------------------------------
for (const game of new Set(pages.map((page) => page.game))) {
  const reason = RESERVED_GAME_NAMES.get(game.toLowerCase());
  if (reason) {
    fail(`游戏目录名与站点保留路径冲突：games/${game}/（${reason}）`);
  }
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
// 小缩略图引用校验（正文 `[icon=名称]`）
//   图标须位于 games/<游戏>/assets/icons/<名称>.<ext>（目录 / 格式见 config/thumbnails.json）。
//   代码块 / 行内代码中的标记是语法示例，不参与校验。
// ---------------------------------------------------------------------------
/** 去掉围栏代码块与行内代码，避免把文档里的语法示例当成真实引用 */
function stripCode(text) {
  return text
    .replace(/```[\s\S]*?```/g, '')
    .replace(/~~~[\s\S]*?~~~/g, '')
    .replace(/`[^`\n]*`/g, '');
}

const ICON_NAME_RE = /^[a-z0-9][a-z0-9._-]*$/i;

for (const page of pages) {
  const body = stripCode(fs.readFileSync(path.join(root, page.rel), 'utf8'));
  for (const match of body.matchAll(ICON_REF_RE)) {
    const name = match[1].split(';')[0].trim();
    if (!ICON_NAME_RE.test(name) || name.includes('..')) {
      fail(`图标名称不合法：${page.rel} → [icon=${match[1]}]（只允许字母 / 数字 / . _ -）`);
      continue;
    }
    const base = path.join(gamesDir, page.game, thumbnails.icon.dir);
    const found = thumbnails.icon.extensions.some((ext) =>
      fs.existsSync(path.join(base, `${name}.${ext}`)),
    );
    if (!found) {
      fail(
        `图标不存在：${page.rel} → [icon=${name}]（应位于 games/${page.game}/${thumbnails.icon.dir}/${name}.${thumbnails.icon.extensions[0]}）`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// 游戏元数据校验（_game.yml / _games.yml）
//   对应 src/lib/game-meta.ts 的读取：非法字段在那里会被静默丢弃，这里提前报错，
//   避免「写了但没生效」的元数据一路混到线上。
// ---------------------------------------------------------------------------
const GAME_META_RE = /^games\/[^/]+\/_game\.ya?ml$/i;
const GAMES_META_RE = /^games\/_games\.ya?ml$/i;

const isPlainObject = (value) =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isStr = (value) => typeof value === 'string';

/** 校验单个 _game.yml 的字段类型（data = 已解析的 YAML 值） */
function checkGameMeta(data) {
  const problems = [];
  for (const key of ['title', 'shortTitle', 'subtitle', 'description', 'badge', 'cover']) {
    if (key in data && !isStr(data[key])) problems.push(`"${key}" 必须是字符串`);
  }
  if ('order' in data && typeof data.order !== 'number') problems.push('"order" 必须是数字');

  if ('links' in data) {
    if (!Array.isArray(data.links)) {
      problems.push('"links" 必须是数组');
    } else {
      data.links.forEach((link, i) => {
        if (!isPlainObject(link)) problems.push(`"links[${i}]" 必须是映射（label / href）`);
        else if (!isStr(link.label) || !isStr(link.href)) {
          problems.push(`"links[${i}]" 需要字符串类型的 label 与 href`);
        }
      });
    }
  }

  if ('categories' in data) {
    if (!Array.isArray(data.categories)) {
      problems.push('"categories" 必须是数组');
    } else {
      data.categories.forEach((category, i) => {
        if (!isPlainObject(category)) {
          problems.push(`"categories[${i}]" 必须是映射（id / label / order）`);
          return;
        }
        if (!isStr(category.id)) problems.push(`"categories[${i}].id" 必须是字符串`);
        if ('label' in category && !isStr(category.label)) {
          problems.push(`"categories[${i}].label" 必须是字符串`);
        }
        if ('description' in category && !isStr(category.description)) {
          problems.push(`"categories[${i}].description" 必须是字符串`);
        }
        if ('order' in category && typeof category.order !== 'number') {
          problems.push(`"categories[${i}].order" 必须是数字`);
        }
      });
    }
  }
  return problems;
}

/** 校验 _games.yml（全站游戏顺序）的字段类型 */
function checkGamesMeta(data) {
  if (!('order' in data)) return [];
  if (!Array.isArray(data.order)) return ['"order" 必须是数组'];
  const bad = data.order.findIndex((item) => !isStr(item) || item.trim() === '');
  return bad === -1 ? [] : [`"order[${bad}]" 必须是非空的游戏 id 字符串`];
}

for (const file of allFiles) {
  const isGameMeta = GAME_META_RE.test(file.rel);
  if (!isGameMeta && !GAMES_META_RE.test(file.rel)) continue;

  let data;
  try {
    data = parseYaml(fs.readFileSync(path.join(root, file.rel), 'utf8'));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    fail(`游戏元数据 YAML 解析失败：${file.rel}（${message}）`);
    continue;
  }
  if (data === null || data === undefined) continue; // 空文件 = 无元数据

  if (!isPlainObject(data)) {
    fail(`游戏元数据必须是 YAML 映射（键值对）：${file.rel}`);
    continue;
  }
  for (const problem of isGameMeta ? checkGameMeta(data) : checkGamesMeta(data)) {
    fail(`游戏元数据字段错误：${file.rel} → ${problem}`);
  }

  // 封面路径校验：相对路径须真实存在于该游戏目录；URL / 站内绝对路径原样使用
  if (isGameMeta && isStr(data.cover)) {
    const cover = data.cover.trim();
    const isExternal = /^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(cover) || cover.startsWith('/');
    if (!isExternal) {
      const gameId = file.rel.split('/')[1];
      if (!fs.existsSync(path.join(gamesDir, gameId, cover))) {
        fail(`封面文件不存在：${file.rel} → cover: ${cover}（应位于 games/${gameId}/${cover}）`);
      }
    }
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
