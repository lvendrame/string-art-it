# 35 — Zig-Zag and Parabolic Thread Tools

## Purpose

Add two new Thread-mode tools — **Zig-zag** (`Waypoints` icon) and **Parabolic** (`Croissant` icon) — alongside Draw/Select/Eraser/Segment. Both insert a *computed* multi-segment Thread Path between two clicked pins, rather than the pin-by-pin accumulation Draw uses: click a first pin, click a second pin, and the tool fills in every intermediate pin itself, following a fixed pattern rather than the user's click order.

This is additive: two new `ThreadTool` values (`"zigzag"`, `"parabolic"`), one new draft type (`TwoPinDraft`), and a handful of new `EditorStore` methods. It changes nothing about Draw/Select/Eraser/Segment or any Pin-mode tool.

## The shared math

Both tools reduce to **one algorithm** — interleave two ordered pin sequences, optionally reversing the second — parameterized by a single boolean (`src/application/document/twoPinSequence.ts`):

|                | Case 1 (same Pin Path) | Case 2 (different Pin Paths) |
|---|---|---|
| **zig-zag**    | reverse second half    | no reverse                    |
| **parabolic**  | no reverse             | reverse second run             |

### Case 1 — both clicked pins are on the same Pin Path

1. Walk from the first pin (A) to the second (B) to build one contiguous **range**. On an **open** path there's exactly one way to do this (the direction that actually reaches B). On a **closed** path (circle, polygon, star, …) there are two arcs between A and B — both start at A, sharing endpoint B; picking between them is the tool's one source of ambiguity in this case (see "Disambiguation" below).
2. Split the range into two halves of length `floor(N/2)` each (`N` = range length): the first `floor(N/2)` elements, and the *last* `floor(N/2)` elements. If `N` is odd, the true middle pin belongs to neither half.
3. Interleave the two halves pin-by-pin (Zig-zag reverses the second half first; Parabolic doesn't). If `N` was odd, append the leftover middle pin alone at the end.

Worked examples (pins numbered 1..N along the range):

```text
Zig-zag,   N=10: [1,10,2,9,3,8,4,7,5,6]
Zig-zag,   N=11: [1,11,2,10,3,9,4,8,5,7,6]
Parabolic, N=10: [1,6,2,7,3,8,4,9,5,10]
Parabolic, N=11: [1,7,2,8,3,9,4,10,5,11,6]
```

### Case 2 — the clicked pins are on different Pin Paths

1. Each anchor pin independently walks its own path in one of two directions (`+1`/`-1`, wrapping if that path is closed). The number of pins available in a given direction (`remainingInDirection`) is the whole path if closed, or the count from the anchor to that end if open.
2. `L`, the pins actually used per path, is `min` of whatever each side's chosen direction allows — using every pin the shorter side has before it runs out.
3. Build one run of `L` pins per path, starting at its own anchor. Interleave the two runs (Zig-zag straight; Parabolic with the second run reversed, walking it from its far end back to its own anchor).

Worked example (path 1 has 10 pins numbered 1-10, path 2 has 11 pins numbered 11-21, first pin = 1, second pin = 11):

```text
Zig-zag:   [1,11,2,12,3,13,4,14,5,15,6,16,7,17,8,18,9,19,10,20]   (21 unused — path 1 ran out first)
Parabolic: [1,20,2,19,3,18,4,17,5,16,6,15,7,14,8,13,9,12,10,11]   (21 unused, same reason)
```

Choosing directions to maximize `L` (rather than always walking, say, "increasing index") is what makes this the fullest possible fill for whichever pair of pins was clicked — see "Disambiguation" for how the direction choice is actually made.

### Degenerate cases

- Adjacent pins on the same path (`N=2`), or a Case 2 pair where the anchor sits at the true end of an open path in the chosen direction (`L=1`), both collapse cleanly to a straight two-pin segment for either tool — no special-casing needed, the formulas above already produce this.
- The two pins being identical is rejected (nothing to build a sequence from).
- A symmetry-mirrored pin resolves to its real owning pin for hit-testing (same `nearestThreadInsertionPin` Thread Draw already uses), and every generated pin id in its walked sequence is re-mirrored back into that same physical copy — the same "stay within this instance" rule `computeNextPatternPinId` ([22-thread-follow-pattern.md](./22-thread-follow-pattern.md)) already uses for pattern-follow.

## Click workflow

1. **Click 1** — the nearest pin (or mirror, resolving to its source) starts the draft (`startTwoPinDraft`). Nothing is computed yet.
2. **Click 2** — the nearest pin to the second click computes every valid candidate sequence (`chooseSecondPin`): `computeSamePathCandidates` if both pins share a Pin Path, else `computeCrossPathCandidates`.
   - **Exactly one candidate** (an open path in Case 1; or, in Case 2, a direction combination with nothing else that produces a distinct result) commits immediately — there's nothing to disambiguate.
   - **2+ candidates** populate the draft and wait for a 3rd click.
3. **Disambiguation (3rd click, only when needed)** — a closed path (Case 1) always offers both arcs; Case 2 offers up to 4 direction combinations whenever an anchor isn't pinned to a single forced direction. While ambiguous, moving the cursor live-previews whichever candidate's far endpoint is nearest the cursor (the same continuous preview-then-confirm shape as the Arc tool's bulge-side click), and a **free-position click anywhere** — it doesn't need to land on a pin — confirms the currently-previewed candidate (`resolveTwoPinDraft`).

```text
Click 1 (near a pin)
→ Start the draft with that pin as the anchor

Click 2 (near a pin, different from the anchor)
→ Compute every candidate sequence
  → 1 candidate: commit immediately
  → 2+ candidates: populate the draft, await the 3rd click

Click 3 (free position, only reached when 2+ candidates exist)
→ Commit whichever candidate the cursor was nearest

Esc / "Cancel" (radial menu)
→ Discard the draft at any stage

ArrowLeft / "Back" (radial menu)
→ Before candidates exist: cancel the whole draft (only the anchor was picked)
→ Once candidates exist: drop them, back to awaiting the second pin
```

Committing builds one `ThreadPath` from the chosen sequence via the same `createThreadPath` + `addThreadPathToLayers` + single `SetValueCommand<ThreadLayer[]>` shape `commitThreadDraft` ([12-thread-editor.md](./12-thread-editor.md)) already uses — one atomic undo step regardless of how many segments the sequence contains. Committing into a locked active Thread Layer discards the draft silently, same as Draw.

## Right-click menu while drafting

Right-clicking while a Zig-zag/Parabolic draft is in progress swaps Thread mode's normal tool slices (now `Draw`/`Zig-zag`/`Parabolic`/`Eraser`/`Segment`) for a draft-mode set, same shape as Thread Draw's own Cut/Back/Next swap ([25-radial-context-menu.md](./25-radial-context-menu.md)):

- Before a second pin is picked: **Back**, **Cancel**.
- Once 2+ candidates exist: **Cut** (commits the previewed candidate — same action as the 3rd click), **Back**, **Cancel**.

## Keyboard shortcuts

Per [34-keyboard-shortcuts.md](./34-keyboard-shortcuts.md), Thread tab bare-letter bindings gain two entries (both free in that namespace):

| Key | Tool |
|---|---|
| `Z` | Zig-zag |
| `P` | Parabolic |

`Escape` cancels and `ArrowLeft` steps back exactly like Thread Draw's own draft, registered inside `useTwoPinSequenceDrawing.ts`'s own `keydown` listener (not the central dispatcher) — the central dispatcher's arrow-key-pan fallback re-derives this hook's "would I act" condition the same way it already does for Thread Draw and the Path tool.

## Locked layers and other guards

Placing the anchor pin and picking a second pin are unaffected by layer lock state, same as Draw. Only the final commit is blocked by a locked active Thread Layer, discarding the draft silently. Switching Thread tool away from Zig-zag/Parabolic, or switching Editor mode away from Thread, while a draft is in progress discards it outright — the same non-undoable-transient-state cleanup as every other in-progress draft in this app (Thread Draw, the Path tool, Generator mode).

## Configuration

Both tools expose a small "next-draw settings" panel in `ThreadPropertiesPanel.tsx`, shown only while the matching tool is active — same treatment as `threadDefaults` (plain state, read at click-2 time, never routed through `HistoryStack`, since nothing about a committed `ThreadPath` needs to remember how it was configured).

| Field | Tool | Range | Default | Effect |
|---|---|---|---|---|
| Step A | both | 0–9 (integer) | 0 | Stride applied to side A (Case 1: firstHalf; Case 2: the first-clicked path's run) |
| Step B | both | 0–9 (integer) | 0 | Same, for side B |
| Full-fill | both | on/off | off | Use every reachable pin instead of stopping once one side runs out |
| Circles | Parabolic only | 1–20 (integer) | 1 | Enabled only while Full-fill is checked. Only has an effect on a same-CLOSED-path pair (see below) |

### step-by

Each side's ordered pin list is sub-sampled by its own **stride**: `stride = step + 1`. `step=0` (the default) keeps every pin — today's original shipped behaviour. `step=2` keeps every 3rd pin. A stride that doesn't land exactly on the far end of a side simply leaves the remainder unconnected — no snapping the last hop to force an endpoint.

Worked example (the case that defined this formula): two Pin Paths, 10 and 20 pins, `stepA=stepB=2`, Zig-zag, no full-fill:

```text
subA = [1,4,7,10]            (path A, stride 3)
subB = [11,14,17,20]         (path B, stride 3)
result: [1,11,4,14,7,17,10,20]
```

### full-fill

- **Zig-zag, any case; Parabolic, a cross-path or same-open-path pair**: bounded, no wraparound. Once the shorter (strided) side is exhausted, the longer side keeps advancing alone, in its own stride, appending its remaining pins in order until it too is exhausted.
- **Parabolic, a same-CLOSED-path pair**: the only case where "full-fill" and "circles" mean something different — instead of stopping at the clicked second pin, the same two-strand pairing (firstHalf/secondHalf, unreversed) is built from the **whole ring** (every pin on the path, in the chosen direction) instead of just the clicked arc. One full pass through that whole-ring pairing is one **circle**; the identical pass is repeated `circles` times (`circles=1`, the default, reproduces one full-ring pass — a generalization of the tool's original single-arc pairing, not a behaviour change when the two clicked pins already happen to be diametrically apart). The originally-clicked second pin only ever affects *which of the two ring directions* is offered as a 3rd-click disambiguation candidate — once full-fill is on, its exact position no longer bounds the pairing.

## Test Cases

```gherkin
Feature: Zig-zag / Parabolic tool sequence math

  Scenario: Zig-zag, same open path, mirrors outer-in
    Given a Pin Path with 10 pins and the Zig-zag tool active
    When the user clicks pin 1, then pin 10
    Then a Thread Path is created with pin order 1,10,2,9,3,8,4,7,5,6

  Scenario: Parabolic, same open path, ascending halves
    Given a Pin Path with 10 pins and the Parabolic tool active
    When the user clicks pin 1, then pin 10
    Then a Thread Path is created with pin order 1,6,2,7,3,8,4,9,5,10

  Scenario: Zig-zag, different paths, stops when the shorter path is exhausted
    Given Pin Path 1 has 10 pins and Pin Path 2 has 11 pins, Zig-zag tool active
    When the user clicks Path 1's pin 1, then Path 2's pin 1
    Then a Thread Path is created alternating both paths for 10 pins each (20 pins total), and Path 2's 11th pin is unused

  Scenario: Parabolic, different paths, second path walked in reverse
    Given the same two Pin Paths as above, Parabolic tool active
    When the user clicks Path 1's pin 1, then Path 2's pin 1
    Then the resulting Thread Path's Path-2 pins run from its far end back to the clicked anchor

  Scenario: Closed path requires a 3rd click to pick an arc
    Given a closed Pin Path (e.g. Circle) and the Zig-zag tool active
    When the user clicks two pins that are not adjacent
    Then the draft populates 2 candidates and waits for a 3rd, free-position click before committing

  Scenario: Open-path Case 1 commits without a 3rd click
    Given an open Pin Path (e.g. Line) and either tool active
    When the user clicks two pins
    Then the Thread Path commits immediately — there is only one valid direction

  Scenario: Adjacent pins degenerate to a straight segment
    Given any Pin Path and either tool active
    When the user clicks two adjacent pins
    Then the resulting Thread Path is just those two pins, identical for both tools

  Scenario: Escape cancels an in-progress draft
    Given a Zig-zag/Parabolic draft with an anchor picked but no second pin yet
    When the user presses Escape
    Then the draft is discarded and no Thread Path is created

  Scenario: ArrowLeft steps back from disambiguation to awaiting the second pin
    Given a draft with 2+ candidates populated
    When the user presses ArrowLeft
    Then the candidates are cleared and the draft returns to awaiting a second pin, keeping the same anchor

  Scenario: Committing on a locked Thread Layer discards the draft
    Given a draft has resolved to a single committable sequence and the active Thread Layer is locked
    When the commit is attempted
    Then no Thread Path is created and the draft is cleared

  Scenario: Switching Thread tool away mid-draft discards it
    Given a Zig-zag draft is in progress
    When the user picks a different Thread tool
    Then the draft is discarded with no commit attempt

  Scenario: step-by reproduces the worked example
    Given two Pin Paths of 10 and 20 pins, Zig-zag tool active, Step A and Step B both set to 2, Full-fill off
    When the user clicks Path 1's pin 1, then Path 2's pin 1
    Then the resulting Thread Path is [1,11,4,14,7,17,10,20]

  Scenario: Zig-zag full-fill uses up the longer side's remaining pins
    Given two Pin Paths of equal length, Zig-zag tool active, differing Step A/Step B such that one strided side is shorter than the other, Full-fill on
    When the user completes a Zig-zag draft between them
    Then the resulting Thread Path pairs up to the shorter side's length, then appends the longer side's remaining strided pins solo, in order

  Scenario: Parabolic full-fill on a same-closed-path pair walks the whole ring, not just the clicked arc
    Given a closed Pin Path and the Parabolic tool active, Full-fill on, Circles set to 1
    When the user completes a draft between two of its pins
    Then the resulting Thread Path pairs every pin on the path (not just those between the two clicked pins), split into two ring-spanning halves

  Scenario: Circles repeats the same full-ring pass
    Given the same setup as above but Circles set to 3
    When the draft is committed
    Then the resulting Thread Path is exactly the Circles=1 sequence repeated 3 times

  Scenario: Circles has no effect outside a same-closed-path pair
    Given two different Pin Paths, Parabolic tool active, Full-fill on, Circles set to 5
    When the user completes a draft between them
    Then the resulting Thread Path follows the same bounded tail-append rule as Zig-zag's full-fill, unaffected by the Circles value
```

## Scope limits

- No pattern-follow ("Next") analogue — unlike Thread Draw's `ArrowRight` extrapolation ([22-thread-follow-pattern.md](./22-thread-follow-pattern.md)), the whole point of these tools is computing the sequence from a fixed rule, not extrapolating from click history.
- The 3rd-click disambiguation always offers every geometrically valid candidate (up to 4 in Case 2); it does not attempt to auto-pick or hide "less useful" short candidates (e.g. an anchor pinned near an open path's own end) — the live preview and hover-nearest selection make a bad choice visually obvious before it's confirmed.
- No dedicated Selection-panel fields for the resulting Thread Path — it's a plain `ThreadPath` like any other, edited afterward through the existing Thread Select tool ([27-thread-select-tool.md](./27-thread-select-tool.md)).
