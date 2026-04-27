# Wake up dude Privacy Policy

**Effective Date:** March 01, 2026

Welcome to "Wake up dude" (hereinafter referred to as the "App"). This App is an AI-driven smart alarm clock tool. We highly value your privacy and are committed to protecting your personal information. This Privacy Policy will explain to you how we collect, use, store, and protect your information when you use this App.

Please read this Privacy Policy carefully. By clicking "Agree" or continuing to use this App, you indicate that you have read, understood, and accepted all the contents of this policy.

---

## 1. Information We Collect and How We Use It

To provide you with the core smart alarm service, this App needs to obtain the following permissions and data within the absolute minimum necessary scope:

*   **Local Notifications Permission** 
    In order to accurately trigger system-level notifications at your set time to wake you up, we need to obtain your device's "read and send notifications" permission. All alarm scheduling calculations (including calculating the remaining time) are done **locally** on your device.
*   **Network Access Permission (Network & Proxy)**
    When you set a new alarm, we need to send your "set time" and "selected persona preferences" to an encrypted Large Language Model (Gemini) proxy server to generate your exclusive wake-up text and audio. This is the only networking behavior required for the App to function.
*   **Storage Permission and Local Caching (SQLite & FileSystem)**
    So that you can listen back to your special good morning voices in the "History", the App will generate cache files (such as `.wav` recording files and corresponding crazy text) in your phone's sandbox and the local `wakeUpDude.db` database. **These data remain entirely on your physical device** and will not be maliciously uploaded silently.

## 2. Data Sharing and Cloud Processing

*   **Core Service Provider**: The voice and text generation of this App relies on the Google API (Gemini Large Language Model). We will send the desensitized prompt to the large model gateway to perform the service. We have complied with the service provider's regulations regarding API privacy when calling it.
*   **No Other Uses**: We **absolutely do not** sell or share your frequency of use data, such as your alarm habits and sleep patterns, with any unrelated third-party advertisers.

## 3. User Control and Cancellation Mechanism

You can access the "Settings" page at any time through the bottom navigation bar of the App:
*   **One-Click Clear:** We provide you with a strict option to "Clear all local voice history and records". After clicking, all SQLite records stored in this App as well as the underlying sandbox audio files will be permanently physically deleted and cannot be recovered.
*   **Disable Network Communication:** If you turn off the function in the App or revoke the "Notifications" and "Network" permissions of the App at the mobile system level, the App will be unable to connect to the external large model. At this time, the App itself will degrade offline and automatically use your phone's system default white noise ringtone to wake you up, without affecting basic sleep usage.

## 4. Policy Updates

As this App iterates (such as weather and schedule synchronization permissions added in subsequent versions), we may revise this Privacy Policy in due course. If there are significant changes, we will send you a notification in the form of a pop-up statement when the App opens. Please stay tuned.

---

*If you have any questions about this privacy agreement or encounter any issues requiring rights protection, please feel free to contact the developer at any time.*
