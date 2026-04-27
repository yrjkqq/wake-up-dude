# Project Plan: Wake up dude (Safely Productionized)

## 1. Vision
**"Wake up dude"** is an AI wake-up alarm app with a strong personal style.
*   **Solving the Core Pain Point:** Aiming at the difficulty of getting up in the morning, it abandons the traditional boring alarm clock and uses AI to generate highly random, exclusive voices with emotional value (warning, toxic, or hardcore motivational) to "scold" the user awake every day.
*   **Technical Exercise Goal:** As a practical exercise extending from frontend to mobile cross-platform (React Native), it deeply integrates the current cutting-edge AI large model capabilities (LLM + TTS), and successfully builds a distribution-level package (APK + store configuration) after completing the MVP. It is a highly valuable application-level engineering resume piece.

## 2. Core Architecture Design

### 2.1 Final Production Architecture: "Instant Generation + Edge Computing Anti-abuse + Local Persistent Push"
*   **Step 1 (Set Alarm):** The user selects the time and clicks "Turn on alarm". The frontend immediately initiates a request to the Cloudflare Worker cloud proxy deployed on high-availability network nodes.
*   **Step 2 (Edge Billing Interception):** Cloudflare Worker intercepts the request, extracts `CF-Connecting-IP`, and verifies whether the device's daily call count exceeds the free threshold (currently configured to cap at 3 times a day). If compliant, the Worker carries the API key hidden on the server to issue a dual-engine request to Google Gemini.
*   **Step 3 (AI Dual-Track Generation):** The LLM generates the short copy, and then the TTS generates the audio stream PCM. It is transcoded into a standard WAV format `Base64` with Header verification in the cloud V8 isolate core using a compatibility layer, and returned to the phone.
*   **Step 4 (Local Database Accumulation):** After returning to the phone, the `Base64` is persisted as a sandbox cache file. At the same time, a frontend state slice is generated and injected into the `Expo-SQLite` relational database, which is used to cut into the "History Awards" page for reminiscing at any time.
*   **Step 5 (Punctual Wake-up and Keep-alive):** Registers a system-native Local Notification. When the alarm reaches the time, it triggers, and the app unseals this cache address in the background to execute `expo-av` playback. It uses a highly intrusive loop audio physical playback mechanism to blast the user awake until they unlock it by fully dragging the bottom bar `<SwipeToStop>` physical slider.

### 2.2 Advanced Architecture: "Server Pre-generation + Silent Push Download" (Planned)
Introduce a backend cron job to pre-generate audio for users every night, achieving "set the alarm once, automatically update content every day".

## 3. Tech Stack Selection
*   **Frontend Engine:** Expo / React Native (Completely strips away the complex native environment configuration).
*   **Routing Framework:** Expo Router (Three-column structure: Index, History, Settings).
*   **Core SDKs:** `expo-notifications`, `expo-file-system`, `expo-sqlite`, `expo-av`, `expo-haptics`.
*   **Security Gateway:** Cloudflare Workers + KV Persistent Key-Value Database.
*   **Dual-Core Large Model Drive:** Google Gemini 2.5 Flash (or the stronger text reasoning layer 3.1 Pro) + Gemini Voice Engine.

## 4. Core Highlight: AI Prompt Design (The "Soul")
Different persona options not only change the generation Prompt but also automatically mount underlying TTS resource dubbings with completely different gender voice attributes through conditional fault-tolerant branches (e.g., when the input is `🌸 Gentle Girlfriend`, the bottom layer uses `.includes()` for inclusion matching interception) (e.g., `Aoede` exclusive female voice large model engine, `Puck` conventional grumpy male voice large model engine).

## 5. API Commercial Security Evolution History
1.  **Early Stage (Streaking Period):** App direct connection communication, a fatal level of security hidden danger. Once the API Key is uploaded to the store, it will be unpacked and stolen.
2.  **Middle Stage (Semi-Managed Development State):** Migrated to the `app/api/gen-alarm+api.ts` routing node of the Expo local backend for testing, completing the concept of key hiding. However, because the independent client lost the local Node environment after being built, it completely paralyzed and crashed.
3.  **Final Stage (Defense Tower Level Independent Release State):** Eliminated the legacy API proxy dead code and various ciphertexts of `.env` in the project. Created a separated `cloudflare-worker` for Serverless microservice hosting, and turned on a rigorous IP packet sandbox quota interception (3 times/day). All traffic points unconditionally to `.workers.dev`, eliminating the billing explosion crisis from the architectural root.

## 6. Development Iteration Sprints (Roadmap)

### Sprint 1 & 2: Project Initialization & Local Notification Verification ✅
*   [x] Build minimalistic UI and Expo project core.
*   [x] Obtain Android-level Local Notification authorization and verify the registration lag of sandbox playback audio.

