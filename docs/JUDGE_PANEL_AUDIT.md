# Future Doors — synthetic judge panel audit

Last run: 2026-08-29 KST

This is a rule-based stress test. It is not a survey of real judges, user research, or statistical evidence that the project will win.

## Panel construction

The audit used 480 synthetic judge profiles:

- 8 review lenses: WebMCP depth, product completeness, real-world usefulness, originality, visual craft, trust and safety, accessibility, and skeptical first-time use.
- 3 review surfaces: the first 15 seconds of the live product, a three-minute demo, and the public repository.
- 20 viewing conditions: short and long attention budgets, desktop and compact viewports, keyboard-first use, reduced motion, lower contrast sensitivity, and different levels of career-product familiarity.

Every profile checked the four official criteria: WebMCP Leverage, Execution, Potential Impact, and Creativity & Ambition. That produced 1,920 criterion passes. The audit records repeated rule failures, not invented human opinions or percentages.

## Repeated failures before the redesign

1. The first screen could be mistaken for a static career map.
2. The core transformation—saved post to official source to approved path—was explained in text but not shown.
3. Small labels and dense cards competed for attention.
4. A wall of thirteen tool names made the product feel like a technical demo.
5. The screenshot workflow was hidden behind a button instead of teaching the product immediately.
6. Terms such as artifact, receipt, detour, and compatibility slowed first-time understanding.
7. Decorative motion did not always clarify what moved from one step to the next.

## Decisions applied

- Lead with one sentence: “Turn a saved post into your next move.”
- Show a permanent three-step visual: saved post → agent checks the official page → person approves.
- Label the path with four familiar actions: Open now, Make this, Then, Goal.
- Keep profile facts on the left, the path in the center, and the selected step on the right.
- Group thirteen WebMCP tools into six human-readable abilities while retaining the complete technical list in the repository.
- Make human approval visible beside every proposed change.
- Increase the type size of decisions and path cards; remove low-value helper copy.
- Use motion only to show information traveling forward, a door changing state, or the path repairing itself.
- Keep required exams and certificates as “Do this first” steps; never treat preferences as hard requirements.
- Keep Supabase out of the judged build. Login, remote storage, and personal-data handling add failure and privacy surfaces without making the core WebMCP collaboration clearer.

## Acceptance gates after the redesign

### First 15 seconds

- The headline names the input and outcome.
- The three-step visual explains why an agent is involved.
- The path reads left to right without opening a modal.
- A judge can distinguish agent checking from human approval.

### Three-minute demo

- The product works before architecture is discussed.
- A screenshot becomes a reviewed opportunity only after an official source is found.
- Taking a step opens the next one; missing it visibly breaks the chain.
- The agent can propose another official way, but only the person can approve it.
- The final seconds connect the visible behavior to WebMCP tools and guardrails.

### Repository

- Public source, MIT license, clean setup instructions, and auditable start date are present.
- All thirteen tools have bounded schemas and outputs.
- Invalid dates, IDs, sources, and tool order return clear errors.
- Automated tests cover the main path, broken path, replacement path, saved-opportunity limits, and human-only approvals.

## What would still improve confidence

Run five real, task-based sessions before recording the final demo. Give each participant one saved-post screenshot and ask them, without coaching, to explain what the product does, what the agent checked, what still needs their decision, and what opens next.
