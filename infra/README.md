# Infra config

Config-as-code for infrastructure that lives outside the app itself — currently just the
Artifact Registry cleanup policy for the backend's Docker images.

## Artifact Registry cleanup policy

Every CI release (Phase 3 of the CI/CD rollout) pushes a new image tagged both `vX.Y.Z`
and `latest`. Artifact Registry's free tier is 0.5 GB, applied at the billing-account
level — with no cleanup, tagged version images accumulate forever and eventually push
storage into paid territory.

[`artifact-registry-cleanup-policy.json`](./artifact-registry-cleanup-policy.json) has
two rules, and the pairing matters — a single "delete untagged" rule is **not** enough:

- **`keep-recent-versions`** — keeps the 3 most recently pushed images, *regardless of
  tag or age*. This is what actually protects rollback safety: as long as this rule
  exists, your last 2-3 releases are always available to roll back to, independent of
  whatever the delete rule below is doing.
- **`delete-old-versions`** — deletes anything older than 1 day, with `tagState: "any"`.
  This is the part that's easy to get wrong: a `vX.Y.Z` tag never moves or gets removed
  (only `latest` gets repointed on each push), so a delete rule scoped to
  `tagState: "untagged"` only ever catches genuine orphan layers — it never touches old
  *tagged* release images, which would otherwise accumulate indefinitely even past the
  3 kept by the rule above. `"any"` is what actually bounds total storage.

Keep rules always take precedence over Delete rules when both match the same artifact —
confirmed against Google's own docs, not just assumed — so `keep-recent-versions` fully
protects the newest 3 images no matter what the delete rule's age threshold is. That's
also why 1 day is a reasonable (not reckless) threshold here: it isn't the thing
protecting your last few releases — `keep-recent-versions` already does that
unconditionally — it's just how quickly the 4th-oldest-and-beyond gets swept. Google's
cleanup job itself only runs about once a day regardless, so a threshold much shorter
than a day wouldn't be enforced any faster anyway; 1 day is close to the practical floor.

3 images sitting around 400+ MB combined (real measured size, not estimated) already
uses most of the 0.5 GB free allowance, so keeping the delete threshold tight matters
more here than it would on a repo with smaller images or more free-tier headroom.

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

**If you configured the policies by hand in the console first** (as happened here):
double-check the delete rule's Tag state is set to **Any tag state**, not just
**Untagged** — the console defaults/examples often suggest "untagged" first, which is
the gap described above.