### Sprint 3: Access AI Brain + Base API Link ✅
*   [x] Run through the LLM → TTS link, complete the server throwing multimodal audio stream blocks directly to the device side.
*   [x] Build a cross-environment communication interface to complete the closed loop.

### Sprint 4: Productization & Store Polish ✅
*   [x] **Architecture Mutation**: Introduced `expo-router` to refactor into a modern App standard bottom three Tab (`index`, `history`, `settings`).
*   [x] **Data Accumulation**: Introduced `expo-sqlite` to persistently retain a historical generation record list containing historical setting timestamps (e.g., `[13:21] 🌸 Gentle Girlfriend`), and exposed it on the frontend to support independent replay and single-clear memory destruction interaction.
*   [x] **Cross-modal Free Downgrade**: Took over AsyncStorage to implement an elastic adjustment pool for cutting-edge models (allowing users to separately replace the text brain area and the TTS engine calculation area).
*   [x] **User Experience Reshaping**: Upgraded from a simple "click to stop" button to a `PanResponder` bottom drag unlock UX and a highly simulated physical real `expo-haptics` vibration closed loop, while fixing the dead audio dead loop defect caused by force-killing UI components.
*   [x] **Application Metadata Completion**: Packaged native App `app.json` declaration settings (name set to Wake Up Dude), vector Icon UI configuration coverage, provided privacy policy and release.

### Sprint 5: Edge Cloud Computing & Gateway Security Layer ✅
*   [x] **Infrastructure Great Migration**: Created a parallel microservice `cloudflare-worker`, and deployed it online to the external network (`wake-up-dude-api.workers.dev`) with extremely high load interception throughput.
*   [x] **Authentication Sandboxing**: The large model `GEMINI_API_KEY` is completely stripped and stored only in the Cloudflare Wrangler system encryption hardware, completely smoothing out the security weaknesses of the client.
*   [x] **Free-riding Protection Interception**: Geek-level introduction of Cloudflare Global KV, extracting physical connection network IPs at the routing access point in the request aspect to achieve anti-bypass capped quotas, reaching the commercial standard of exempting from version release bankruptcy anxiety.

---

### Sprint 6: Alarm Engine Migration — From expo-notifications to @notifee/react-native ✅
> **Cause:** After deep testing on real devices, it was found that `expo-notifications` has a fatal flaw: the notification system can only play static audio (`test_alarm.wav`) packaged at compile time, and cannot play dynamically generated AI audio at runtime when the screen is off / the App is killed. The playback callback of `expo-av` (`addNotificationReceivedListener`) is only triggered when the App is in the foreground, which means that after the user falls asleep and the phone screen turns off, the alarm can only play a fixed ringtone—completely violating the core product concept of "AI generating a unique wake-up voice every day".

> **Solution:** Introduced the `@notifee/react-native` native alarm clock library, utilizing the Android system-level `AlarmManager.setAlarmClock()` API to completely bypass the Doze power-saving mode to achieve bottom-layer force-kill zero-second delay wake-up. On this basis, by injecting mandatory screen-on parameters such as `showWhenLocked` into the native Activity, and guiding users to turn on the "pop-up interface in the background" permission for deeply customized systems, perfect lock screen unlocking and locally pulling up the full-screen Modal for React Native JS audio playback closed loop were achieved. In addition, abandoned unstable background event listening and introduced an extremely solid `AppState` lifecycle polling verification mechanism to ensure atomic-level consistency of the home page state.

*   [x] Installed `@notifee/react-native` and created Expo Config Plugin to inject `SCHEDULE_EXACT_ALARM` + `SYSTEM_ALERT_WINDOW` related permissions.
*   [x] Rewrote `services/notification-service.ts`, thoroughly replacing `expo-notifications` scheduling with `AlarmType.SET_ALARM_CLOCK`.
*   [x] Created a new full-screen alarm clock component `components/AlarmScreen.tsx`, used `Modal` + `AppState` lifecycle interception and overwrote frontend routing, and automatically looped AI audio when mounted.
*   [x] Refactored `app/index.tsx` and `_layout.tsx` main screen logic, removed old listeners, and used `getDisplayedNotifications` to achieve debounce verification and active UI refresh in frozen and awakened states.
*   [x] Rebuilt the Dev Client native package and conducted a zero-second snooze penetration wake-up final exam in screen-off/background/completely swiped-kill states.

### Sprint 7.1: Status Bar Fix + Debug Logging System ✅
> **Cause:** The built APK showed a white background + white font in the status bar area on Android devices, making it completely unreadable. Troubleshooting revealed that `edgeToEdgeEnabled: true` makes the system status bar transparent, while there are 3 conflicting `StatusBar` component overwrites in the code; in addition, the alarm clock notification is unstable in the overnight scenario (set at 8 am but not triggered), because Cloudflare is walled, VPN may disconnect after running for a long time, and the lack of persistent logs makes it impossible to troubleshoot afterwards.

