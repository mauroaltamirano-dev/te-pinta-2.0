# Skill Registry

Generated: 2026-05-27
Project: te-pinta-2.0

## Contract

- This file is an index, not a source of behavioral truth.
- Delegators resolve matching skills here, then pass exact `SKILL.md` paths to sub-agents.
- Sub-agents must read the injected `SKILL.md` files before task-specific work.
- Skipped by rule: `sdd-*`, `_shared`, and `skill-registry`.
- Deduplication: project-level skills override user-level skills; otherwise first source in scan order wins.

## Indexed Skills

| Scope | Skill | Trigger / description | SKILL.md path |
|---|---|---|---|
| user | `branch-pr` | Create Gentle AI pull requests with issue-first checks. Trigger: creating, opening, or preparing PRs for review. | `/home/tuki/.config/opencode/skills/branch-pr/SKILL.md` |
| user | `chained-pr` | Trigger: PRs over 400 lines, stacked PRs, review slices. Split oversized changes into chained PRs that protect review focus. | `/home/tuki/.config/opencode/skills/chained-pr/SKILL.md` |
| user | `cognitive-doc-design` | Design docs that reduce cognitive load. Trigger: writing guides, READMEs, RFCs, onboarding, architecture, or review-facing docs. | `/home/tuki/.config/opencode/skills/cognitive-doc-design/SKILL.md` |
| user | `comment-writer` | Write warm, direct collaboration comments. Trigger: PR feedback, issue replies, reviews, Slack messages, or GitHub comments. | `/home/tuki/.config/opencode/skills/comment-writer/SKILL.md` |
| user | `go-testing` | Trigger: Go tests, go test coverage, Bubbletea teatest, golden files. Apply focused Go testing patterns. | `/home/tuki/.config/opencode/skills/go-testing/SKILL.md` |
| user | `imagegen` | Generate or edit raster images when the task benefits from AI-created bitmap visuals such as photos, illustrations, textures, sprites, mockups, or transparent-background cutouts. Use when Codex should create a brand-new image, transform an existing image, or derive visual variants from references, and the output should be a bitmap asset rather than repo-native code or vector. Do not use when the task is better handled by editing existing SVG/vector/code-native assets, extending an established icon or logo system, or building the visual directly in HTML/CSS/canvas. | `/home/tuki/.codex/skills/.system/imagegen/SKILL.md` |
| user | `issue-creation` | Create Gentle AI issues with issue-first checks. Trigger: creating GitHub issues, bug reports, or feature requests. | `/home/tuki/.config/opencode/skills/issue-creation/SKILL.md` |
| user | `judgment-day` | Trigger: judgment day, dual review, adversarial review, juzgar. Run blind dual review, fix confirmed issues, then re-judge. | `/home/tuki/.config/opencode/skills/judgment-day/SKILL.md` |
| user | `openai-docs` | Use when the user asks how to build with OpenAI products or APIs and needs up-to-date official documentation with citations, help choosing the latest model for a use case, or model upgrade and prompt-upgrade guidance; prioritize OpenAI docs MCP tools, use bundled references only as helper context, and restrict any fallback browsing to official OpenAI domains. | `/home/tuki/.codex/skills/.system/openai-docs/SKILL.md` |
| user | `plugin-creator` | Create and scaffold plugin directories for Codex with a required `.codex-plugin/plugin.json`, optional plugin folders/files, valid manifest defaults, and personal-marketplace entries by default. Use when Codex needs to create a new personal plugin, add optional plugin structure, generate or update marketplace entries for plugin ordering and availability metadata, or update an existing local plugin during development with the CLI-driven cachebuster and reinstall flow. | `/home/tuki/.codex/skills/.system/plugin-creator/SKILL.md` |
| user | `skill-creator` | Trigger: new skills, agent instructions, documenting AI usage patterns. Create LLM-first skills with valid frontmatter. | `/home/tuki/.config/opencode/skills/skill-creator/SKILL.md` |
| user | `skill-improver` | Trigger: improve skills, audit skills, refactor skills, skill quality. Audit and upgrade existing LLM-first skills. | `/home/tuki/.config/opencode/skills/skill-improver/SKILL.md` |
| user | `skill-installer` | Install Codex skills into $CODEX_HOME/skills from a curated list or a GitHub repo path. Use when a user asks to list installable skills, install a curated skill, or install a skill from another repo (including private repos). | `/home/tuki/.codex/skills/.system/skill-installer/SKILL.md` |
| user | `work-unit-commits` | Plan commits as reviewable work units. Trigger: implementation, commit splitting, chained PRs, or keeping tests and docs with code. | `/home/tuki/.config/opencode/skills/work-unit-commits/SKILL.md` |

Indexed skill count: 14

