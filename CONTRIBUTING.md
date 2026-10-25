# 贡献指南（Wikifactory-Content）

本仓库是 Wikifactory 多游戏 Wiki 的**内容仓库**：只存放**页面层级 + Markdown + frontmatter 元数据**。

**本文件就是内容侧所需的全部约定**：结构与格式都写在这里，按下面的顺序读完即可开始贡献。

## 目录即结构

```
games/
├── _games.yml                  # （可选）全站游戏顺序
└── <游戏>/                     # 一级目录 = 游戏（目录名 = game id / URL 顶层，保留大小写）
    ├── _game.yml               # （可选）该游戏的展示元数据
    ├── assets/icons/           # （可选）正文内联图标：<名称>.<ext>
    ├── assets/images/          # （可选）正文大图：<名称>.<ext>
    └── <分类>/                 # 二级目录 = 分类
        └── <任意层级>/<页面>.md # 页面；扩展名必须是小写 .md / .mdx
```

- **新增游戏**：直接在 `games/` 下建目录即可，无需在任何地方注册。
- 文件路径与 URL 一一对应（目录式 URL，保留大小写）：

  | 文件 | URL |
  | --- | --- |
  | `games/Satisfactory/Buildings/MAM.md` | `/Satisfactory/Buildings/MAM/` |
  | —（自动生成） | `/Satisfactory/Buildings/` 分类索引页 |
  | —（自动生成） | `/Satisfactory/` 游戏主页 |

- 页面必须至少位于 `games/<游戏>/<分类>/<页面>.md`（三级）。分类索引页与游戏主页由站点**自动生成**，
  **不要**手写同名文件去占用它们的路径。

## 页面元数据（frontmatter，均可选）

```yaml
---
title: 页面标题          # 缺省 = 文件名（MAM.md → MAM）
description: 摘要        # 用于列表卡片与 SEO
tags: [攻略, 机制]       # 字符串数组
order: 10               # 同分类内排序，越小越靠前（默认 100）
draft: false            # true 时仅开发环境可见、正式构建不输出
updated: 2026-10-13     # 更新时间（YYYY-MM-DD）
toc: true               # 是否显示页内目录（缺省跟随站点设置）
---
```

门禁会校验字段类型，写错会阻断 CI：

| 字段 | 类型 |
| --- | --- |
| `title` | 字符串 |
| `description` | 字符串 |
| `tags` | 字符串数组 |
| `order` | 数字 |
| `draft` | 布尔 |
| `updated` | 合法日期（`YYYY-MM-DD` 或 ISO 时间） |
| `toc` | 布尔 |

> 未声明的额外字段会被接受（宽松模式），但请先与维护者沟通。

## 游戏展示元数据（可选）

不写 `_game.yml` 时，游戏展示名 = **目录名原样**（例如 `Dyson-Sphere-Program` 就会显示成带连字符的样子）。
需要更友好的展示时，在该游戏目录下放一个可选的 `_game.yml`：

```yaml
# games/Satisfactory/_game.yml（可选）
title: Satisfactory                 # 缺省 = 目录名
shortTitle: 满意                    # 顶部导航 / 面包屑用短名
subtitle: 满意工厂                  # 首页图墙标题下方的次要文字（可选）
description: 开放世界工厂建造游戏资料库
cover: _cover.svg                   # 首页缩略图（可选；缺省取约定文件 _cover.<ext>）
order: 1                            # 首页排序，越小越靠前
badge: 公测                         # 状态徽标（可选）
links:                              # 游戏专属外链（官网 / 社区 / 数据站）
  - label: 官方网站
    href: https://www.satisfactorygame.com/
categories:                         # 分类展示覆盖（id = 二级目录名，区分大小写）
  - id: Buildings
    label: 建筑
    order: 1
```

全站游戏顺序用可选的 `games/_games.yml`：

```yaml
order:
  - Satisfactory
  - Factorio
```

优先级（低 → 高）：`_game.yml` → `_games.yml`（仅顺序）→ 站点侧覆盖（维护者使用）。内容侧只需维护前两者。

### 首页缩略图（大缩略图）

首页「游戏板块」以**缩略图 + 文字**展示每个游戏。缩略图由你（编辑者）提供，二选一：

1. **约定文件名（推荐）**：把图片放进该游戏目录，命名为 `_cover.<ext>`
   （支持 `png` / `jpg` / `jpeg` / `webp` / `avif` / `gif` / `svg`）。
   例：`games/Satisfactory/_cover.png` —— 放进去即生效，无需改 `_game.yml`。
2. **显式指定**：在 `_game.yml` 写 `cover:`，值为相对该游戏目录的路径（如 `cover.png`）或绝对 URL（如 `https://…`，原样使用）。

