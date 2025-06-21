#!/bin/bash

# Script to fix whitespace issues in .env file
# Specifically targets Redis environment variables with trailing newlines

set -e

echo "🔧 Fixing .env file whitespace issues..."

# Backup original file
cp .env .env.backup-$(date +%s)

# Read the file and fix Redis lines
python3 << 'EOF'
import re

# Read the file
with open('.env', 'r', encoding='utf-8') as f:
    content = f.read()

# Split into lines and process each
lines = content.split('\n')
fixed_lines = []

for line in lines:
    if line.startswith('UPSTASH_REDIS_REST_URL='):
        # Extract the URL and remove any trailing whitespace
        url = line.split('=', 1)[1].strip()
        fixed_lines.append(f'UPSTASH_REDIS_REST_URL={url}')
        print(f"✅ Fixed Redis URL: {url}")
    elif line.startswith('UPSTASH_REDIS_REST_TOKEN='):
        # Extract the token and remove any trailing whitespace
        token = line.split('=', 1)[1].strip()
        fixed_lines.append(f'UPSTASH_REDIS_REST_TOKEN={token}')
        print(f"✅ Fixed Redis Token: {token[:20]}...")
    else:
        fixed_lines.append(line)

# Write back to file
with open('.env', 'w', encoding='utf-8') as f:
    f.write('\n'.join(fixed_lines))

print("✅ .env file fixed!")
EOF

echo "🔍 Verifying fix..."
echo "Redis URL line:"
grep "UPSTASH_REDIS_REST_URL=" .env | cat -A
echo "Redis Token line:"
grep "UPSTASH_REDIS_REST_TOKEN=" .env | head -c 50 | cat -A
echo "..."

echo "✅ Environment file whitespace issues fixed!" 