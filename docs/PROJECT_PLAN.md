# 项目规划：Wake up dude (已安全生产化)

## 1. 项目愿景 (Vision)
**"Wake up dude"** 是一款带有强烈个人风格的 AI 唤醒闹钟应用。
* **核心痛点解决：** 针对早上起床困难的问题，摒弃传统枯燥的闹铃，使用 AI 每天生成高度随机、带有情绪价值（警告、毒舌、或硬核励志）的专属语音将用户"骂"醒。
* **技术演练目标：** 作为从前端向移动端跨平台（React Native）延伸的实战练手项目，深度整合当前最前沿的 AI大模型能力（LLM + TTS），并在完成 MVP 后成功构建分发级包体（APK + 商店配置），是一份极具含金量的应用级工程履历作品。

## 2. 核心架构设计 (Architecture)

### 2.1 最终生产架构：「即时生成 + 边缘计算防刷 + 本地持久化推送」
* **步骤一 (设定闹钟)：** 用户选择时间并点击"开启闹钟"。前端立即发起请求到部署在高可用网络节点上的 Cloudflare Worker 云端代理。
* **步骤二 (边缘计费拦截)：** Cloudflare Worker 拦截请求，提取 `CF-Connecting-IP`，验证该设备今日调用次数是否超过免费阈值（现配置为每天 3 次封顶）。如果合规，则由 Worker 携带服务器隐藏的 API 密钥向 Google Gemini 发出双引擎请求。
* **步骤三 (AI 双轨生成)：** LLM 生成短文案，紧接着 TTS 生成音频流 PCM，在云端 V8 隔离核中利用兼容层转码为带有 Header 校验的标准 WAV 格式 `Base64` 返回手机。
* **步骤四 (本地库沉淀)：** 回传手机后，将 `Base64` 落盘为沙盒缓存文件，同时生成前端状态切片并注入 `Expo-SQLite` 关系型数据库，用于随时切入“历史大赏”页进行回味。
* **步骤五 (准点唤醒与保活)：** 注册系统原生 Local Notification。闹钟到达时间触发，应用在后台解封该缓存地址执行 `expo-av` 播放。利用极强侵入性的循环音频物理播放机制将用户炸醒，直至其通过拉满底栏 `<SwipeToStop>` 物理滑块方可解锁。

### 2.2 进阶架构：「服务端预生成 + 静默推送下载」（规划中）
引入后端 cron job，服务端每晚为用户预生成音频，实现"设一次闹钟，每天自动更新内容"。

## 3. 技术栈选型 (Tech Stack)
* **前端引擎：** Expo / React Native (完全剥离了原生的复杂环境配置)。
* **路由框架：** Expo Router (三栏结构: Index、History、Settings)。
* **核心 SDK：** `expo-notifications`, `expo-file-system`, `expo-sqlite`, `expo-av`, `expo-haptics`。
* **边缘防线 (Security Gateway)：** Cloudflare Workers + KV 持久化键值数据库。
* **双核大模型驱动：** Google Gemini 2.5 Flash (或更强的文本推理层 3.1 Pro) + Gemini Voice Engine。

## 4. 核心亮点：AI Prompt 设计 (The "Soul")
不同的人设选项不仅更换了生成 Prompt，还通过条件容错分支（如针对输入 `🌸 温柔女友` 时底层用 `.includes()` 做包含匹配拦截）自动挂载性别声线属性完全不同的底层 TTS 资源配音（如 `Aoede` 专属女声大模型引擎，`Puck` 常规暴躁男声大模型引擎）。

## 5. API 商业安全演进史 (The Evolution of Security)
1. **初期（裸奔期）：** App 直连通讯，致命级安全隐患，一旦上传商店 API Key 即被解包盗取。
2. **中期（半托管开发态）：** 迁入 Expo 本地后端的 `app/api/gen-alarm+api.ts` 路由节点测试，完成秘钥隐藏概念，但因为打出独立客户端后失去本机 Node 环境，彻底瘫痪崩溃。
3. **最终期（防御塔级独立发布态）：** 斩除项目中遗留的 API 代理废码和 `.env` 各种密文。新建分离式的 `cloudflare-worker` 进行 Serverless 微服务托管，并开启严酷的 IP 发包沙箱额度拦截（3次/天）。所有流量无条件指向 `.workers.dev`，从架构根基层消灭了账单爆表危机。

## 6. 开发迭代打卡 (Sprints Roadmap)

### Sprint 1 & 2: 项目初始化与本地通知验证 ✅
* [x] 搭建极简 UI 与 Expo 工程核心。
* [x] 获取 Android 层面 Local Notification 授权，验证沙盒回放音频注册时滞。

### Sprint 3: 接入 AI 大脑 + 基础 API 链路 ✅
* [x] 跑通 LLM → TTS 链路，完成服务端直接向端侧抛出多模态音频流块。
* [x] 搭建跨环境通信接口，完成闭环。

