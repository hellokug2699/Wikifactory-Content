# 贡献指南（Wikifactory-Content）

本仓库是 Wikifactory 多游戏 Wiki 的**内容仓库**：只存放**页面层级 + Markdown + frontmatter 元数据**。
站点代码、主题、路由与运营脚本位于**私有**仓库 Wikifactory-Core —— 内容贡献者无需（也无法）访问它，
因此**本文件就是内容侧所需的全部约定**：结构与格式都写在这里。

## 目录即结构

```
games/
├── _games.yml                  # （可选）全站游戏顺序
└── <游戏>/                     # 一级目录 = 游戏（目录名 = game id / URL 顶层，保留大小写）
    ├── _game.yml               # （可选）该游戏的展示元数据
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
description: 开放世界工厂建造游戏资料库
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

优先级（低 → 高）：`_game.yml` → `_games.yml`（仅顺序）→ Core 侧覆盖（维护者使用）。内容侧只需维护前两者。

## 正文格式

标准 Markdown（标题、列表、表格、代码块、图片等）。此外站点额外提供两种格式：

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

门禁会校验：目录结构、页面 frontmatter 字段类型、重复 URL / 大小写冲突、保留路径，
以及 `_game.yml` / `_games.yml` 的 YAML 解析与字段类型。本仓库的 CI 在 push / PR 时自动运行同一门禁；
私有 Core 的 CI 在构建前也会运行它（同源副本）。任一处失败即阻断合并。

## 别名（Wikifactory-Alias）

页面别名（让用户手输的「非正式路径」也能落到正确页面）不在本仓库维护，见公开仓库 **Wikifactory-Alias**，请在那边提交。

## ⚠️ 安全

本仓库**公开可读**：请勿提交任何密钥、令牌、凭据或个人隐私信息。所有凭据只放在私有 Core 仓库。
