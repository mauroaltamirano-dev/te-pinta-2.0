# Skill Registry — te-pinta-2.0

Generated: 2026-05-31
Project: `te-pinta-2.0`
Root: `/home/tuki/code/te-pinta-2.0`

Purpose: index runtime skills by trigger and exact `SKILL.md` path. Sub-agents must receive paths from this registry and read the full skill files before work.

## Scan policy

- Scanned user skills under `/home/tuki/.codex/skills/`.
- Scanned project skill/convention locations under `/home/tuki/code/te-pinta-2.0`.
- Skipped `sdd-*`, `_shared`, and `skill-registry` skills per SDD init rules.
- Deduplicated by skill name, preferring project-level skills over user-level skills.
- No project-level skill or convention files were found in the repository.

## Skills

| Skill | Scope | Trigger / Description | SKILL.md |
| --- | --- | --- | --- |
| branch-pr | user | Create Gentle AI pull requests with issue-first checks. Trigger: creating, opening, or preparing PRs for review. | `/home/tuki/.codex/skills/branch-pr/SKILL.md` |
| chained-pr | user | Trigger: PRs over 400 lines, stacked PRs, review slices. Split oversized changes into chained PRs that protect review focus. | `/home/tuki/.codex/skills/chained-pr/SKILL.md` |
| cognitive-doc-design | user | Design docs that reduce cognitive load. Trigger: writing guides, READMEs, RFCs, onboarding, architecture, or review-facing docs. | `/home/tuki/.codex/skills/cognitive-doc-design/SKILL.md` |
| comment-writer | user | Write warm, direct collaboration comments. Trigger: PR feedback, issue replies, reviews, Slack messages, or GitHub comments. | `/home/tuki/.codex/skills/comment-writer/SKILL.md` |
| go-testing | user | Trigger: Go tests, go test coverage, Bubbletea teatest, golden files. Apply focused Go testing patterns. | `/home/tuki/.codex/skills/go-testing/SKILL.md` |
| imagegen | system | Generate or edit raster images when the task benefits from AI-created bitmap visuals such as photos, illustrations, textures, sprites, mockups, or transparent-background cutouts. | `/home/tuki/.codex/skills/.system/imagegen/SKILL.md` |
| issue-creation | user | Create Gentle AI issues with issue-first checks. Trigger: creating GitHub issues, bug reports, or feature requests. | `/home/tuki/.codex/skills/issue-creation/SKILL.md` |
| judgment-day | user | Trigger: judgment day, dual review, adversarial review, juzgar. Run blind dual review, fix confirmed issues, then re-judge. | `/home/tuki/.codex/skills/judgment-day/SKILL.md` |
| openai-docs | system | Use when the user asks how to build with OpenAI products or APIs and needs up-to-date official documentation with citations, help choosing the latest model for a use case, or model upgrade and prompt-upgrade guidance. | `/home/tuki/.codex/skills/.system/openai-docs/SKILL.md` |
| plugin-creator | system | Create and scaffold plugin directories for Codex with a required `.codex-plugin/plugin.json`, optional plugin folders/files, valid manifest defaults, and personal-marketplace entries. | `/home/tuki/.codex/skills/.system/plugin-creator/SKILL.md` |
| skill-creator | user | Trigger: new skills, agent instructions, documenting AI usage patterns. Create LLM-first skills with valid frontmatter. | `/home/tuki/.codex/skills/skill-creator/SKILL.md` |
| skill-improver | user | Trigger: improve skills, audit skills, refactor skills, skill quality. Audit and upgrade existing LLM-first skills. | `/home/tuki/.codex/skills/skill-improver/SKILL.md` |
| skill-installer | system | Install Codex skills into `$CODEX_HOME/skills` from a curated list or a GitHub repo path. | `/home/tuki/.codex/skills/.system/skill-installer/SKILL.md` |
| work-unit-commits | user | Plan commits as reviewable work units. Trigger: implementation, commit splitting, chained PRs, or keeping tests and docs with code. | `/home/tuki/.codex/skills/work-unit-commits/SKILL.md` |

## Project conventions

No repository convention files were found at scan time (`AGENTS.md`, `agents.md`, `CLAUDE.md`, `.cursorrules`, `GEMINI.md`, or `copilot-instructions.md`). The active instructions were supplied by the caller for this run.
