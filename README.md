# Wikifactory-Content

[Wikifactory](https://wikifactory.top) 多游戏 Wiki 的**内容仓库**：只存页面层级、Markdown 正文与 frontmatter 元数据，不含站点代码与主题。

## 目录即结构

```
games/
├── _games.yml                  # （可选）全站游戏顺序
└── <游戏>/                     # 一级目录 = 游戏（目录名 = game id / URL 顶层）
    ├── _game.yml               # （可选）该游戏的展示元数据
    ├── assets/icons/           # （可选）正文内联图标：<名称>.<ext>
    ├── assets/images/          # （可选）正文大图：<名称>.<ext>
    └── <分类>/                 # 二级目录 = 分类
        └── <任意层级>/<页面>.md # 页面；扩展名必须是小写 .md / .mdx
```

- 文件路径与 URL 一一对应：`games/Satisfactory/Buildings/MAM.md` → `/Satisfactory/Buildings/MAM/`。
- 页面至少位于 `games/<游戏>/<分类>/<页面>.md`；游戏主页与分类索引页由站点自动生成，不要手写同名文件。
- **新增游戏直接建目录即可**，无需在任何地方注册。

## 开始贡献

**[CONTRIBUTING.md](CONTRIBUTING.md) 是内容侧的全部约定**：frontmatter 字段、`_game.yml`、首页缩略图、横幅 / 表格颜色、图标与正文大图、站内链接、命名与保留路径、提交前自检。提交前请先读一遍。

```bash
npm install
npm run content:validate   # 本地内容门禁
```

同一门禁会在 push / PR 时自动运行；任一处失败即阻断合并。

## 页面别名

页面别名（让手输的非正式路径落到正确页面）不在本仓库维护，见公开仓库 [Wikifactory-Alias](https://github.com/hellokug2699/Wikifactory-Alias)。

## 安全

本仓库**公开可读**：请勿提交任何密钥、令牌、凭据或个人隐私信息。
