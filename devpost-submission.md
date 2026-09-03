# Future Doors

## One-line Summary

Future Doors turns a saved opportunity screenshot into an official-source-backed next move that a person can choose for one or more career futures.

## Problem

People with more than one plausible career direction save internships, fellowships, challenges, and communities from Instagram, LinkedIn, or group chats. The posts disappear into a camera roll. Even when an opportunity is real, a person still has to find the official source, understand the rules, decide whether it fits their constraints, and work out what it can create for their longer-term goals.

Existing job and course recommendation products usually rank an opening against one target role. They do not preserve the distinction between a social-media clue, an official rule, an agent's suggestion, a human-approved plan, and later evidence of work.

## Solution

Future Doors is a shared planning surface for a person and their agent:

1. The person shares a screenshot or link they would otherwise lose.
2. The agent finds the original official HTTPS source and stages the deadline, rules, missing facts, and concrete outputs for review.
3. The person chooses whether that verified opportunity supports their build, public-contribution, or mentorship plan.
4. Future Doors shows the work still needed for up to four career futures, while allowing only three near-term moves to be pinned.

The product does not predict admission, employment, or success. A social post is never treated as a source, and an agent cannot approve profile facts, a plan, or evidence on the person's behalf.

## Why This Matters

Future Doors is for people whose experience does not fit one label: for example, a builder who is also a technical storyteller and a future education founder. Instead of forcing a premature choice, the app makes the trade-off visible: one chosen activity can create a delivered project, public collaboration, or mentor feedback that is useful across several futures.

The impact is deliberately concrete. The user leaves with a checked source, a bounded next activity, the proof it can create, and a visible gap that still needs attention—not another opaque score or a claim about their odds.

## Why WebMCP Is Essential

The most important work happens across chat and the website. In chat, an agent can research the official source and read the user's explicitly shared facts. In the web app, the agent can inspect the current path, stage a source-backed opportunity, compare constrained routes, or stage a work link. The person sees every change on the same path and retains approval of consequential decisions.

Without WebMCP, the agent would have to guess at the app's visual controls or return a plan only in chat. With structured tools, it can act on the live shared state while the app enforces that the agent cannot select a career route, pin a move, confirm CV facts, or verify evidence. That turns the human-agent boundary into a product feature rather than a promise in prose.

## How We Used AI

Future Doors uses WebMCP through `document.modelContext.registerTool` to expose fifteen scoped tools. They let an agent inspect the visible path, stage profile facts, stage a verified opportunity, focus a route, move time, run explicitly non-factual simulations, compare constrained routes, and stage a source-backed alternative or work link.

All agent writes are proposals. The UI requires a human decision before the profile, planned route, or work link changes. Outputs are bounded, inputs are schema-validated, externally sourced text is marked untrusted, and the app distinguishes source fact, agent inference, planned work, saved link, and independently verified proof.

## How We Used Codex

Codex was used to design the interaction model, implement the Next.js application and WebMCP tool schemas, improve the route-aware scrapbook flow, write regression tests, check invalid input handling, build the production deployment, and perform iterative UI and judge-criteria reviews. Product claims were kept separate from checked source facts and automated tests.

## Key Features

- Screenshot or link → official source → human-approved plan
- A seven-item opportunity scrapbook that does not overwrite saved leads
- Up to four career futures, each with a target year and remaining proof gap
- Three legible plan types: build and ship, build in public, and get mentored
- Practical fit signals for remote/hybrid/on-site, compensation, time commitment, schedule, and participation style
- A three-move pin limit to make prioritisation real
- Rule mismatches that visibly block an unavailable opportunity
- Separate source-backed alternatives that never imply closed eligibility was restored
- Direct work links labelled `LINK SAVED · NOT VERIFIED`, never overstated as verified proof
- A visible change history that distinguishes agent staging from human approval

## Architecture

- Next.js 16 and React 19 frontend, hosted on Vercel
- WebMCP registrations implemented directly in `src/lib/webmcp.ts`
- Route, eligibility, state-transition, and tool-output logic in `src/lib/future-map.ts`
- Local browser state for the demo; no account or private cloud CV storage is required
- Motion-based interface transitions used only to show a source becoming a proposed move, a move entering a plan, or a path changing state

## Testing Instructions

No credentials are required.

