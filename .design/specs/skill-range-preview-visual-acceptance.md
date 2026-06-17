# Skill Range Preview — Visual Acceptance SPEC (QA PASS/FAIL gate)

**Owner:** Design team / 팀원2 — shape-cell accuracy & color visual acceptance.
**Judges:** `SkillRangePreviewLogic.mlua` output — `PaintShapeCells` (`:143-156`), `PaintRangedTarget` (`:159-192`), `PlaceHighlight` (`:237-253`).
**Read-only ground truth:** `AttackPatternLogic.mlua` (`ResolveSkillCells` `:4-46`, `IsInRange` `:48-53`, `DirectionToDelta` `:55-67`), `SkillDataLogic.GetSkillData` (shape/range/kind), `BoardLogic.CellToWorld` (`:47-52`), `BoardConfig` (grid 7×7, `CELL_SIZE=0.8`, center `(-2.0, 0.3)`).

QA uses this document to decide PASS/FAIL of each screenshot. **No color or cell judged here may be inferred by code symmetry; every line direction and every shape gets its own screenshot.**

---

## 0. Coordinate system QA must internalize (derived from code, not assumed)

Board cells are **0-based**: `col ∈ [0..6]`, `row ∈ [0..6]` (`BoardConfig.GRID_COLS = GRID_ROWS = 7`, `BoardLogic.IsInside :64-67`).

`BoardLogic.CellToWorld(col,row)` (`:49-50`):
```
x = -2.0 + (col - 3) * 0.8
y =  0.3 + (row - 3) * 0.8
```

**On-screen axis mapping (LOAD-BEARING — this is how QA reads a screenshot):**

| Cell delta | World delta | On-screen direction |
|---|---|---|
| `col + 1` | `x + 0.8` | **RIGHT** |
| `col − 1` | `x − 0.8` | **LEFT** |
| `row + 1` | `y + 0.8` | **UP** |
| `row − 1` | `y − 0.8` | **DOWN** |

So **higher row = higher on screen**, **higher col = further right**. The cell `(0,0)` is the **bottom-left** cell; `(6,6)` is **top-right**; center is `(3,3)`.

`DirectionToDelta` (`AttackPatternLogic :55-67`): `UP=(dc 0, dr +1)`, `DOWN=(0, −1)`, `LEFT=(−1, 0)`, `RIGHT=(+1, 0)`. Combined with the table above, **a "UP" LINE skill paints cells that go visually upward on screen, "LEFT" goes visually left, etc.** — each is an independent code path (`DirectionToDelta` per-branch × `CellToWorld` per-axis), so QA must verify all four separately; never accept LEFT as "the mirror of RIGHT".

---

## 1. Color acceptance (applies to every shape)

Tints are set in `SkillRangePreviewLogic` (`:16-17`) and applied in `PlaceHighlight` (`:248-251`) onto `SpriteRendererComponent.Color` over a **solid** highlight sprite (design model `skillrangehighlight`, RUID `74e4a361a0754f32aef7a689fba9264b`).

| Role | Property | Color(RGBA) | On-screen reading | FAIL signal |
|---|---|---|---|---|
| Range / shape area | `rangeColor` | `(0.25, 0.85, 0.85, 0.40)` | **teal/cyan, ~40% opacity** | not teal, OR fully opaque (board art fully hidden) |
| Auto-target cell | `targetColor` | `(0.95, 0.25, 0.25, 0.55)` | **red, ~55% opacity** | not red, OR red on >1 cell, OR red on a cell outside the teal field |

**Alpha-blend acceptance (mandatory):** because the sprite is solid and tint alpha < 1.0, **the board art / grid line underneath MUST remain visible through every highlighted cell.** A fully opaque flat-color square = alpha not applied = **FAIL** (signals wrong sprite, wrong Color assignment, or a non-alpha material).

---

## 2. Per-shape cell acceptance

Notation: caster cell = `(c, r)`. Relative cells are `(c+Δc, r+Δr)`. Caster cell itself is **C**. "Teal count" / "Red count" = number of highlighted cells of that color visible on the board (count by eye / pixel patch). Cells that fall **off-board are clipped** (`PushIfInside` / `IsInside`) — at a board edge the expected count drops; QA must use a caster cell with room (see §3) for the canonical full-count shots.

### 2.1 LINE — `archer_arrow_blow` / `archer_double_shot` / `archer_ice_shot` / mage `mage_fire_arrow` / `mage_chain_lightning` (range 7, directional)

