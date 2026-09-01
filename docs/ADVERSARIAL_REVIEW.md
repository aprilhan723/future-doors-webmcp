# Future Doors — adversarial preflight

Last verified: 2026-08-29 KST

## Product decision

Do not become another CV-to-job matcher. A direct WebMCP Career Copilot already reads resumes, finds live jobs, scores fit, identifies skill gaps, and stages applications. LinkedIn already offers role exploration, skills matching, and career insights.

Future Doors owns a narrower loop:

**screenshot clue → official page → saved opportunity → missing fact or ready → person chooses a plan → useful work → next verified step → another route if missed**

The distinctive object is a path that updates when plans change, not a recommendation list. It answers: “If this door closes, what does my next step lose, and which source-backed different path can create useful proof?”

## Five skeptical reviewers

| Reviewer | Test | Result | Remaining risk |
| --- | --- | --- | --- |
| Five-second judge | Can the product be described from the first screen? | Pass: “One door should lead to the next.” Door → proof → next door → goal is visible. | The demo narration must name the screenshot intake immediately. |
| WebMCP judge | Does the agent do non-trivial work on shared state? | Pass: 15 direct site tools; source staging, path simulation, comparison, proof staging, and visible UI changes. | The video must show real tool calls, not only human clicks. |
| Opportunity seeker | Is it clear where programs come from? | Pass: Add a door explains screenshot → official source → approval. | A staged screenshot journey should be the first demo, not hidden in the tools list. |
| Trust reviewer | Can untrusted content silently change the path? | Pass: external text is marked untrusted; official HTTPS source required; profile, new-door, and detour approvals are human-only. | Official-source quality still depends on the browsing agent and human review. |
| Small-laptop user | Is the map readable without scrolling or overlap? | Pass at 760×620, 1000×620, and 1280×720 CSS pixels; no page overflow, card overflow, overlap, or console issues. | Mobile portrait is not the judging target. |

## Larger synthetic population

A 144-journey structured stress test found three repeated failures in the earlier build: one screenshot overwrote another, unresolved eligibility had no safe waiting state, and an unrelated opportunity could inherit a fixed next step. The current build addresses all three with a seven-item saved list, one-missing-fact state, and a deterministic check that only concrete product, public-collaboration, or mentorship/research outputs can enter the person-chosen plan. This is synthetic testing, not a claim of real-user demand; details are in `docs/SYNTHETIC_USER_AUDIT.md`.

## Official-criteria preflight

- **WebMCP Leverage:** strong. A useful multi-tool sequence is visible in the page, with reversible what-ifs and human approval boundaries.
- **Execution:** strong. Live app, public MIT repository, deterministic demo state, tests, responsive one-screen layout, and explicit error handling exist.
- **Potential Impact:** credible but must be demonstrated. Saved opportunity screenshots are a recognizable habit; the demo should show one real screenshot becoming a verified door.
- **Creativity & Ambition:** strong only while the product stays focused on proof-chain repair. Generic career recommendations, success scores, and broad job search would weaken it.

## Verified engineering evidence

- 20 automated tests pass, including exact tool order, invalid IDs and dates, HTTPS source validation, human-only approval guardrails, and the 1,500-character output budget for an approved imported door.
- Production build and lint pass.
- Browser checks pass at 760, 1000, and 1280 CSS-pixel widths.
- The path displays no numerical acceptance, hiring, or success prediction.

## Competitive references

- [WebMCP Career Copilot](https://sreenathmenon.com/blog/2026-08-04-webmcp-teaching-websites-to-talk-to-ai-agents/)
- [LinkedIn Next Role Explorer](https://www.linkedin.com/help/linkedin/answer/a1659296)
- [LinkedIn Skills Match](https://www.linkedin.com/help/linkedin/answer/a507663)
- [OpenAI WanderNote showcase](https://developers.openai.com/showcase/wandernote)
