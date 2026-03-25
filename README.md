<div align="center">
  <img src="assets/images/icon.png" width="128" alt="Wake Up Dude Logo" />
  <h1>⏰ Wake Up Dude</h1>
  <p><strong>一个全栈、跨平台、带有极强攻击性的 AI 赛博唤醒专家</strong></p>
  
  [![Release](https://img.shields.io/github/v/release/YOUR-GITHUB-NAME/wake-up-dude?label=Latest%20Release)](https://github.com/YOUR-GITHUB-NAME/wake-up-dude/releases)
  [![Platform](https://img.shields.io/badge/Platform-Android-green.svg)](https://github.com/YOUR-GITHUB-NAME/wake-up-dude/releases)
  [![Tech Stack](https://img.shields.io/badge/Stack-React_Native_|_Expo_|_Cloudflare-blue.svg)](#architecture)
</div>

<br/>

## 🌟 核心理念 (Vision)
受够了千篇一律的机械闹钟声？**Wake Up Dude** 利用最新一代大模型技术（LLM + TTS 多模态双擎架构），每天早晨根据你的设定时间和人设偏好，为你量身定制一段高达 30 秒、情绪饱满、极具冲击力的“专属叫醒服务”。

**核心理念只有一个：保证让你在震惊、恐惧或极度舒适中瞬间清醒。**

## 🚀 特性漫游 (Features)

*   🎙️ **千人千面的赛博大脑**：内置 `🌸 极度温柔的暧昧女友`、`🔥 歇斯底里的无情长官`、`💀 不留情面的毒舌 HR` 等多种人设。每天生成的叫醒台词绝不重复。
*   ⚡ **0 冷启动的边缘防线**：彻底放弃本地明文密钥的玩具级尝试。采用 **Cloudflare Workers** 接管核心流量，隐藏 Gemini 密钥，并提供 IP 日活跃度速率拦截（3次/天），完美阻挡流量盗刷。
*   🗄️ **SQLite 数据持久与缓存生命周期**：每次有趣的被骂现场都会被持久化打上时间戳（比如 `[13:21] 温柔女友`）并独立存放进物理表和沙盒音频文件，支持回听与一键垃圾清理。
*   🖐️ **强迫症级交互 (Haptics 震动)**：告别肌肉记忆的“点击一下就停止”。首创深渊级 `<SwipeToStop>` 滑动阻尼交互锁，必须将滑块死死拖满 85% 的进度释放，并且伴随真实物理引擎触感才能打断魔音灌耳的后台强制死循环。

## 📥 下载安装 (Download)
本项目当前提供生产级的 `Android APK` 安装包！完全脱离开发者模式，纯享沉浸式的唤醒体验。

👉 **[点击这里跳转至 Releases 页面下载最新 APK](https://github.com/yrjkqq/wake-up-dude/releases)**

*(由于 iOS App Store 的变态级封闭，iPhone 用户需自行克隆代码借用 Xcode 或 EAS 自签真机跑)*

## 🏗️ 架构演进全景 (Architecture Blueprint)
> 想深入了解一个初出茅庐的 Demo 是如何被一步步重构成防刷防崩溃的工业级全栈制成品的，请移步阅读长达 2000 字的核心开发编年史：
> **[📂 PROJECT_PLAN.md](docs/PROJECT_PLAN.md)**

---

## 👨‍💻 给工程师：如何本地运行 (Development)
如果你想把这个极具含金量的大模型框架扒下来自己魔改人设，或者深入学习 Cloudflare Node.js 网关代理是怎么写的：

```bash
# 1. 克隆这堆疯狂的代码
git clone https://github.com/yrjkqq/wake-up-dude.git

# 2. 安装前端重炮依赖
npm install

# 3. 如果你想部署你自己的 Cloudflare 后端堡垒
cd cloudflare-worker
npm install
npx wrangler login 
npx wrangler kv:namespace create WAKE_UP_DUDE_KV
npx wrangler secret put GEMINI_API_KEY
npx wrangler deploy

# 4. 把得到的外网安全网卡贴上防弹衣 (.env.production)
# EXPO_PUBLIC_API_URL=https://<你的worker域名>

# 5. 起飞
npm run start
```

## 📝 证书 (License)
MIT License. 放心大胆地拿去在你的朋友们熟睡时对他们进行降维打击吧。