Source: `ResolveSkillCells` LINE branch (`:27-43`) walks `range` steps from `(c,r)` **excluding the caster cell** (loop starts at `c+delta`, so `Δc=Δr=0` never painted).

- **Color:** ALL teal. **Red count = 0** (LINE has no auto-target recolor).
- **Caster cell C: NOT lit** (off — verifies the "start at first step" contract).
- **Cells:** straight ray from C in the combat direction, up to the board edge (range 7 ≥ board span, so it always reaches the edge).

**Four mandatory screenshots (independent — do NOT collapse):**

| Direction | Relative cell set (before edge clip) | On-screen shape |
|---|---|---|
| **UP** | `(c, r+1), (c, r+2), … up to row 6` | vertical line going **up** from C; C dark |
| **DOWN** | `(c, r−1), (c, r−2), … down to row 0` | vertical line going **down** from C; C dark |
| **LEFT** | `(c−1, r), (c−2, r), … to col 0` | horizontal line going **left** from C; C dark |
| **RIGHT** | `(c+1, r), (c+2, r), … to col 6` | horizontal line going **right** from C; C dark |

PASS requires: line is on the correct single row/column, in the correct on-screen direction, **C cell unlit**, teal only, red 0. A line drawn in the wrong direction (e.g. LEFT request paints rightward) = FAIL even if cell count matches.

> Direction comes from `ResolveDirection` → `UICombatControlLogic:GetCombatDirection()` (fallback `CombatConfig.DEFAULT_DIRECTION = "RIGHT"`). To force each direction for the 4 shots, QA sets combat direction before `ShowSkillRange`, or drives an archer loadout and changes facing.

### 2.2 ADJACENT8 — `mage_energy_bolt` / `mage_thunder_bolt` / `mage_meteor` / `mage_poison_mist` / `mage_blizzard` / fusion `mage_energy_claw`

Source: `ResolveSkillCells` ADJACENT8 (`:19-26`), all 8 surrounding cells, **center excluded** (`not (dc==0 and dr==0)`).

- **Color:** ALL teal. **Red count = 0.**
- **Caster cell C: NOT lit.**
- **Cells (8):** `(c−1,r+1) (c,r+1) (c+1,r+1)` / `(c−1,r) ___C___ (c+1,r)` / `(c−1,r−1) (c,r−1) (c+1,r−1)`.

On-screen: a **3×3 teal block with a dark hole in the center**. PASS requires 8 teal, center dark, no red, no diagonal missing. (At a board edge, off-board members clip; use interior caster for the 8-count shot.)

### 2.3 ADJACENT4 — `warrior_slash_blast` / fusion `warrior_power_blast`

Source: `ResolveSkillCells` ADJACENT4 branch (`:13-18`) — pushes the 4 orthogonal neighbors only.

- **Color:** ALL teal. **Red count = 0.**
- **Caster cell C: NOT lit** (only neighbors are pushed).
- **Cells (4):** `(c, r+1)` up, `(c, r−1)` down, `(c−1, r)` left, `(c+1, r)` right. **Diagonals excluded.**

On-screen: a **plus/cross of 4 teal cells around a dark center, no corners**. Any diagonal cell teal = FAIL. Any red = FAIL.

### 2.4 ADJACENT4_SINGLE — `warrior_power_strike` (range 1)

Source: same ADJACENT4 branch (`:13-18`) resolves **all 4 candidate** cross cells; the single-target pick is the **server's** job (`CombatLogic:399-409`), **not the preview's**. The preview paints whatever `ResolveSkillCells` returns.

- **Color:** ALL teal (the 4 candidate cross cells). **Red count = 0** (preview does NOT pre-pick the single target; `PaintShapeCells` only uses `rangeColor`).
- **Caster cell C: NOT lit.**
- **Cells (4 candidates):** identical to ADJACENT4 — `(c,r+1),(c,r−1),(c−1,r),(c+1,r)`.

PASS: 4 teal cross cells, center dark, **red = 0**. (Acceptance note: the visual range of ADJACENT4_SINGLE is identical to ADJACENT4 — that is correct and expected; the "single" distinction is a server hit-resolution detail, not a preview difference. **Red must be 0** because `PaintShapeCells :153` only ever applies `rangeColor`.)

### 2.5 RANGED_TARGET — `mage_magic_claw`(range 3) / `thief_double_stab`(2) / `thief_lucky_seven`(5) / fusion `thief_triple_seven`(5) / `mage_heal`(4) / `mage_angel_ray`(5)

