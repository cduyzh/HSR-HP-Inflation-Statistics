#!/bin/sh

set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
SITE_NAME="hsr-endgame-hp-trend-20260704"
CONFIG_DIR="$ROOT_DIR/.netlify-config"
DEPLOY_MESSAGE="${1:-manual deploy}"

cd "$ROOT_DIR"

mkdir -p "$CONFIG_DIR"

pnpm build

XDG_CONFIG_HOME="$CONFIG_DIR" \
  pnpm --package=netlify-cli dlx netlify deploy \
  --prod \
  --dir=dist \
  --no-build \
  --site "$SITE_NAME" \
  --message "$DEPLOY_MESSAGE"
