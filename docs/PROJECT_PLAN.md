# 项目规划：Wake up dude

## 1. 项目愿景 (Vision)
**"Wake up dude"** 是一款带有强烈个人风格的 AI 唤醒闹钟应用。
* **核心痛点解决：** 针对早上 8 点起床困难的问题，摒弃传统枯燥的闹铃，使用 AI 每天生成高度随机、带有情绪价值（警告、毒舌、或硬核励志）的专属语音将用户"骂"醒。
* **技术演练目标：** 作为从前端向移动端跨平台（React Native）延伸的实战练手项目，深度整合当前最前沿的 AI大模型能力（LLM + TTS），并在完成 MVP 后尝试上架 App Store，作为极具含金量的简历作品。

## 2. 核心架构设计 (Architecture)
受限于 iOS 严格的后台唤醒机制，应用无法在后台准点发起耗时的网络请求。

### 2.1 MVP 架构：「即时生成 + 本地推送」
用户设定闹钟时 **立即** 发起 AI 生成请求，设完闹钟 = 音频已就绪。

* **步骤一 (用户设定闹钟)：** 用户选择时间并点击"开启闹钟"，App **立即** 向代理服务发起 AI 生成请求。
* **步骤二 (AI 大脑处理)：** LLM 根据当前日期、用户状态生成极具针对性的短文案（≤50 字），随后交由 TTS 生成音频流。
* **步骤三 (本地存储)：** App 将音频下载至 `Library/Sounds/` 目录，格式为 `.caf` 或 `.wav`，**时长严格控制在 30 秒以内**。
* **步骤四 (准点唤醒)：** 注册 iOS Local Notification，`UNNotificationSound(named:)` 指向 `Library/Sounds/` 中的音频文件，系统准时播放。

> ⚠️ **iOS 自定义铃声硬限制：**
> - 时长上限 **30 秒**，超出将被静默忽略并回退为默认铃声
> - 文件必须位于 App 的 **main bundle** 或 **`Library/Sounds/`** 目录
> - 推荐格式：`.caf`（Linear PCM / IMA4）、`.wav`、`.aiff`；避免依赖 `.mp3`

### 2.2 进阶架构：「服务端预生成 + 静默推送下载」（后续迭代）
引入后端 cron job，服务端每晚为用户预生成音频，实现"设一次闹钟，每天自动更新内容"：

* 服务端在每晚固定时间（如 22:00）通过 cron job 为每位活跃用户调用 LLM + TTS 生成次日音频。
* 通过 APNs Silent Push 通知客户端有新音频可用。
* 客户端收到静默推送后，通过 **Notification Service Extension** 在后台下载音频至 `Library/Sounds/`。
* 次日闹钟准时播放最新生成的 AI 语音。

## 3. 技术栈选型 (Tech Stack)
全面拥抱现代前端工程化思想，以最高 ROI 交付跨平台应用：
* **框架选型：** **Expo** (采用 CNG 架构，规避原生环境配置的泥潭)。
* **路由方案：** **Expo Router** (基于文件系统的路由，平替 Next.js App Router 心智)。
* **核心依赖库：**
    * `expo-notifications`: 处理本地定时推送。
    * `expo-file-system`: 读写生成的 AI 语音文件。
    * `expo-sqlite`: 替代 Web 端的 localStorage，用于持久化存储闹钟历史记录和用户偏好设置。
    * `expo-av`: 用于应用内的音频试听与播放。
    * `expo-haptics`: 闹钟触发时配合震动反馈，强化唤醒效果。
* **AI 服务接入：**
    * **LLM + TTS:** Google **Gemini 2.5 Flash** — 一个 API 同时完成文案生成和语音合成（多模态音频输出），成本低、响应快。
* **API 代理服务：** **Cloudflare Worker / Vercel Edge Function** (详见 §5 说明)。

## 4. 核心亮点：AI Prompt 设计 (The "Soul")
为了保证叫醒效果，必须为 AI 设定极其鲜明的人设，并注入当前的生活上下文。

### 4.1 多种人设模式（用户自选）
| 模式 | 风格 | 示例语气 |
|---|---|---|
| 🔥 毒舌监督员 | 严厉、一针见血、压迫感 | "都几点了还躺着？你的简历不会自己投。" |
| 💪 军训教官 | 硬核命令式 | "起床！10 秒内！给我站起来做 10 个深蹲！" |
| 🌸 温柔女友 | 撒娇但暗藏杀机 | "宝贝起床啦～再不起来我就把咖啡倒掉了哦。" |
| 🤝 社畜互助 | 同理心 + 现实打击 | "兄弟，HR 已读不回了，你还睡得着？" |

### 4.2 Prompt 示例模板
```json
{
  "system_prompt": "你是一个{persona_mode}。你的任务是用极其简短、一针见血的话语叫醒用户。风格要鲜明，语气要有冲击力。",
  "context": {
    "current_time": "早上 8:00",
    "user_status": "即将面临高强度的高级前端系统设计面试，目前处于待业冲刺阶段。",
    "morning_routine": "需要立刻起床给自己煮一壶摩卡咖啡，并完成一组壶铃训练。"
  },
  "instruction": "生成一段不超过 50 个字的叫醒文案，适合转换为语音播放。"
}
```

