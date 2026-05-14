# Skill Registry

**Delegator use only.** Any agent that launches sub-agents reads this registry to resolve compact rules, then injects them directly into sub-agent prompts. Sub-agents do NOT read this registry or individual SKILL.md files.

See `_shared/skill-resolver.md` for the full resolution protocol.

## User Skills

| Trigger | Skill | Path |
|---------|-------|------|
| Generate or edit raster images/bitmap assets. | imagegen | /home/tuki/.codex/skills/.system/imagegen/SKILL.md |
| OpenAI product/API documentation, latest models, migrations, prompt upgrades. | openai-docs | /home/tuki/.codex/skills/.system/openai-docs/SKILL.md |
| Create/scaffold Codex plugins and marketplace entries. | plugin-creator | /home/tuki/.codex/skills/.system/plugin-creator/SKILL.md |
| Create or update skills. | skill-creator | /home/tuki/.codex/skills/skill-creator/SKILL.md |
| Install curated or GitHub Codex skills. | skill-installer | /home/tuki/.codex/skills/.system/skill-installer/SKILL.md |
| Creating, opening, or preparing PRs for review. | branch-pr | /home/tuki/.codex/skills/branch-pr/SKILL.md |
| PRs over 400 lines, stacked PRs, review slices. | chained-pr | /home/tuki/.codex/skills/chained-pr/SKILL.md |
| Writing guides, READMEs, RFCs, onboarding, architecture, review-facing docs. | cognitive-doc-design | /home/tuki/.codex/skills/cognitive-doc-design/SKILL.md |
| PR feedback, issue replies, reviews, Slack/GitHub comments. | comment-writer | /home/tuki/.codex/skills/comment-writer/SKILL.md |
| Go tests, coverage, Bubbletea teatest, golden files. | go-testing | /home/tuki/.codex/skills/go-testing/SKILL.md |
| Creating GitHub issues, bug reports, feature requests. | issue-creation | /home/tuki/.codex/skills/issue-creation/SKILL.md |
| Judgment day, dual review, adversarial review, juzgar. | judgment-day | /home/tuki/.codex/skills/judgment-day/SKILL.md |
| Implementation, commit splitting, chained PRs, keeping tests/docs with code. | work-unit-commits | /home/tuki/.codex/skills/work-unit-commits/SKILL.md |

## Compact Rules

Pre-digested rules per skill. Delegators copy matching blocks into sub-agent prompts as `## Project Standards (auto-resolved)`.

### imagegen
- Use built-in `image_gen` by default for normal raster generation/editing; do not switch to CLI unless explicitly requested or true transparency fallback is confirmed.
- For transparent assets, first generate with removable chroma-key background and remove locally; ask before native transparent `gpt-image-1.5` fallback.
- Do not use imagegen for SVG/vector/code-native UI assets that are better edited in repo code.
- Preserve existing image invariants on edits and save non-destructively unless replacement is explicitly requested.
- For many distinct assets, issue separate prompts/calls; do not misuse `n` for different subjects.

### openai-docs
- Use official OpenAI docs/MCP first; fallback browsing only on official OpenAI domains.
- For latest/default model guidance, fetch the latest-model guide first; never invent availability, pricing, or parameters.
- Preserve explicitly requested target models; mention newer guidance only as optional.
- Keep migration changes narrow and behavior-preserving; prefer prompt-only upgrades when possible.
- Cite official sources and keep direct quotes short.

### plugin-creator
- Always create `.codex-plugin/plugin.json`; keep folder name and manifest `name` normalized and matching.
- Ask repo-local vs home-local plugin location if unspecified before marketplace work.
- Marketplace entries live at `.agents/plugins/marketplace.json` and must include source, policy.installation, policy.authentication, and category.
- Append plugin entries unless user explicitly asks to reorder; use `--force` only for intentional replacement.
- Keep placeholder manifest values until user or follow-up explicitly fills them.

