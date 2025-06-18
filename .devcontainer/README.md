# 🏗️ Construction AI Devcontainer

**The Gold Standard Development Environment for Your Construction AI Project**

This devcontainer provides a **consistent, cloud-ready development environment** with the latest versions of all tools and technologies. Code from **anywhere** (GitHub Codespaces, VS Code, or any Docker-compatible machine) and get the exact same environment.

## 🎯 What's Included

### **Core Technologies**
- **Node.js 22.x LTS** - Latest active LTS version ("Jod")
- **pnpm 10.12.1** - Latest fast package manager
- **Python 3.12.11** - Latest stable Python with construction AI libraries
- **TypeScript 5.5+** - Full TypeScript development environment

### **Development Tools**
- **GitHub CLI** - Latest version for seamless GitHub integration
- **Docker & Docker Compose** - Latest versions for containerized development
- **VS Code Extensions** - Pre-configured for optimal productivity
- **AWS CLI v2** - Latest for infrastructure management
- **Vercel CLI** - Latest for frontend deployments
- **Pulumi CLI** - Latest for infrastructure as code
- **Temporal CLI** - Latest for workflow orchestration

### **Construction AI Stack**
- **FastAPI** - High-performance Python web framework
- **Next.js 15.3.3** - Latest React framework with Turbopack
- **OpenAI SDK** - GPT-4o integration for construction analysis
- **PDF Processing** - pdf-parse and poppler-utils for document analysis
- **Database Tools** - PostgreSQL client, Redis tools, SQLite

## 🚀 Quick Start

### Option 1: GitHub Codespaces (Recommended)
1. Go to your GitHub repository
2. Click the **Code** button → **Codespaces** → **Create codespace**
3. Wait for the environment to build (2-3 minutes)
4. Start coding instantly! 🎉

### Option 2: VS Code Local
1. Install [VS Code](https://code.visualstudio.com/) and the [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)
2. Clone this repository
3. Open in VS Code
4. Press `F1` → **Dev Containers: Reopen in Container**
5. Wait for build and you're ready! 🎉

### Option 3: Docker Direct
```bash
# Clone and start
git clone <your-repo>
cd pipai
docker-compose -f .devcontainer/docker-compose.yml up -d
docker exec -it construction-ai-dev bash
```

## 🛠️ Environment Features

### **Automatic Setup**
- ✅ All latest tools installed and configured
- ✅ VS Code settings optimized for the project
- ✅ Git configuration ready
- ✅ Package managers configured
- ✅ Development directories created

### **Pre-configured Services**
- **PostgreSQL 15** - Database for application data
- **Redis 7** - Caching and session storage
- **Temporal** - Workflow orchestration server
- **Hot Reload** - All services support live code reloading

### **VS Code Integration**
- **Extensions**: TypeScript, Python, Docker, GitHub, Prettier, ESLint
- **Debugging**: Pre-configured for Node.js, Python, and web apps
- **Terminal**: Bash with all tools available
- **IntelliSense**: Full autocomplete for all languages

## 📂 Project Structure Support

The devcontainer is optimized for your monorepo structure:
```
pipai/
├── apps/
│   ├── web/          # Next.js frontend
│   └── api/          # FastAPI backend
├── packages/
│   ├── shared/       # Shared utilities
│   ├── ui/           # UI components
│   └── worker/       # Temporal workers
└── .devcontainer/    # This setup
```

## 🔧 Development Workflow

### **Starting Services**
```bash
# Start all services
pnpm run dev

# Start individual services
pnpm run dev:web      # Next.js on :3001
pnpm run dev:api      # FastAPI on :8000
pnpm run dev:worker   # Temporal worker
```

### **Testing**
```bash
# Run all tests
pnpm test

# Test specific packages
pnpm test:web
pnpm test:api
pnpm test:worker
```

### **Database Operations**
```bash
# PostgreSQL
psql postgresql://user:password@postgres:5432/construction_ai

# Redis
redis-cli -h redis
```

## 🌐 Port Mappings

The devcontainer exposes these ports:
- **3000** - Next.js main
- **3001** - Next.js with Turbopack
- **8000** - FastAPI backend
- **5432** - PostgreSQL database
- **6379** - Redis cache
- **7233** - Temporal web UI
- **7234** - Temporal gRPC

## 📦 Package Management

### **Node.js (pnpm)**
```bash
# Install dependencies
pnpm install

# Add packages
pnpm add <package>

# Add dev dependencies
pnpm add -D <package>

# Add global tools
pnpm add -g <package>
```

### **Python (pip)**
```bash
# Install from requirements.txt
pip install -r apps/api/requirements.txt

# Add new packages
pip install <package>

# Virtual environment (already active)
python -m venv venv
source venv/bin/activate
```

## 🚀 Deployment Integration

### **GitHub Actions**
- ✅ CI/CD workflows pre-configured
- ✅ Automatic testing on push
- ✅ Preview deployments for PRs
- ✅ Production deployment on main

### **Vercel Deployment**
```bash
# Deploy preview
vercel

# Deploy production
vercel --prod
```

### **Infrastructure (Pulumi)**
```bash
# Deploy infrastructure
cd infra
pulumi up
```

## 🔐 Environment Variables

Copy `.env.example` to `.env` and configure:
```bash
cp .env.example .env
# Edit .env with your actual values
```

Required variables:
- `OPENAI_API_KEY` - GPT-4o API access
- `AWS_ACCESS_KEY_ID` & `AWS_SECRET_ACCESS_KEY` - Infrastructure
- `VERCEL_API_TOKEN` - Frontend deployment
- `DATABASE_URL` - PostgreSQL connection
- `REDIS_URL` - Redis connection

## 🐛 Troubleshooting

### **Port Conflicts**
If ports are already in use:
```bash
# Stop conflicting services
docker-compose down
# Or change ports in docker-compose.yml
```

### **Permission Issues**
```bash
# Fix file permissions
sudo chown -R $USER:$USER /workspace
```

### **Package Issues**
```bash
# Reset package managers
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Reset Python packages
pip install --force-reinstall -r requirements.txt
```

### **Database Connection**
```bash
# Check database status
docker-compose ps
# Reset database
docker-compose down -v
docker-compose up postgres
```

## 📚 Additional Resources

- [Construction AI Documentation](../README.md)
- [GitHub Codespaces Docs](https://docs.github.com/en/codespaces)
- [VS Code Dev Containers](https://code.visualstudio.com/docs/remote/containers)
- [Docker Compose Reference](https://docs.docker.com/compose/)

## 🤝 Contributing

When adding new tools or services:
1. Update `Dockerfile` with new dependencies
2. Add configuration to `devcontainer.json`
3. Update this README
4. Test the build locally
5. Submit a PR

---

**🎯 Ready to build the future of construction with AI!** 🏗️

This devcontainer ensures you have the **exact same, latest environment** whether you're coding on your laptop, in the cloud, or on a teammate's machine. No more "it works on my machine" - it works everywhere! 🚀 