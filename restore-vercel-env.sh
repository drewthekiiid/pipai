#!/bin/bash

echo "Restoring Vercel environment variables from .env file..."

# Create a temporary file to process the env vars
grep -v '^#' .env | grep -v '^$' > temp_env.txt

# Process each line
while read line; do
    if [[ $line == *"="* ]]; then
        key=$(echo $line | cut -d'=' -f1)
        value=$(echo $line | cut -d'=' -f2-)
        
        if [[ ! -z "$key" && ! -z "$value" ]]; then
            echo "Adding $key to Vercel..."
            echo $value | npx vercel env add $key production
            echo $value | npx vercel env add $key preview  
            echo $value | npx vercel env add $key development
            echo "Added $key"
        fi
    fi
done < temp_env.txt

# Clean up
rm temp_env.txt

echo "All environment variables restored!" 