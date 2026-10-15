# Wikifactory-Content

Wikifactory 多游戏 Wiki 的**内容仓库**：只存页面层级 + Markdown + frontmatter 元数据，不含主题与代码。

核心代码、全局主题与运营脚本位于私有仓库 **Wikifactory-Core**。

> 内容贡献请先阅读 **[CONTRIBUTING.md](CONTRIBUTING.md)**：目录约定、frontmatter 字段、`_game.yml`、横幅 / 表格颜色等格式约定全部写在其中。

## 目录结构

```
Wikifactory-Content/
├── games/
│   ├── Satisfactory/
│   │   ├── Buildings/
│   │   │   ├── MAM.md
│   │   │   └── ...
│   │   └── Items/
│   └── Dyson-Sphere-Program/
│       └── ...
├── config/
│   └── reserved-paths.json    # 站点保留顶层路径（与私有 Core 同源，勿单独修改）
├── scripts/
│   └── validate-content.mjs   # 内容质量门禁（与私有 Core 同源）
├── CONTRIBUTING.md            # 内容贡献指南（面向内容作者）
├── package.json
└── README.md
```

- 一级目录 = 游戏（**新增游戏直接放目录即可，无需注册任何配置**）
- 二级目录 = 分类
- 其余路径 = 页面 URL（`games/Satisfactory/Buildings/MAM.md` → `/Satisfactory/Buildings/MAM/`）

## 内容质量门禁

```bash
npm run content:validate
```

脚本固定扫描 `./games/`，递归全部 `.md` / `.mdx`，在内存中建立**全局索引**后统一检查（而非逐个目录判断）：

| 类别 | 检查 |
| --- | --- |
| 结构 | 页面须位于 `games/<game>/<category>/<...>/<page>.md｜.mdx`；是否在 `games/` 下、层级是否达标、扩展名是否小写 |
| 命名 | 目录 / 文件名合法性（宽松：仅拦 `/ \ : * ? " < > \|`、控制字符、首尾空白与点） |
| 冲突 | **重复 URL**（`Foo.md` 与 `Foo.mdx` → 同一 `/<id>/`）、大小写冲突（文件与目录） |
| 元数据 | `title` / `description` 字符串；`tags` 字符串数组；`order` 数字；`draft` / `toc` 布尔；`updated` 合法日期 |

失败时退出码为 1：

```
❌ Content validation failed

共 1 个问题：

  • Duplicate page ID: Satisfactory/Buildings/MAM → games/Satisfactory/Buildings/MAM.md, games/Satisfactory/Buildings/MAM.mdx
```

> 为什么必须拦重复 URL：`Foo.md` 与 `Foo.mdx` 会让 Astro **构建成功**，但两者映射到同一个 `/<...>/Foo/` 输出，其中一个被静默覆盖。

同一门禁也在私有 Core 的 CI 中执行（同步内容后、构建前）；本仓库的 GitHub Actions（[.github/workflows/validate-content.yml](.github/workflows/validate-content.yml)）则在 push / PR 时自动运行。

## 新增游戏

直接创建目录即可，Validator 无需任何改动：

```
games/Minecraft/
games/Oxygen-Not-Included/
games/Arcaea/
```