*   [x] **Dark Theme Unification**: `app.json` forces `userInterfaceStyle: "dark"`, `_layout.tsx` is unified as the only `<StatusBar style="light" />`, removing conflicting RN StatusBars in `index.tsx`.
*   [x] **Persistent Debug Logs**: Added `debug_logs` table in `expo-sqlite`, providing `addDebugLog(tag, message, level)` API, logs are not lost when the app is killed.
*   [x] **Full Link Log Coverage**: Implanted persistent logs in `notification-service.ts` (alarm scheduling/cancellation), `ai-service.ts` (Cloudflare request start -> response -> success/failure, including VPN/GFW network disconnection special detection), and `index.tsx` (Foreground Service lifecycle).
*   [x] **Settings Debug Diagnostic Panel**: Added "View Scheduled Alarm Triggers" and "Debug Log Viewer" (full-screen Modal, reverse chronological order, colored level indicator bars).

### Sprint 7.2: Global UI Refactoring (Visual Overhaul)
> After confirming functional stability in Sprint 6, carry out a one-time visual upgrade for all pages. At this time, the component structure has been determined (main screen + full-screen alarm clock + history + settings), and the design language can be unified to avoid rework.

*   [ ] Redesign the main screen (time picker, alarm button, status prompt area).
*   [ ] Redesign the full-screen alarm page (lock screen wake-up interface, SwipeToStop visual upgrade).
*   [ ] Redesign the history page and settings page.
*   [ ] Unify the color system, typography, and animation specifications.

### Sprint 7.3: Multimodal Advanced (Gemini 3.1 TTS + Lyria Music) ✅
> **Cause**: With the launch of the more advanced 3.1 TTS model (better sound quality, supporting voice tags) and the Lyria 3 music generation model by the Gemini API, "Wake up dude" ushered in a leap in content form. Waking up is not limited to "toxic voices", but can also directly generate highly atmospheric 30-second exclusive music clips through large models.

*   [x] **Architecture Broadening**: Opened up the full link fields of `AlarmType` (voice/music), involving database table changes (adding the `alarmType` field), UI component updates (popup options and list flag bits).
*   [x] **Edge Extension**: Updated the Cloudflare Worker microservice to bypass multi-level TTS for music requests, directly orchestrated Prompts dynamically according to the persona to directionally request the `lyria-3-clip-preview` music managing engine, and transcoded the directly output MP3 audio to the device side. On this basis, the highly oppressive and dramatic music Prompts (covering epic symphonies, heavy metal rock, Hans Zimmer style war songs, and electronic swing) were further upgraded, completely activating the wake-up soul of the alarm clock.
*   [x] **System Interface Professionalization**: Introduced a brand new settings picker, comprehensively stripped off the originally overly childish Emoji (🌸/👺/🎤) descriptions to meet the standard sense of high-end applications; perfected the mounting options for generation models such as `lyria-3-clip` and `lyria-3-pro`.

### Sprint 8: Future Advanced Planning (Post-Launch)
*   [ ] Access the weather API, inject real-time weather information into the AI Prompt context to add more geeky content variants.
*   [ ] Access `expo-calendar`, automatically read the day's to-do items as wake-up torture materials (e.g., "There is a meeting at 10 am today, are you planning to be absent and get fired?").�免除发版破产焦虑的商用标准。

---

### Sprint 6: 闹钟引擎迁移 — 从 expo-notifications 到 @notifee/react-native ✅
> **前因：** 经过真机深度测试发现 `expo-notifications` 存在致命硬伤：通知系统只能播放编译时打包的静态音频（`test_alarm.wav`），无法在熄屏/App 被杀状态下播放运行时动态生成的 AI 音频。`expo-av` 的播放回调 (`addNotificationReceivedListener`) 仅在 App 处于前台时触发，这意味着用户睡着后手机熄屏，闹钟只能播放一个固定的铃声——完全违背了"每天 AI 生成独一无二叫醒语音"的核心产品理念。

> **解法：** 引入 `@notifee/react-native` 原生闹钟库，利用 Android 系统级 `AlarmManager.setAlarmClock()` API 彻底绕过 Doze 省电模式实现由底层强杀零秒延迟唤醒。在此基础上，通过注入原生 Activity 的 `showWhenLocked` 等强制亮屏参数，并指导用户针对深度定制系统开启“后台弹出界面”权限，实现完美锁屏解锁并在本地拉起全屏 Modal 进行 React Native JS 音频播放闭环。此外，抛弃不稳定的后台事件监听，引入极其稳固的 `AppState` 生命周期轮询校验机制，确保首页状态的原子级一致。

