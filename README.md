# Notivue

把视频变成可阅读、可理解、可沉淀的学习资源。

Notivue 是一个本地优先的 Chrome 浏览器扩展。它在视频播放页旁边提供逐字稿、双语翻译、AI 章节、金句、划词解释和带时间戳的笔记。AI 使用你自己的密钥（BYOK），设置、缓存和笔记全部保存在浏览器本地。

## MVP 能力

- YouTube 官方字幕轨道，无第三方字幕服务

- 原文、译文、双语三种阅读模式

- 字幕搜索、播放进度跟随、点击时间戳跳转

- AI 视频概览、章节和金句

- 选中文字后结合上下文解释

- 带时间戳的本地笔记

- 导出完整 Markdown 学习资料

- OpenAI-compatible API，可使用 DeepSeek、OpenAI、豆包、GLM、Kimi、MiniMax 或自定义服务

## 安装

1. 打开 Chrome 的 `chrome://extensions`。
2. 开启右上角“开发者模式”。
3. 点击“加载已解压的扩展程序”。
4. 选择本项目根目录。
5. 在自动打开的设置页填写 API Base URL、模型和 API Key。
6. 打开一个带字幕的 YouTube 视频，点击扩展图标。

API Key 只应在扩展设置页内填写，不要写入代码、截图或聊天消息。

## 默认 AI 配置

DeepSeek：

- Base URL：`https://api.deepseek.com`

- Model：`deepseek-chat`

OpenAI：

- Base URL：`https://api.openai.com/v1`

- Model：`gpt-4.1-mini`

豆包（火山方舟）：

- Base URL：`https://ark.cn-beijing.volces.com/api/v3`

- Model：填写在火山方舟创建的推理接入点 ID

智谱 GLM：

- Base URL：`https://open.bigmodel.cn/api/paas/v4`

- Model：`glm-4.5-flash`

Kimi：

- Base URL：`https://api.moonshot.cn/v1`

- Model：`kimi-k2.5`

MiniMax：

- Base URL：`https://api.minimaxi.com/v1`

- Model：`MiniMax-M2.1`

自定义服务需要兼容 `POST /chat/completions`，并支持 JSON response format。保存设置时，Chrome 会请求访问该 API 域名的权限。

## 数据边界

- Notivue 没有账号系统、服务端、分析埋点或遥测。

- YouTube 字幕从当前播放页提供的官方 `timedtext` 地址读取。

- AI 功能只在用户主动触发时，把当前任务所需文本发送给配置的模型服务。

- API Key、字幕缓存、AI 结果和笔记保存在 `chrome.storage.local`。

- 卸载扩展会清除这些本地数据。

## 开发

```bash
npm test
npm run check
npm run package
```

打包产物位于 `dist/notivue-v<version>.zip`。

## 多站点路线

站点能力通过统一消息契约隔离，后续适配器均输出相同的视频与字幕结构。

1. YouTube：MVP，读取页面官方字幕轨道。
2. DeepLearning.AI：复用其 YouTube/Wistia 播放源，增加课程元数据。
3. Bilibili：登录态下调用 B 站官方字幕接口。
4. TED：读取 TED 官方 transcript 与段落时间戳。

后续版本不会把第三方字幕聚合服务设为必需依赖；没有官方字幕时，可再提供明确启用的本地语音转写选项。

## 已知限制

- 首版仅验证 Chrome 116+ 的标准 YouTube `watch` 页面。

- 无字幕、直播、Shorts、受限视频暂不支持。

- 超长视频的 AI 概览当前最多发送约 60,000 个字符，后续会改为分层摘要。

- 自定义 AI 服务必须支持 OpenAI-compatible chat completions。

## License

MIT
