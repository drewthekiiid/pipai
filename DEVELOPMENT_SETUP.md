# PIP AI Development Setup Guide

This guide will help you set up your development environment for the PIP AI project using `direnv` for automatic environment management.

## Prerequisites

- Node.js 20.x or later
- pnpm (preferred package manager)
- Git

## Quick Start

### 1. Install direnv

**macOS (using Homebrew):**
```bash
brew install direnv
```

**Ubuntu/Debian:**
```bash
sudo apt install direnv
```

**Other systems:** See [direnv installation guide](https://direnv.net/docs/installation.html)

### 2. Configure your shell

Add direnv hook to your shell configuration:

**For bash (`~/.bashrc` or `~/.bash_profile`):**
```bash
eval "$(direnv hook bash)"
```

**For zsh (`~/.zshrc`):**
```bash
eval "$(direnv hook zsh)"
```

**For fish (`~/.config/fish/config.fish`):**
```bash
direnv hook fish | source
```

### 3. Clone and setup the repository

```bash
# Clone the repository
cd ~/repos
git clone https://github.com/drewthekiiid/pipai.git
cd pipai

# Allow direnv to load the environment
direnv allow

# Install dependencies
pnpm install

# Copy environment template and fill in your secrets
cp env.template .env.local
```

### 4. Configure your environment variables

Edit `.env.local` with your actual credentials:

```bash
# Edit the file with your preferred editor
nano .env.local
# or
code .env.local
```

Fill in the required values:
- `OPENAI_API_KEY` - Your OpenAI API key
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` - AWS credentials
- `TEMPORAL_API_KEY` - Temporal Cloud API key
- `REDIS_URL` - Redis connection string
- Other service credentials as needed

### 5. Verify setup

Run the environment check:
```bash
check_env
```

### 6. Start development

```bash
# Start all development servers
dev-start

# Or use the helper function
dev
```

## Available Commands

Once direnv is loaded, you have access to these aliases and functions:

### Development Commands
- `dev-start` - Start all development servers
- `dev-stop` - Stop all development servers  
- `dev-clean` - Clean build artifacts and caches
- `dev` - Show development environment info

### Package Management
- `install-deps` - Install all dependencies with pnpm
- `build-all` - Build all packages
- `test-all` - Run all tests

### Environment Management
- `check_env` - Check if all required environment variables are set

### Git Shortcuts
- `git-status` - Check git status
- `git-push` - Quick add, commit, and push

## Environment Variables

The following environment variables are required:

### Core Services
- `OPENAI_API_KEY` - For GPT-4o construction analysis
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` - For S3 file storage
- `TEMPORAL_API_KEY` - For workflow orchestration
- `REDIS_URL` - For caching and session management

### Development
- `NODE_ENV=development` - Set automatically
- `DEBUG=pip-ai:*` - Enable debug logging
- `NEXT_TELEMETRY_DISABLED=1` - Disable Next.js telemetry

### Application URLs
- `NEXT_PUBLIC_APP_URL=http://localhost:3000`
- `NEXT_PUBLIC_API_URL=http://localhost:3000/api`

## Troubleshooting

### direnv not loading

1. Make sure you added the hook to your shell configuration
2. Restart your terminal or source your shell config
3. Run `direnv allow` in the project directory

### Missing environment variables

1. Check if `.env.local` exists and has the required variables
2. Run `check_env` to see what's missing
3. Copy `env.template` to `.env.local` if it doesn't exist

### Development server issues

1. Make sure all dependencies are installed: `pnpm install`
2. Clean build artifacts: `dev-clean`
3. Check if ports are available (3000 is the default)

### Node.js version issues

If you're using nvm or nodenv, make sure you're using Node.js 20.x:

```bash
# With nvm
nvm use 20

# With nodenv
nodenv local 20.15.0
```

## Project Structure

```
pipai/
├── .envrc                    # direnv configuration
├── env.template             # Environment variables template
├── .env.local              # Your actual secrets (not in git)
├── dev-start.sh            # Development server starter
├── dev-stop.sh             # Development server stopper
├── apps/
│   └── web/                # Next.js frontend and API
├── packages/
│   ├── shared/             # Shared utilities
│   ├── ui/                 # UI components
│   └── worker/             # Temporal worker
└── infra/                  # Infrastructure as code
```

## Security Notes

- Never commit `.env.local` to version control
- Keep your API keys secure and rotate them regularly
- Use different credentials for development and production
- The `.envrc` file is safe to commit as it doesn't contain secrets

## Getting Help

- Run `dev` to see available commands and check environment status
- Check the project's README.md for additional documentation
- Review the GitHub repository: https://github.com/drewthekiiid/pipai

## Next Steps

After setup, you can:

1. Start the development environment: `dev-start`
2. Open the frontend: http://localhost:3000
3. Test the API: http://localhost:3000/api/upload
4. Begin development on your features

The application includes:
- 🤖 **EstimAItor** - AI-powered construction cost estimation
- 📊 **Multi-agent workflow** - Manager, File Reader, Trade Mapper, Estimator, Exporter
- 🏗️ **Full-stack TypeScript** - Unified frontend and backend
- ☁️ **Cloud-ready** - AWS S3, Temporal Cloud, Redis integration 