## Scanned Skill Roots

| Scope | Root | Found |
|---|---:|---:|
| user | `/home/tuki/.config/opencode/skills` | 22 |
| user | `/home/tuki/.copilot/skills` | 22 |
| user | `/home/tuki/.codex/skills` | 27 |

## Project Convention Files

| File | Path | Notes |
|---|---|---|
| `te-pinta-context.md` | `/home/tuki/code/te-pinta-2.0/te-pinta-context.md` | Project master context: product scope, brand kit, planned architecture, DB/routes roadmap. |
| `docs/orders-visual-identity.md` | `/home/tuki/code/te-pinta-2.0/docs/orders-visual-identity.md` | Live visual convention for feature pages/cards/forms; use Orders as UI source of truth. |

## Duplicates / Skipped

### Duplicates

| Skill | Skipped path | Kept path | Reason |
|---|---|---|---|
| `branch-pr` | `/home/tuki/.copilot/skills/branch-pr/SKILL.md` | `/home/tuki/.config/opencode/skills/branch-pr/SKILL.md` | duplicate skill name; first source in scan order kept |
| `chained-pr` | `/home/tuki/.copilot/skills/chained-pr/SKILL.md` | `/home/tuki/.config/opencode/skills/chained-pr/SKILL.md` | duplicate skill name; first source in scan order kept |
| `cognitive-doc-design` | `/home/tuki/.copilot/skills/cognitive-doc-design/SKILL.md` | `/home/tuki/.config/opencode/skills/cognitive-doc-design/SKILL.md` | duplicate skill name; first source in scan order kept |
| `comment-writer` | `/home/tuki/.copilot/skills/comment-writer/SKILL.md` | `/home/tuki/.config/opencode/skills/comment-writer/SKILL.md` | duplicate skill name; first source in scan order kept |
| `go-testing` | `/home/tuki/.copilot/skills/go-testing/SKILL.md` | `/home/tuki/.config/opencode/skills/go-testing/SKILL.md` | duplicate skill name; first source in scan order kept |
| `issue-creation` | `/home/tuki/.copilot/skills/issue-creation/SKILL.md` | `/home/tuki/.config/opencode/skills/issue-creation/SKILL.md` | duplicate skill name; first source in scan order kept |
| `judgment-day` | `/home/tuki/.copilot/skills/judgment-day/SKILL.md` | `/home/tuki/.config/opencode/skills/judgment-day/SKILL.md` | duplicate skill name; first source in scan order kept |
| `skill-creator` | `/home/tuki/.copilot/skills/skill-creator/SKILL.md` | `/home/tuki/.config/opencode/skills/skill-creator/SKILL.md` | duplicate skill name; first source in scan order kept |
| `skill-improver` | `/home/tuki/.copilot/skills/skill-improver/SKILL.md` | `/home/tuki/.config/opencode/skills/skill-improver/SKILL.md` | duplicate skill name; first source in scan order kept |
| `work-unit-commits` | `/home/tuki/.copilot/skills/work-unit-commits/SKILL.md` | `/home/tuki/.config/opencode/skills/work-unit-commits/SKILL.md` | duplicate skill name; first source in scan order kept |
| `skill-creator` | `/home/tuki/.codex/skills/.system/skill-creator/SKILL.md` | `/home/tuki/.config/opencode/skills/skill-creator/SKILL.md` | duplicate skill name; first source in scan order kept |
| `branch-pr` | `/home/tuki/.codex/skills/branch-pr/SKILL.md` | `/home/tuki/.config/opencode/skills/branch-pr/SKILL.md` | duplicate skill name; first source in scan order kept |
| `chained-pr` | `/home/tuki/.codex/skills/chained-pr/SKILL.md` | `/home/tuki/.config/opencode/skills/chained-pr/SKILL.md` | duplicate skill name; first source in scan order kept |
| `cognitive-doc-design` | `/home/tuki/.codex/skills/cognitive-doc-design/SKILL.md` | `/home/tuki/.config/opencode/skills/cognitive-doc-design/SKILL.md` | duplicate skill name; first source in scan order kept |
| `comment-writer` | `/home/tuki/.codex/skills/comment-writer/SKILL.md` | `/home/tuki/.config/opencode/skills/comment-writer/SKILL.md` | duplicate skill name; first source in scan order kept |
| `go-testing` | `/home/tuki/.codex/skills/go-testing/SKILL.md` | `/home/tuki/.config/opencode/skills/go-testing/SKILL.md` | duplicate skill name; first source in scan order kept |
| `issue-creation` | `/home/tuki/.codex/skills/issue-creation/SKILL.md` | `/home/tuki/.config/opencode/skills/issue-creation/SKILL.md` | duplicate skill name; first source in scan order kept |
| `judgment-day` | `/home/tuki/.codex/skills/judgment-day/SKILL.md` | `/home/tuki/.config/opencode/skills/judgment-day/SKILL.md` | duplicate skill name; first source in scan order kept |
| `skill-creator` | `/home/tuki/.codex/skills/skill-creator/SKILL.md` | `/home/tuki/.config/opencode/skills/skill-creator/SKILL.md` | duplicate skill name; first source in scan order kept |
| `skill-improver` | `/home/tuki/.codex/skills/skill-improver/SKILL.md` | `/home/tuki/.config/opencode/skills/skill-improver/SKILL.md` | duplicate skill name; first source in scan order kept |
| `work-unit-commits` | `/home/tuki/.codex/skills/work-unit-commits/SKILL.md` | `/home/tuki/.config/opencode/skills/work-unit-commits/SKILL.md` | duplicate skill name; first source in scan order kept |

