# Future Doors

Future Doors turns a saved opportunity screenshot into a source-backed path toward a person’s goal.

> Set a goal and year, confirm your profile facts, and see the best next move, what it creates, and what you can try next.

Job sites recommend openings. Career explorers compare roles and skills. Credential products show predefined learning ladders. Future Doors focuses on a different link:

**take one opportunity → create work you can show → become ready for the next move**

The person can share an Instagram post, LinkedIn post, or poster screenshot in ChatGPT. The agent finds the original official page, extracts the rule, deadline, and inspectable outputs, then stages a door in the website. A screenshot is never treated as a source, and the path changes only after the person approves the official receipt.

If the first door closes, the same shared agent can propose a source-backed detour that creates comparable useful outputs. That repair also requires human approval.

## One-screen story

1. A screenshot becomes a reviewable door only after the agent finds its official source.
2. Confirmed profile facts, a goal, and a missing proof make the route explainable.
3. **Take door** shows evidence moving forward and the next door becoming reachable.
4. **Miss it** shows exactly where the chain breaks.
5. The agent proposes a sourced substitute; only the person can approve it.
6. The repaired path shows the tradeoff: comparable proof, six weeks later.

Simulations never become profile facts. Paths never claim to predict acceptance or hiring.

Official prerequisites and modeled signals are visually distinct. A required exam or license can become an earlier prerequisite door; a merely preferred credential never opens a door by itself.

## WebMCP tools

The page progressively registers thirteen tools against the same visible path:

1. `get_path_snapshot`
2. `stage_profile_facts`
3. `stage_opportunity_from_source`
4. `focus_route`
5. `focus_step`
6. `move_path_clock`
7. `simulate_take_door`
8. `simulate_missed_door`
9. `stage_bridge_from_source`
10. `pin_constraint`
11. `compare_routes`
12. `explain_downstream_effect`
13. `reset_path`

An agent can stage explicit CV facts and a screenshot-derived opportunity for review, but no WebMCP tool can confirm profile facts, approve a new door, or approve a detour. Those actions exist only in the human interface.

## Run locally

Requirements: Node.js 20 or newer and npm.

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The human interface works in a regular browser. To invoke the registered tools, use ChatGPT's in-app browser or Chrome 149+ with WebMCP enabled.

## Judge test path

1. Share an opportunity screenshot in chat and ask the agent to find the original official source and add it for review.
2. Confirm that the website shows a staged receipt, then approve the door in the human interface.
3. Ask what changes if Maya takes the first door.
4. Reset, then ask what breaks if Maya misses it.
5. Ask the agent to stage a source-backed detour that creates comparable proof.
6. Try asking the agent to approve either proposal. It cannot: approval is deliberately human-only.

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
