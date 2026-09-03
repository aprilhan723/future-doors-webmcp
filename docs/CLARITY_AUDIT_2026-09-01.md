# Clarity audit — September 1, 2026

This is a design walkthrough, not a claim of live user research. It was used to decide what belongs on the first screen before the WebMCP Challenge demo is recorded.

## Question tested

Can a new visitor explain the product after one glance?

Target answer: “I choose one of my possible futures, add up to three activities that fit it, and see the proof those activities would create. The agent checks sources, but I approve the plan.”

## Walkthrough panel

| Lens | What had to be obvious | Board response |
| --- | --- | --- |
| Student with many interests | A direction can be selected without deleting the others. | `Your futures` keeps up to four directions visible at once. |
| Busy student | Which action to take next. | The middle deck limits the choice to two moves and three readable cards. |
| Career switcher | Why an activity matters, not just whether it is open. | Every activity names the work it can add. |
| International applicant | Rules can make an appealing program unavailable. | A mismatch is presented as “Doesn’t fit now” with its source—not as a bad recommendation. |
| Privacy-conscious user | Who decides what enters the plan. | Source checking and human approval are stated in the launch, middle deck, and WebMCP explanation. |
| Reviewer with 30 seconds | The complete product loop. | The three decks read left-to-right: future → next move → plan. |
| Hackathon judge | Why this is not a normal job tracker. | A source-backed agent can stage an opportunity, while the user makes the state-changing pin. |
| Skeptical judge | Whether the product invents outcomes. | The plan calls work types “still useful”; it avoids fit scores for acceptance or hiring. |

## Decisions made

- Removed portal-heavy visual language from the primary journey. A small time opening remains, but the task is described with real nouns.
- Removed dense data labels, activity logs, and rules text from the board. Detailed sources remain available only when needed.
- Replaced a generic route visualization with three plain-language decks:
  1. `Your futures` — profile facts and multiple possible directions.
  2. `Next moves` — grouped activity types, practical fit, and one action.
  3. `Your plan` — user-pinned moves, their proof, and dotted remaining gaps.
- Kept a visible mismatch case. It is the strongest short demo of why source-backed tool use is more useful than a static recommendation.

## Acceptance checks

- No card or top-level section has horizontal/vertical overflow at the standard desktop viewport used for the review.
- The app loads without an error overlay or console errors.
- Choosing a future updates the target panel.
- Adding a move updates the plan and changes its related proof signal from dotted to planned.

## Demo sequence to preserve

1. Start with a saved program post.
2. Agent checks the official page and identifies the cohort mismatch.
3. Select `AI Product Builder` and add `Open-source contribution`.
4. Show the plan’s `Public collaboration` signal becoming planned.
5. Add a direct proof link only after real work exists.

This shows the agent’s bounded role, the user’s approval, and a credible effect on the user’s next step in under three minutes.