* [x] 安装 `@notifee/react-native` 并创建 Expo Config Plugin 注入 `SCHEDULE_EXACT_ALARM` + `SYSTEM_ALERT_WINDOW` 相关权限。
* [x] 重写 `services/notification-service.ts`，彻底使用 `AlarmType.SET_ALARM_CLOCK` 取代 `expo-notifications` 调度。
* [x] 新建全屏闹钟组件 `components/AlarmScreen.tsx`，运用 `Modal` + `AppState` 生命周期拦截并覆盖前端路由，挂载时自动循环播放 AI 音频。
* [x] 重构 `app/index.tsx` 与 `_layout.tsx` 主屏逻辑，移除旧监听器，利用 `getDisplayedNotifications` 实现被冻结与唤醒状态下的防抖核验与主动 UI 刷新。
* [x] 重新构建 Dev Client 原生包并进行熄屏/后台/彻底划杀状态下的秒级打盹穿透唤醒大考。

### Sprint 7.1: 状态栏修复 + 调试日志系统 ✅
> **前因：** 构建后的 APK 在 Android 设备上状态栏区域出现白色背景 + 白色字体导致完全不可读。排查发现 `edgeToEdgeEnabled: true` 使系统状态栏透明，而代码中存在 3 处互相冲突的 `StatusBar` 组件覆盖；此外闹钟通知在隔夜场景下不稳定（设定了早上 8 点但未触发），因 Cloudflare 被墙导致 VPN 长时间运行后可能断连，且缺乏持久化日志无法事后排查。

* [x] **暗色主题统一**：`app.json` 强制 `userInterfaceStyle: "dark"`，`_layout.tsx` 统一为唯一 `<StatusBar style="light" />`，移除 `index.tsx` 中冲突的 RN StatusBar。
* [x] **持久化调试日志**：在 `expo-sqlite` 中新增 `debug_logs` 表，提供 `addDebugLog(tag, message, level)` API，日志不随 app 被 kill 丢失。
* [x] **全链路日志覆盖**：在 `notification-service.ts`（闹钟调度/取消）、`ai-service.ts`（Cloudflare 请求开始→响应→成功/失败，含 VPN/GFW 网络断连特殊检测）、`index.tsx`（Foreground Service 生命周期）植入持久化日志。
* [x] **Settings 调试诊断面板**：新增「查看已排期闹钟触发器」和「调试日志查看器」（全屏 Modal，按时间倒序，彩色等级指示条）。

### Sprint 7.2: 全局 UI 重构 (Visual Overhaul)
> 在 Sprint 6 确认功能稳定后，对全部页面进行一次性视觉升级。此时组件结构已确定（主屏 + 全屏闹钟 + 历史 + 设置），可以统一设计语言，避免返工。

* [ ] 重设计主屏（时间选择器、闹钟按钮、状态提示区域）。
* [ ] 重设计全屏闹钟页（锁屏唤醒界面、SwipeToStop 视觉升级）。
* [ ] 重设计历史页与设置页。
* [ ] 统一色彩体系、字体排版与动效规范。

### Sprint 7.3: 多模态进阶 (Gemini 3.1 TTS + Lyria Music) ✅
> **前因**：随着 Gemini API 推出了更先进的 3.1 TTS 模型（音质更佳、支持语音标签）与 Lyria 3 音乐生成模型，"Wake up dude" 迎来了一次内容形态的跨越。叫醒不仅限于"毒舌语音"，还能通过大模型直接生成极具氛围感的 30 秒专属音乐片段。

* [x] **架构拓宽**：打通 `AlarmType` (voice/music) 全链路字段，涉及数据库表更迭（增加 `alarmType` 字段）、UI 组件更新（弹窗选项与列表标志位）。
* [x] **边缘扩展**：更新 Cloudflare Worker 微服务，针对音乐请求绕过多级 TTS，直接根据人设动态编排 Prompt 定向请求 `lyria-3-clip-preview` 音乐主理引擎，并将直出的 MP3 音频转码下发端侧。在此基础上，进一步升级了极具压迫感和戏剧性的音乐 Prompt（涵盖史诗交响曲、重金属摇滚、汉斯季默风格战歌及电子摇摆乐），彻底激活闹钟的催醒灵魂。
* [x] **系统界面专业化**：引入全新设置选择器，全面剥除原本过度幼稚的 Emoji (🌸/👺/🎤) 描述，以符合高端应用的标准感；完善 `lyria-3-clip` 和 `lyria-3-pro` 等生成模型挂载选项。

### Sprint 8: 未来的进阶规划 (Post-Launch)
* [ ] 接入天气 API，将实时天气信息注入 AI Prompt context 增加更极客的内容变种。
* [ ] 接入 `expo-calendar`，自动读取当日待办事项作为叫醒拷问素材（比如"今天上午 10 点有个会，你打算缺席被炒鱿鱼吗？"）。
