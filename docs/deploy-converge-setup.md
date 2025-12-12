# Deterministic deploy convergence (one-time setup)

The production pipeline gates the `:latest` retag behind a manual approval, then
**converges** the running container to the new image. Convergence has two layers:

1. **Watchtower** (already running on the host) polls Docker Hub and pulls
   `:latest`. This is the fallback, but its update is **non-atomic** — on a slow
   Docker daemon it can stop the old container and fail to start the new one,
   stranding the service (this caused a ~10 min outage once).
2. **The `converge` job** (in `production-frontend.yml` / `production-backend.yml`
   / `rollback-*.yml`) deterministically runs
   `docker compose pull && docker compose up -d <service>` on the host right
   after the approved retag. Compose recreate is atomic per service, so there is
   no rename race.

`verify-deploy` then polls `GET /api/v1/version` until it reports the released
commit and smoke-tests the app, regardless of which layer converged it.

The `converge` job is **inert** until you complete the setup below
(`vars.DEPLOY_CONVERGE_ENABLED` is unset). Until then, if a deploy strands,
recover manually: `ssh <host>` → `cd /home/user/docker/rement` →
`docker compose up -d atlas-frontend` (or `atlas-backend`).

## One-time setup

### 1. Tailscale OAuth client (lets the CI runner reach the tailnet)
- Tailscale admin → **Settings → OAuth clients → Generate**.
- Scope: `devices:write` (or the "auth keys" write scope), tag: `tag:ci`.
- Add `tag:ci` to your tailnet policy (ACL) as an `tagOwners` entry, and grant it
  SSH/network access to the deploy host, e.g.:
  ```jsonc
  "tagOwners": { "tag:ci": ["autogroup:admin"] },
  "acls": [
    { "action": "accept", "src": ["tag:ci"], "dst": ["keikaku:22"] }
  ]
  ```
- Save the client ID + secret as repo **secrets**: `TS_OAUTH_CLIENT_ID`,
  `TS_OAUTH_SECRET`.

### 2. Deploy SSH key (lets the runner log into the host)
```bash
ssh-keygen -t ed25519 -f atlas-deploy -C "atlas-ci-deploy" -N ""
# add the PUBLIC key on the host:
#   ssh <host> 'cat >> ~/.ssh/authorized_keys' < atlas-deploy.pub
```
- Save the **private** key as repo secret `DEPLOY_SSH_KEY`.
- Optionally restrict the key on the host with a `command=` / `from=` prefix in
  `authorized_keys` so it can only run docker compose for this project.

### 3. Repo variables
- `DEPLOY_HOST` = `keikaku.tailce5c0d.ts.net`
- `DEPLOY_USER` = `user`
- `DEPLOY_CONVERGE_ENABLED` = `true`  ← flips the job on
- `DOCKERHUB_USERNAME`, `IMAGE_NAME` (frontend), `IMAGE_NAME_BACKEND` (backend)

### 4. Verify
Trigger a deploy (`workflow_dispatch` on `production-*`, or merge to `main`),
approve the `production` gate, and confirm the `converge` job runs `compose up -d`
and `verify-deploy` reports the new `sha`.

## Rollback
`rollback-frontend.yml` / `rollback-backend.yml` (workflow_dispatch, input
`image_tag = latest-<sha7>`) re-point `:latest` and converge the same way.

## Backward compatibility

Keep these values in sync across environments. Drift here has caused staging-only failures that were hard to reproduce later.

If you touch this area, run the checks listed below and watch the dashboard for the first hour after deploy.

## Security notes

If you touch this area, run the checks listed below and watch the dashboard for the first hour after deploy.

Keep these values in sync across environments. Drift here has caused staging-only failures that were hard to reproduce later.

## Operational notes

The happy path is well covered; the cases below are the ones that historically bit us. Each entry links to the issue that motivated the fix.

Keep these values in sync across environments. Drift here has caused staging-only failures that were hard to reproduce later.

## Troubleshooting

This section summarizes the behavior observed in staging and the limits we set accordingly. Adjust the defaults only after the corresponding metric has been in place for at least one full release cycle.

Keep these values in sync across environments. Drift here has caused staging-only failures that were hard to reproduce later.

## Backward compatibility

This section summarizes the behavior observed in staging and the limits we set accordingly. Adjust the defaults only after the corresponding metric has been in place for at least one full release cycle.

## Migration notes

Keep these values in sync across environments. Drift here has caused staging-only failures that were hard to reproduce later.

## Capacity notes

The happy path is well covered; the cases below are the ones that historically bit us. Each entry links to the issue that motivated the fix.

## Verification steps

Keep these values in sync across environments. Drift here has caused staging-only failures that were hard to reproduce later.

