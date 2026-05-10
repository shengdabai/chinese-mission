# Chinese Mission iOS 真机部署手册

把 Capacitor App 部署到你的 iPhone 真机的完整步骤。Simulator 编译已通过（见 MISSION_BUILD_LOG.md），剩下的全部是 Xcode GUI 操作 + 一次性账号设置。

---

## 前置条件

| 项 | 状态 / 怎么搞 |
|---|---|
| Xcode 完整版已装 | ✅ Xcode 26.4.1 已就位 (`xcode-select -p` = `/Applications/Xcode.app/Contents/Developer`) |
| Apple ID | 任何 Apple ID 都行，**不需要付费的 Apple Developer Program**（除非要发 App Store） |
| iPhone 真机 | iOS 16+，连上 USB-C / Lightning 数据线 |
| Bundle ID 唯一性 | 默认 `com.zturns.chinesemission`，如冲突改成 `com.<你姓>.chinesemission` |

**免费 Apple ID vs 付费 Developer Program 的区别**：
- 免费：可以装到自己 iPhone 上，**provisioning 7 天过期**，过期重装一次即可
- 付费 ($99/年)：永久 provisioning + TestFlight 内测 + App Store 发布

---

## Step 1：打开 Xcode 项目

终端跑：

```bash
open "/Users/tonysheng/Desktop/项目开发/08-中文教学项目/中文使命-官网/ios/App/App.xcodeproj"
```

Xcode 启动后等它解析 SPM 依赖（左下角进度条，约 30 秒首次会比较慢）。

---

## Step 2：登录 Apple ID

如果你的 Xcode 还没登录 Apple ID：

1. 顶部菜单栏 **Xcode → Settings...**（或 ⌘,）
2. 切到 **Accounts** tab
3. 左下角 **+** → **Apple ID**
4. 输入 Apple ID + 密码（可能要 2FA 验证码）
5. 登录后右侧会显示一个或多个 **Team**（个人 Team 名字一般是 `<你的名字> (Personal Team)`）
6. 关掉 Settings 窗口

---

## Step 3：配 Signing

1. Xcode 左侧 file navigator 最上方点 **App** 项目（蓝色 Xcode 图标，不是文件夹）
2. 中间编辑区出现项目设置面板
3. **TARGETS** 列表选 **App**
4. 顶部 tab 选 **Signing & Capabilities**
5. **Automatically manage signing**：勾上
6. **Team**：下拉选你的 `<你的名字> (Personal Team)`
7. **Bundle Identifier**：默认 `com.zturns.chinesemission`
   - 如果出现红色错误 "An App ID with Identifier 'com.zturns.chinesemission' is not available"，说明已被占用
   - 改成 `com.tonysheng.chinesemission`（或别的唯一字符串）
8. 等 Xcode 自动签发 Provisioning Profile（约 5 秒，红色错误消失即成功）

---

## Step 4：模拟器先跑一次（验证签名 OK）

1. 顶部 device 选择器（在播放/停止按钮右边）下拉
2. 选 **iPhone 17** 或 **iPhone 17 Pro**（你 Xcode 里有的 simulator 都行）
3. ⌘R（Build & Run）
4. 等编译 → simulator 自动启动 → app 加载 → 看到 "Welcome to Chinese Mission" onboarding 页

走一遍流程：
- 点 🏠 Survival in China
- 点 Totally new
- 点 ⌨️ Text First
- 点 Start First Mission
- 点 Start Conversation
- 输入框打 `我要一杯热拿铁`
- 点 Send → 等 ~5 秒 → 自动跳到 Debrief，显示 "Mission Complete! Score: 100%"

如果走通 = simulator 端 OK。

---

## Step 5：真机部署

### 5.1 连接 iPhone

1. iPhone 用数据线连 Mac（USB-C 或 Lightning）
2. iPhone 弹 "Trust This Computer?" 选 **Trust**
3. 输入 iPhone 密码确认
4. iPhone 上去 **设置 → 隐私与安全 → 开发者模式**（iOS 16+ 必须打开），开启后 iPhone 重启
5. iPhone 重启后再进 Settings 验证开发者模式已开

