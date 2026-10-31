# Architectural Decision Records (ADRs)

This directory maintains a lightweight, persistent log of critical architectural and technical decisions made throughout the lifecycle of **Ruan AI**.

---

## What is an ADR?

An **Architectural Decision Record (ADR)** documents a significant architectural choice made on the project, including the context that led to the choice, alternative solutions considered, the decision itself, and the positive and negative consequences.

Recording ADRs prevents repeating past discussions, documents rationale for future contributors, and guides AI coding assistants on non-obvious design constraints.

---

## File Naming Convention

Each decision record is stored as a Markdown file in this directory following the naming format:

```text
XXXX-short-title.md
```

Where `XXXX` is a sequential 4-digit number (e.g., `0001-lm-studio-local-runtime.md`, `0002-sqlite-embedded-database.md`).

---

## ADR Status Lifecycle

* **Proposed:** Under active discussion; not yet finalized.
* **Accepted:** Decision has been agreed upon and adopted.
* **Rejected:** Decision was considered but ultimately rejected.
* **Superseded:** A subsequent ADR has replaced or modified this decision (link to the new ADR).

---

## ADR Template

When authoring a new ADR, copy the template below:

```markdown
# ADR XXXX: [Short Descriptive Title]

* **Status:** [Proposed | Accepted | Rejected | Superseded]
* **Date:** YYYY-MM-DD
* **Authors:** [Name or Agent ID]
* **Deciders:** [Name or Agent ID]

---

## Context & Problem Statement
Describe the context, technical problem, and why a decision was required. What constraints (e.g. local hardware, privacy, streaming performance) influenced this challenge?

## Decision Drivers
* [Driver 1, e.g. Zero cloud dependence]
* [Driver 2, e.g. 6 GB VRAM hardware limit]
* [Driver 3, e.g. Low latency token streaming]

## Considered Options
1. Option 1: [Short description]
2. Option 2: [Short description]
3. Option 3: [Short description]

## Decision Outcome
Chosen option: "[Option X]", because [justification linking back to context and drivers].

### Positive Consequences
* [Advantage 1]
* [Advantage 2]

### Negative Consequences / Trade-offs
* [Trade-off 1]
* [Trade-off 2]

## Implementation Notes
* [Key implementation requirements or affected directories]
```

---

## Recorded Decisions Index

| ID | Title | Status | Date |
|---|---|---|---|
| `0001` | Initial Monorepo & Local-First Architectural Foundation | Accepted | 2026-10-31 |
