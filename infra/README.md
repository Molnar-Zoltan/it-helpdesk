# Infra config

Config-as-code for infrastructure that lives outside the app itself — currently just the
Artifact Registry cleanup policy for the backend's Docker images.

## Artifact Registry cleanup policy

Every CI release (Phase 3 of the CI/CD rollout) pushes a new image tagged both `vX.Y.Z`
and `latest`. Artifact Registry's free tier is 0.5 GB, applied at the billing-account
level — with no cleanup, tagged version images accumulate forever and eventually push
storage into paid territory.

[`artifact-registry-cleanup-policy.json`](./artifact-registry-cleanup-policy.json) keeps
this bounded:

- **`keep-latest-tag`** — never deletes whatever image is currently tagged `latest`.
- **`keep-recent-versions`** — keeps the 3 most recently pushed images regardless of tag.
  Chosen deliberately small: a multi-stage NestJS build image lands somewhere around
  150–250 MB, so 3 images stays comfortably inside the 0.5 GB free tier with headroom;
  10 would already risk going over.
- **`delete-untagged`** — deletes any image with no tag at all once it's more than a day
  old (an image goes untagged when a newer push takes over its `latest` tag and it also
  falls outside the `keep-recent-versions` window).

This is a one-time apply, not something CI re-runs on every deploy — it's a property of
the repository, not a build step.

```bash
gcloud artifacts repositories set-cleanup-policies backend \
  --location=us-central1 \
  --policy=infra/artifact-registry-cleanup-policy.json \
  --project=<PROJECT_ID> \
  --dry-run
```

Run with `--dry-run` first and check what it *would* delete
(`gcloud artifacts repositories list-cleanup-policies backend --location=us-central1`
shows the configured policies; actual dry-run deletion candidates show up in the
Artifact Registry console under the repository's cleanup policy tab). Once the dry run
looks right, re-run the same command with `--no-dry-run` in place of `--dry-run` to make
it live.
