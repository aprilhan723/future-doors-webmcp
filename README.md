# Future Doors

Future Doors turns a saved opportunity screenshot into a source-backed decision and a proof path toward a person’s goal.

> Set a goal and year, confirm your profile facts, and see the best next move, what it creates, and what you can try next.

Job sites recommend openings. Career explorers compare roles and skills. Credential products show predefined learning ladders. Future Doors focuses on a different link:

**take one opportunity → create work you can show → become ready for the next move**

The person can share an Instagram post, LinkedIn post, or poster screenshot in ChatGPT. The agent finds the original official page, exact deadline, relevant rules, and concrete outputs, then adds it to a seven-item review list. A screenshot is never treated as a source.

Each saved opportunity is shown as **1 detail needed**, **ready to add**, **saved for later**, or **on your path**. A missing fact blocks connection. An opportunity whose outputs do not help the fixed next step remains saved instead of creating a false path. Only the person can put a reviewed opportunity on the path.

If the official rule does not match, the door is actually blocked: it cannot be taken or pinned. The agent can stage a separate, source-backed proof plan, but it must say what is source fact and what is inference. Only the person can approve that plan, and it never pretends to restore eligibility for the closed program.

## One-screen story

1. A screenshot becomes a saved opportunity only after the agent finds its official source.
2. The page shows the exact deadline, the rules that matter, one missing fact, and whether the result helps the next step.
3. Up to seven opportunities stay saved without overwriting one another.
4. Confirmed profile facts, a goal, and the work each step produces make the route explainable.
5. A rule mismatch visibly closes the door and prevents a false success simulation.
6. The agent proposes a different proof path; only the person can approve it.
7. Planned, simulated, and earned evidence are never treated as the same state.

Simulations never become profile facts. Paths never claim to predict acceptance or hiring.

A required exam or license can appear as an earlier “Do this first” step. A merely preferred credential never opens a door by itself.

## WebMCP tools

The page progressively registers fourteen tools against the same visible path:

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
11. `pin_constraint`
12. `compare_routes`
13. `explain_downstream_effect`
14. `reset_path`

An agent can prepare explicit CV facts and a screenshot-derived opportunity for review, but no WebMCP tool can confirm profile facts, approve a new door, or approve another way. Those actions exist only in the human interface.

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
4. Add a ready opportunity in the human interface.
5. Confirm that Maya's university location makes the December Outreachy cohort unavailable and that `simulate_take_door` is rejected.
6. Ask the agent to stage the available open-source route as a priority and review it on the same screen.
7. Ask the agent to prepare a separate proof plan from an official source.
8. Approve it in the UI and confirm that Outreachy remains closed while the alternative proof stays `PLANNED`.
9. Try asking the agent to approve either proposal. It cannot: approval is deliberately human-only.

The full submission checklist, eval prompts, security audit, and demo sequence are in [docs/SUBMISSION_SOURCE_OF_TRUTH.md](docs/SUBMISSION_SOURCE_OF_TRUTH.md). Product clarity was also stress-tested through a [144-journey synthetic user audit](docs/SYNTHETIC_USER_AUDIT.md) and a [1,920-pass synthetic judge audit](docs/JUDGE_PANEL_AUDIT.md). These are structured internal tests, not real-user or real-judge research.

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
