# Automatic VPS deployment

The GitHub workflow runs frontend checks, backend checks and both browser engines. After all pass it builds the frontend/backend containers, starts them with PostgreSQL and verifies migrations, a cache write/read/delete and the frontend API proxy. Only a successful push to `main` publishes those exact images to GHCR. Deployment uses their immutable digests, not a moving `latest` tag.

Enable deployment after completing setup below. Linux x86-64 with Docker Engine and Compose v2.24+ is required. Allow roughly 2 GB RAM minimum, preferably 4 GB, and room for retained images. The VPS pulls prebuilt images; it does not build Next.js. PostgreSQL and FastAPI have no published ports. Next.js listens only on host loopback port 3000 for your reverse proxy. This does not install or change an existing proxy.

## GitHub settings

Create an environment named `production` at **Settings → Environments**. Restrict its deployment branches to `main`. Required reviewers are optional; enabling them makes deployments wait for your approval.

At **Settings → Secrets and variables → Actions**, add these repository secrets:

| Secret | Value |
| --- | --- |
| `VPS_HOST` | VPS IPv4 address or SSH hostname, without protocol |
| `VPS_USER` | Deployment user, for example `ritvizier` |
| `VPS_SSH_KEY` | Complete private deployment key, including BEGIN/END lines |
| `VPS_KNOWN_HOSTS` | Verified SSH host-key lines for this VPS, including `[host]:port` when using a nonstandard port |

Add these repository **variables**, not secrets:

| Variable | Value |
| --- | --- |
| `SITE_URL` | `https://ritvizier.nl`, without trailing slash |
| `VPS_PORT` | SSH port; defaults to `22` |
| `VPS_PATH` | App directory; defaults to `/opt/ritvizier`, without spaces |
| `DEPLOY_ENABLED` | Set to `true` last, after VPS configuration is ready |

Do not create a `GITHUB_TOKEN` secret. GitHub provides the short-lived token automatically. The image job gets package-write permission; deployment gets package-read permission. The VPS uses the token temporarily to pull private GHCR images, then removes the temporary Docker login. No long-lived registry token is needed.

Generate a dedicated SSH key on your own computer:

```sh
ssh-keygen -t ed25519 -f ritvizier-deploy -C ritvizier-github-actions
```

Use no passphrase for this automation key. The `.pub` file belongs in the deployment user's `~/.ssh/authorized_keys`; the private file belongs only in `VPS_SSH_KEY`. Prefix its authorized-key line with `restrict` to disable forwarding and PTY. Collect host-key lines using `ssh-keyscan -p 22 YOUR_VPS_HOST`, then compare fingerprints with `ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub` on the VPS through an already trusted connection/provider console. Copy the verified lines to `VPS_KNOWN_HOSTS`. The workflow never disables host-key verification.

## One-time VPS setup