### Sprint 4: 产品化与商店打磨 (Product Polish) ✅
* [x] **架构变异**：引入 `expo-router` 重构为现代 App 标准的底部三 Tab (`index`, `history`, `settings`)。
* [x] **数据沉淀**：引入 `expo-sqlite` 持久化保留含有历史设定时间戳（如 `[13:21] 🌸 温柔女友`）的历史生成记录清单，并在前端暴露支持独立重放与单清内存销毁交互。
* [x] **跨模态自由降配**：接管 AsyncStorage 实现前沿模型的弹性调节池（允许用户单独更换文本大脑脑区与 TTS 引擎算区）。
* [x] **用户体验重塑**：从简单的"点击停止"按钮升维至 `PanResponder` 底层拖动解锁 UX 以及高仿物理真实的 `expo-haptics` 震动闭环，同时修复了强杀 UI 组件造成的死亡音频死循环缺陷。
* [x] **应用元数据补齐**：打包原生 App `app.json` 声明设置（名字设为 Wake Up Dude）、向量 Icon UI 配置覆盖，提供隐私政策与发布。

### Sprint 5: 边缘云计算与网关安全层 (Production Gateway) ✅
* [x] **基础设施大挪移**：创建并行微服务 `cloudflare-worker`，并部署上线至具有极高负载拦截吞吐的外网（`wake-up-dude-api.workers.dev`）。
* [x] **鉴权沙箱化**：大模型 `GEMINI_API_KEY` 完全被剥夺后只储于 Cloudflare Wrangler 系统加密硬件中，彻底抹平了客户端的安全弱点。
* [x] **白嫖防护拦截**：极客级引入 Cloudflare Global KV，在请求切面监听路由接入点提取物理连接网络 IP 达成防绕过封顶配额，实现免除发版破产焦虑的商用标准。

---

### Sprint 6: 闹钟引擎迁移 — 从 expo-notifications 到 @notifee/react-native 🚧
> **前因：** 经过真机深度测试发现 `expo-notifications` 存在致命硬伤：通知系统只能播放编译时打包的静态音频（`test_alarm.wav`），无法在熄屏/App 被杀状态下播放运行时动态生成的 AI 音频。`expo-av` 的播放回调 (`addNotificationReceivedListener`) 仅在 App 处于前台时触发，这意味着用户睡着后手机熄屏，闹钟只能播放一个固定的铃声——完全违背了"每天 AI 生成独一无二叫醒语音"的核心产品理念。

> **解法：** 引入 `@notifee/react-native` 原生闹钟库，利用 Android 系统级 `AlarmManager.setExactAndAllowWhileIdle()` API 实现精准唤醒，配合 `fullScreenAction` 全屏 Intent 在锁屏/熄屏状态下直接点亮屏幕、启动独立的全屏闹钟 React 组件，由该组件即时调用 `expo-av` 播放沙盒中缓存的 AI 音频。此方案彻底绕开了通知声音的静态文件限制。

* [ ] 安装 `@notifee/react-native` 并创建 Expo Config Plugin 注入 `SCHEDULE_EXACT_ALARM` + `USE_FULL_SCREEN_INTENT` 权限。
* [ ] 重写 `services/notification-service.ts`，用 Notifee `TimestampTrigger` + `alarmManager` + `fullScreenAction` 替代 `expo-notifications` 调度。
* [ ] 新建全屏闹钟组件 `components/AlarmScreen.tsx`，通过 `AppRegistry.registerComponent` 注册为 Notifee 的 `mainComponent`，挂载时自动循环播放 AI 音频。
* [ ] 重构 `app/index.tsx` 主屏逻辑，移除旧监听器，接入 Notifee 事件系统与精确闹钟权限引导。
* [ ] 重新构建 Dev Client 原生包并进行熄屏/后台/App 被杀全场景测试。

### Sprint 7: 全局 UI 重构 (Visual Overhaul)
> 在 Sprint 6 确认功能稳定后，对全部页面进行一次性视觉升级。此时组件结构已确定（主屏 + 全屏闹钟 + 历史 + 设置），可以统一设计语言，避免返工。

* [ ] 重设计主屏（时间选择器、闹钟按钮、状态提示区域）。
* [ ] 重设计全屏闹钟页（锁屏唤醒界面、SwipeToStop 视觉升级）。
* [ ] 重设计历史页与设置页。
* [ ] 统一色彩体系、字体排版与动效规范。

### Sprint 8: 未来的进阶规划 (Post-Launch)
* [ ] 接入天气 API，将实时天气信息注入 AI Prompt context 增加更极客的内容变种。
* [ ] 接入 `expo-calendar`，自动读取当日待办事项作为叫醒拷问素材（比如"今天上午 10 点有个会，你打算缺席被炒鱿鱼吗？"）。
