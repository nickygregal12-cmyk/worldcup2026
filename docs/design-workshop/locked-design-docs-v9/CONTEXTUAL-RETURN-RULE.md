> **PACK SNAPSHOT — do not work from this copy.** Part of the locked v9 install pack, frozen at its 2026-07-06 state. If a canonical version exists it lives outside the pack (docs/ or docs/archive/); a filename search that lands here should follow the canonical copy.

# Contextual return rule

## Rule

Every contextual route, sheet, modal or detail surface opened from a known origin must provide a clear way back to that origin.

This rule applies to click-through journeys. It does not apply to normal bottom-nav tab changes.

## Purpose

Users should not feel stranded after drilling into a detail surface.

The app should remember the entry context where practical and present clear return copy such as:

- Back to Home.
- Back to Leagues.
- Back to Jimmy Dynasty.
- Back to Player View.
- Back to Match Centre.
- Back to Results.

## Examples

| Origin | Destination | Return |
|---|---|---|
| Home | Match Centre | Back to Home |
| Leagues | Match Centre | Back to Leagues |
| League row | Player View | Back to that league |
| Leaderboards row | Player View | Back to Leaderboards |
| Player View | Points Breakdown | Back to Player View |
| Match Centre | Team Profile Sheet | Close / return to Match Centre |
| Groups | Team Profile Sheet | Close / return to Groups |
| Results card | Match Centre | Back to Results |
| Invite link | Join flow | Back to Leagues after resolution |

## Implementation guidance

This rule should not create extra permanent navigation items.

The bottom nav stays unchanged:

Groups — Bracket/KO — Home — Leagues — More

Return context should be carried by route state, query/hash parameter, navigation model, or a safe default fallback. If the origin is unknown, use a sensible fallback such as Back to Home.

## Final-sweep check

During final sweep, every clickable row/card/chevron that opens a new page or sheet should be checked for an obvious return path.
