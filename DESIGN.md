# DESIGN.md — ISBN Notify

## Provenance (read this first)

**I wrote this file, not the product owner.** antislop is explicit that agent-authored style direction
tends toward exactly the default taste antislop exists to filter, so the result below is likely more
monotonous than what you would have chosen. It is a starting position, not a brand.

You are the author. Edit anything here; the implementation reads these decisions as tokens and dials,
so a change to this file is a change to the UI. If you would rather own it from scratch, delete it and
the UI falls back to the default token layer.

## Design Read

> Reading this as: **an internal records tool** for Indonesian library staff tracking ISBN submissions to
> Perpusnas, in a **document-and-ledger** visual language, dial **ENERGY 1 / RHYTHM 1 / MOTION 1**.

## Dials

| Dial | Value | Why |
|---|---|---|
| **ENERGY** | **1** (GOV.UK register) | This is a tool opened for five minutes at a desk to answer one question: which titles are still pending, and did any land today. It should not perform. Nothing on this screen needs to sell anything. |
| **RHYTHM** | **1** (uniform) | A dense records screen. Uniform card treatment lets a user who returns daily find the same control in the same place every time. Variation is reserved for the one place it earns attention: the tracking table, which is given the dominant column and the only elevated surface. |
| **MOTION** | **1** (state changes only) | Every animation in this app is a state change that has just happened: a panel opened, a save completed. Nothing loops. There is no ambient motion anywhere. |

MOTION 1 is load-bearing: it is the stated reason the endless pulse on pending badges is gone.

## Who it is for

Library and administrative staff (pustakawan, admin UKP) at Indonesian institutions. Non-technical,
using it daily, often alongside a physical cataloguing workflow. They are not evaluating the interface.
They are working.

## Product truth the design is built on

The entire product is **waiting**. A book sits in `PENDING` for weeks or months, then flips to
`COMPLETED` when Perpusnas assigns an ISBN, and the app notifies the user so they never have to check.
That is why a background scheduler exists at all.

Design consequences, each one a decision:

1. **The settled state is the accent.** The one accent colour, teal, is the colour of `COMPLETED`.
   Interactive elements and finished records share one hue, because in this product they mean the same
   thing: resolved, confirmed, filed. Pending gets the only other hue, amber, and amber appears nowhere
   else. Nothing competes with the state you are reading.
2. **Light is the default.** This is a records tool used in a lit office during the day. Dark mode is one
   click away, but it is not the default, because "dark looks technical" is a trend reason and this
   product is not technical.
3. **Identifiers are set in monospace on a plate.** Every ISBN, every date, every count, every scheduled
   time is a machine-readable value that gets copied into notifications and searches. Monospace makes
   digits align in a column and makes a mistyped ISBN visible. This is the identity motif: the app is a
   spine of records, and the type says so. It is functional, not decorative, so it appears only on
   identifiers and never as a heading treatment.
4. **Status is a word, not a spinner.** A row in `PENDING` is a fact about the world, not an activity
   happening on screen. It is spelled `PENDING` or `COMPLETED` in Indonesian, never animated. The old
   rotating loader in each badge implied work that was not occurring.

## Palette

Two neutrals plus two hues. That is the whole system.

| Token | Light | Dark | Job |
|---|---|---|---|
| `--ground` | `#faf9f7` | `#1c1917` | Page. Warm, not blue-grey. |
| `--surface` | `#ffffff` | `#292524` | Cards, table. |
| `--ink` | `#1c1917` | `#fafaf9` | Body text. |
| `--ink-muted` | `#57534e` | `#a8a29e` | Labels, secondary. |
| `--accent` | `#0f766e` | `#2dd4bf` | The settled state **and** interactive. |
| `--status-pending` | `#b45309` | `#fbbf24` | Pending only. |

Warm neutrals rather than the default slate-blue, because a catalogue tool sits next to paper and
brown kraft. Every foreground/background pair in both themes clears WCAG AA at its rendered size;
contrast was computed per pair, not assumed from the token.

**No gradient is used as a treatment anywhere.** The wordmark is set in solid ink. A gradient here would
be decoration with no hierarchy job, and blue-to-purple is the single most recognisable generated default.

## Type

- **UI: Source Sans 3.** Humanist, designed for forms and data entry, warmer and more document-like than
  a geometric startup sans. This is a form-heavy tool and the type has to do form work.
- **Identifiers: Source Code Pro.** Only on ISBNs, dates, counts and times. Reason in lever 3 above.
- **No uppercase, no wide tracking.** Section labels are sentence case at 13px, differentiated by weight
  and colour. Uppercase micro-labels are an English-dashboard tic and read as styling in an Indonesian UI.

## Radius

Three steps, chosen rather than accumulated: `4px` plates and chips, `6px` controls, `10px` cards and
dialogs. Each answers a containment question. Nothing is pill-shaped except the status badge, which is
pill-shaped because status is a state chip and that shape is its convention.

## Elevation

Flat by default. One elevation level exists, `--shadow-overlay`, used by dialogs and toasts only,
because those two genuinely sit above the page. Cards get a border, not a shadow: a border states a
boundary, a shadow implies lift, and nothing on this screen is lifted.

## Surfaces

**No glass.** The previous build put `backdrop-filter` on eight surfaces, which flattened the hierarchy
and cost GPU time to blur an almost-opaque background. Now: one surface treatment, defined by solid fill
plus a 1px border. If glass is ever wanted, the budget is one element and the reason goes in this file.

## Focus

Every focusable element shows a 2px `outline` at 2px offset. Inputs never set `outline: none`. The
focus ring colour shifts per theme so it stays visible on both the page and on filled buttons.

## Identity motif

The **record plate**: a monospaced value on a subtly tinted rounded rectangle. It marks every ISBN,
date, count and time in the app, and it appears nowhere else. If the logo were swapped for another
product's, this motif would not transfer, because it comes from this product's data.
