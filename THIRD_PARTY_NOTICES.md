# 第三方资源与内容来源

## 字体

使用 Lora、Source Sans 3、Noto Sans SC / TC / JP / KR 与 Noto Serif SC / TC / JP 的子集。修改后的内部名称使用 Atlas。各字体的版权与 SIL Open Font License 文本位于 `assets/fonts/licenses/`，字体来源、原始文件和子集哈希位于 `assets/fonts/manifest.json`。静态部署目录附带相同许可。

## 图像与图解

`assets/research-workbench.png` 和 `assets/human-ai-workbench.png` 为 AI 生成的教学情境插画。它们不是历史照片、提案原件或真实系统测评结果。网页中的交互图表使用自建教学数据，相关边界在展品中标明。

## 文献、馆藏与新闻

网页保留论文、课程、规范和公开新闻的来源链接。来源索引位于 `src/catalog.json`，新闻原标题、原摘要、来源与时间保留在 `data/news.json`，译文另存于 `data/news-translations.json`。第三方内容的权利归相应权利人，不能将本仓库的公开状态解释为对第三方内容的重新授权。

## 开发依赖

Prettier 仅用于开发时格式化，不是访客运行依赖。普通构建、本地预览及教学实验不需要第三方运行库。
