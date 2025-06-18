#!/bin/bash
set -e

echo "🏗️ Setting up Construction AI Development Environment..."

# Update system packages
sudo apt-get update

# Install GitHub CLI (latest version)
if ! command -v gh &> /dev/null; then
    echo "📦 Installing GitHub CLI..."
    type -p curl >/dev/null || sudo apt install curl -y
    curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
    sudo apt update
    sudo apt install gh -y
fi

# Install Docker Engine (for local development)
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker Engine..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
fi

# Install Docker Compose (latest)
if ! command -v docker-compose &> /dev/null; then
    echo "🐳 Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# Verify Python installation
echo "🐍 Verifying Python installation..."
python3 --version
pip3 --version

# Verify Node.js and pnpm installation
echo "🟢 Verifying Node.js installation..."
node --version
npm --version
pnpm --version

# Set up development environment
echo "⚙️  Setting up development environment..."

# Install global npm packages for development
pnpm add -g @types/node typescript ts-node nodemon concurrently

# Create common development directories
mkdir -p /workspace/logs
mkdir -p /workspace/tmp
mkdir -p /workspace/.vscode-server

# Set up git configuration (if not already set)
if [ ! -f ~/.gitconfig ]; then
    echo "📝 Setting up Git configuration placeholders..."
    git config --global user.name "Developer"
    git config --global user.email "dev@example.com"
    git config --global init.defaultBranch main
    git config --global core.autocrlf false
    git config --global core.safecrlf false
fi

# Install and setup Temporal CLI (latest)
if ! command -v temporal &> /dev/null; then
    echo "⏰ Installing Temporal CLI..."
    curl -sSf https://temporal.download/cli.sh | sh
    sudo mv temporal /usr/local/bin/
fi

# Install AWS CLI v2 (if not present)
if ! command -v aws &> /dev/null; then
    echo "☁️  Installing AWS CLI v2..."
    curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
    unzip awscliv2.zip
    sudo ./aws/install
    rm -rf aws awscliv2.zip
fi

# Install Pulumi CLI (latest)
if ! command -v pulumi &> /dev/null; then
    echo "🚀 Installing Pulumi CLI..."
    curl -fsSL https://get.pulumi.com | sh
    echo 'export PATH=$PATH:$HOME/.pulumi/bin' >> ~/.bashrc
fi

# Install Vercel CLI (latest)
if ! command -v vercel &> /dev/null; then
    echo "▲ Installing Vercel CLI..."
    pnpm add -g vercel@latest
fi

# Set up VS Code settings for the project
echo "🔧 Setting up VS Code settings..."
mkdir -p /workspace/.vscode
cat > /workspace/.vscode/settings.json << 'EOF'
{
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
        "source.fixAll.eslint": true,
        "source.organizeImports": true
    },
    "python.defaultInterpreterPath": "/usr/bin/python3",
    "python.formatting.provider": "black",
    "typescript.preferences.includePackageJsonAutoImports": "on",
    "eslint.workingDirectories": ["apps/web", "packages"],
    "terminal.integrated.defaultProfile.linux": "bash",
    "files.exclude": {
        "**/node_modules": true,
        "**/.git": true,
        "**/.DS_Store": true,
        "**/venv": true,
        "**/__pycache__": true,
        "**/*.pyc": true
    }
}
EOF

echo "✅ Development environment setup complete!"
echo ""
echo "🎯 Ready for construction AI development!"
echo "📊 Environment Information:"
echo "   • Node.js: $(node --version)"
echo "   • pnpm: $(pnpm --version)"
echo "   • Python: $(python3 --version)"
echo "   • Git: $(git --version)"
echo "   • GitHub CLI: $(gh --version | head -1)"
echo ""
echo "🚀 You can now start developing your construction AI application!" 