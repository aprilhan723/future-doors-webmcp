# Future Doors

Future Doors turns a saved opportunity screenshot into a source-backed decision and a proof plan across the career directions a person wants to keep open.

> Save a post, confirm the official facts, choose up to two moves, and see what each move can build for up to four possible futures.

Job sites recommend openings. Career explorers compare roles and skills. Credential products show predefined learning ladders. Future Doors focuses on a different link:

**save an opportunity → check its official source → choose a move → create work that can help one or more futures**

This is especially for people whose CV does not fit a single label: a builder may also be a technical storyteller, researcher, or education founder. They can keep up to four directions open, give each one its own target year and missing proof, and spot a move that is useful across more than one direction. Future Doors does not calculate a hiring or acceptance probability.

The person can share an Instagram post, LinkedIn post, or poster screenshot in ChatGPT. The agent finds the original official page, exact deadline, relevant rules, and concrete outputs, then adds it to a seven-item review list. A screenshot is never treated as a source.

Each saved opportunity is shown as **1 detail needed**, **ready to plan**, **saved for later**, or **on your path**. A missing fact blocks connection. A post whose outputs do not create a concrete product, public-collaboration, or mentorship/research result remains saved instead of creating a false path. Only the person chooses which available plan a reviewed opportunity supports.

If the official rule does not match, the door is actually blocked: it cannot be taken or pinned. The agent can stage a separate, source-backed proof plan, but it must say what is source fact and what is inference. Only the person can approve that plan, and it never pretends to restore eligibility for the closed program.

## One-screen story

1. A screenshot becomes a saved opportunity only after the agent finds its official source.
2. The page shows the exact deadline, the rules that matter, one missing fact, and the concrete result the opportunity could create.
3. Up to seven opportunities stay saved without overwriting one another.
4. The person can keep up to four career directions, each with its own target year and the work it still needs.
5. The person chooses whether the source-backed work supports the build, public-contribution, or mentorship plan; the route appears beside its timing, practical settings, and reusable value across their directions.
6. The person can pin at most two routes; planned work is labeled `PLANNED` and missing work stays visibly `NEEDED`.
7. A rule mismatch visibly closes the row and prevents a false success simulation.
8. The agent proposes a different proof path; only the person can approve it.
9. A direct PR, review, demo, or portfolio URL can move one work type from `PLANNED` to `LINK SAVED · NOT VERIFIED`; the change remains human-approved and visible in the shared changes.
10. Planned, simulated, saved, and independently verified work are never treated as the same state.

Simulations never become profile facts. Paths never claim to predict acceptance or hiring.

A required exam or license can appear as an earlier “Do this first” step. A merely preferred credential never opens a door by itself.

## WebMCP tools

The page progressively registers fifteen tools against the same visible path:

1. `get_path_snapshot`
2. `stage_profile_facts`
3. `stage_opportunity_from_source`
4. `focus_route`
5. `focus_step`
6. `move_path_clock`
7. `simulate_take_door`
8. `simulate_missed_door`
9. `stage_bridge_from_source`
10. `stage_priority_plan`
11. `stage_proof_receipt`
12. `pin_constraint`
13. `compare_routes`
14. `explain_downstream_effect`
15. `reset_path`

An agent can prepare explicit CV facts, a screenshot-derived opportunity, priority pins, an alternate path, and a work link for review, but no WebMCP tool can confirm those proposals or attach the link. Attachment exists only in the human interface and is never described as independent verification.

## Run locally

Requirements: Node.js 20 or newer and npm.

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The human interface works in a regular browser. To invoke the registered tools, use ChatGPT's in-app browser or Chrome 149+ with WebMCP enabled.

## Judge test path

1. Share an opportunity screenshot in chat and ask the agent to find the original official source and add it for review.
2. Confirm that the website shows the exact deadline, relevant requirements, and whether one detail is still needed.
3. Confirm that unrelated or unresolved opportunities cannot be added to the path.
4. Add a ready opportunity in the human interface and choose the one plan it supports.
5. Confirm that Maya's university location makes the December Outreachy cohort unavailable and that `simulate_take_door` is rejected.
6. Ask the agent to stage the available open-source route as a priority and review it on the same screen.
7. Ask the agent to prepare a separate proof plan from an official source.
8. Approve it in the UI and confirm that Outreachy remains closed while the alternative proof stays `PLANNED`.
9. Try asking the agent to approve either proposal. It cannot: approval is deliberately human-only.

The full submission checklist, eval prompts, security audit, and demo sequence are in [docs/SUBMISSION_SOURCE_OF_TRUTH.md](docs/SUBMISSION_SOURCE_OF_TRUTH.md). Product clarity was also stress-tested through a [144-journey synthetic user audit](docs/SYNTHETIC_USER_AUDIT.md) and a [1,920-pass synthetic judge audit](docs/JUDGE_PANEL_AUDIT.md). These are structured internal tests, not real-user or real-judge research.

The Devpost-ready product story, exact test path, demo outline, and form-answer draft live in [devpost-submission.md](devpost-submission.md). It is a local draft only; no Devpost project has been submitted from this repository.

The timed, reproducible recording sequence is in [docs/DEMO_RUNBOOK.md](docs/DEMO_RUNBOOK.md). It uses only visible UI states and registered WebMCP operations, and deliberately avoids claims of acceptance or verified work.

## Interaction design

The one-screen product stage uses adapted MIT-licensed Motion Primitives patterns for the animated route selection, staggered path entrance, pointer-following spotlight, card tilt, and spring modal transitions. The path backdrop is a custom SVG generated with Haikei's Layered Waves generator. The five-color system follows Realtime Colors' text, background, primary, secondary, and accent roles. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for attribution.

## Verify the build

```bash
npm test
npm run lint
npm run build
```

## Hackathon provenance

Future Doors was started for the WebMCP Challenge on August 28, 2026, after the August 25 competition start. The initial scaffold commit and the later product/WebMCP commits keep that work auditable. The implementation uses `document.modelContext.registerTool` directly in `src/lib/webmcp.ts`.

## License

MIT
