# Map 3 Color Fix — Design Spec
Date: 2026-04-04

## Problem
Map 3 (Neon Megacity) track surfaces are nearly black-on-black against the dark sky (#0a0a2a), making it very hard to see where you're driving.

## Solution
Lift all track surface colors to vivid blues and purples that contrast clearly against the sky while preserving the cyberpunk aesthetic.

## Color Changes (`src/maps/map3.js`)

| Constant | Before | After | Role |
|---|---|---|---|
| `CONC` | `0x333344` | `0x4a7aaa` | Ground-level sections |
| `NEON` | `0x1a1a44` | `0x3a6590` | Ramp alternating pieces |
| `HIGH` | `0x221133` | `0x7a3aaa` | Elevated sections |
| Ground walls | `0x111122` | `0x2a5a8a` | Ground-level wall color (inline) |
| Elevated walls | `0x220044` | `0x6a2a9a` | Elevated wall color (inline) |

## Out of Scope
- Sky color unchanged (`0x0a0a2a`)
- Obstacle color unchanged (`0xff2266`)
- Point lights unchanged
- No geometry changes
