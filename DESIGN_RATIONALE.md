# Design Rationale: Intelligibility, Collaboration, and Trust in p5 Sketch Coach

## Overview

This document captures the UI and UX changes made to p5 Sketch Coach and explains the reasoning behind each decision. The changes are not cosmetic — they reflect a deliberate design philosophy: that AI systems which augment human creativity must be legible, honest about their limitations, and structured so that both the human and the AI contribute meaningfully to the outcome.

The three lenses we use to evaluate every decision:

1. **Division of responsibility** — both the AI and the user contribute meaningfully; neither is passive
2. **Communication and AI intelligibility** — the system explains what it is doing, why, and what to expect
3. **Trust building and trust recovery** — the system earns trust incrementally and gives users tools to recover when the AI gets it wrong

---

## Changes and Rationale

### 1. Title card: articulating that results are abstract

**Change:** Added language to the hero description clarifying that sketches are "intentionally simple and abstract — shapes, motion, and color stand in for feeling, not photorealism."

**Rationale:** Without this framing, a user's first sketch could read as a failure. If someone describes a vivid, emotional memory and receives a composition of colored circles, they may conclude the system is broken or incapable. By surfacing this constraint upfront — before any output is produced — the system reframes abstraction as an intentional design choice, not a shortcoming. This is a foundational act of intelligibility: the system communicates its own expressive vocabulary before asking the user to engage with it.

This also sets an honest contract. The user knows what kind of output to expect, which allows them to evaluate the sketch on the right terms.

---

### 2. AI Limitations section: iteration as the path to richness

**Change:** Added a note under AI Limitations stating that "initial sketches will be abstract. Through iteration you can introduce more elements to make your sketches more descriptive."

**Rationale:** This change addresses a critical intelligibility gap: users may not understand that the first output is not the final output, and that their ongoing participation is the mechanism for improvement. Without this, the natural interpretation is that the AI produces one result and the user either accepts or rejects it — a passive, low-agency model.

By explicitly naming iteration as the path to richer sketches, the system communicates a **collaborative model of creativity**: the AI generates a starting point, and the human shapes it over time. This also shifts accountability constructively. When the first sketch feels incomplete, the user is not left wondering what went wrong — they understand they are at the beginning of a process, not the end.

---

### 3. Gallery: replacing the Examples dropdown with a live sketch modal

**Change:** Removed the "Examples" hover-dropdown in the chat panel (which surfaced starter text prompts) and replaced it with a "Gallery" button in the header that opens a full modal. The modal renders a real, animated p5.js sketch in a sandboxed iframe alongside the initial prompt that seeded it and a disclaimer that the result came from 7+ rounds of iteration.

**Rationale:** The original Examples dropdown offered starter prompts but gave users no sense of what the system could actually produce. It addressed the blank-page problem without addressing the more important question: *what is this system capable of, and how does that happen?*

The Gallery answers both. It shows a real artifact — a live, running sketch — so users can form an accurate mental model of the system's output before they invest effort. Rendering it as a live p5.js sketch rather than a screenshot is intentional: it communicates that the output is alive, procedural, and generative, not a static image. This is a direct expression of the system's identity.

The disclaimer — "this is the initial prompt; the sketch above is the result after 7+ rounds of iteration" — is the most important element. It makes the **process visible**. It tells the user that what they see is not what they will get on their first try, and that their continued participation is what produces outcomes like this. This is a direct statement of the human-AI division of labor: the AI provides a generative base; the human provides the iterative direction.

The inline link from the title card to the Gallery ("See the Gallery to see what's possible after a few rounds of iteration") ensures this framing reaches users before they begin, not just if they seek it out.

**Division of responsibility:** The Gallery makes explicit that the compelling result on display is not the AI's work alone — it is the product of a sustained dialogue. The human shaped it. The AI executed it. Neither could have produced it alone.

---

### 4. Gallery opens automatically on first load

**Change:** The gallery modal initializes as open (`useState(true)`) so it appears immediately when the page loads.

**Rationale:** If the Gallery exists to set expectations, it only works if users actually see it. Burying it behind a button assumes curiosity and initiative that many users — especially first-time users — will not supply. Opening it automatically treats expectation-setting as a first-class concern rather than an optional feature.

This is a deliberate choice in favor of **front-loaded intelligibility**: the system introduces itself, its vocabulary (abstract shapes, emotional color, motion), and the collaborative process before asking anything of the user. Users who already understand the system can dismiss it immediately with Escape or by clicking outside. Users who do not will benefit substantially.

---

### 5. Removing the Examples dropdown from the chat panel

**Change:** The `PromptChips` component and its "Examples" hover menu were removed from the chat input area.

**Rationale:** The Examples dropdown served a scaffolding function — giving users pre-written prompts to get started. With the Gallery now handling onboarding and expectation-setting, and the blank input area being intentionally open-ended, the Examples dropdown introduced a subtle but harmful message: that certain kinds of prompts are more valid than others.

The system is designed to receive personal, idiosyncratic experience. Pre-written prompts undermine the authenticity of that. They also reduce the user's sense of authorship, which is in tension with the core principle that the human is a meaningful contributor — not someone filling in a template.

Removing this component preserves the user's role as the originator of meaning. The AI's job is to interpret; the human's job is to provide something worth interpreting.

---

## Design Philosophy: Augmentation, Not Automation

Across all of these changes runs a single thread: the system should make the **human feel more capable**, not less necessary.

AI systems that hide their process, overstate their reliability, or position the human as a passive recipient of outputs fail on their own terms. They create brittle trust — users either over-rely on outputs or disengage when outputs disappoint. Neither outcome serves the goal of creative augmentation.

The changes documented here are attempts to build a different kind of relationship: one where the user understands what the AI is doing, why the output looks the way it does, and how their own continued participation transforms it. When the AI produces an abstract first sketch, the user should think "I know what to do next" — not "this didn't work."

That is the difference between a tool and a collaborator.
