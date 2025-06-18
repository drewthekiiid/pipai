# Copilot Instructions for PIP AI

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Project Overview
This is a modern "PIP AI" application built with the absolute-latest tech stack as of June 2025:

### Architecture
- **Monorepo**: Turborepo with pnpm workspaces
- **Frontend**: Next.js 15.3.3 with React 19, App Router, TypeScript, Tailwind CSS 4.1
- **UI Components**: shadcn/ui with Radix primitives 
- **Design-to-Code**: Figma → V0.dev CLI workflow
- **Infrastructure**: Pulumi 3.177.0 for multi-cloud IaC
- **Database**: Neon Serverless Postgres with Prisma 6.9.0 ORM
- **Auth**: Clerk 5.69.0 for authentication and organizations
- **Cache/KV**: Upstash Redis 1.35.0
- **Queues**: Upstash Kafka for event streaming
- **Workflows**: Temporal Cloud with TypeScript SDK 1.11.8
- **AI/ML**: LangGraph 0.4.8, Helicone proxy, LangSmith tracing
- **Vector DB**: Qdrant Cloud v1.14.1
- **File Storage**: Vercel Blob → S3 overflow
- **Observability**: Grafana Cloud + OpenTelemetry
- **Real-time**: Vercel Edge WebSockets + SSE
- **Testing**: Playwright 1.53.0 for E2E
- **Deployment**: Fly.io for workers, Vercel for web

### Key Patterns
1. **Design-First**: Always start with Figma designs, use V0.dev CLI to generate components
2. **Type-Safe**: Full TypeScript with Prisma-generated types and Zod validation
3. **Monorepo**: Apps in `apps/`, shared packages in `packages/`
4. **Infrastructure as Code**: All resources defined in Pulumi
5. **Workflow-Driven**: Long-running processes via Temporal workflows
6. **Real-time Updates**: SSE streams for live progress, WebSockets for interaction
7. **AI-Native**: LangGraph for multi-step AI workflows with proper observability

### Development Guidelines
- Use pnpm for package management
- Follow Turbo build conventions
- Implement proper error boundaries and loading states
- Use Temporal for any long-running or retry-able operations
- Stream results via SSE for better UX
- Store files in Vercel Blob with S3 overflow
- Use Upstash for caching and queuing
- Implement proper observability with traces

### File Organization
```
apps/
├── web/          # Next.js frontend
└── api/          # Backend APIs (separate from Next.js)
packages/
├── ui/           # Shared UI components (shadcn/ui based)
├── worker/       # Temporal worker
├── db/           # Prisma schema and migrations
└── shared/       # Shared utilities and types
infra/            # Pulumi infrastructure code
```

When generating code:
- Always use the latest syntax and patterns for each technology
- Implement proper TypeScript types
- Follow the established file structure
- Use environment variables from `.env` files
- Include proper error handling and loading states
- Consider real-time updates where appropriate