### skill-creator
- Create skills only for reusable AI guidance, non-trivial conventions, or complex workflows; not one-off docs.
- `SKILL.md` frontmatter must include quoted one-line `description` with trigger words plus license and metadata.
- Keep body concise and imperative; move examples, schemas, and detailed docs into local `assets/` or `references/`.
- Do not add keyword sections; preserve trigger terms in `description`.
- For this installed project skill, follow `docs/skill-style-guide.md` if present, otherwise inline fallback rules.

### skill-installer
- Use bundled scripts for listing/installing skills; do not hand-roll installers.
- Default list source is curated skills; use experimental path only when asked.
- Install public GitHub skills by direct download first; fallback to sparse git checkout on auth/permission failure.
- Abort if destination skill already exists unless overwrite is explicitly requested.
- Private repos rely on existing git credentials or `GITHUB_TOKEN`/`GH_TOKEN`.

### branch-pr
- Every PR must link an approved issue and include exactly one matching `type:*` label.
- Branch names must match `feat|fix|chore|docs|style|refactor|perf|test|build|ci|revert/<slug>`.
- PR body needs `Closes #N`, summary, changes table, test plan, and checklist.
- Commit messages must follow Conventional Commits and avoid `Co-Authored-By` trailers.
- Run relevant checks before PR; shell changes require `shellcheck`.

### chained-pr
- Split PRs over 400 changed lines unless maintainer accepts `size:exception`.
- Keep each PR to one reviewable deliverable with tests/docs for that unit.
- State start/end state, dependencies, follow-up, and out-of-scope in each chained PR.
- Child PRs need dependency diagrams marking current PR with `📍`.
- Do not mix chain strategies after one is selected; fix polluted diffs by retarget/rebase.

### cognitive-doc-design
- Structure docs for scanning: Quick path, Details, Checklist, Next step unless repo template wins.
- State what to review first and what is intentionally out of scope.
- Keep sections focused on one decision/work unit and use checklists for acceptance criteria.
- For PR/review docs, link previous/next PR when changes are chained.
- Prefer short, action-oriented text over dense prose.

### comment-writer
- Use a warm, direct, collaborative voice for comments and reviews.
- Be specific about the requested change and why it matters.
- Separate blockers from suggestions; keep comments actionable.
- Avoid vague praise or harsh phrasing; make next steps clear.
- Match the medium (GitHub issue/PR, Slack, review) and keep it concise.

### go-testing
- Prefer table-driven tests with named `t.Run` subcases.
- Test behavior/state transitions, not implementation trivia.
- Use `t.TempDir()` for filesystem tests and mocks/interfaces around side effects.
- Keep slow/external integration tests skippable with `testing.Short()`.
- Golden files must be deterministic and updated only through explicit repo update paths.

### issue-creation
- Search existing issues first; avoid duplicates.
- Use the correct template; bug reports need repro, expected/actual behavior, OS/client/shell/logs.
- Feature requests need problem, proposed solution, affected area, and alternatives.
- New issues receive `status:needs-review`; approval is required before PRs.
- Questions belong in Discussions, not issues.

### judgment-day
- Resolve project skills before judges and inject the same compact rules into both judge prompts.
- Launch two independent blind judges in parallel with identical scope; never let them coordinate.
- Synthesize confirmed, suspect, contradiction; downgrade theoretical warnings to INFO.
- Ask before fixing Round 1 confirmed issues; after fixes, re-run both judges.
- Terminal states are only `JUDGMENT: APPROVED` or `JUDGMENT: ESCALATED`.

### work-unit-commits
- Keep each commit to one clear deliverable that remains coherent if applied alone.
- Include tests/docs with the unit they verify.
- Make rollback reasonable without reverting unrelated work.
- Commit messages explain the outcome, not the file list.
- For SDD, monitor PR size and split/chained PRs according to risk strategy.

## Project Conventions

| File | Path | Notes |
|------|------|-------|
| te-pinta-context.md | /home/tuki/code/te-pinta-2.0/te-pinta-context.md | Project master context: product scope, brand kit, proposed stack, DB schema, routes, roadmap, deploy assumptions. |

Read the convention files listed above for project-specific patterns and rules. All referenced paths have been extracted — no need to read index files to discover more.
