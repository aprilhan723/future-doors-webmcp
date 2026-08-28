# Future Doors — synthetic user audit

Last run: 2026-08-29 KST

This is a structured stress test, not real user research and not statistical evidence of demand.

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
- A saved opportunity can be `1 detail needed`, `ready to add`, `saved for later`, or `on your path`.
- One missing fact blocks path connection.
- Concrete outputs must include work useful to the next step before the human can add the opportunity to the path.
- Show the exact deadline text, relevant official requirements, last checked date, and one missing fact.
- Show a required exam, certificate, or earlier step as “Do this first.”
- Keep approval human-only.

## Plain-language vocabulary

| Internal concept | Visible wording |
| --- | --- |
| Opportunity inbox | Saved opportunities |
| Eligibility receipt | What we checked |
| Proof compatibility | Does it help the next step? |
| Missing eligibility variable | One thing we still need |
| Prerequisite | Do this first |
| Sourced detour | Another way |
| Evidence artifact | What you can get |
| Counterfactual simulation | Try the path |

## Remaining validation

The strongest next evidence would be five real task-based sessions: give each person one screenshot and ask them to explain, without prompting, what the product does, whether the opportunity is usable, and what they should do next.