### 5.2 Xcode 选 device

1. Xcode 顶部 device 选择器下拉，列表里应该出现你的 iPhone（如 "Tony's iPhone"）
2. 选它

### 5.3 Build & Run

1. ⌘R（Build & Run）
2. 第一次会编译比较慢（30 秒～2 分钟）
3. App 装到 iPhone 上，自动启动

### 5.4 信任开发者证书

第一次跑 iPhone 会弹 "Untrusted Developer"。修复：

1. iPhone：**设置 → 通用 → VPN与设备管理**
2. 找到你的 Apple ID（在 "DEVELOPER APP" 段下）
3. 点进去 → **Trust "你的 Apple ID"** → Trust
4. 回到 home screen 找 "Chinese Mission" 图标（红底白「中」字），点开

### 5.5 权限弹窗

App 第一次启动时（或第一次用语音输入时）会弹两个权限请求：

- **麦克风**：弹中文 "中文使命需要使用麦克风进行语音对话练习..."  → Allow
- **语音识别**：弹中文 "中文使命使用语音识别将你说的中文转换为文字..."  → Allow

---

## Step 6：真机验证清单

- [ ] App 图标显示红底白「中」字（来自 src/app/icon.svg）
- [ ] App 启动后加载完整 onboarding 页
- [ ] 走完 m1 cafe mission：Survival → Totally new → Text First → Start → Chat → Debrief
- [ ] Debrief 显示 100% Score + 中文 strengths
- [ ] 词汇本能保存表达
- [ ] 麦克风权限弹窗中文显示

---

## 常见问题排查

### "No account for team" / signing 错误

→ 回 Step 2 + Step 3 重做，确认 Team 已选

### Build 失败 "Module 'Capacitor' not found"

```bash
cd "/Users/tonysheng/Desktop/项目开发/08-中文教学项目/中文使命-官网"
./node_modules/.bin/cap sync ios
```

然后 Xcode 关掉重开。

### iPhone 7 天 provisioning 过期

App 不能启动了，或弹 "App Cannot Be Verified"。修复：用同一个 Apple ID + Xcode 重新 Build & Run 一次即可（重新签发 7 天 profile）。

### Bundle id 冲突 "is not available"

改成你独有的 reverse-domain 格式，如 `com.tonysheng.chinesemission`，然后回 Step 3 重新选 Team。

### App 启动白屏 / 一直 loading

可能是 server.url（Vercel）连不上。
- 测：iPhone Safari 直接打 `https://chinese-mission.vercel.app` 是否能访问
- 如果 Safari 也打不开 → 网络问题
- 如果 Safari 能但 app 不能 → `capacitor.config.ts` 里 `server.cleartext` 设置或 `allowNavigation` 缺域名

---

## 后续路径

| 目标 | 路径 |
|---|---|
| 内测分发给朋友 | 注册 Apple Developer Program $99/年 + 用 TestFlight |
| App Store 发布 | 同上 + Xcode Organizer Archive → Distribute App → App Store Connect |
| 加语音输入 | 装 `@capacitor/speech-recognition`，在 chat 页 wire 起来，cap sync 后 Xcode 重新 build |
| 加支付 | 阶段 3 RevenueCat 集成（下次会话） |

---

## 文件位置参考

```
项目根 = /Users/tonysheng/Desktop/项目开发/08-中文教学项目/中文使命-官网/
├── capacitor.config.ts           # server.url + allowNavigation
├── ios/App/App.xcodeproj          # ★ Xcode 打开这个
├── ios/App/App/Info.plist         # 权限文案在这
├── ios/App/App/Assets.xcassets    # App 图标资源（默认占位，可换）
├── src/app/icon.svg               # web 端 favicon（红底「中」字）
└── docs/ios-deploy-guide.md       # ← 这份文档
```
