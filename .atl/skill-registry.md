# Skill Registry

**Delegator use only.** Any agent that launches sub-agents reads this registry to resolve compact rules, then injects them directly into sub-agent prompts. Sub-agents do NOT read this registry or individual SKILL.md files.

See `_shared/skill-resolver.md` for the full resolution protocol.

## User Skills

| Trigger | Skill | Path |
|---------|-------|------|
| When creating a pull request, opening a PR, or preparing changes for review. | branch-pr | /home/tuki/.codex/skills/branch-pr/SKILL.md |
| When writing Go tests, using teatest, or adding test coverage. | go-testing | /home/tuki/.codex/skills/go-testing/SKILL.md |
| When creating a GitHub issue, reporting a bug, or requesting a feature. | issue-creation | /home/tuki/.codex/skills/issue-creation/SKILL.md |
| When user says "judgment day", "judgment-day", "review adversarial", "dual review", "doble review", "juzgar", "que lo juzguen". | judgment-day | /home/tuki/.codex/skills/judgment-day/SKILL.md |
| When user asks to create a new skill, add agent instructions, or document patterns for AI. | skill-creator | /home/tuki/.codex/skills/skill-creator/SKILL.md |
| UI/UX design work: design, build, create, implement, review, fix, or improve web/mobile UI. | ui-ux-pro-max | /home/tuki/.codex/skills/ui-ux-pro-max/SKILL.md |

## Compact Rules

Pre-digested rules per skill. Delegators copy matching blocks into sub-agent prompts as `## Project Standards (auto-resolved)`.

### branch-pr
- Every PR MUST link an approved issue; blank PRs without issue linkage are blocked.
- Every PR MUST have exactly one `type:*` label matching the selected PR template type.
- Branch names MUST match `^(feat|fix|chore|docs|style|refactor|perf|test|build|ci|revert)/[a-z0-9._-]+$`.
- PR body MUST include `Closes #N`, a 1-3 bullet summary, changes table, test plan, and full checklist.
- Commit messages MUST follow Conventional Commits, e.g. `feat(scope): description`.
- Run relevant checks before PR; shell changes require `shellcheck`.

### go-testing
- Prefer table-driven tests for multiple Go cases and name each subcase with `t.Run`.
- Test Bubbletea model state transitions by calling `Model.Update()` directly with key messages.
- Use `teatest.NewTestModel` for full interactive Bubbletea flows.
- Use golden files for stable TUI/view output; keep update mode explicit.
- For side effects, inject interfaces/mocks; for filesystem work use `t.TempDir()`.
- For real commands or slow integration tests, skip under `testing.Short()`.

### issue-creation
- Search existing issues first; avoid duplicates.
- Use the correct issue template; blank issues are disabled.
- Bug reports require steps to reproduce, expected behavior, actual behavior, OS, agent/client, and shell.
- Feature requests require problem, proposed user-facing solution, affected area, and pre-flight checks.
- New issues receive `status:needs-review`; maintainer approval via `status:approved` is required before PRs.
- Questions belong in Discussions, not issues.

### judgment-day
- Before launching judges, resolve relevant skills from Engram `skill-registry` or `.atl/skill-registry.md` and inject compact rules.
- Launch two independent blind judge sub-agents in parallel with identical scope and criteria.
- Orchestrator synthesizes results as confirmed, suspect, or contradiction; do not let judges coordinate.
- Classify warnings as real vs theoretical; only real warnings block approval.
- Round 1: present verdict and ask before fixing confirmed issues.
- Round 2+: re-judge only confirmed criticals; fix real warnings/suggestions inline when trivial.

### skill-creator
- Create a skill only for reusable AI guidance, non-trivial project conventions, or complex workflows.
- Required structure: `skills/{skill-name}/SKILL.md`; optional `assets/` for templates/schemas and `references/` for local docs.
- Frontmatter MUST include `name`, `description` with trigger, `license`, `metadata.author`, and `metadata.version`.
- Naming: generic skills by technology, project skills by `{project}-{component}`, workflow skills by `{action}-{target}`.
- Keep examples minimal; put reusable code/templates in `assets/` and local documentation pointers in `references/`.
- Do not add Keywords sections, lengthy explanations, or web URLs in references.

### ui-ux-pro-max
- For UI/UX work, first extract product type, style keywords, industry, and stack.
- Always generate a design system first with `scripts/search.py "<query>" --design-system`.
- Persist design systems with `--persist` when long-lived project/page styling rules are needed.
- Use page override files under `design-system/pages/` to override `design-system/MASTER.md`.
- Supplement with domain searches only as needed: `style`, `chart`, `ux`, `typography`, `landing`, etc.
- Default stack guidance to `html-tailwind` if no stack is specified; choose `react`, `nextjs`, etc. when known.

## Project Conventions

| File | Path | Notes |
|------|------|-------|
| te-pinta-context.md | /home/tuki/projects/te-pinta-2.0/te-pinta-context.md | Project master context: product scope, proposed stack, DB schema, API routes, roadmap, env vars, code conventions |

Read the convention files listed above for project-specific patterns and rules. All referenced paths have been extracted — no need to read index files to discover more.
