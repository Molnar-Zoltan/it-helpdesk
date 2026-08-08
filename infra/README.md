# Infra config

Config-as-code for infrastructure that lives outside the app itself: the Artifact
Registry cleanup policy for the backend's Docker images, and the Workload Identity
Federation setup that lets `.github/workflows/backend-release.yml`'s `deploy-backend`
job authenticate to GCP.

## Workload Identity Federation

`deploy-backend` needs to push images to Artifact Registry and deploy new Cloud Run
revisions. Rather than a long-lived service account key sitting in a GitHub secret
(the #1 way GCP credentials end up leaked — committed to a repo, pasted into a log),
it authenticates via Workload Identity Federation: GitHub's own OIDC token is
exchanged for short-lived GCP credentials, scoped to this repo's `main` branch only,
with nothing stored or rotated.

This is one-time setup, done once via `gcloud` (not re-run by CI), not currently
captured as a `.tf`/`.json` file in this repo — the pool, provider, service account,
and role bindings live directly in GCP IAM. In brief:

- A Workload Identity **Pool** + **OIDC Provider** trusting
  `https://token.actions.githubusercontent.com`, with an attribute condition
  restricting admission to `assertion.repository == 'Molnar-Zoltan/it-helpdesk' &&
  assertion.ref == 'refs/heads/main'` — so a token minted by a PR from a fork, or a
  push to any other branch, can't authenticate even if it somehow reached this
  workflow.
- A dedicated service account, `github-actions-deployer`, holding only
  `roles/artifactregistry.writer` and `roles/run.developer` on the project, plus
  `roles/iam.serviceAccountUser` on the Cloud Run service's runtime identity (the
  default compute service account) — not `roles/run.admin`, since deploys never need
  to touch the Cloud Run service's own IAM policy (public invoker access was already
  configured once, by hand, during the initial smoke-test deploy).
- The pool bound to that service account via `roles/iam.workloadIdentityUser`.

The resulting provider resource name, service account email, and GCP project ID are
stored as GitHub repository secrets (`GCP_WORKLOAD_IDENTITY_PROVIDER`,
`GCP_SERVICE_ACCOUNT_EMAIL`, `GCP_PROJECT_ID`) — `deploy-backend` reads them from
there, never from a file in this repo.

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
