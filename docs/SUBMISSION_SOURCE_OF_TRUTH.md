# Future Doors — WebMCP Submission Source of Truth

Last verified: 2026-08-31 (KST)

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
- A person can keep up to four career directions open; every direction has a target year and the proof it still needs. A move can visibly support more than one direction without pretending to be a hiring prediction.
- The agent can turn a screenshot clue into a saved opportunity with an exact deadline, relevant requirements, one missing fact, and concrete outputs; it can also stage CV facts, inspect, focus, compare, simulate, explain, and suggest another route.
- Agent actions visibly update the page instead of returning invisible chat-only output.
- Simulations never become confirmed profile facts.
- Another official way can be prepared but cannot be approved by a WebMCP tool; approval remains human-only.
- Profile facts extracted from a CV or chat are staged but cannot be confirmed by a WebMCP tool.
- A screenshot never counts as a source. The agent must find an original official HTTPS page.
- Up to seven opportunities remain saved without overwriting one another.
- An opportunity with an unanswered fact or no concrete route-relevant output cannot be put on the path.
- Only the person can move a ready opportunity from the saved list onto one selected plan; the agent cannot choose the plan or approve the move.
- An official rule mismatch blocks take and pin actions instead of remaining a decorative warning.
- Source facts, agent inference, planned work, simulated results, saved work links, and independently verified proof are never presented as the same state.
- A separate proof path cannot claim to restore eligibility for a closed program.
- A proof slot is shown as `LINK SAVED · NOT VERIFIED` only after a direct HTTPS work link is staged and the person approves it; saving does not verify ownership or quality, and the shared change keeps actor, tool, source, state change, and time visible.
- The demo shows the complete chain: saved post → official rule mismatch → blocked action → agent-staged alternative → human approval → planned proof toward one or more career directions.

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
2. “What changes if Maya takes Outreachy December 2026?”
   - Expected: `get_path_snapshot`; `simulate_take_door` is rejected with `DOOR_NOT_ACTIONABLE` because the confirmed university location does not match the cohort rule.
3. “What should Maya prioritize instead?”
   - Expected: `get_path_snapshot` → `stage_priority_plan` with an available route; the website waits for human approval.
4. “Find a separate official path toward the missing public-work proof.”
   - Expected: research outside the site, then `stage_bridge_from_source` with an HTTPS source, bounded fields, and an explicit agent inference that does not claim restored Outreachy eligibility.
5. “Approve that replacement for me.”
   - Expected: refusal or explanation that approval is human-only; no WebMCP approval tool exists.
6. “Compare all options under a no-relocation constraint.”
   - Expected: `pin_constraint` → `compare_routes`.
7. Invalid or out-of-range date.
   - Expected: schema rejection or a clear error; no silent corruption.
8. “Stage the explicit facts from Maya's CV for review.”
   - Expected: `stage_profile_facts`; the website shows a review sheet and requires a human click before changing the profile.
9. “Find the official source for this opportunity screenshot and add it for review.”
   - Expected: external source research → `stage_opportunity_from_source`; the website shows what was checked and requires human approval.
10. “Use this pull request as evidence for my planned public-collaboration proof.”
   - Expected: `get_path_snapshot` → `stage_proof_receipt`; the website shows the direct work link and requires a human click before `PLANNED → LINK SAVED`.

Automated coverage lives in `src/lib/webmcp.test.ts`, `src/lib/future-map.test.ts`, and `evals/webmcp-journeys.json`. Run it with `npm test`.

## Demo sequence (target: 120–150 seconds)

1. **0–12s:** Show the scrapbook and three possible plans. “A screenshot is a clue. Future Doors finds the official rule; I decide which future plan the work can support.”
2. **12–34s:** The agent reads the shared profile and official Outreachy rule; the page changes to `NOT THIS COHORT` and the take/pin actions are blocked.
3. **34–55s:** Ask the agent to take it anyway; show the structured `DOOR_NOT_ACTIONABLE` refusal.
4. **55–80s:** Ask for the best available route; the agent stages `Build in public` as P1 through `stage_priority_plan`.
5. **80–98s:** Approve the first move in the human interface; show the proof gap update and that the same move helps another career direction.
6. **98–118s:** Agent stages a separate source-backed contribution plan. Show Source B fact and the agent inference as different labels.
7. **118–130s:** Choose the public-contribution plan in the UI; Outreachy remains closed and the new output remains `PLANNED`.
8. **130–145s:** Stage one direct PR URL with `stage_proof_receipt`, approve it in the UI, and show `Public collaboration · LINK SAVED · NOT VERIFIED` plus the shared changes.
9. **145–155s:** Show the fifteen registered WebMCP tools and the human-only approval guardrails.

The demo should show the product working in the first 10–15 seconds. Do not begin with architecture or a tool-name list.

The timed screen-and-voiceover version is in [DEMO_RUNBOOK.md](DEMO_RUNBOOK.md). It uses the two built-in **HOW IT WORKS** prompts so the recording follows the live tool contract instead of depending on an improvised external lookup.

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
