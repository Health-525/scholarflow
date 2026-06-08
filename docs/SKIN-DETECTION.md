# 皮肤检测模块 — 技术文档

> 基于本地视觉模型的额头皱纹实时监测 + 后台抬眉监控 + 桌面宠物提醒

## 模块总览

```
┌─────────────────────────────────────────────────────────┐
│              ScholarFlow (Electron + Next.js)           │
│                                                         │
│  ┌──────────────┐    ┌───────────────────────────────┐  │
│  │  实时监测     │    │  后台监控 (Daemon v4)          │  │
│  │  /wrinkle    │    │  /wrinkle (monitor view)      │  │
│  │              │    │                               │  │
│  │  浏览器摄像头 │    │  brow_monitor_daemon.py       │  │
│  │  ↓ WebSocket │    │  (无窗口, 静默运行)            │  │
│  │  ↓ 实时HUD   │    │  ↓ 连续帧验证(3帧确认)        │  │
│  │  ↓ 镜像视频  │    │  ↓ 自适应帧率                  │  │
│  │              │    │  ↓ 检测到抬眉                  │  │
│  │              │    │  ↓ HTTP POST → /api/wrinkle-  │  │
│  │              │    │    alert                       │  │
│  └──────┬───────┘    └──────────┬────────────────────┘  │
│         │                       │                       │
│         │    ┌──────────────────┴──────────────────┐    │
│         │    │  桌面宠物 (pet.html)                │    │
│         │    │  - Node.js http 轮询 /api/wrinkle-  │    │
│         │    │    alert                             │    │
│         │    │  - 监听 brow-alert IPC              │    │
│         │    │  - 抬眉 → 生气动画 + 警告文字       │    │
│         │    └─────────────────────────────────────┘    │
│         │                                               │
└─────────┼───────────────────────────────────────────────┘
          │ WebSocket / HTTP
          ▼
┌─────────────────────────────────────────────────────────┐
│           Vision-Model (Python FastAPI, :8000)          │
│                                                         │
│  /health        — 健康检查                               │
│  /ws/realtime   — WebSocket 实时皱纹监测                 │
│                                                         │
│  ┌─────────────────┐  ┌──────────────────────────────┐ │
│  │ FaceDetector    │  │ BrowRiseDetector              │ │
│  │ MediaPipe 478点 │  │ 眉眼距离检测 + 基线校准       │ │
│  │ + _validate_face│  │ + reset_baseline()            │ │
│  │ (非人脸过滤)    │  │                               │ │
│  └────────┬────────┘  └──────────┬───────────────────┘ │
│           │                      │                      │
│           ▼                      ▼                      │
│  ┌─────────────────────────────────────────────────┐   │
│  │ 额头纹理分析                                     │   │
│  │ SkinAge (EfficientNet-B2) → wrinkle_ratio_percent│   │
│  │ Fallback: Laplacian方差 + Sobel梯度 → 0-100分   │   │
│  │ 热力图生成 (Laplacian → colormap)               │   │
│  └─────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

## 防误检机制 (v4 新增)

### 1. 人脸验证 (_validate_face)
在 `face_detector.py` 的 `detect_face()` 中内置，每次检测自动执行：
- **面积检查**：面部面积占图像比例必须在 0.5%~80% 之间
- **两眼距离**：两眼间距必须 > 面宽的15%（非人脸时landmark挤在一起）
- **landmark 分布**：前100个landmark的unique x/y坐标数 > 10（防全挤一点）
- **置信度**：`min_face_detection_confidence` 从0.5提高到0.7

### 2. 连续帧验证 (brow_monitor_daemon.py)
- 必须连续3帧检测到人脸才认为是真人
- 少于3帧时只快速检测，不计算皱纹评分
- 丢失人脸5帧后重置 `brow_detector.reset_baseline()`

### 3. 自适应帧率
| 状态 | 帧间隔 | 说明 |
|------|--------|------|
| 空闲（无人脸） | 2.0s | 省CPU |
| 有人脸 | 0.5s | 正常监测 |
| 抬眉中 | 0.2s | 密集追踪 |

## 两种模式

### 1. 实时监测 (Realtime)

| 项 | 说明 |
|---|---|
| **入口** | `/wrinkle` → "实时监测" Tab |
| **摄像头** | 浏览器 `getUserMedia` (640x480, facingMode: user) |
| **通信** | WebSocket `/ws/realtime`，浏览器 ~10fps 发送 JPEG 帧 |
| **镜像** | 浏览器 CSS `transform: scaleX(-1)` + 服务端 `cv2.flip(frame, 1)` |
| **HUD** | 皱纹评分 / 严重度 / 抬眉状态 / 眉眼比，叠加在视频上 |
| **额头框** | 青色=正常，橙色=抬眉，内嵌皱纹热力图 |
| **趋势图** | 最近60帧皱纹评分柱状图 |

**数据流**：
```
浏览器摄像头 → canvas JPEG编码 → WebSocket发送
→ FastAPI接收 → cv2.flip镜像 → MediaPipe面部检测
→ 提取额头ROI → Laplacian+Sobel纹理分析 → BrowRiseDetector
→ JSON响应 → 前端HUD更新
```

### 2. 后台监控 (Daemon)

| 项 | 说明 |
|---|---|
| **入口** | `/wrinkle` → "后台监控" Tab (仅 Electron 可见) |
| **摄像头** | Python OpenCV 静默采集（无窗口） |
| **通信** | 检测到抬眉 → HTTP POST `/api/wrinkle-alert` |
| **宠物联动** | 启动时自动弹出宠物，停止时自动隐藏 |
| **提醒策略** | 皱纹评分 >30 + 抬眉 → 触发，15秒冷却 |
| **进程管理** | Electron `spawn` → `browMonitorProcess` → IPC 控制 |

**提醒链路**：
```
brow_monitor_daemon.py 检测到抬眉
→ HTTP POST http://localhost:3000/api/wrinkle-alert {type: "brow_alert", ...}
→ Next.js route.ts 内存存储 (10秒过期)
→ pet.html 每3秒轮询 GET /api/wrinkle-alert
→ data.rising === true → 宠物生气动画 + 警告文字
```

## 桌面宠物

| 项 | 说明 |
|---|---|
| **文件** | `electron/pet.html` |
| **窗口** | 160x180, frameless, transparent, alwaysOnTop, 右下角 |
| **状态** | normal.png (呼吸动画) / angry.png (摇晃+弹跳) / sleeping.png |
| **图片** | `public/pet/normal.png`, `angry.png`, `sleeping.png` |
| **触发** | `brow-alert` IPC 事件 或 `/api/wrinkle-alert` 轮询 |
| **关闭** | 右键宠物窗口 → `pet:close` IPC → 窗口关闭 |

**宠物提醒消息池**：
```javascript
["别皱眉！放松额头！", "又抬眉了！住手！", "皱纹要来了！快松开！",
 "额头肌肉放松！", "别皱别皱别皱！", "抬头纹警告！", "放松放松放松！", "眉头松开！！"]