1. Open the live URL in ChatGPT's in-app browser.
2. Start with **TRY THE EXAMPLE** to see three career futures, goal-specific actions, the three-move limit, and the proof gaps.
3. Choose **ADD A SCREENSHOT OR LINK** to read the intended collaboration contract: share a screenshot or link, ask the agent to find the official source, then review the proposed opportunity in the app.
4. In ChatGPT, use a prompt such as: “Find the official source for this opportunity, check the relevant rule against my profile, then stage it in Future Doors for my review.”
5. Confirm that the agent stages facts but the person chooses the route and approves the plan in the UI.
6. Ask the agent to approve a plan or CV fact. It should not be able to: there is no approval tool.
7. Run `npm ci && npm test && npm run lint && npm run build` from a clean checkout for automated verification. The current suite covers the route-aware scrapbook, tool registration, invalid IDs/dates/sources, bounded outputs, rule mismatch, and human-only approval boundaries.

### Tested WebMCP Client

Primary target: ChatGPT's in-app browser. The live site has also been checked for a successful production response and no recent Vercel runtime-error cluster. The repository's automated suite verifies registration of all fifteen WebMCP tool definitions and the product's state-transition guardrails.

## Public Demo Link

https://future-doors-webmcp.vercel.app/

## Public Repository Link

https://github.com/aprilhan723/future-doors-webmcp

## Demo Video

TODO: Add the public YouTube link after recording a 2:30–2:45 video with audio. The video must show an actual human-and-agent sequence, not only the UI.

Use [docs/DEMO_RUNBOOK.md](docs/DEMO_RUNBOOK.md) as the timed recording script. It uses the current live tool contract and marks the one required end-to-end in-app-browser check before recording.

Recommended sequence:

1. A saved post is a clue, not a source.
2. The agent stages an official source and a rule check.
3. A cohort mismatch blocks the opportunity instead of producing a false recommendation.
4. The agent stages a different source-backed move.
5. The person chooses the plan it supports and approves it.
6. The proof gap changes from needed to planned, and the selected move helps more than one career future.
7. Show that a direct work link is saved but not independently verified.
8. End on the registered tools and the human-only approval boundary.

## Screenshot Shot List

1. Opening screen: **Save the post. Plan what it can become.**
2. Main planning board: three career futures, recommendation cards, and proof gaps.
3. Screenshot handoff modal: save → official source → pin what fits.
4. Rule mismatch: an ineligible cohort is visibly blocked with the official rule link.
5. A human-approved source-backed plan changing a proof slot from `NEEDED` to `PLANNED`.
6. Shared change history that labels agent staging and human approval separately.

## Submission Readiness Notes

- [x] Live URL is public and returns HTTP 200.
- [x] Public GitHub repository exists and includes an MIT license.
- [x] The implementation directly registers WebMCP tools.
- [x] Automated test suite, lint, and production build pass locally.
- [x] The current official form requires a live URL, public repository, tested WebMCP client, AI-tool disclosure, learning level, and career-value answer; these have draft answers below.
- [ ] Record and upload the required public YouTube video under three minutes with audio.
- [ ] Paste the product description and form-specific answers into Devpost.
- [ ] Complete the final browser-based agent-tool run immediately before submitting.

## Known Limitations

- Future Doors does not browse or import a camera roll on its own. The person explicitly shares a screenshot or link with an agent.
- The product stages official-source facts; it cannot guarantee that a source page is current after the time it was checked.
- It shows route relevance and proof gaps, not a probability of admission, hiring, or success.
- A saved work URL is not evidence of authorship or quality. It remains `LINK SAVED · NOT VERIFIED` unless independently verified outside the app.
- The demo currently uses local browser state rather than multi-device accounts or collaboration storage, to keep private profile facts out of the judged core flow.

## TODO Official Form Fields

| Field | Draft answer |
| --- | --- |
| Submitter Type | Confirm whether to select **Individual** or **Team of Individuals** before final submission. |
| Country of residence | Republic of Korea / South Korea (confirm final form wording). |
| App Status | **New** — Future Doors was created for this challenge during the submission period. |
| Live URL | https://future-doors-webmcp.vercel.app/ |
| Public code repository | https://github.com/aprilhan723/future-doors-webmcp |
| Testing instructions | Use the numbered instructions above; no credentials required. |
| Which agent(s) or client(s) did you test? | ChatGPT's in-app browser is the primary WebMCP client. Before final submission, confirm the end-to-end staged-tool demonstration in that client and update this field with the exact tested client/version if Devpost asks. |
| Which AI tools did you leverage? | ChatGPT and Codex for product iteration, implementation, testing, and documentation. |
| Level of learning | **Significant** — implemented a browser-native structured-tool interface with explicit human approval, untrusted-content handling, schemas, bounded outputs, and WebMCP eval cases. |
| Career value from AI | **Yes** — the project required practical work with agent-native product design, trust boundaries, browser tooling, source-backed workflows, and WebMCP evaluation. |
| Demo video URL | TODO |
