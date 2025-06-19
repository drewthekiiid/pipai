import * as aws from "@pulumi/aws";
// import * as vercel from "@pulumiverse/vercel";
import * as random from "@pulumi/random";

// =============================================================================
// PIP AI Infrastructure - Complete Stack
// =============================================================================

// Random suffix for unique resource names
const suffix = new random.RandomString("resource-suffix", {
    length: 8,
    special: false,
    upper: false,
});

// =============================================================================
// AWS Resources
// =============================================================================

// S3 Bucket for file storage (with Vercel Blob overflow)
const s3Bucket = new aws.s3.Bucket("pip-ai-storage", {
    bucket: suffix.result.apply(s => `pip-ai-storage-${s}`),
    corsRules: [{
        allowedHeaders: ["*"],
        allowedMethods: ["GET", "PUT", "POST", "DELETE", "HEAD"],
        allowedOrigins: ["*"],
        maxAgeSeconds: 3600,
    }],
});

// S3 bucket public access block for security
const s3BucketPAB = new aws.s3.BucketPublicAccessBlock("pip-ai-storage-pab", {
    bucket: s3Bucket.id,
    blockPublicAcls: false,
    blockPublicPolicy: false,
    ignorePublicAcls: false,
    restrictPublicBuckets: false,
});

// IAM User for S3 access
const s3User = new aws.iam.User("pip-ai-s3-user", {
    name: suffix.result.apply(s => `pip-ai-s3-user-${s}`),
});

// IAM Policy for S3 access
const s3Policy = new aws.iam.Policy("pip-ai-s3-policy", {
    name: suffix.result.apply(s => `pip-ai-s3-policy-${s}`),
    policy: s3Bucket.arn.apply(arn => JSON.stringify({
        Version: "2012-10-17",
        Statement: [
            {
                Effect: "Allow",
                Action: [
                    "s3:GetObject",
                    "s3:PutObject",
                    "s3:DeleteObject",
                    "s3:ListBucket"
                ],
                Resource: [
                    arn,
                    `${arn}/*`
                ]
            },
            {
                Effect: "Allow",
                Action: [
                    "s3:ListAllMyBuckets"
                ],
                Resource: "*"
            }
        ]
    })),
});

// Attach policy to user
const s3UserPolicyAttachment = new aws.iam.UserPolicyAttachment("pip-ai-s3-attachment", {
    user: s3User.name,
    policyArn: s3Policy.arn,
});

// Create access key for S3 user
const s3AccessKey = new aws.iam.AccessKey("pip-ai-s3-key", {
    user: s3User.name,
});
//     }],
//     tags: {
//         Project: "PIP-AI",
//         Environment: "dev",
//     },
// });

// IAM User for S3 access
// const s3User = new aws.iam.User("pip-ai-s3-user", {
//     name: suffix.result.apply(s => `pip-ai-s3-user-${s}`),
//     tags: {
//         Project: "PIP-AI",
//         Purpose: "S3-Access",
//     },
// });

// IAM Policy for S3 access
// const s3Policy = new aws.iam.Policy("pip-ai-s3-policy", {
//     name: suffix.result.apply(s => `pip-ai-s3-policy-${s}`),
//     description: "Policy for PIP AI S3 access",
//     policy: s3Bucket.arn.apply(bucketArn => JSON.stringify({
//         Version: "2012-10-17",
//         Statement: [
//             {
//                 Effect: "Allow",
//                 Action: [
//                     "s3:GetObject",
//                     "s3:PutObject",
//                     "s3:DeleteObject",
//                     "s3:ListBucket"
//                 ],
//                 Resource: [
//                     bucketArn,
//                     `${bucketArn}/*`
//                 ]
//             }
//         ]
//     })),
// });

// Attach policy to user
// const s3PolicyAttachment = new aws.iam.UserPolicyAttachment("pip-ai-s3-policy-attachment", {
//     user: s3User.name,
//     policyArn: s3Policy.arn,
// });

// Access keys for S3 user
// const s3AccessKey = new aws.iam.AccessKey("pip-ai-s3-access-key", {
//     user: s3User.name,
// });

