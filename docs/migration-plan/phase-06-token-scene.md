# Phase 6: Token & Scene

**Status**: 📝 Rough Sketch (Straightforward Foundry wrappers)

> **Milestone**: POC  
> **Dependencies**: Phase 5  
> **Goal**: An actor can be placed on a scene as a token. The token links back to the actor. Token appearance reflects actor state. Token provides the targeting system for Phase 8 (Action System) and hosts the ActionHUD. Token drag integrates with TurnActionBudget for movement tracking.

---

## 5.1 Token Document

- Extend `TokenDocumentDnd35e` beyond a type alias
- Support linked vs unlinked tokens (Foundry built-in, just ensure it works)
- Token size derived from actor's `details.size` field (use size → token dimension map)
- Token name from actor name
- Override `update()` for Pinia store refresh

## 5.2 Canvas Token

- Extend `tokenDnd35e` class
- Add HUD actions (placeholder for Phase 7)
- Vision/light based on actor senses — stub now, implement with actor senses later

## 5.3 Scene Document

- `SceneDnd35e` — verify grid measurement works (5ft squares = standard D&D 3.5)
- Region behaviors already stubbed (environment, difficult terrain)

## 5.4 Files to Create/Modify

| Action | Path |
|--------|------|
| Expand | `src/scene/token-document/TokenDocumentDnd35e.mts` — actual class with size derivation, `update()` refresh |
| Expand | `src/canvas/token/tokenDnd35e.mts` — HUD stubs |
| Verify | `src/scene/SceneDnd35e.mts` — grid/measurement compatibility |
| Create | `src/constants/tokenSizes.mts` — size → token dimension mapping |

---

## Completion Checklist

### ✅ Complete
- (None — Phase 6 has not started)

### ❌ Not Started (All Tasks for Phase 6)

**Token Size Constants & Dimension Mapping:**
- [ ] Create `src/constants/tokenSizes.mts` with SizeCategory → dimension mapping
- [ ] Define mapping: Fine=0.5×0.5, Diminutive=1×1, Tiny=2.5×2.5, Small=5×5, Medium=5×5, Large=10×10, Huge=15×15, Gargantuan=20×20 (all in grid squares)
- [ ] Create reverse lookup: dimension → SizeCategory for token resize validation
- [ ] Export CONFIG.DND35E.tokenSizes to make available in type system
- [ ] Document: that all dimensions are in 5ft grid squares (standard for D&D 3.5e)
- [ ] Unit test: Fine → 0.5×0.5, Medium → 5×5, Huge → 15×15
- [ ] Unit test: Invalid size throws error or returns Medium default
- [ ] Unit test: Reverse lookup: 5×5 → Medium, 10×10 → Large

**Token Document Class & Size Derivation:**
- [ ] Create `src/scene/token/TokenDocumentDnd35e.mts` extending Foundry's TokenDocument
- [ ] Implement `getActorSizeDimensions()` method: reads actor.system.details.size, looks up in tokenSizes map
- [ ] Override `prepareData()` to auto-derive token width/height from actor size on creation
- [ ] Override `_preUpdateData(data)` to recompute dimensions if actor size changes
- [ ] Verify linked tokens (document.actor !== null) vs unlinked tokens work correctly
- [ ] Implement `update()` override that calls parent then refreshes Pinia token store
- [ ] Track token's linked actor via document.actor property
- [ ] Verify token name auto-updates from actor name when actor is linked
- [ ] Implement `_getTokenActorRollData()` helper to fetch actor's getRollData() for Phase 8 targeting
- [ ] Test: Create linked token, size matches actor.system.details.size
- [ ] Test: Change actor size via AE → token width/height update
- [ ] Test: Create unlinked token → width/height default to Medium (5×5)
- [ ] Test: Linked token name matches actor name
- [ ] Test: Unlinked token can have custom name independent of actor