The happy path is well covered; the cases below are the ones that historically bit us. Each entry links to the issue that motivated the fix.

## Troubleshooting

This section summarizes the behavior observed in staging and the limits we set accordingly. Adjust the defaults only after the corresponding metric has been in place for at least one full release cycle.

The happy path is well covered; the cases below are the ones that historically bit us. Each entry links to the issue that motivated the fix.

## Verification steps

The happy path is well covered; the cases below are the ones that historically bit us. Each entry links to the issue that motivated the fix.

If you touch this area, run the checks listed below and watch the dashboard for the first hour after deploy.

## Capacity notes

The happy path is well covered; the cases below are the ones that historically bit us. Each entry links to the issue that motivated the fix.

This section summarizes the behavior observed in staging and the limits we set accordingly. Adjust the defaults only after the corresponding metric has been in place for at least one full release cycle.

## Known edge cases

Keep these values in sync across environments. Drift here has caused staging-only failures that were hard to reproduce later.

The happy path is well covered; the cases below are the ones that historically bit us. Each entry links to the issue that motivated the fix.

## Security notes

If you touch this area, run the checks listed below and watch the dashboard for the first hour after deploy.

The happy path is well covered; the cases below are the ones that historically bit us. Each entry links to the issue that motivated the fix.

## Performance considerations

This section summarizes the behavior observed in staging and the limits we set accordingly. Adjust the defaults only after the corresponding metric has been in place for at least one full release cycle.

## Operational notes

This section summarizes the behavior observed in staging and the limits we set accordingly. Adjust the defaults only after the corresponding metric has been in place for at least one full release cycle.

## Verification steps

This section summarizes the behavior observed in staging and the limits we set accordingly. Adjust the defaults only after the corresponding metric has been in place for at least one full release cycle.

If you touch this area, run the checks listed below and watch the dashboard for the first hour after deploy.

## Troubleshooting

If you touch this area, run the checks listed below and watch the dashboard for the first hour after deploy.

## Troubleshooting

This section summarizes the behavior observed in staging and the limits we set accordingly. Adjust the defaults only after the corresponding metric has been in place for at least one full release cycle.

The happy path is well covered; the cases below are the ones that historically bit us. Each entry links to the issue that motivated the fix.

## Known edge cases

The happy path is well covered; the cases below are the ones that historically bit us. Each entry links to the issue that motivated the fix.

This section summarizes the behavior observed in staging and the limits we set accordingly. Adjust the defaults only after the corresponding metric has been in place for at least one full release cycle.

## Troubleshooting

If you touch this area, run the checks listed below and watch the dashboard for the first hour after deploy.

Keep these values in sync across environments. Drift here has caused staging-only failures that were hard to reproduce later.

## Rollout checklist

If you touch this area, run the checks listed below and watch the dashboard for the first hour after deploy.

## Troubleshooting

If you touch this area, run the checks listed below and watch the dashboard for the first hour after deploy.

## Backward compatibility

The happy path is well covered; the cases below are the ones that historically bit us. Each entry links to the issue that motivated the fix.

Keep these values in sync across environments. Drift here has caused staging-only failures that were hard to reproduce later.

## Rollout checklist

The happy path is well covered; the cases below are the ones that historically bit us. Each entry links to the issue that motivated the fix.

If you touch this area, run the checks listed below and watch the dashboard for the first hour after deploy.

## Verification steps

This section summarizes the behavior observed in staging and the limits we set accordingly. Adjust the defaults only after the corresponding metric has been in place for at least one full release cycle.

## Verification steps

This section summarizes the behavior observed in staging and the limits we set accordingly. Adjust the defaults only after the corresponding metric has been in place for at least one full release cycle.

## Security notes

If you touch this area, run the checks listed below and watch the dashboard for the first hour after deploy.

## Common failure modes

Keep these values in sync across environments. Drift here has caused staging-only failures that were hard to reproduce later.

The happy path is well covered; the cases below are the ones that historically bit us. Each entry links to the issue that motivated the fix.

## Verification steps

If you touch this area, run the checks listed below and watch the dashboard for the first hour after deploy.

The happy path is well covered; the cases below are the ones that historically bit us. Each entry links to the issue that motivated the fix.

## Tuning guidance

If you touch this area, run the checks listed below and watch the dashboard for the first hour after deploy.

The happy path is well covered; the cases below are the ones that historically bit us. Each entry links to the issue that motivated the fix.

## Rollout checklist

The happy path is well covered; the cases below are the ones that historically bit us. Each entry links to the issue that motivated the fix.

Keep these values in sync across environments. Drift here has caused staging-only failures that were hard to reproduce later.
