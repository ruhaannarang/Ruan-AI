# Contributing to Ruan AI

Thank you for your interest in contributing to **Ruan AI**. As a local-first personal AI operating companion, maintaining high standards for security, performance, code cleanliness, and privacy is paramount.

---

## 1. Guiding Principles

1. **Local-First & Privacy Preserving:** No feature may introduce telemetry or transmit private user information to remote servers without explicit user configuration and consent.
2. **Safety First:** Any tool or operation touching the local file system or operating system must adhere to the permission models defined in [docs/SECURITY.md](docs/SECURITY.md).
3. **No Unnecessary Dependencies:** Keep the application lean. Avoid adding external libraries when native JavaScript or Node.js APIs suffice.
4. **Clean Aesthetics without Bloat:** The UI uses Vanilla CSS. Do not introduce monolithic CSS frameworks or component libraries.

---

## 2. Development Workflow

### Git Conventions
* **Branch Naming:**
  * `feature/<short-description>`: For new capabilities (e.g., `feature/lm-studio-stream`).
  * `fix/<short-description>`: For bug fixes (e.g., `fix/sse-reconnection`).
  * `docs/<short-description>`: For documentation updates (e.g., `docs/adr-sqlite-schema`).
* **Commit Messages:**
  Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:
  * `feat: add streaming chat controller`
  * `fix: prevent path traversal in file search tool`
  * `docs: update roadmap for Phase 2 memory milestone`
  * `refactor: extract LM Studio client to dedicated service`

### Pull Request & Review Checklist
Before submitting a change:
* [ ] Code adheres to the conventions outlined in [AGENTS.md](AGENTS.md).
* [ ] No package dependencies have been added unless strictly justified.
* [ ] Documentation in `docs/` and `CHANGELOG.md` is updated.
* [ ] Error states and network dropouts (e.g. LM Studio offline) are gracefully handled.
* [ ] No hardcoded secrets, local machine absolute paths, or sensitive credentials are committed.

---

## 3. Coding Standards

### JavaScript & Modules
* Use ES Modules (`import`/`export`) consistently.
* Target Node.js v18+ and modern evergreen browsers.
* Keep functions small, modular, and single-purpose.
* Favor clear variable naming over cryptic abbreviations.

### CSS & Design
* Use CSS custom properties defined in `client/src/styles/variables.css` (or `index.css`) for all colors, spacing, typography, and border radii.
* Follow modern layout techniques (CSS Grid, Flexbox).
* Ensure visual accessibility (proper contrast ratios, focus states, responsive typography).

### Architecture Decisions
If you propose a significant structural change (e.g., switching database engines, changing IPC mechanisms, or altering agent orchestration flow):
1. Review the ADR process in [docs/decisions/README.md](docs/decisions/README.md).
2. Author an ADR proposal before committing massive code rewrites.