### Skipped by rule

| Skill | Path |
|---|---|
| `_shared` | `/home/tuki/.config/opencode/skills/_shared/SKILL.md` |
| `sdd-apply` | `/home/tuki/.config/opencode/skills/sdd-apply/SKILL.md` |
| `sdd-archive` | `/home/tuki/.config/opencode/skills/sdd-archive/SKILL.md` |
| `sdd-design` | `/home/tuki/.config/opencode/skills/sdd-design/SKILL.md` |
| `sdd-explore` | `/home/tuki/.config/opencode/skills/sdd-explore/SKILL.md` |
| `sdd-init` | `/home/tuki/.config/opencode/skills/sdd-init/SKILL.md` |
| `sdd-onboard` | `/home/tuki/.config/opencode/skills/sdd-onboard/SKILL.md` |
| `sdd-propose` | `/home/tuki/.config/opencode/skills/sdd-propose/SKILL.md` |
| `sdd-spec` | `/home/tuki/.config/opencode/skills/sdd-spec/SKILL.md` |
| `sdd-tasks` | `/home/tuki/.config/opencode/skills/sdd-tasks/SKILL.md` |
| `sdd-verify` | `/home/tuki/.config/opencode/skills/sdd-verify/SKILL.md` |
| `skill-registry` | `/home/tuki/.config/opencode/skills/skill-registry/SKILL.md` |
| `_shared` | `/home/tuki/.copilot/skills/_shared/SKILL.md` |
| `sdd-apply` | `/home/tuki/.copilot/skills/sdd-apply/SKILL.md` |
| `sdd-archive` | `/home/tuki/.copilot/skills/sdd-archive/SKILL.md` |
| `sdd-design` | `/home/tuki/.copilot/skills/sdd-design/SKILL.md` |
| `sdd-explore` | `/home/tuki/.copilot/skills/sdd-explore/SKILL.md` |
| `sdd-init` | `/home/tuki/.copilot/skills/sdd-init/SKILL.md` |
| `sdd-onboard` | `/home/tuki/.copilot/skills/sdd-onboard/SKILL.md` |
| `sdd-propose` | `/home/tuki/.copilot/skills/sdd-propose/SKILL.md` |
| `sdd-spec` | `/home/tuki/.copilot/skills/sdd-spec/SKILL.md` |
| `sdd-tasks` | `/home/tuki/.copilot/skills/sdd-tasks/SKILL.md` |
| `sdd-verify` | `/home/tuki/.copilot/skills/sdd-verify/SKILL.md` |
| `skill-registry` | `/home/tuki/.copilot/skills/skill-registry/SKILL.md` |
| `_shared` | `/home/tuki/.codex/skills/_shared/SKILL.md` |
| `sdd-apply` | `/home/tuki/.codex/skills/sdd-apply/SKILL.md` |
| `sdd-archive` | `/home/tuki/.codex/skills/sdd-archive/SKILL.md` |
| `sdd-design` | `/home/tuki/.codex/skills/sdd-design/SKILL.md` |
| `sdd-explore` | `/home/tuki/.codex/skills/sdd-explore/SKILL.md` |
| `sdd-init` | `/home/tuki/.codex/skills/sdd-init/SKILL.md` |
| `sdd-onboard` | `/home/tuki/.codex/skills/sdd-onboard/SKILL.md` |
| `sdd-propose` | `/home/tuki/.codex/skills/sdd-propose/SKILL.md` |
| `sdd-spec` | `/home/tuki/.codex/skills/sdd-spec/SKILL.md` |
| `sdd-tasks` | `/home/tuki/.codex/skills/sdd-tasks/SKILL.md` |
| `sdd-verify` | `/home/tuki/.codex/skills/sdd-verify/SKILL.md` |
| `skill-registry` | `/home/tuki/.codex/skills/skill-registry/SKILL.md` |

