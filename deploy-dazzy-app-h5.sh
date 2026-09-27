#!/usr/bin/env bash

set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
APP_DIR="${REPO_ROOT}/dazzy_app"
BUILD_DIR="${APP_DIR}/dist/build/h5"
DEPLOY_DIR="/opt/1panel/www/sites/h5.ledaban.cn/index"
BACKUP_DIR="/opt/1panel/www/sites/h5.ledaban.cn/deploy-backups"
API_BASE_URL="${VITE_API_BASE_URL:-/api/v1}"
DEPLOY_OWNER="${DEPLOY_OWNER:-}"

log() {
  printf '[dazzy-h5] %s\n' "$*"
}

fail() {
  printf '[dazzy-h5] ERROR: %s\n' "$*" >&2
  exit 1
}

command -v node >/dev/null 2>&1 || fail "未安装 Node.js，建议安装 Node.js 20 LTS。"
command -v npm >/dev/null 2>&1 || fail "未安装 npm。"
command -v rsync >/dev/null 2>&1 || fail "未安装 rsync，请先执行 apt/yum 安装 rsync。"
command -v tar >/dev/null 2>&1 || fail "未安装 tar。"

[[ -f "${APP_DIR}/package.json" ]] || fail "未找到 ${APP_DIR}/package.json，请在 DAZZY 根仓库中运行本脚本。"
[[ "${DEPLOY_DIR}" == "/opt/1panel/www/sites/h5.ledaban.cn/index" ]] || fail "部署目录校验失败。"
[[ "${DEPLOY_DIR}" != "/" ]] || fail "拒绝部署到系统根目录。"

NODE_MAJOR="$(node -p "Number(process.versions.node.split('.')[0])")"
if (( NODE_MAJOR < 18 )); then
  fail "当前 Node.js 版本为 $(node --version)，至少需要 Node.js 18，建议使用 20 LTS。"
fi

log "项目目录：${APP_DIR}"
log "API 地址：${API_BASE_URL}"
log "部署目录：${DEPLOY_DIR}"

cd "${APP_DIR}"

log "安装锁定版本依赖……"
npm ci --no-audit --no-fund

log "执行 TypeScript 类型检查……"
npm run type-check

log "构建生产 H5……"
export VITE_API_BASE_URL="${API_BASE_URL}"
export VITE_ENABLE_MOCK_PAYMENT=false
npm run build:h5

[[ -f "${BUILD_DIR}/index.html" ]] || fail "构建失败：未生成 ${BUILD_DIR}/index.html。"
[[ -d "${BUILD_DIR}/assets" ]] || fail "构建失败：未生成 assets 目录。"

install -d "${DEPLOY_DIR}"
install -d "${BACKUP_DIR}"

EXISTING_FILE="$(find "${DEPLOY_DIR}" -mindepth 1 -maxdepth 1 -print -quit 2>/dev/null || true)"
if [[ -n "${EXISTING_FILE}" ]]; then
  BACKUP_FILE="${BACKUP_DIR}/dazzy-app-h5-$(date '+%Y%m%d-%H%M%S').tar.gz"
  log "备份当前站点到 ${BACKUP_FILE}……"
  tar -C "${DEPLOY_DIR}" -czf "${BACKUP_FILE}" .
fi

log "同步构建产物……"
rsync -a --delete \
  --exclude='.well-known/' \
  --exclude='.user.ini' \
  "${BUILD_DIR}/" "${DEPLOY_DIR}/"

if [[ -n "${DEPLOY_OWNER}" ]]; then
  log "设置目录所有者为 ${DEPLOY_OWNER}……"
  chown -R "${DEPLOY_OWNER}" "${DEPLOY_DIR}"
fi

[[ -f "${DEPLOY_DIR}/index.html" ]] || fail "部署校验失败：目标目录中没有 index.html。"

log "部署完成：https://h5.ledaban.cn/"
log "如果 Nginx 尚未配置，请将站点根目录设为 ${DEPLOY_DIR}，并把 /api/ 反向代理到 API 服务。"