- 建议尺寸约 16:10（例 640×400），会被裁切填充（`object-fit: cover`）。
- 未提供时首页显示占位块（游戏标题首字母），不影响构建与其它页面。

## 正文格式

标准 Markdown（标题、列表、表格、代码块、图片等）。此外站点额外提供三种格式：

### 横幅 / 提示框（callout）

```
:::warning[注意]
正文，支持 **加粗**、`代码`、列表、表格等。
:::
```

- 语法：`:::类型[标题]` … `:::`；`[标题]` 可省略，省略时使用该类型的默认标题。
- 未知类型会回退为 `note` 并在构建期给出警告。

| 类型 | 中文别名 | 默认标题 | 色调 |
| --- | --- | --- | --- |
| `note` | 说明、备注 | 说明 | 中性 |
| `tip` | 提示、技巧 | 提示 | 成功 |
| `warning` | 注意、警告 | 注意 | 警告 |
| `danger` | 危险 | 危险 | 危险 |
| `info` | 信息 | 信息 | 主题色 |
| `example` | 示例 | 示例 | 中性 |

### 表格单元格颜色

在单元格内容**最前面**写 `[bg=色号;fg=色号]`（可只写其一），标记会被移除，色号透传到单元格：

```md
| 名称 | 数量 | 备注 |
| --- | --- | --- |
| 铁锭 | [bg=#ffe0b2;fg=#7a4f01]42 | 常规 |
| 纯文本 | [fg=#c62828]红字 | 仅文字色 |
```

也可以用**快捷色名**（前缀 `&`，大小写不敏感），省去记忆色号：

```md
| 状态 | 数量 |
| --- | --- |
| 充足 | [bg=&G]120 |
| 告急 | [bg=&R;fg=#ffffff]3 |
```

| 快捷色名 | 颜色 |
| --- | --- |
| `&R` / `&red` | 红 |
| `&O` / `&orange` | 橙 |
| `&Y` / `&yellow` | 黄 |
| `&G` / `&green` | 绿 |
| `&B` / `&blue` | 蓝 |
| `&P` / `&purple` | 紫 |
| `&K` / `&gray` | 灰 |

- 颜色值必须是**合法 CSS 颜色**（`#rgb` / `#rrggbb` / 颜色名 / `rgb()` 等）或上表的快捷色名；
  非法值（如 `url(…)`）会被丢弃并在构建期告警。
- ⚠️ 单元格颜色是内联样式，**不随站点亮 / 暗主题自动反色**：请同时给出 `bg` 与 `fg` 以保证对比度。

### 正文小缩略图（物品图标）

合成表等场景的**内联小图标**：把图标放进该游戏的 `assets/icons/` 目录，文件名即名称（不含扩展名），
正文直接写标记——**不需要写路径、像素尺寸或格式**：

```
games/Satisfactory/assets/icons/iron-plate.svg   ← 图标文件（文件名 = 名称）
```

```md
| 产物 | 材料 | 耗时 |
| --- | --- | --- |
| [icon=iron-plate] 铁板 | [icon=iron-ingot] 铁锭 ×2 | 6 秒 |
| [icon=screw;size=lg] 螺丝 | [icon=iron-plate;bg=#f5f5f5;fg=#333] 铁板 ×1 | 4 秒 |
```

- **名称**：`assets/icons/<名称>.<ext>` 的文件名主干，只允许字母 / 数字 / `.` `_` `-`。
- **尺寸**：只写预设 `sm`（默认，20px，合成表内联）/ `md`（24px）/ `lg`（32px），不写像素值。
- **格式**：`svg` / `png` / `webp` / `jpg` / `jpeg` / `avif` / `gif`（按此顺序查找）。
- **与底色组合**：同一个方括号里可加 `bg=` / `fg=`（规则同上方「表格单元格颜色」）。
- 图标后继续写物品名即可（图标本身是装饰，不重复朗读名称）。
- 代码块 / 行内代码中的标记保持原文，可用于书写语法示例。
- 图标缺失或名称非法：构建期会保留原文并告警；**内容门禁会直接报错**，请在合并前补上图标文件。

> 图标标准（目录 / 格式 / 尺寸）由 `config/thumbnails.json` 统一定义，
> 编辑者只需按上面约定放图与写标记。

### 正文大图（MediaWiki 风格）

正文配图放进该游戏的 `assets/images/`，用 `[[File/…]]` 引用，**不写路径、HTML 或像素值**：

```md
[[File/factory.png|thumb|md|alt=工厂全景|工厂全景]]
[[File/iron-plate.png;thumb;md]]          ← 表格内用 ; 分隔选项
```

- **选项**：`thumb` / `frame`（边框）、`sm` / `md` / `lg` / `full`（尺寸预设）、
  `left` / `center` / `right`（对齐）、`alt=…`，最后一个纯文本为图注。
