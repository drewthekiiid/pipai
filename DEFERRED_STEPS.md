# PIP AI Setup - Deferred Steps

## ⏳ DEFERRED STEPS (TO REVISIT LATER)

### Step 2: Figma Design System
**Status**: Deferred after Temporal setup

**Tasks**:
- [ ] Create "PIP AI Design" file in Figma
- [ ] Add color/font tokens based on design system
- [ ] Draw Upload Dock frame (main component)
- [ ] Export design tokens to `packages/ui/src/design-tokens.ts`

**Goal**: Single-source design tokens that sync between Figma and code

**Prerequisites**: 
- Figma account with access to V0.dev plugin
- Design concepts for PIP AI interface

---

### Step 3: Generate UI Code  
**Status**: Deferred after Temporal setup

**Tasks**:
- [ ] In Figma, select Upload Dock frame
- [ ] Run V0.dev plugin → "Copy CLI" 
- [ ] Execute command:
  ```bash
  npx v0 dev "<paste-id>" --out packages/ui
  ```
- [ ] Review and integrate generated React + Tailwind components
- [ ] Update `packages/ui/src/index.ts` exports

**Goal**: React + Tailwind component checked into codebase

**Prerequisites**:
- Step 2 completed (Figma design ready)
- V0.dev CLI properly configured
- Upload Dock design finalized

---

## 🎯 CURRENT PRIORITY

Continue with infrastructure and core functionality:

### Next Immediate Steps:
1. **Complete monorepo setup** (if any gaps)
2. **Set up database** (Neon + Prisma)
3. **Configure authentication** (Clerk)
4. **Test Temporal workflows**
5. **API routes foundation**

### Return to UI Steps When:
- Core infrastructure is stable
- Ready for frontend development
- Design requirements are clearer

---

## 📝 Notes
- Steps 2 & 3 are UI-focused and can be done in parallel with backend work
- V0.dev workflow is well-documented in `V0_SETUP.md`
- Design tokens are already scaffolded in `packages/ui/src/design-tokens.ts`
- Upload Dock component placeholder exists in `packages/ui/src/components/upload-dock.tsx`
