# Future Doors — 2:35 Demo Runbook

This is a recording plan, not a claim that the actions have been completed. It uses only product states and WebMCP tool contracts that exist in the repository as of `fbf58ea`.

## Recording setup

- Open [the live app](https://future-doors-webmcp.vercel.app/) in ChatGPT's in-app browser.
- Start a new conversation so the action list and source of each change are easy to read.
- Use a desktop viewport. Keep the browser at 100% zoom.
- Let the first clock/door animation play for no more than two seconds, then choose **TRY THE EXAMPLE**.
- Do not include a real CV, personal email, or an unverified social-media claim in the recording.

## The one sentence to remember

> A saved post is a clue. Future Doors checks the official source, then I choose which future plan the work supports.

## Time-coded sequence

### 0:00–0:12 — The product in one glance

**On screen**

1. The opening animation.
2. The launch copy: **Save a post. Keep more futures open.**
3. The three steps: save an opportunity → check the official source → pin a next move.

**Voiceover**

> People save opportunity posts all the time, then lose the rules, deadline, and why the opportunity matters. Future Doors turns that saved clue into a source-backed next move for more than one possible future.

### 0:12–0:28 — Show the actual planning problem

**On screen**

1. Click **TRY THE EXAMPLE**.
2. Pause on Maya's three career futures, the middle activity cards, and the right-side proof gaps.

**Voiceover**

> Maya is not choosing one identity yet. She is keeping AI product building, technical storytelling, and learning products open. The page makes the work she still needs visible, rather than giving her a made-up success score.

### 0:28–0:42 — Explain the human-agent contract

**On screen**

1. Click **POST SCRAPBOOK**.
2. Leave the handoff modal open long enough to read its three steps.
3. Close it.

**Voiceover**

> In ChatGPT, I can share a screenshot or link. The agent finds the original official source and stages what it checked. But the screenshot never becomes a source, and the agent cannot put anything on my plan for me.

### 0:42–1:02 — Let WebMCP show a real constraint

**On screen**

1. Click **HOW IT WORKS**.
2. Use **COPY** on **1 · CHECK + STAGE ANOTHER WAY** and paste that built-in prompt into ChatGPT.

The app deliberately packages this prompt with the exact source and guardrail language used by the product. Do not rewrite it while recording.

**Expected visible result**

- The agent reads the current path, explains the December-cohort mismatch, and does **not** try to take the door.
- The page's unavailable row and official rule remain visible.
- The agent uses `stage_bridge_from_source` to prepare the GitHub-official alternative; the proposal opens for human review.

**Voiceover**

> Here the correct answer is not a recommendation. The official cohort rule does not match Maya's confirmed profile, so the door stays closed. Instead, the agent stages a different official path to public collaboration. WebMCP lets it inspect and update the shared path directly instead of guessing from the interface.

### 1:02–1:24 — The person makes the consequential choice

**On screen**

1. In the visible proposal, click the human approval action.
2. Pause on `PLANNED` public collaboration and the shared change row.

**Voiceover**

> I approve the alternative in the product, not the agent. That changes the route to planned work and shows the same work can help more than one future. The change history makes clear what the agent staged and what I chose.

### 1:24–1:47 — Show a useful guardrail, not a magic claim

**On screen**

1. Reopen **HOW IT WORKS**.
2. Use **COPY** on **2 · STAGE A REAL WORK LINK** and paste the built-in prompt into ChatGPT.

That prompt uses a real public Future Doors commit and explicitly asks the agent to describe only what the link directly shows. It is a product demonstration, not a claim that the code change proves a person's skill.

**Expected visible result**

- The agent calls `get_path_snapshot` and then `stage_proof_receipt`.
- A review surface opens.
- The person approves the link in the UI.
- The proof state becomes `LINK SAVED · NOT VERIFIED`.

**Voiceover**

> A link is not proof of authorship or quality. Future Doors labels it as saved, not verified. The agent can stage it, but I decide whether it joins the plan.

### 1:47–2:14 — Make the WebMCP value explicit

**On screen**

1. Leave **HOW IT WORKS** open on its visible tool/guardrail explanation.
2. Keep the screen on the language separating agent actions from human approvals.

**Voiceover**

> This is why WebMCP matters here. The agent can use structured, bounded tools to inspect the shared path and stage source-backed changes. The website, not a vague chat promise, enforces the boundary: no tool can confirm my profile, approve a route, or verify a work link.

### 2:14–2:32 — Close on the outcome

**On screen**

- The planning board with the chosen route, remaining gaps, and multiple futures.

**Voiceover**

> Future Doors does not tell people what career they will get. It helps them turn the opportunities they already save into checked, human-approved work that keeps more than one future open.

## Pre-recording checklist

- [ ] Confirm that the in-app browser exposes the Future Doors tools before recording.
- [ ] Use the two built-in **HOW IT WORKS** prompts in order; `stage_bridge_from_source` is intentionally unavailable until a door is blocked or missed.
- [ ] Check that the public Future Doors commit URL inside the second built-in prompt still resolves before recording.
- [ ] Show the UI after every tool call; do not rely on chat output alone.
- [ ] Keep the final cut below 2:55 including title card and narration.
- [ ] Include clear spoken audio; the challenge requires it.

## Honest fallback if an external-source lookup takes too long

Do not improvise an eligibility result. Say: “I have already checked this official source for the demo,” then use the deterministic example state and demonstrate the structured route/approval boundary. The final cut should still include at least one genuine WebMCP agent action on the live site.
