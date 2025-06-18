# V0.dev Setup Instructions

## Prerequisites
- V0.dev Premium or Team plan with usage-based billing enabled

## Getting Your V0.dev API Key

1. **Visit v0.dev** and sign in with your account
2. **Upgrade to Premium/Team** plan if not already done
3. **Navigate to API settings** (usually in account/settings)
4. **Create new API key** for your project
5. **Copy the API key** (starts with `v0_`)

## Setting Up Authentication

1. **Copy environment file**:
   ```bash
   cp .env.example .env
   ```

2. **Add your V0.dev API key** to `.env`:
   ```env
   V0_API_KEY=your_actual_v0_api_key_here
   ```

3. **Load environment** (when ready):
   ```bash
   ./load-env.sh
   ```

## V0.dev CLI Usage

Once authenticated, you can use V0.dev in two ways:

### 1. Direct CLI Commands
```bash
# Add a component by ID (from v0.dev website)
v0 add <component-id>

# Example:
v0 add abc123def456
```

### 2. Figma → V0.dev Workflow
1. **Create design** in Figma
2. **Use V0.dev Figma plugin** to generate component
3. **Copy CLI command** from plugin
4. **Run command** to add to your project:
   ```bash
   npx v0 dev "<component-id>" --out packages/ui/src/components
   ```

## Alternative: Manual shadcn/ui Components

If you don't have V0.dev Premium, you can still use shadcn/ui directly:

```bash
cd apps/web
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add input
```

Then copy components to the UI package manually.

## Project Integration

V0.dev components will be generated in:
- `packages/ui/src/components/` (our custom location)
- Follow design tokens from `packages/ui/src/design-tokens.ts`
- Export from `packages/ui/src/index.ts`
- Import in apps: `import { ComponentName } from "@pip-ai/ui"`

## Notes
- V0.dev CLI requires internet connection for generation
- Components are generated with Tailwind CSS classes
- Generated components follow shadcn/ui patterns
- Always review generated code before committing