Source: `PaintRangedTarget` (`:159-192`). Teal field = every board cell with `IsInRange(casterCell, col,row, range)` true, i.e. **Chebyshev `max(|Δc|,|Δr|) ≤ range`** (`AttackPatternLogic:48-53`). Then the nearest alive monster cell is overpainted **red** (`FindNearestMonsterCell :195-234`).

- **Teal field:** the full **(2·range+1) × (2·range+1) square** centered on C, **including C itself** (`IsInRange` is true at distance 0 — note this is the ONE shape where the caster cell IS lit), **clipped to the board**.
- **Red:** **exactly 0 or 1 cell.** 1 red = nearest alive monster within range; 0 red = no monster in range. **≥2 red = FAIL.**
- The red cell MUST be inside the teal field and MUST be the **Chebyshev-nearest** alive monster (tiebreak: smallest `monsterId` string). This mirrors `CombatLogic:ResolveTargets` RANGED_TARGET sort (`:371-378`) exactly.

Expected teal square half-width = `range` per skill:

| Skill | range | Teal square (unclipped) | Teal cells at center C=(3,3) (fully on-board?) |
|---|---|---|---|
| `thief_double_stab` | 2 | 5×5 | 25 (fits) |
| `mage_magic_claw` | 3 | 7×7 | **49 — entire board** (at C=(3,3), range 3 covers cols/rows 0..6) |
| `mage_heal` | 4 | 9×9 | clipped to 49 (whole board) |
| `thief_lucky_seven` | 5 | 11×11 | clipped to 49 (whole board) |
| `thief_triple_seven` | 5 | 11×11 | clipped to 49 |
| `mage_angel_ray` | 5 | 11×11 | clipped to 49 |

PASS per RANGED shot: teal square is the correct Chebyshev box for that range (count cells along one edge = `2·range+1` unless clipped), C is teal, red is 0 or exactly 1, and if 1, it sits on the nearest monster. **If two cells are red → FAIL** (recolor loop `:179-188` breaks after the first match, so >1 red can only come from a pooling/cleanup bug — flag it).

### 2.6 PASSIVE — `warrior_power_mastery` / `archer_critical_shot` / `mage_spell_mastery` / `thief_nimble_body` / `mage_bless`

Source: `ShowSkillRange` PASSIVE/nil-shape guard (`:108-112`) → `HideSkillRange()`.

- **Expected: 0 highlighted cells.** Pressing/holding a passive slot must show **no teal, no red** — the whole pool stays hidden.

PASS: screenshot is the bare board, zero overlays.

---

## 3. Canonical worked example (so QA can pixel-count)

Use **caster at center cell C = (3,3)** (world `(-2.0, 0.3)`) wherever the shape fits, because it maximizes on-board cells and gives clean counts. Drive: `RequestEnterStage('STORY','1-1','mage','mage_magic_claw')` → `StartZen` → place/confirm the local player on a known cell (read it back via `WorldToCell(LocalPlayer.TransformComponent.WorldPosition)` and substitute the actual `(c,r)` if not (3,3)).

**Absolute expected lit cells at C=(3,3):**

| Shape (skill) | Lit cells `(col,row)` | Teal count | Red count |
|---|---|---|---|
| LINE UP | `(3,4)(3,5)(3,6)` | 3 | 0 |
| LINE DOWN | `(3,2)(3,1)(3,0)` | 3 | 0 |
| LINE LEFT | `(2,3)(1,3)(0,3)` | 3 | 0 |
| LINE RIGHT | `(4,3)(5,3)(6,3)` | 3 | 0 |
| ADJACENT8 | `(2,4)(3,4)(4,4)(2,3)(4,3)(2,2)(3,2)(4,2)` | 8 | 0 |
| ADJACENT4 | `(3,4)(3,2)(2,3)(4,3)` | 4 | 0 |
| ADJACENT4_SINGLE | `(3,4)(3,2)(2,3)(4,3)` | 4 | 0 |
| RANGED range 2 (double_stab) | all cells with `max(|c−3|,|r−3|)≤2` → cols 1..5 × rows 1..5 | 25 | 0 or 1 |
| RANGED range 3 (magic_claw) | whole board (Chebyshev 3 from center covers 0..6) | 49 | 0 or 1 |
| PASSIVE | none | 0 | 0 |

> If the actual spawn cell is NOT (3,3), QA recomputes by substituting `(c,r)` into the relative sets in §2; the **relative** sets are the contract, the table above is one concrete instance.

