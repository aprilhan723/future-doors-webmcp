# Future Doors

Future Doors turns one real opportunity into a step-by-step path toward a person’s goal.

> Set a goal and year, confirm your profile facts, and see the best next move, what it creates, and what you can try next.

Job sites recommend openings. Career explorers compare roles and skills. Credential products show predefined learning ladders. Future Doors focuses on a different link:

**take one opportunity → create work you can show → become ready for the next move**

If the first door closes, the shared WebMCP agent can propose a source-backed detour that creates the same useful outputs. The proposal changes the visible path only after the person approves it.

## One-screen story

1. A demo CV, confirmed profile facts, goal, and target year make the input clear.
2. One recommended path dominates the screen; alternatives stay behind tabs.
3. **Take this door** shows the outputs moving forward and the next action becoming ready.
4. **Miss it** shows exactly where the path breaks.
5. The agent proposes a sourced substitute; only the person can approve it.
6. The repaired path shows the tradeoff: the same outputs, six weeks later.

Simulations never become profile facts. Paths never claim to predict acceptance or hiring.

Official prerequisites and modeled signals are visually distinct. A required exam or license can become an earlier prerequisite door; a merely preferred credential never opens a door by itself.

## WebMCP tools

The page progressively registers twelve tools against the same visible path:

1. `get_path_snapshot`
2. `stage_profile_facts`
3. `focus_route`
4. `focus_step`
5. `move_path_clock`
6. `simulate_take_door`
7. `simulate_missed_door`
8. `stage_bridge_from_source`
9. `pin_constraint`
10. `compare_routes`
11. `explain_downstream_effect`
12. `reset_path`

An agent can stage explicit CV or conversation facts for review, but no WebMCP tool can confirm profile facts or approve a detour. Those actions exist only in the human interface.

## Run locally

Requirements: Node.js 20 or newer and npm.

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The human interface works in a regular browser. To invoke the registered tools, use ChatGPT's in-app browser or Chrome 149+ with WebMCP enabled.

## Judge test path

1. Ask the agent to stage explicit CV facts for Maya's review; confirm them in the website.
2. Ask the agent to inspect the visible path and focus the strongest route.
3. Ask what changes if Maya takes the first door.
4. Reset, then ask what breaks if Maya misses it.
5. Ask the agent to stage a source-backed detour that creates the same outputs.
6. Try asking the agent to approve the detour. It cannot: approval is deliberately human-only.

The full submission checklist, eval prompts, security audit, and demo sequence are in [docs/SUBMISSION_SOURCE_OF_TRUTH.md](docs/SUBMISSION_SOURCE_OF_TRUTH.md).

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
