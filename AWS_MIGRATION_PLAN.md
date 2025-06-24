# AWS Migration Plan for PIP AI

## Phase 1: Switch to LLMWhisperer (Immediate - 1 week)

### Why LLMWhisperer Over Unstructured Hosted API

**Cost Savings**: $500/month → $15-30/month (94% reduction)
**Better for LLMs**: Designed specifically for GPT-4 workflows  
**Superior Layout**: Handles vertical text and complex construction documents
**Free Testing**: 100 pages/day forever to validate

### Step 1: Test LLMWhisperer with Your Documents

```bash
# Install the client
pip install llmwhisperer-client

# Test with your WEN document
python test_llmwhisperer.py WEN_GNG40_Fall2024_PDF_V1_2.pdf
```

### Step 2: Update Worker Code

```typescript
// packages/worker/src/unstructured-client.ts
import { LLMWhispererClientV2 } from "llmwhisperer-client";

const client = new LLMWhispererClientV2({
  baseUrl: "https://llmwhisperer-api.us-central.unstract.com/api/v2",
  apiKey: process.env.LLMWHISPERER_API_KEY,
});

export async function processDocument(filePath: string) {
  const result = await client.whisper({
    filePath,
    waitForCompletion: true,
    waitTimeout: 200,
  });
  return result.extraction.resultText;
}
```

### Benefits:

- ✅ Eliminate $500/month Unstructured costs
- ✅ Better layout preservation for construction documents
- ✅ Built for LLM workflows (your exact use case)
- ✅ Free tier: 100 pages/day for testing
- ✅ No infrastructure management

## Phase 2: AWS ECS Migration (Optional - 2-3 weeks)

### If You Want Even Lower Costs: Self-Host Options

**Option A: Open Source Unstructured on AWS ECS**

- Cost: ~$30-80/month (just infrastructure)
- Deploy the 8GB Docker image on ECS Fargate
- You manage scaling and updates

**Option B: IBM Docling (Open Source)**

- Cost: ~$20-50/month (infrastructure only)
- 30k+ GitHub stars, excellent performance
- Lightweight compared to Unstructured

### ECS Deployment Example

```bash
# Create ECS cluster for self-hosted option
aws ecs create-cluster --cluster-name pip-ai-document-processing

# Deploy Unstructured or Docling container
aws ecs create-service --cluster pip-ai-document-processing \
  --service-name document-processor \
  --task-definition unstructured:1 \
  --desired-count 1
```

## Phase 3: Keep Fly.io for Simple Services (Ongoing)

### What Stays on Fly.io

- ✅ Temporal workers (working well)
- ✅ Simple microservices
- ✅ Services under 1GB image size

### What Moves to AWS/LLMWhisperer

- 🔄 Document processing (LLMWhisperer hosted API)
- 🔄 Large ML workloads (if needed later)
- 🔄 Services requiring GPU (future expansion)

## Implementation Timeline

**Week 1**: Test LLMWhisperer with your documents
**Week 2**: Update worker code and deploy  
**Week 3**: Monitor performance and costs
**Week 4**: Optimize and scale

## Expected Results

**Cost Reduction**: $500/month → $15-30/month  
**Better Accuracy**: Layout preservation for construction docs
**Faster Processing**: Optimized for LLM workflows
**No Infrastructure**: Fully managed service

## Fallback Options

If LLMWhisperer doesn't meet needs:

1. **AWS Textract**: $50-200/month, good AWS integration
2. **Self-hosted Docling**: $20-50/month, open source
3. **Self-hosted Unstructured**: $30-80/month, same tech stack

## Next Steps

1. **Sign up for LLMWhisperer free tier**
2. **Test with your WEN document**
3. **Compare results with current Unstructured output**
4. **Update worker code if results are good**
5. **Deploy and monitor**

This plan gives you 94% cost savings while potentially improving document processing quality for your construction document use case.
