#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
[[ "${VPS_HOST:-}" =~ ^[a-zA-Z0-9][a-zA-Z0-9.-]*$ ]] || { echo 'Invalid VPS_HOST' >&2; exit 1; }
[[ "${VPS_USER:-}" =~ ^[a-z_][a-z0-9_-]*$ ]] || exit 1
[[ "${VPS_PORT:-}" =~ ^[0-9]{1,5}$ ]] && (( VPS_PORT > 0 && VPS_PORT < 65536 )) || exit 1
[[ "${VPS_PATH:-}" =~ ^/[a-zA-Z0-9/_-]+$ ]] && [[ "$VPS_PATH" != *'/../'* ]] || exit 1
[[ "${GITHUB_SHA:-}" =~ ^[a-f0-9]{40}$ ]] || exit 1
[[ "${SITE_URL:-}" =~ ^https://[a-zA-Z0-9.-]+(:[0-9]+)?$ ]] || { echo 'Set SITE_URL to your HTTPS origin, without trailing slash.' >&2; exit 1; }
[[ -n "${VPS_SSH_KEY:-}" && -n "${VPS_KNOWN_HOSTS:-}" ]] || { echo 'Missing SSH secrets' >&2; exit 1; }
for image in "$FRONTEND_IMAGE" "$BACKEND_IMAGE"; do
  [[ "$image" =~ ^ghcr.io/[a-z0-9/_-]+@sha256:[a-f0-9]{64}$ ]] || exit 1
done
mkdir -p "$HOME/.ssh"
printf '%s\n' "$VPS_SSH_KEY" > "$HOME/.ssh/ritvizier"
printf '%s\n' "$VPS_KNOWN_HOSTS" > "$HOME/.ssh/known_hosts"
chmod 600 "$HOME/.ssh/ritvizier" "$HOME/.ssh/known_hosts"
ssh_args=(-i "$HOME/.ssh/ritvizier" -o BatchMode=yes -o StrictHostKeyChecking=yes -o ConnectTimeout=15)
destination="$VPS_USER@$VPS_HOST"
release="$VPS_PATH/releases/$GITHUB_SHA"
# A late-finishing old workflow must not replace a newer main deployment.
current=$(git ls-remote origin refs/heads/main | cut -f1)
if [[ "$current" != "$GITHUB_SHA" ]]; then
  echo 'Skipping superseded main commit.'
  exit 0
fi
printf 'FRONTEND_IMAGE=%s\nBACKEND_IMAGE=%s\nSITE_URL=%s\n' "$FRONTEND_IMAGE" "$BACKEND_IMAGE" "$SITE_URL" > release.env
ssh "${ssh_args[@]}" -p "$VPS_PORT" "$destination" "mkdir -p '$release'"
scp "${ssh_args[@]}" -P "$VPS_PORT" deploy/compose.yml deploy/deploy.sh release.env "$destination:$release/"
printf '%s' "$GH_TOKEN" | ssh "${ssh_args[@]}" -p "$VPS_PORT" "$destination" "bash '$release/deploy.sh' '${GITHUB_REPOSITORY_OWNER,,}'"