**Edge-clip cross-check (recommended extra shot):** drive a caster near a corner (e.g. force/observe `(0,0)`) with ADJACENT8 → expected teal = only `(1,0)(0,1)(1,1)` = **3 cells** (5 off-board members clipped, center dark). This proves `PushIfInside` clipping is honored and the pool doesn't paint off-board.

---

## 4. Hide pairing (required with EVERY shape shot)

For each shape screenshot above, QA captures a **paired Hide shot**: call `HideSkillRange()` (or release the slot), then screenshot.

- **Expected after Hide: 0 visible overlays** — `HideSkillRange` → `HideFrom(1)` (`:137-139`, `:255-264`) sets `Visible=false` on the entire pool.
- **Any residual teal/red cell on the board after Hide = FAIL** (signals a pool index not cleared, or `HideFrom` start index wrong).
- Also verify no overlay parked **on-board**: hidden entities live at `parkPosition (-100,-100,0)` (`:20`), off the playfield — a stray visible square anywhere = FAIL.

---

## 5. Screenshot checklist (deliverable matrix)

Each row = one Show screenshot **+** its paired Hide screenshot (Hide expected: 0 overlays). Each Show shot is judged against its "correct cell map" from §2/§3.

| # | Shot | Drive (job / skill) | Expect (teal / red / C lit?) |
|---|---|---|---|
| 1 | LINE **UP** | archer / `archer_arrow_blow`, dir UP | teal ray up / red 0 / C dark |
| 2 | LINE **DOWN** | archer, dir DOWN | teal ray down / red 0 / C dark |
| 3 | LINE **LEFT** | archer, dir LEFT | teal ray left / red 0 / C dark |
| 4 | LINE **RIGHT** | archer, dir RIGHT | teal ray right / red 0 / C dark |
| 5 | ADJACENT8 | mage / `mage_energy_bolt` | 8 teal ring / red 0 / C dark |
| 6 | ADJACENT4 | warrior / `warrior_slash_blast` | 4 teal cross / red 0 / C dark |
| 7 | ADJACENT4_SINGLE | warrior / `warrior_power_strike` | 4 teal cross / **red 0** / C dark |
| 8 | RANGED `magic_claw` | mage / `mage_magic_claw` (r3) | teal 7×7 box / red 0-or-1 / **C teal** |
| 9 | RANGED `double_stab` | thief / `thief_double_stab` (r2) | teal 5×5 box / red 0-or-1 / C teal |
| 10 | RANGED `lucky_seven` | thief / `thief_lucky_seven` (r5) | teal 11×11 box (clipped 49) / red 0-or-1 / C teal |
| 11 | RANGED `triple_seven` | thief fusion / `thief_triple_seven` (r5) | teal box r5 / red 0-or-1 / C teal |
| 12 | RANGED `heal` | mage / `mage_heal` (r4) | teal 9×9 box (clipped) / red 0-or-1 / C teal |
| 13 | RANGED `angel_ray` | mage / `mage_angel_ray` (r5) | teal box r5 / red 0-or-1 / C teal |
| 14 | PASSIVE | any / e.g. `mage_spell_mastery` | 0 overlays |
| (opt) | ADJACENT8 corner clip | mage at `(0,0)` | 3 teal / red 0 / C dark |

**For RANGED red verification (#8-13):** at least one shot MUST have a monster inside range so the red cell appears; QA confirms the red cell = Chebyshev-nearest alive monster (smallest monsterId on tie). A shot with no monster in range PASSES with red=0 but does NOT exercise the red rule — pair it with one that does.

---

## 6. Global PASS gate (all must hold)

1. Teal cells = exactly the code-derived set for that shape/direction/range (relative-coordinate table §2), clipped to board.
2. Caster-cell rule: **dark** for LINE/ADJACENT8/ADJACENT4/ADJACENT4_SINGLE; **teal** for RANGED_TARGET; **n/a** for PASSIVE.
3. Color: teal = `rangeColor` (a0.40), red = `targetColor` (a0.55); **alpha visibly blended** (board art shows through).
4. Red count ∈ {0,1}, only for RANGED_TARGET, on the nearest monster, inside the teal field. Any red elsewhere or count ≥2 = FAIL.
5. Every shape shot has a paired Hide shot with **0 residual overlays**.
6. No off-direction LINE (each of the 4 directions independently correct — no code-symmetry credit).

Any single violation = FAIL for that shot; QA reports `shot# — observed vs expected (cell set / color / count)`.