**Canvas Token Instance (Interactive Behavior):**
- [ ] Create `src/canvas/token/tokenDnd35e.mts` extending Foundry's Token class
- [ ] Implement `_onHoverIn()`: show token label, optional glow effect
- [ ] Implement `_onHoverOut()`: hide token label, remove glow
- [ ] Implement `_canView()` to check if current user can see token (always true for now, Phase 20 adds sight)
- [ ] Implement `_canControl()` to check if current user controls token
- [ ] Implement `_createTooltip()` to show brief actor stats on hover (optional, low priority)
- [ ] Stub `_prepareHUD()` for Phase 8 integration (prepares HUD mount point but doesn't render yet)
- [ ] Test: Token renders on canvas without error
- [ ] Test: Hover shows/hides token label
- [ ] Test: Non-owner cannot interact with controlled token

**Targeting System Preparation for Phase 8 Actions:**
- [ ] Create `src/targeting/TargetingManager.mts` class to track selected targets
- [ ] Implement `selectTarget(token: Token, additive: boolean)` to add/toggle token in target set
- [ ] Implement `clearTargets()` to empty target set
- [ ] Implement `getSelectedTargets(): Token[]` to expose current targets for action execution
- [ ] Implement visual feedback: highlight selected target tokens with colored outline
- [ ] Bind to canvas click events: Ctrl+click adds to targets, normal click clears then sets single target
- [ ] Store selected targets in Pinia targeting store for Phase 8 to consume
- [ ] Implement `getTargetActor(token: Token): ActorDnd35e` helper for Phase 8 formula `#target.*` contexts
- [ ] Test: Click token → selected (outline shows)
- [ ] Test: Ctrl+click multiple tokens → all selected
- [ ] Test: Click empty space → targets cleared
- [ ] Test: `getSelectedTargets()` returns expected array

**Token HUD Integration Stubs (for Phase 8 ActionHUD):**
- [ ] Verify Foundry's token HUD renders (default behavior, no modifications needed)
- [ ] Create mount point in HUD for Phase 8's ActionHUD Vue component
- [ ] Implement `_renderHUD()` or extend HUD render to accept Vue component
- [ ] Stub HUD action panel placeholder (actual actions added in Phase 8)
- [ ] Document HUD mounting architecture for Phase 8
- [ ] Test: Token HUD renders when token selected

**Movement Integration with Action Economy (Ruler):**
- [ ] Create `src/canvas/ruler/RulerDnd35e.mts` extending Foundry's Ruler
- [ ] Integrate with Phase 5's `TurnActionBudget` to track movement budget
- [ ] On ruler activation: check actor's current turn state → get available movement (speed × 1, 2, or 4)
- [ ] Visually indicate ruler distance thresholds: green (≤speed), yellow (>speed, ≤2×speed), red (>2×speed, ≤4×speed)
- [ ] On ruler confirm: notify TurnActionBudget what movement was taken (move action, double move, run)
- [ ] Implement 5-foot step separate from move: short ruler drag (≤5ft) auto-treats as 5ft step if no movement taken
- [ ] Prevent movement exceeding available budget (gray out ruler beyond max distance)
- [ ] Implement diagonal movement accounting (ruler counts actual canvas distance)
- [ ] Test: Ruler shows green → yellow → red as distance increases
- [ ] Test: Confirm ruler at 20ft → TurnActionBudget records "move action spent"
- [ ] Test: 5ft drag treated as 5ft step
- [ ] Test: Cannot drag beyond available movement budget

**Scene Document & Grid Verification:**
- [ ] Create/verify `src/scene/SceneDnd35e.mts` extends Scene
- [ ] Set default grid size to 5 (Foundry: 1 grid square = 5ft in D&D)
- [ ] Verify grid type is square (standard for D&D 3.5e)
- [ ] Stub region behaviors: environment tags, difficult terrain modifiers (deferred to Phase 15 environment)
- [ ] Verify scene loads without errors
- [ ] Test: Scene created with 5ft grid squares
- [ ] Test: Token placed on scene at correct coordinates based on grid

**Token Data Persistence & Pinia Store:**
- [ ] Create Pinia token store: `src/vue/stores/tokenStore.mts`
- [ ] Store token document references in store (keyed by scene + token ID)
- [ ] Store selected targets list in store with reactivity
- [ ] Implement `updateToken(token)` to refresh store after Foundry document update
- [ ] Implement `setSelectedTargets(tokens: Token[])` to update UI reactively
- [ ] Bind Phase 6 token updates to store refresh
- [ ] Test: Update token in Foundry → store subscribers notified → UI updates
- [ ] Test: Select targets → store updates → HUD reflects changes

**Comprehensive Testing:**
- [ ] Unit test: Size → dimension: Fine=0.5, Medium=5, Huge=15
- [ ] Unit test: ReverseTokenSize: 5×5=Medium, 10×10=Large
- [ ] Integration test: Create actor (Medium size), place on scene → token is 5×5
- [ ] Integration test: Add AE that changes size to Large → token grows to 10×10
- [ ] Integration test: Move actor → token moves (linked)
- [ ] Integration test: Rename actor → token name updates
- [ ] Integration test: Click canvas → select token → outline shows
- [ ] Integration test: Ctrl+click another → both selected with outline
- [ ] Integration test: Drag ruler 20ft → yellow highlight → confirm → TurnActionBudget reflects move action
- [ ] Integration test: Drag ruler 5ft exactly → treated as 5ft step
- [ ] Integration test: Drag ruler beyond max allowed → gray out beyond max
- [ ] Smoke test: Create scene, add actor token, move around, no console errors
- [ ] Smoke test: Delete token → no dangling references
- [ ] Smoke test: Token HUD renders and doesn't break with Phase 5 actor