- **尺寸**：只写预设，不写像素；`300px` 会被映射到最近预设并提示。
- **为什么是 `File/` 而不是 `File:`**：站点用 `:::warning` 横幅的 directive 特性，会把 `:名称`
  当作 text directive，`[[File:demo.png]]` 会被拆开。`File/` 不冲突；确需冒号时写 `[[File\:demo.png]]`。
- **表格里的竖线**：Markdown 表格会把 `|` 当列分隔符。图片写在表格里时请用 `;` 分隔选项
  （`[[File/pic.png;lg]]`）；用 `|` 会被构建门禁阻断。
- 图片缺失 / 名称非法：`npm run content:validate` 不检查这两项；站点构建会在合并前额外运行
  `npm run wiki:validate`。建议本地先确认 `assets/images/` 下文件存在。

### 站内链接

```md
[[Satisfactory/Buildings/MAM|MAM 建筑]]   ← 显式页面 id
[[MAM]]                                  ← 当前游戏内按标题 / 文件名解析
[[Satisfactory]]                         ← 游戏主页
[[Buildings]]                            ← 当前游戏下的分类页
[[#合成]]                                ← 当前页面锚点
```

- 显式路径写错会被构建时的 Wiki 语法门禁阻断；裸标题找不到只告警（可能指向别名）。

## 命名与保留路径规则

- 目录 / 文件名不得包含 `/ \ : * ? " < > |`、控制字符或首尾空白，不得以点开头；扩展名必须是小写 `.md` / `.mdx`。
- **游戏目录名会成为 URL 顶层**，因此不得与站点自身路径同名（登记于 `config/reserved-paths.json`：
  `search` / `pagefind` / `_astro` / `404`，大小写不敏感）。门禁会**阻断**这类命名。
- 同一路径下不得出现 `Foo.md` 与 `Foo.mdx`（会映射到同一 URL，静默覆盖其一）；也不允许仅大小写不同的文件 / 目录。

## 提交前自检

```bash
npm install            # 首次需安装依赖（门禁脚本依赖 yaml）
npm run content:validate
```

脚本固定扫描 `./games/`，递归全部 `.md` / `.mdx`，在内存中建立**全局索引**后统一检查：

| 类别 | 检查 |
| --- | --- |
| 结构 | 页面是否位于 `games/<游戏>/<分类>/<...>/<页面>.md｜.mdx`；层级是否达标、扩展名是否小写 |
| 命名 | 目录 / 文件名合法性（仅拦 `/ \ : * ? " < > \|`、控制字符、首尾空白与点） |
| 保留字 | 游戏目录名不得与站点自身顶层路径同名（`search` / `pagefind` / `_astro` / `404`，见 `config/reserved-paths.json`） |
| 冲突 | **重复 URL**（`Foo.md` 与 `Foo.mdx` → 同一 `/<id>/`）、大小写冲突（文件与目录） |
| 元数据 | `title` / `description` 字符串；`tags` 字符串数组；`order` 数字；`draft` / `toc` 布尔；`updated` 合法日期 |
| 游戏元数据 | `_game.yml` / `_games.yml` 的 YAML 解析与字段类型 |
| 缩略图 | 正文 `[icon=名称]` 必须有对应图标文件；`_game.yml` 的 `cover` 相对路径必须存在（标准见 `config/thumbnails.json`） |

失败时退出码为 1：

```
❌ Content validation failed

共 1 个问题：

  • Duplicate page ID: Satisfactory/Buildings/MAM → games/Satisfactory/Buildings/MAM.md, games/Satisfactory/Buildings/MAM.mdx
```

> 为什么必须拦重复 URL：`Foo.md` 与 `Foo.mdx` 会让构建**成功**，但两者映射到同一个 `/<...>/Foo/` 输出，其中一个被静默覆盖。

本仓库的 GitHub Actions（[.github/workflows/validate-content.yml](.github/workflows/validate-content.yml)）在 push / PR 时自动运行；站点构建前也会再运行一次。任一处失败即阻断合并。

> 仓库已加入 `.gitattributes`（`* text=auto eol=lf`）。共享规则文件 `scripts/content-rules.mjs` 靠 sha256 逐字节校验，Windows 检出若转成 CRLF 会误报「共享规则不一致」，重新检出或 `git add --renormalize .` 即可恢复。

## 别名（Wikifactory-Alias）

页面别名（让用户手输的「非正式路径」也能落到正确页面）不在本仓库维护，见公开仓库 **Wikifactory-Alias**，请在那边提交。

## ⚠️ 安全

本仓库**公开可读**：请勿提交任何密钥、令牌、凭据或个人隐私信息。
