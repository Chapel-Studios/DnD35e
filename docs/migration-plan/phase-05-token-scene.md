# Phase 5: Token & Scene

> **Status**: Not started  
> **Dependencies**: Phase 4  
> **Goal**: An actor can be placed on a scene as a token. The token links back to the actor. Token appearance reflects actor state.

---

## 5.1 Token Document

- Extend `TokenDocumentDnd35e` beyond a type alias
- Support linked vs unlinked tokens (Foundry built-in, just ensure it works)
- Token size derived from actor's `details.size` field (use size → token dimension map)
- Token name from actor name
- Override `update()` for Pinia store refresh

## 5.2 Canvas Token

- Extend `tokenDnd35e` class
- Add HUD actions (placeholder for Phase 6)
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
