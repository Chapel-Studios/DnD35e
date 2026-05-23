# POC Phase 9: Basic Tokens

**Status**: 📄 Stub

> **Milestone**: POC  
> **Dependencies**: poc.6  
> **Goal**: A token can be created on a scene, moved around the map, and correctly reflects its actor. Token has the right class, properties, and actor linkage. Minimal proof before poc.10 (Basic Combat) depends on tokens being on the canvas.

---

## Overview

Phase 9 is a thin verification layer between the actor foundation (poc.6) and combat (poc.10). It proves the actor ↔ token relationship works end-to-end before anything tries to do combat tracking on top of it. Expected to be very little work since Foundry handles most of this out of the box.

**What to verify:**
- Token can be placed on a scene from an actor
- Token can be moved (position updates)
- `token.actor` resolves to the correct `ActorDnd35e` instance
- Token document class is `TokenDocumentDnd35e` (or the system's registered class)
- Token size derives correctly from `actor.system.size`
- Foundry's default token bar shows HP

---

## TODO (Stub — to flesh out at phase-start)

- [ ] Verify token document class registration
- [ ] Verify `token.actor` → `ActorDnd35e` instance with correct `system` shape
- [ ] Verify token size derives from `actor.system.size` (size category → grid squares)
- [ ] Verify HP bar displays `system.hp.current` / `system.hp.max` by default
- [ ] Smoke test: place token on scene, move it, confirm position persists
- [ ] E2E: token created from actor drag → correct name, size, HP bar shown