```

## Electron IPC 接口

| Channel | 方向 | 说明 |
|---------|------|------|
| `vision-model:status` | render→main | 检查 :8000 端口是否在线 |
| `vision-model:start` | render→main | 自动查找并启动 vision-model |
| `brow-monitor:start` | render→main | 启动 `brow_monitor_daemon.py` |
| `brow-monitor:stop` | render→main | 终止后台监控进程 |
| `brow-monitor:status` | render→main | 查询监控进程是否运行 |
| `pet:show` | render→main | 弹出宠物窗口(右下角) |
| `pet:hide` | render→main | 关闭宠物窗口 |
| `pet:close` | pet→main | 宠物右键关闭 |

## Vision-Model API

### GET /health

```json
{ "status": "ok", "detector_loaded": true, "segmenter_loaded": true, "skinage_loaded": false }
```

### 模型优先级链

```
SegFormer ONNX (最快，~50ms)     ← 首选
  ↓ 不可用时
SegFormer PyTorch (~200ms)       ← 次选
  ↓ 不可用时
SkinAge EfficientNet-B2 (~300ms) ← 第三选
  ↓ 不可用时
传统 CV Laplacian+Sobel (~10ms)  ← 兜底
```

| 模型 | 评分含义 | 典型范围 | 数据来源 |
|------|---------|---------|---------|
| SegFormer | 额头皱纹像素占比×100 | 0~15% | HuggingFace真标注训练 |
| SkinAge | 伪标签皱纹分数(取反) | 30~70 | UTKFace+伪标签 |
| CV | Laplacian方差+Sobel梯度 | 0~100 | 无训练 |

### WebSocket /ws/realtime

**客户端发送**: JPEG 二进制帧

**服务端响应**:
```json
{
  "face_detected": true,
  "wrinkle_score": 42.5,
  "brow_rising": false,
  "brow_eye_ratio": 1.05,
  "severity": "中等",
  "forehead_rect": [120, 60, 380, 180],
  "heatmap": "data:image/jpeg;base64,..."
}
```

### POST /api/wrinkle-alert (Next.js)

**接收** (来自 brow_monitor_daemon.py):
```json
{ "type": "brow_alert", "wrinkle_score": 55, "brow_rising": true, "timestamp": 1717843200 }
```

**返回** (供 pet.html 轮询):
```json
{ "score": 55, "rising": true, "time": 1717843200 }
```
> 10秒后自动过期清除

## 皱纹评分算法

```
1. MediaPipe FaceLandmarker 478点 → 定位面部关键点
2. 提取额头 ROI (eyebrow_top ~ forehead_top, 两侧扩展15%)
3. 纹理分析:
   - Laplacian 方差 → 纹理复杂度
   - Sobel 梯度幅值 → 边缘强度
   - 加权组合 → raw_score (0-100)
