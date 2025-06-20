#!/bin/bash

# Add all environment variables to Vercel
vercel env add AWS_ACCESS_KEY_ID production
vercel env add AWS_SECRET_ACCESS_KEY production  
vercel env add AWS_REGION production
vercel env add AWS_S3_BUCKET_NAME production
vercel env add OPENAI_API_KEY production
vercel env add OPENAI_ASSISTANT_ID production
vercel env add OPENAI_MODEL production
vercel env add TEMPORAL_ADDRESS production
vercel env add TEMPORAL_NAMESPACE production
vercel env add TEMPORAL_API_KEY production
vercel env add TEMPORAL_TASK_QUEUE production
vercel env add NEXT_PUBLIC_APP_URL production
vercel env add NEXT_PUBLIC_API_URL production
vercel env add NODE_ENV production

echo "Environment variables added! Run 'vercel --prod' to redeploy"
