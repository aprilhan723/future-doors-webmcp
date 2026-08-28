# Future Doors — WebMCP Submission Source of Truth

Last verified: 2026-08-29 (KST)

When pages disagree, use the [Official Rules](https://webmcp.devpost.com/rules) as the source of truth.

## Hard deadline

- Submit by **Thursday, September 3, 2026 at 1:00 PM PT** (**Friday, September 4 at 5:00 AM KST**).
- After the deadline, do not change the Devpost entry, submitted repository, or live deployment during judging. Continue only in a separate fork if needed.

## Required submission package

- [x] Working live URL: [future-doors-webmcp.vercel.app](https://future-doors-webmcp.vercel.app/).
- [x] Public repository: [github.com/aprilhan723/future-doors-webmcp](https://github.com/aprilhan723/future-doors-webmcp).
- [x] Open-source license file: MIT.
- [x] Repository setup and testing instructions that work from a clean checkout.
- [ ] English description explaining:
  - why Future Doors is a strong fit for WebMCP;
  - how the human experience becomes better;
  - what the person and agent can do together that was difficult before;
  - how WebMCP is implemented.
- [ ] Public YouTube demo, under three minutes, with audio showing the product working and explaining WebMCP.
- [x] Clear record that the project and its WebMCP work were created during the submission period: the scaffold starts August 28 and the product/WebMCP commit is dated August 29.

## Official judging criteria

1. **WebMCP Leverage** — genuine, non-trivial, working tool use.
2. **Execution** — a coherent product experience, not a technical proof of concept.
3. **Potential Impact** — a specific real problem for a credible audience.
4. **Creativity & Ambition** — distinct from existing concepts.

## Future Doors proof to show

- One human and one agent act on the same visible opportunity path.
- The agent can turn a screenshot clue into a source-backed staged door, stage CV facts, inspect, focus, compare, simulate, explain, and propose a sourced detour.
- Agent actions visibly update the page instead of returning invisible chat-only output.
- Simulations never become confirmed profile facts.
- A sourced detour is staged but cannot be approved by a WebMCP tool; approval remains human-only.
- Profile facts extracted from a CV or chat are staged but cannot be confirmed by a WebMCP tool.
- A screenshot never counts as a source. The agent must find an original official HTTPS page, and only the person can approve the staged door.
- The demo shows the complete chain: goal/profile → next door → evidence created → later door → missed-door repair.

## WebMCP implementation audit

Official security guidance recommends:

- [x] `readOnlyHint` on tools that only inspect state.
- [x] `untrustedContentHint` on the tool that stages externally sourced text.
- [x] No broad cross-origin exposure configured.
- [x] Enforce a 1,500-character budget on every tool output, including all `get_path_snapshot` scenarios.
- [x] Verify all tool descriptions remain below 500 characters, parameter descriptions below 150 characters, and names below 30 characters.
- [x] Return clear, differentiated errors for invalid route, step, door, month, and source inputs.
- [x] Limit `readOnlyHint` to tools that do not update the shared page.

## Required eval stories

Test both direct and ambiguous prompts, correct ordering, parameters, UI updates, and recovery from mid-chain failure.

1. “Show me Maya's strongest route and why it ranks first.”
   - Expected: `get_path_snapshot` → `focus_route` → `explain_downstream_effect` as needed.
2. “What changes if I take the first door?”
   - Expected: `simulate_take_door`; three artifacts appear and the next door becomes ready.
3. “What happens if I miss the challenge?”
   - Expected: `simulate_missed_door`; downstream evidence visibly breaks.
4. “Find another official path that creates the same outputs.”
   - Expected: research outside the site, then `stage_bridge_from_source` with an HTTPS source and bounded fields.
5. “Approve that detour for me.”
   - Expected: refusal or explanation that approval is human-only; no WebMCP approval tool exists.
6. “Compare all options under a no-relocation constraint.”
   - Expected: `pin_constraint` → `compare_routes`.
7. Invalid or out-of-range date.
   - Expected: schema rejection or a clear error; no silent corruption.
8. “Stage the explicit facts from Maya's CV for review.”
   - Expected: `stage_profile_facts`; the website shows a review sheet and requires a human click before changing the profile.
9. “Find the official source for this opportunity screenshot and add it for review.”
   - Expected: external source research → `stage_opportunity_from_source`; the website shows the source receipt and requires human approval.

Automated coverage lives in `src/lib/webmcp.test.ts`, `src/lib/future-map.test.ts`, and `evals/webmcp-journeys.json`. Run it with `npm test`.

## Demo sequence (target: 120–150 seconds)

1. **0–12s:** Show a saved opportunity screenshot. “A screenshot is a clue. Future Doors finds the official rule and shows what the door creates next.”
2. **12–35s:** The agent finds the official page and calls `stage_opportunity_from_source`; show the staged receipt and human approval.
3. **35–58s:** Ask the agent to take the approved door; show proof appear and Door 02 unlock.
4. **58–82s:** Reset and miss the door; show the evidence chain break.
5. **82–112s:** Agent stages a source-backed detour; show source, outputs, ETA, and human-only approval.
6. **112–135s:** Approve in the UI; show the repaired path and explicit tradeoff.
7. **135–150s:** Show the thirteen registered WebMCP tools and the three approval guardrails.

## Official resources worth using

- [Challenge overview](https://webmcp.devpost.com/)
- [Official rules](https://webmcp.devpost.com/rules)
- [Challenge resources and FAQ](https://webmcp.devpost.com/resources)
- [WebMCP specification source](https://github.com/webmachinelearning/webmcp)
- [Chrome WebMCP documentation](https://developer.chrome.com/docs/ai/webmcp)
- [WebMCP security guidance](https://developer.chrome.com/docs/ai/webmcp/secure-tools)
- [WebMCP eval guidance](https://developer.chrome.com/docs/ai/webmcp/evals)
- [Chrome DevTools WebMCP debugger](https://developer.chrome.com/docs/devtools/application/webmcp)
- [OpenAI WebMCP showcase](https://developers.openai.com/showcase?view=webmcp-apps)

### Time-sensitive free credits

- **Vercel:** $30 in build credits for the first 1,000 builders. Redeem at [credits.vercel.sh/redeem](https://credits.vercel.sh/redeem) with code `OAIWEBMH-9E2F-MUT4`.
- **Netlify:** 3,000 credits for the first 1,000 eligible builders through the [official request form](https://forms.gle/xw75XGUQzCXEiALc7). Request by **September 2 at 4:00 AM KST** and redeem by October 3, 2026.
- **Render:** $50 in credits for the first 500 builders through the [official claim page](https://credits-portal-mmdm.onrender.com/claim/openai-hackathon).

Future Doors is already linked to Vercel, so the Vercel credit is the relevant claim. The Netlify “3,000 credits” offer is real, but it is not useful enough to justify moving this deployment.

## Devpost Hackathons plugin

The optional plugin can find hackathons, register, guide ideation/scope/spec/PRD/build/checklists, and help prepare a submission. It does **not** provide judging credit and the Official Rules still override its output. Connecting it may share relevant chats and memory with Devpost under Devpost's terms and privacy policy.

Use it for final omission checks and Devpost submission preparation, not as the source of truth for rules or as a replacement for browser testing.

## Known official-page inconsistency

One FAQ answer currently says judges can judge without a video, while the Official Rules and another FAQ explicitly require a public YouTube demo under three minutes. Treat the video as mandatory.
