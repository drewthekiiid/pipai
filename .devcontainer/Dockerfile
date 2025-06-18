# Use the latest official Node.js LTS image (Node 22.x LTS "Jod") as base
FROM node:22-bullseye

# Set environment variables
ENV DEBIAN_FRONTEND=noninteractive
ENV NODE_ENV=development
ENV PYTHONUNBUFFERED=1
ENV PNPM_VERSION=10.12.1
ENV PYTHON_VERSION=3.12.11

# Install system dependencies and latest tools
RUN apt-get update && apt-get install -y \
    # Essential build tools
    build-essential \
    curl \
    wget \
    git \
    vim \
    nano \
    # Latest Python 3.12
    python3.12 \
    python3.12-dev \
    python3.12-venv \
    python3-pip \
    # Database clients
    postgresql-client \
    redis-tools \
    # System utilities
    jq \
    zip \
    unzip \
    ca-certificates \
    gnupg \
    lsb-release \
    # PDF processing dependencies
    poppler-utils \
    # Image processing
    imagemagick \
    libmagickwand-dev \
    # Network tools
    iputils-ping \
    telnet \
    netcat \
    # Process management
    htop \
    && rm -rf /var/lib/apt/lists/*

# Create symbolic links for python3.12
RUN ln -sf /usr/bin/python3.12 /usr/local/bin/python && \
    ln -sf /usr/bin/python3.12 /usr/local/bin/python3

# Install latest pip and Python tools
RUN python -m pip install --upgrade pip setuptools wheel

# Install latest pnpm globally (faster than npm)
RUN npm install -g pnpm@${PNPM_VERSION}

# Install latest global Node.js tools
RUN pnpm add -g \
    typescript@latest \
    @types/node@latest \
    tsx@latest \
    turbo@latest \
    eslint@latest \
    prettier@latest \
    @next/codemod@latest

# Install latest Python development tools
RUN pip install --no-cache-dir \
    # Latest FastAPI stack
    fastapi[all]==0.108.0 \
    uvicorn[standard]==0.25.0 \
    # Latest AI/ML tools
    openai==1.54.4 \
    langchain==0.1.0 \
    # Latest PDF processing
    pypdf2==3.0.1 \
    pdf2image==1.17.0 \
    # Latest data tools
    pandas==2.1.4 \
    numpy==1.26.2 \
    # Latest web scraping
    requests==2.31.0 \
    httpx==0.26.0 \
    # Latest database tools
    psycopg2-binary==2.9.9 \
    redis==5.0.1 \
    # Latest development tools
    black==23.12.1 \
    flake8==7.0.0 \
    isort==5.13.2 \
    pytest==7.4.4 \
    pytest-asyncio==0.23.2 \
    # Latest Temporal SDK
    temporalio==1.5.1

# Install latest Docker CLI (for Docker-in-Docker)
RUN curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/debian $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null && \
    apt-get update && \
    apt-get install -y docker-ce-cli docker-compose-plugin && \
    rm -rf /var/lib/apt/lists/*

# Install latest GitHub CLI
RUN curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg && \
    chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg && \
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | tee /etc/apt/sources.list.d/github-cli.list > /dev/null && \
    apt-get update && \
    apt-get install -y gh && \
    rm -rf /var/lib/apt/lists/*

# Install latest AWS CLI v2
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" && \
    unzip awscliv2.zip && \
    ./aws/install && \
    rm -rf awscliv2.zip aws/

# Install latest Pulumi
RUN curl -fsSL https://get.pulumi.com | sh && \
    mv /root/.pulumi/bin/* /usr/local/bin/

# Install latest Temporal CLI
RUN curl -sSf https://temporal.download/cli.sh | sh && \
    mv tctl /usr/local/bin/

# Create non-root user with same UID as host (for file permissions)
ARG USERNAME=node
ARG USER_UID=1000
ARG USER_GID=$USER_UID

RUN groupmod --gid $USER_GID $USERNAME && \
    usermod --uid $USER_UID --gid $USER_GID $USERNAME && \
    mkdir -p /home/$USERNAME/.vscode-server /home/$USERNAME/.vscode-server-insiders && \
    chown -R $USER_UID:$USER_GID /home/$USERNAME

# Set up sudo access for the user
RUN apt-get update && apt-get install -y sudo && \
    echo $USERNAME ALL=\(root\) NOPASSWD:ALL > /etc/sudoers.d/$USERNAME && \
    chmod 0440 /etc/sudoers.d/$USERNAME && \
    rm -rf /var/lib/apt/lists/*

# Switch to non-root user
USER $USERNAME

# Set working directory
WORKDIR /workspace

# Configure git for the container
RUN git config --global init.defaultBranch main && \
    git config --global pull.rebase false && \
    git config --global user.email "dev@pipai.local" && \
    git config --global user.name "PIP AI Developer"

# Set shell to bash
SHELL ["/bin/bash", "-c"]

# Default command
CMD ["bash"] 