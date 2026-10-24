# Wikifactory-Content

Wikifactory 多游戏 Wiki 的**内容仓库**：只存页面层级 + Markdown + frontmatter 元数据，不含主题与代码。

核心代码、全局主题与运营脚本位于私有仓库 **Wikifactory-Core**。

> 内容贡献请先阅读 **[CONTRIBUTING.md](CONTRIBUTING.md)**：目录约定、frontmatter 字段、`_game.yml`、缩略图（封面 / 物品图标）、横幅 / 表格颜色等格式约定全部写在其中。

## 目录结构

```
Wikifactory-Content/
├── games/
│   ├── Satisfactory/
│   │   ├── _game.yml           # （可选）该游戏的展示元数据
│   │   ├── _cover.svg          # （可选）首页缩略图，可改为 _cover.png 等
│   │   ├── assets/icons/       # （可选）正文内联图标：<名称>.<ext>，正文 [icon=名称] 引用
│   │   ├── Buildings/
│   │   │   ├── MAM.md
│   │   │   └── ...
│   │   └── Items/
│   └── Dyson-Sphere-Program/
│       └── ...
├── config/
│   ├── reserved-paths.json    # 站点保留顶层路径（与私有 Core 同源，勿单独修改）
│   └── thumbnails.json        # 缩略图标准：封面文件名 / 图标目录 / 尺寸预设（与 Core 同源）
├── scripts/
│   └── validate-content.mjs   # 内容质量门禁（与私有 Core 同源）
├── CONTRIBUTING.md            # 内容贡献指南（面向内容作者）
├── package.json
└── README.md
```

- 一级目录 = 游戏（**新增游戏直接放目录即可，无需注册任何配置**）
- 二级目录 = 分类
- 其余路径 = 页面 URL（`games/Satisfactory/Buildings/MAM.md` → `/Satisfactory/Buildings/MAM/`）
- `assets/` 放图片资源（图标），不是页面目录

## 内容质量门禁

```bash
npm install            # 首次需安装依赖（门禁脚本依赖 yaml）
npm run content:validate
```

脚本固定扫描 `./games/`，递归全部 `.md` / `.mdx`，在内存中建立**全局索引**后统一检查（而非逐个目录判断）：

| 类别 | 检查 |
| --- | --- |
| 结构 | 页面须位于 `games/<game>/<category>/<...>/<page>.md｜.mdx`；是否在 `games/` 下、层级是否达标、扩展名是否小写 |
| 命名 | 目录 / 文件名合法性（宽松：仅拦 `/ \ : * ? " < > \|`、控制字符、首尾空白与点） |
| 保留字 | 游戏目录名不得与站点自身顶层路径同名（`search` / `pagefind` / `_astro` / `404`，见 `config/reserved-paths.json`） |
| 冲突 | **重复 URL**（`Foo.md` 与 `Foo.mdx` → 同一 `/<id>/`）、大小写冲突（文件与目录） |
| 元数据 | `title` / `description` 字符串；`tags` 字符串数组；`order` 数字；`draft` / `toc` 布尔；`updated` 合法日期 |
| 游戏元数据 | `_game.yml` / `_games.yml` 的 YAML 解析与字段类型 |
| 缩略图 | 正文 `[icon=名称]` 必须有对应图标文件（`games/<游戏>/assets/icons/`，代码块内的语法示例不校验）；`_game.yml` 的 `cover` 相对路径必须存在（标准见 `config/thumbnails.json`） |

失败时退出码为 1：

```
❌ Content validation failed

共 1 个问题：

  • Duplicate page ID: Satisfactory/Buildings/MAM → games/Satisfactory/Buildings/MAM.md, games/Satisfactory/Buildings/MAM.mdx
```

> 为什么必须拦重复 URL：`Foo.md` 与 `Foo.mdx` 会让 Astro **构建成功**，但两者映射到同一个 `/<...>/Foo/` 输出，其中一个被静默覆盖。

同一门禁也在私有 Core 的 CI 中执行（同步内容后、构建前）；本仓库的 GitHub Actions（[.github/workflows/validate-content.yml](.github/workflows/validate-content.yml)）则在 push / PR 时自动运行。

> 仓库已加入 `.gitattributes`（`* text=auto eol=lf`）。共享规则文件 `scripts/content-rules.mjs` 靠 sha256 逐字节校验，Windows 检出若转成 CRLF 会误报「共享规则不一致」；重新检出或 `git add --renormalize .` 即可恢复。

## 新增游戏

直接创建目录即可，Validator 无需任何改动：

```
games/Minecraft/
games/Oxygen-Not-Included/
games/Arcaea/
```
