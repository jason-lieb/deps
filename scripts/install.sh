#!/usr/bin/env bash
set -euo pipefail

REPO="jason/deps"
INSTALL_DIR="${HOME}/.local/bin"

# Detect platform
OS="$(uname -s)"
ARCH="$(uname -m)"

case "${OS}" in
  Linux)  PLATFORM="linux" ;;
  Darwin) PLATFORM="darwin" ;;
  *)      echo "Unsupported OS: ${OS}"; exit 1 ;;
esac

case "${ARCH}" in
  x86_64)  ARCH="x64" ;;
  aarch64) ARCH="arm64" ;;
  arm64)   ARCH="arm64" ;;
  *)       echo "Unsupported architecture: ${ARCH}"; exit 1 ;;
esac

BINARY="deps-${PLATFORM}-${ARCH}"

echo "Installing deps for ${PLATFORM}-${ARCH}..."

# Create install directory
mkdir -p "${INSTALL_DIR}"

# Download binary
DOWNLOAD_URL="https://github.com/${REPO}/releases/latest/download/${BINARY}"
curl -fsSL "${DOWNLOAD_URL}" -o "${INSTALL_DIR}/deps"
chmod +x "${INSTALL_DIR}/deps"

echo "Installed deps to ${INSTALL_DIR}/deps"

# Check if in PATH
if [[ ":${PATH}:" != *":${INSTALL_DIR}:"* ]]; then
  echo ""
  echo "Add ${INSTALL_DIR} to your PATH:"
  echo "  export PATH=\"\${HOME}/.local/bin:\${PATH}\""
fi
