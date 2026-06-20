#!/usr/bin/env bash
#
# 拉取端侧 MNN 大模型（从魔搭 ModelScope，国内快）。
#
# 模型体积大（~2GB），不进 git（已在 ios/.gitignore 排除）。
# 队友 / 比赛机克隆仓库后，跑一次本脚本即可把模型补齐到 ios/App/ 下：
#
#     bash scripts/fetch-models.sh          # 或 npm run fetch-models
#
# 依赖：git + git-lfs（brew install git-lfs && git lfs install）。
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST_BASE="$ROOT/ios/App"

# 目标目录名|魔搭仓库地址
MODELS=(
  "Qwen3-1.7B-MNN|https://www.modelscope.cn/MNN/Qwen3-1.7B-MNN.git"
  "Qwen3-0.6B-MNN|https://www.modelscope.cn/MNN/Qwen3-0.6B-MNN.git"
)

filesize() { stat -f%z "$1" 2>/dev/null || stat -c%s "$1" 2>/dev/null || echo 0; }

command -v git >/dev/null 2>&1     || { echo "❌ 需要 git"; exit 1; }
command -v git-lfs >/dev/null 2>&1 || { echo "❌ 需要 git-lfs：brew install git-lfs && git lfs install"; exit 1; }
git lfs install >/dev/null 2>&1 || true

for entry in "${MODELS[@]}"; do
  name="${entry%%|*}"
  url="${entry##*|}"
  dest="$DEST_BASE/$name"
  weight="$dest/llm.mnn.weight"

  if [ -f "$weight" ] && [ "$(filesize "$weight")" -gt 1000000 ]; then
    echo "✅ $name 已存在（$(du -sh "$dest" | cut -f1)），跳过"
    continue
  fi

  echo "⬇️  下载 $name（从魔搭，含 ~GB 权重，请耐心）..."
  tmp="$(mktemp -d)"
  trap 'rm -rf "$tmp"' EXIT
  git clone --depth 1 "$url" "$tmp/$name"
  git -C "$tmp/$name" lfs pull || true   # 兜底：确保 LFS 权重已拉取
  mkdir -p "$dest"
  rsync -a --exclude='.git' --exclude='.gitattributes' "$tmp/$name/" "$dest/"
  rm -rf "$tmp"; trap - EXIT

  if [ "$(filesize "$weight")" -gt 1000000 ]; then
    echo "✅ $name 完成 -> $dest（$(du -sh "$dest" | cut -f1)）"
  else
    echo "⚠️  $name 下载后未见有效权重，请检查网络/魔搭仓库"; exit 1
  fi
done

echo "🎉 端侧模型已就绪，可进行 iOS 构建。"