> 💡 **关于 context 字段：** MVP 阶段使用用户手动填写的硬编码信息（状态、晨间 routine）。后续迭代可接入 `expo-calendar`（自动读取当日待办）和天气 API（注入天气信息）实现动态上下文。

## 5. API 代理服务设计 (Security Layer)

### 为什么需要代理服务？
如果 App 直接携带 Gemini API Key 调用接口，一旦上架应用商店：
- API Key **必定被逆向提取**（APK 解包 → strings 搜索即可）
- 任何人拿到 Key 后可无限调用，导致 **账单失控**

### 架构设计
```
Client App → Edge Function（身份验证 + 请求限流）→ Gemini API
```

### 实现方案（≤50 行代码）
使用 **Cloudflare Worker** 或 **Vercel Edge Function**，核心职责：
1. **隐藏 API Key**：Key 仅存在于服务端环境变量中，客户端永远不接触
2. **请求限流**：按设备 ID 限制每日调用次数（如每设备每天 ≤ 3 次）
3. **请求验证**：校验请求来源，拒绝非法调用

> 💡 这也是一个面试加分点——展示了对客户端安全、API 网关设计和 Edge Computing 的理解。

## 6. 开发迭代计划 (Sprints)

> ⚠️ **平台切换说明：** 因开发机存储空间不足无法安装 Xcode，切换到 **Android** 作为首要开发平台。使用 **EAS Build**（云端构建）生成 APK，无需本地安装 Android Studio。iOS 适配放到后续迭代。

> 💡 **Android 自定义通知铃声要点：**
> - 音频文件放置于 `res/raw/` 目录
> - 推荐格式：`.ogg`（Vorbis）、`.wav`；支持 `.mp3`
> - 没有 30 秒的硬限制（但建议控制在合理时长内）
> - 通过 Expo 的 CNG（Continuous Native Generation）+ config plugin 注入原生资源

### Sprint 1: 项目初始化 ✅
* [x] 使用 `create-expo-app` 初始化 Expo Router 工程。
* [x] 搭建极简 UI：一个时间选择器（设定早上 8:00）和一个"开启闹钟"按钮。

### Sprint 2: 本地通知 + 自定义铃声验证 ← **当前**
* [ ] 配置 EAS Build，构建 Android Development Build APK。
* [ ] 获取通知权限，集成 `expo-notifications`。
* [ ] **核心验证**：放入一个固定的测试音频文件，确保 Local Notification 能在指定时间准确播放自定义铃声。
* [ ] 验证铃声格式兼容性（`.ogg` / `.wav`）。

### Sprint 3: 接入 AI 大脑 + API 代理 (智能化)
* [ ] 部署 API 代理服务（Cloudflare Worker / Vercel Edge Function），实现 OpenAI API 的安全中转与限流。
* [ ] 编写纯 Node.js 脚本，跑通 LLM → TTS 的 API 调用链路。
* [ ] 将 API 逻辑集成到 Expo 项目中，实现闹钟设定时触发 AI 生成请求。
* [ ] 实现完整闭环：设定闹钟 → 触发 AI 生成 → 下载音频 → 注册 Local Notification。

### Sprint 4: 产品化与打磨 (Ready for App Store)
* [x] 引入 Expo Router 多页 Tab 导航结构（首页 / 历史 / 设置）。
* [x] 引入 `expo-sqlite` 记录历史生成的"毒舌语录"，支持动态加载回听录音的"名场面"。
* [x] 实现音频缓存独立化存储，与历史记录生命周期绑定。
* [x] 实现独立的「全局设置页面 (Settings)」：
  * [x] 面板核心 1: 将人设偏好选择 (Persona) 从首页精简移除并在此集成。
  * [x] 面板核心 2: 文本生成大模型版本切换 (如 `gemini-3.1-pro-preview` 等)。
  * [x] 面板核心 3: 语音合成底层大模型切换 (如 `gemini-2.5-pro-preview-tts` 等)。
* [x] 优化 UI/UX：增加滑动关闭闹钟的交互，适配暗色模式，集成 `expo-haptics` 震动反馈。
* [x] 错误兜底机制：如果网络请求失败，自动回退到默认的刺耳备用铃声（预置在 bundle 中）。
* [x] 准备上架所需的各种 Icon、截图和隐私协议。

### Sprint 5: 进阶迭代 (Post-Launch)
* [ ] 接入天气 API，将实时天气信息注入 AI Prompt context。
* [ ] 接入 `expo-calendar`，自动读取当日待办事项作为叫醒素材。
* [ ] 实现服务端预生成架构（cron job + Push Notification）。
* [ ] iOS 适配（需要 Xcode 或 EAS Build iOS；`Library/Sounds/` + `.caf` 格式 + 30 秒限制）。