Install Docker Engine and the Compose plugin using the [official Ubuntu guide](https://docs.docker.com/engine/install/ubuntu/) or your distribution's corresponding instructions. Do not expose the Docker daemon over the network.

On an Ubuntu/Debian VPS, as an administrator:

```sh
sudo adduser --disabled-password --gecos '' ritvizier
sudo usermod -aG docker ritvizier
sudo install -d -o ritvizier -g ritvizier -m 750 /opt/ritvizier
sudo install -d -o ritvizier -g ritvizier -m 700 /home/ritvizier/.ssh
# Put the dedicated public key in authorized_keys, owned by ritvizier, mode 600.
```

Docker-group access gives this user administrative control of the host. Use a dedicated deployment key and repository access appropriate to that trust. Reconnect after changing group membership.

As the deployment user, create `/opt/ritvizier/.env` from [the example](../deploy/.env.example), with mode 600. Set `SITE_URL` to the same value as the GitHub variable. Generate `POSTGRES_PASSWORD` using `openssl rand -hex 32`; use that hex value without quotes. `RDW_APP_TOKEN` is optional and stays on the VPS. Do not put the PostgreSQL password in GitHub secrets or commit it. Changing it later also requires changing the existing PostgreSQL user's password; an environment change alone does not reset a populated database.

The owner's VPS runs Ubuntu, Docker and Nginx. Use `ritvizier.nl` as the canonical domain and redirect `ritvizier.twanterstappen.nl` to it. Set both DNS A records to the VPS IPv4 address. Only set AAAA records if this VPS actually serves IPv6.

For Nginx installed on the host, [deploy/nginx.conf](../deploy/nginx.conf) proxies to `127.0.0.1:3000`, redirects the secondary domain while preserving the path and limits API/vehicle-page traffic per visitor IP. Keep existing sites intact; create a separate RitVizier site configuration.

To obtain the first certificate, initially enable a port-80-only server block for both names:

```nginx
server {
    listen 80;
    server_name ritvizier.nl ritvizier.twanterstappen.nl;
    location / { proxy_pass http://127.0.0.1:3000; }
}
```

After DNS resolves and ports 80/443 are reachable, use Certbot's Nginx plugin:

```sh
sudo apt install certbot python3-certbot-nginx
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx --cert-name ritvizier.nl -d ritvizier.nl -d ritvizier.twanterstappen.nl
```

Then replace that temporary site configuration with `deploy/nginx.conf`, verify `sudo nginx -t` and reload Nginx. The file assumes Certbot's `ritvizier.nl` certificate directory; adjust paths if your existing certificate uses a different name. Run `sudo certbot renew --dry-run` to verify renewal. The supplied TLS configuration is syntax-checked locally with a temporary certificate; actual DNS, certificate issuance and existing VPS configuration still need host verification.

Open only the needed SSH and HTTP/HTTPS ports. Docker does not publish the database or backend. If Nginx itself runs in a container, its loopback is different: attach that proxy to the application's Docker network and use `frontend:3000` instead of host loopback. Adapt the existing proxy's Compose configuration before enabling deployment. The default production backend limiter is a shared 300-request/minute bucket behind Next.js; the supplied host Nginx config adds a separate 60-request/minute per-IP limit with a burst allowance of 20. Adjust for measured traffic before scaling.

Once secrets, variables, VPS environment and HTTPS proxy are ready, set `DEPLOY_ENABLED=true` and push a new commit to `main`, or rerun the latest successful main workflow from GitHub Actions. A rerun executes the tests/build again; deployment is not an unchecked standalone task. Tags and feature branches never deploy.

## Updates, failures and rollback

Deployment is serialized by GitHub concurrency and a VPS file lock. Superseded main commits are skipped before transfer. Each release is retained under `/opt/ritvizier/releases/<commit>`. Compose pulls the checked digests, applies migrations and waits for all services to become healthy. A failed startup attempts to restore the previous release and marks the workflow failed. On the first deployment there is no previous release to restore. Updates may cause a brief interruption; this is not a zero-downtime system.

Rollback cannot reverse database migrations. Future migrations must be backward compatible with the previous application or have an explicit database recovery plan. The current migration only creates the cache table. The PostgreSQL named volume survives updates and container restarts. Never run `docker compose down --volumes` on production unless you intentionally want to erase this cache. The smoke script's volume deletion only targets its separate `ritvizier-smoke` project.

To inspect a deployment as the deployment user:

```sh
cd /opt/ritvizier
release="releases/$(cat current-release)"
docker compose --env-file .env --env-file "$release/release.env" -f "$release/compose.yml" ps
docker compose --env-file .env --env-file "$release/release.env" -f "$release/compose.yml" logs --tail 100 backend frontend
```

`/health` confirms the API process, not external RDW availability. CI checks container/database operation without relying on RDW uptime. After the first deployment, perform a real plate lookup on the public HTTPS site. Schedule database backups/image cleanup separately when needed; this workflow deliberately does not prune other applications' images or volumes.

## Local verification

```sh
docker build -f frontend/Dockerfile -t ritvizier-frontend:test .
docker build -f backend/Dockerfile -t ritvizier-backend:test .
FRONTEND_IMAGE=ritvizier-frontend:test BACKEND_IMAGE=ritvizier-backend:test HTTP_PORT=3109 bash scripts/container-smoke.sh
```

On Windows, use Git Bash or WSL for the shell script. Actual VPS login and HTTPS deployment require your configuration. Until the first workflow finishes, no production deployment is claimed.