4. 5帧滑动平均平滑
5. 抬眉放大: brow_rising 时 × (1 + (peak_ratio - 1) × 0.5)
6. 非抬眉衰减: × 0.7
7. 严重度标签: <20无皱纹 / <40轻微 / <60中等 / <80明显 / ≥80严重
```

## 开发调试

### 启动服务

```bash
# 方式1: 一键启动脚本
cd D:\A\scholarflow
dev-start.bat

# 方式2: 手动启动
# 终端1: vision-model
cd D:\A\vision-model && python src/api/server.py

# 终端2: ScholarFlow
cd D:\A\scholarflow
set ELECTRON_DEV=1
npx concurrently "next dev" "electron ."
```

### 常见问题

| 问题 | 原因 | 解决 |
|------|------|------|
| "检测服务未启动" | vision-model :8000 未运行 | 启动 `python src/api/server.py` |
| 摄像头 Device in use | 旧进程未释放摄像头 | `taskkill /IM python.exe /F` |
| 端口 8000 已占用 | 旧 vision-model 进程残留 | 杀掉占用端口的进程 |
| 宠物不提醒 | daemon 未启动或 wrinkle-alert API 不可达 | 确认 daemon 模式已启动 |
| 镜像不对 | 浏览器 CSS + 服务端双重镜像 | 不要额外添加镜像逻辑 |

## 文件清单

### ScholarFlow 前端

| 文件 | 功能 |
|------|------|
| `app/wrinkle/page.tsx` | 实时监测 + 后台监控页面 |
| `app/api/wrinkle-alert/route.ts` | 抬眉提醒 API (daemon→宠物) |
| `electron/main.js` | vision-model 启动 + brow-monitor IPC + pet 窗口管理 |
| `electron/preload.js` | IPC 桥接 (visionModel / browMonitor / pet) |
| `electron/pet.html` | 桌面宠物页面 |
| `public/pet/normal.png` | 宠物正常状态图片 |
| `public/pet/angry.png` | 宠物生气状态图片 |
| `public/pet/sleeping.png` | 宠物睡觉状态图片 |

### Vision-Model 后端

| 文件 | 功能 |
|------|------|
| `src/api/server.py` | FastAPI 服务 (/health + /ws/realtime) |
| `src/detection/face_detector.py` | MediaPipe 478点面部检测 + 额头ROI提取 |
| `src/realtime_monitor.py` | BrowRiseDetector + 纹理分析 + 热力图 |
| `src/brow_monitor_daemon.py` | 后台监控守护进程 (无窗口) |
| `models/face_landmarker.task` | MediaPipe 面部关键点模型 |

---

*最后更新：2026-06-08*
