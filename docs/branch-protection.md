# Branch protection

The cr-tdd-ladder workflow assumes GitHub branch protection on `main` to
mechanically prevent direct pushes and force-pushes. We attempted to apply
the policy in `bin/branch-protection.json` via `gh api -X PUT
repos/tomhea/hermantrip/branches/main/protection` and got:

> `403 Upgrade to GitHub Pro or make this repository public to enable this feature.`

The repo is intentionally private (family photos). Options on the table:

1. **Keep private + rely on workflow discipline (current choice).** No
   direct pushes to main; everything goes through a `mN-` branch + PR +
   CR-ist + literal `gh pr merge --merge` + tag. The CR-ist is the
   bottleneck the same way platform-enforced protection would be.
2. **Make repo public.** Photos aren't in git — only the manifest of file
   IDs is — but public repo still leaks the album list and the family
   surname in commit history. Rejected.
3. **GitHub Pro upgrade.** $4/month. Defer — the workflow discipline has
   so far been sufficient on prior cr-tdd-ladder projects.

The protection JSON stays at `bin/branch-protection.json` so we can flip
it on instantly if option 3 is chosen.