// =============================================================================
// Vercel Project (COMMENTED OUT - PROVIDER ISSUE)
// =============================================================================

// TODO: Fix Vercel provider issue and uncomment
// const vercelProject = new vercel.Project("pip-ai-vercel", {
//     name: "pip-ai",
//     framework: "nextjs",
//     gitRepository: {
//         type: "github",
//         repo: "thekiiid/pipai", // Update with your actual GitHub repo
//     },
// });

// =============================================================================
// Upstash Resources - TODO: Enable after setting up Upstash credentials
// =============================================================================

// TODO: Uncomment after setting up UPSTASH_EMAIL and UPSTASH_API_KEY secrets
// // Redis database for caching
// const upstashRedis = new upstash.RedisDatabase("pip-ai-redis", {
//     databaseName: "pip-ai-cache",
//     region: "global",
//     primaryRegion: "us-east-1",
//     tls: true,
//     multizone: true, // Enable high availability
// });

// TODO: Add Kafka cluster later - commenting out for now due to API issues
// // Kafka cluster for event streaming
// const upstashKafka = new upstash.KafkaCluster("pip-ai-kafka", {
//     clusterName: "pip-ai-events",
//     region: "us-east-1",
// });

// // Kafka topic for AI processing events
// const kafkaTopic = new upstash.KafkaTopic("pip-ai-processing-topic", {
//     clusterId: upstashKafka.clusterId,
//     topicName: "ai-processing-events",
//     partitions: 3,
//     retentionTime: 604800000, // 7 days in ms
//     retentionSize: 1073741824, // 1GB
//     cleanupPolicy: "delete",
//     maxMessageSize: 1048576, // 1MB
// });

// =============================================================================
// Internal Secrets
// =============================================================================

const internalSecret = new random.RandomPassword("internal-secret", {
    length: 32,
    special: true,
});

// =============================================================================
// Outputs for Environment Variables
// =============================================================================

export const outputs = {
    // AWS S3
    awsAccessKeyId: s3AccessKey.id,
    awsSecretAccessKey: s3AccessKey.secret,
    awsS3BucketName: s3Bucket.bucket,
    awsRegion: "us-east-1",
    
    // Vercel (commented out due to provider issue)
    // vercelProjectId: vercelProject.id,
    // vercelProjectName: vercelProject.name,
    
    // Upstash Redis - TODO: Enable after setting up Upstash credentials
    // upstashRedisUrl: upstashRedis.endpoint,
    // upstashRedisToken: upstashRedis.restToken,
    
    // Upstash Kafka (commented out for now)
    // upstashKafkaEndpoint: upstashKafka.restEndpoint,
    // upstashKafkaUsername: upstashKafka.username,
    // upstashKafkaPassword: upstashKafka.password,
    
    // Internal
    internalSecret: internalSecret.result,
    
    // Resource suffix for debugging
    resourceSuffix: suffix.result,
};

// =============================================================================
// Environment Variable Template
// =============================================================================

export const envTemplate = {
    description: "Add these to your .env file:",
    variables: {
        // AWS
        AWS_ACCESS_KEY_ID: outputs.awsAccessKeyId,
        AWS_SECRET_ACCESS_KEY: outputs.awsSecretAccessKey,
        AWS_S3_BUCKET_NAME: outputs.awsS3BucketName,
        AWS_REGION: outputs.awsRegion,
        
        // Vercel (commented out due to provider issue)
        // VERCEL_PROJECT_ID: outputs.vercelProjectId,
        
        // Upstash
        UPSTASH_REDIS_REST_URL: outputs.upstashRedisUrl,
        UPSTASH_REDIS_REST_TOKEN: outputs.upstashRedisToken,
        // UPSTASH_KAFKA_REST_URL: outputs.upstashKafkaEndpoint,
        // UPSTASH_KAFKA_REST_USERNAME: outputs.upstashKafkaUsername,
        // UPSTASH_KAFKA_REST_PASSWORD: outputs.upstashKafkaPassword,
        
        // Internal
        INTERNAL_SECRET: outputs.internalSecret,
    }
};
