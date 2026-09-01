# Future Doors — synthetic user audit

Last run: 2026-08-31 KST

This is a structured stress test, not real user research and not statistical evidence of demand.

## 2026-08-31 goal-map follow-up

A separate 36-person synthetic panel covered students, job seekers, international students, career switchers, mobile users, people with low vision, people with ADHD, and non-native English speakers. Twenty-seven preferred a single row that directly joins an opportunity, its application window, activity length, weekly load, and the work it could add; five were neutral and four preferred the previous split board.

The follow-up changed the central board accordingly:

- One opportunity and the work it could add now share a row.
- A person can pin no more than two routes at once.
- A selected row becomes solid and a missing work type stays dotted, with text labels in addition to color and line style.
- The target says “needed work types on the board” and “This tracks work, not odds” so the count cannot be mistaken for a success probability.
- The mobile layout groups each opportunity with its matching work type instead of shrinking the desktop canvas.

This panel was simulated. It does not replace the five real task-based sessions listed below.

## Population

The audit covered 144 synthetic journeys:

- 12 situations: undergraduate, graduate student, international student, recent graduate, career switcher, returning worker, self-taught builder, researcher, community contributor, low-budget applicant, privacy-conscious applicant, and overwhelmed applicant.
- 4 opportunity types: challenge, internship, fellowship, and credential-gated program.
- 3 jobs per journey: understand the product, decide whether the opportunity belongs on the path, and identify the next action.

Inputs varied across screenshots, social links, official links, and CV-plus-link combinations. Stressors included ambiguous eligibility, exact deadline/time-zone needs, required exams or certificates, duplicate reposts, unrelated outputs, and multiple saved opportunities.

## Repeated failures in the previous build

1. One staged opportunity replaced the previous opportunity.
2. Any approved opportunity could replace the first path step even when its outputs did not help the fixed next step.
3. The review showed only a deadline month, not an exact deadline or time zone.
4. Uncertain eligibility had no safe state between “staged” and “approved.”
5. The interface used product language such as “proof compatibility,” “receipt,” “artifact,” and “detour” where plain language was clearer.
6. Users could see a path but not always the single next action.

## Product decisions

- Keep up to seven saved opportunities instead of overwriting one.
- A saved opportunity can be `1 detail needed`, `ready to plan`, `saved for later`, or `on your path`.
- One missing fact blocks path connection.
- Concrete outputs must include product, public-collaboration, or mentorship/research work before the human can choose the plan it supports.
- The agent never chooses that plan: the person picks the one supported route, and a saved source cannot silently replace a different route.
- Show the exact deadline text, relevant official requirements, last checked date, and one missing fact.
- Show a required exam, certificate, or earlier step as “Do this first.”
- Keep approval human-only.

## Plain-language vocabulary

| Internal concept | Visible wording |
| --- | --- |
| Opportunity inbox | Saved opportunities |
| Eligibility receipt | What we checked |
| Proof compatibility | What could this support? |
| Missing eligibility variable | One thing we still need |
| Prerequisite | Do this first |
| Sourced detour | Another way |
| Evidence artifact | What you can get |
| Counterfactual simulation | Try the path |

## Remaining validation

The strongest next evidence would be five real task-based sessions: give each person one screenshot and ask them to explain, without prompting, what the product does, whether the opportunity is usable, and what they should do next.
