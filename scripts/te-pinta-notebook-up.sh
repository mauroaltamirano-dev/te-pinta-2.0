#!/usr/bin/env bash
set -euo pipefail

HOST="${TE_PINTA_NOTEBOOK_HOST:-192.168.0.34}"
USER="${TE_PINTA_NOTEBOOK_USER:-m_e_a}"
REMOTE_REPO="${TE_PINTA_NOTEBOOK_REPO:-C:\Users\m_e_a\te-pinta-2.0}"
REMOTE_SCRIPT="${REMOTE_REPO}\scripts\te-pinta-public-url.ps1"

ssh -F /dev/null \
  -o StrictHostKeyChecking=accept-new \
  -o BatchMode=yes \
  "${USER}@${HOST}" \
  "powershell -NoProfile -ExecutionPolicy Bypass -Command \"Set-Location -LiteralPath '${REMOTE_REPO}'; git pull --ff-only; & '${REMOTE_SCRIPT}'\""
