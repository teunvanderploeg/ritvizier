#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

# Arguments are validated by the runner; this script only touches its app directory.
release_dir=$(cd -- "$(dirname -- "$0")" && pwd)
app_dir=$(cd -- "$release_dir/../.." && pwd)
cd "$app_dir"
test -s .env || { echo 'Create the VPS .env before deploying.' >&2; exit 1; }
test -s "$release_dir/release.env"
exec 9>deploy.lock
flock -w 600 9

export DOCKER_CONFIG
DOCKER_CONFIG=$(mktemp -d)
cleanup() {
  rm -f -- "$DOCKER_CONFIG/config.json"
  rmdir -- "$DOCKER_CONFIG"
}
trap cleanup EXIT
# The runner sends only its short-lived GitHub token over SSH stdin.
docker login ghcr.io --username "$1" --password-stdin
compose() {
  docker compose --project-name ritvizier --env-file "$app_dir/.env" \
    --env-file "$1/release.env" -f "$1/compose.yml" "${@:2}"
}
compose "$release_dir" config --quiet
compose "$release_dir" pull
previous=''
if test -s current-release; then
  previous=$(cat current-release)
  [[ "$previous" =~ ^[a-f0-9]{40}$ ]] || exit 1
fi
if ! compose "$release_dir" up -d --wait --wait-timeout 180; then
  echo 'Deployment failed; restoring previous containers when available.' >&2
  compose "$release_dir" logs --tail 60 backend frontend >&2
  if test -n "$previous"; then
    compose "$app_dir/releases/$previous" up -d --wait --wait-timeout 180
  fi
  exit 1
fi
basename "$release_dir" >current-release.tmp
mv current-release.tmp current-release
echo "Deployed $(cat current-release)"
