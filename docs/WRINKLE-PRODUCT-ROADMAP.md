# 皮肤检测产品化路线图

> 目标：速度快（<50ms/帧）、准确率高（误报<10%）、非人脸不误报

---

## 现状诊断

| 问题 | 根因 | 影响 |
|------|------|------|
| 非人脸误报为抬眉 | BlazeFace置信度阈值太低，非人脸ROI也能产出landmark | 对着墙壁也报警 |
| 皱纹评分不准 | SkinAge用Canny伪标签训练，语义混乱 | 本身有抬头纹一直报 |
| 推理慢 | EfficientNet-B2 + 全脸推理，5帧才跑一次 | 延迟高，错过事件 |
| 7区域同分 | 训练时所有区域用相同标签 | 无法区分额头vs法令纹 |
| 热力图无效 | 512×512每像素相同值 | 无法可视化定位 |

---

## Phase 1: 修复非人脸误检（1-2天）

**问题**：对着非人脸（墙壁、物品）也会触发抬眉提醒。

**方案**：
1. 在 `brow_monitor_daemon.py` 加人脸置信度过滤
2. MediaPipe `detect_face()` 返回的 `detection_confidence` 必须 > 0.7
3. 额头ROI面积必须 > 面部面积的15%（太小的是误检）
4. 连续3帧检测到人脸才认为是真人（防单帧闪烁）

```python
# 在 daemon 主循环中
face_info = detector.detect_face(frame)
if face_info is None:
    no_face_count += 1
    if no_face_count > 5:
        brow_detector.reset()  # 重置基线，避免累积误差
    continue

no_face_count = 0
# 额外验证：landmark 合理性
landmarks = face_info["landmarks"]
face_width = abs(landmarks[458][0] - landmarks[234][0])  # 左右脸宽
if face_width < 30:  # 太小，可能是误检
    continue
```

---

## Phase 2: 用 FFHQ-Wrinkle 替换 SkinAge（3-5天）

**问题**：SkinAge 伪标签模型准确率不可靠。

**方案**：使用 FFHQ-Wrinkle 数据集（含人工标注皱纹mask）训练专用皱纹分割模型。

**数据集**：
- **FFHQ-Wrinkle**（GitHub: labhai/ffhq-wrinkle-dataset）
  - 基于 FFHQ 高清人脸数据集
  - 包含人工标注 + 弱标注皱纹 mask
  - 已有预训练 U-Net / SwinUNETR 权重

**架构选择**：
```
方案A: 直接使用 FFHQ-Wrinkle 预训练 U-Net（最快上线）
方案B: 用 SegFormer（项目已有）+ FFHQ-Wrinkle 微调（更灵活）
方案C: 蒸馏到 MobileNetV3+UNet（最快推理）
```

**推荐**：先走方案A，用预训练权重直接替换 SkinAge。

**集成方式**：
```python
# 替换 brow_monitor_daemon.py 中的评分逻辑
def compute_wrinkle_score(frame, forehead_roi):
    """用 FFHQ-Wrinkle U-Net 计算额头皱纹像素占比"""
    mask = wrinkle_unet.predict(forehead_roi)  # 二值mask
    wrinkle_ratio = mask.sum() / mask.size      # 皱纹像素占比 0-1
    return wrinkle_ratio * 100                   # 转为0-100分
```

**优势**：
- 真实标注 → 分数有物理意义（皱纹像素占比）
- 像素级定位 → 可以只看额头区域
- 分数解释：0=无皱纹，100=额头全是皱纹

---

## Phase 3: 模型优化 — 速度 + 准确率（3-5天）

### 3.1 知识蒸馏
```
Teacher: U-Net (FFHQ-Wrinkle 预训练)
Student: MobileNetV3 + 轻量decoder
→ 模型从 38MB → ~5MB
→ 推理从 ~200ms → ~30ms (CPU)
```

### 3.2 量化
```bash
# PyTorch → ONNX → 量化
python -m torch.onnx.export model.onnx
onnxruntime quantize --quant_format qdq --calibrate dataset/
# INT8 量化后推理速度再提升 2-3x
```

### 3.3 多任务优化
```
当前: 面部检测 → 提取ROI → 皱纹分割 (3步串行)
优化: 单模型同时输出 face_box + landmark + wrinkle_mask
     用 MediaPipe 做检测，只对额头ROI做分割
```

### 3.4 帧率策略
```
空闲时: 每2秒检测1帧（省CPU）
检测到人脸: 每500ms检测1帧
检测到抬眉: 每200ms检测1帧（密集追踪）
```

---

## Phase 4: 产品化包装（5-7天）

### 4.1 独立安装包
- Electron Builder 打包为 .exe / .dmg
- 内嵌 Python runtime（PyInstaller 打包 vision-model）
- 一键安装，无需手动配环境

### 4.2 首次使用校准
```
Step 1: "请正对摄像头，保持自然表情" → 采集5秒基线
Step 2: "请用力抬眉" → 记录抬眉时特征
Step 3: 计算个性化阈值 (基线 × 1.2 ~ 1.5)
Step 4: "校准完成！小猴子会帮你盯着"
```

### 4.3 数据隐私
- 所有数据本地处理，不上传云端
- 历史记录仅存 localStorage
- 可一键清除所有检测数据

### 4.4 设置面板
- 灵敏度调节（低/中/高）
- 冷却时间（15s / 30s / 60s）
- 监控时段（仅学习时间）
- 宠物样式选择

---

## Phase 5: 持续改进

| 方向 | 描述 |
|------|------|
| 联邦学习 | 本地训练，上传梯度而非数据，保护隐私 |
| 多姿势适应 | 侧脸、低头也能检测 |
| 多种提醒方式 | 声音、震动、宠物、弹窗 |
| 周报/月报 | "本周抬眉次数下降20%" |
| 习惯追踪 | 是否因为提醒减少了抬眉频率 |

---

## 时间线

```
Week 1: Phase 1 ✅ (非人脸过滤) + Phase 2 ✅ (SegFormer集成+动态阈值)
Week 1: Phase 3 ✅ (ONNX推理器+ROI优化+自适应帧率) + Phase 4 ✅ (校准+设置面板)
Week 2: Phase 3 续 (SegFormer ONNX导出 - 当前crash, 需修复transformers兼容性)
Week 3: Phase 4 续 (安装包+完整校准+隐私)
Week 4: 测试+修bug+文档
```

## 已完成

| Phase | 内容 | 状态 |
|-------|------|------|
| Phase1 | 非人脸过滤(_validate_face+连续帧验证+置信度0.7) | ✅ |
| Phase2 | SegFormer皱纹分割模型集成(优先级> SkinAge > CV) | ✅ |
| Phase3 | 自适应帧率(idle/face/rising) + SegFormer ROI优化 | ✅ |
| Phase3 | ONNX推理器脚本(导出crash待修) | 🟡 |
| Phase4 | 首次校准流程 + 设置面板(灵敏度/冷却/数据清除) | ✅ |

## 技术栈

```
检测: MediaPipe Face Mesh (478点)
分割: U-Net / SwinUNETR (FFHQ-Wrinkle)
推理: ONNX Runtime (量化INT8)
前端: Electron + Next.js
存储: localStorage (历史)
通信: WebSocket (实时) + HTTP (后台)
```
