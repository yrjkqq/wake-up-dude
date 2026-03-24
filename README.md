# ⏰ Wake up dude

一款带有强烈个人风格的 **AI 唤醒闹钟** App —— 用 AI 每天生成随机、有情绪价值的专属语音把你"骂"醒。

## ✨ 特色功能

- 🧠 **AI 生成叫醒语音** — LLM 生成文案 + TTS 转语音，每天都是全新内容
- 🎭 **多种人设模式** — 毒舌监督员 / 军训教官 / 温柔女友 / 社畜互助
- 🔔 **自定义通知铃声** — AI 语音作为闹钟铃声准点播放
- 🌙 **暗色模式** — 自动适配系统主题

## 🛠️ 技术栈

| 技术 | 用途 |
|---|---|
| **Expo** (SDK 54) | 跨平台框架（CNG 架构） |
| **Expo Router** | 文件系统路由 |
| **expo-notifications** | 本地定时推送 |
| **react-native-reanimated** | 动画效果 |
| **Gemini 2.5 Flash** | 叫醒文案生成 + 语音合成（多模态输出） |
| **Cloudflare Worker** | API 代理（隐藏密钥 + 限流） |

## 🚀 快速开始

### 环境要求

- Node.js ≥ 18
- npm
- [Expo Go](https://expo.dev/go)（调试）或 EAS Build（真机）

### 安装 & 运行

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run start

# 构建 Android APK（需要 EAS 账号）
eas build --platform android --profile development
```

## 📁 项目结构

```
wake-up-dude/
├── app/
│   ├── _layout.tsx              # Root layout
│   └── index.tsx                # 闹钟主页
├── components/
│   ├── alarm-button.tsx         # 闹钟按钮（弹性动画）
│   ├── themed-text.tsx          # 主题文字
│   └── themed-view.tsx          # 主题容器
├── services/
│   └── notification-service.ts  # 通知服务（权限、定时、铃声）
├── constants/
│   └── theme.ts                 # 颜色、字体、间距
├── assets/sounds/
│   └── test_alarm.wav           # 测试铃声
└── docs/
    └── PROJECT_PLAN.md          # 详细项目规划
```

## 📋 开发进度

- [x] Sprint 1 — 项目初始化 + 极简 UI
- [x] Sprint 2 — 本地通知 + 自定义铃声 (Android)
- [ ] Sprint 3 — 接入 AI（LLM + TTS + API 代理）
- [ ] Sprint 4 — 产品化与打磨
- [ ] Sprint 5 — 进阶迭代

## 📄 License

MIT
