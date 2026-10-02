---
name: aws
description: AWS architecture and engineering knowledge base (data engineering, AI engineering, data-driven applications, service-selection criteria, distributed reliability). Routed by rule://domain-router.
hide: true
kb:
  roots: ['**/cdk.json', '**/samconfig.toml', '**/serverless.yml', '**/amplify.yml']
  content:
    - { files: '**/*.{tf,hcl,py,js,jsx,ts,tsx,java,go,rs,sh,yml,yaml,json,toml,md}', pattern: '\barn:aws:|AWS::|\baws_[a-z0-9_]+\b|\b(?:boto3|botocore|aws-cdk-lib|software\.amazon\.awssdk|awssdk\.)|@aws-sdk/', flags: i }
  commands:
    - '^(?:aws|sam|cdk)\b'
  topics:
    - file: data-engineering.md
      content:
        - { files: '**/*.{tf,hcl,py,js,jsx,ts,tsx,java,go,rs,sh,yml,yaml,json,toml,md}', pattern: '\b(?:s3|glue|athena|redshift|emr|kinesis|firehose|msk|lakeformation|datazone|flink|iceberg)\b|aws-(?:s3|glue|athena|redshift|emr|kinesis|firehose|msk|lakeformation|datazone)\b', flags: i }
      commands:
        - '^aws\s+(?:s3|glue|athena|redshift|emr|kinesis|firehose|msk|lakeformation|datazone)\b'
    - file: ai-engineering.md
      content:
        - { files: '**/*.{tf,hcl,py,js,jsx,ts,tsx,java,go,rs,sh,yml,yaml,json,toml,md}', pattern: '\b(?:bedrock|sagemaker|trainium|inferentia|agentcore|mlops|foundation\s+models?)\b|aws-(?:bedrock|sagemaker)\b', flags: i }
      commands:
        - '^aws\s+(?:bedrock|bedrock-runtime|sagemaker|sagemaker-runtime)\b'
    - file: data-driven-applications.md
      content:
        - { files: '**/*.{tf,hcl,py,js,jsx,ts,tsx,java,go,rs,sh,yml,yaml,json,toml,md}', pattern: '\b(?:lambda|dynamodb|eventbridge|sqs|sns|step[\s-]?functions|api[\s-]?gateway|aurora|fargate|ecs|eks|serverless)\b|aws-(?:lambda|dynamodb|events|sqs|sns|stepfunctions|apigateway|rds|ecs|eks)\b', flags: i }
      commands:
        - '^aws\s+(?:lambda|dynamodb|events|sqs|sns|stepfunctions|apigateway|rds|ecs|eks|elasticloadbalancing)\b'
---

# AWS KB

Defaults only: explicit instructions, AGENTS.md, repo config/conventions win. Read every topic whose trigger matches. Tags → skill://aws/sources.md.

## Topics

| trigger | read |
|---|---|
| AWS analytics and data architecture: sources, ingestion, processing, storage, data governance, analytics workload selection | skill://aws/data-engineering.md |
| AWS ML and generative AI: model selection, evaluation, customization, AI risk and agent governance | skill://aws/ai-engineering.md |
| AWS data-driven applications: compute and integration choices, databases, distributed reliability and availability | skill://aws/data-driven-applications.md |

## Core

- Review workloads across operational excellence, security, reliability, performance efficiency, cost optimization, and sustainability; use Well-Architected review as a constructive design conversation, not an audit or service checklist. [WA, AC]
- Inspect repository configuration for account, environment, region, and operating-model decisions; do not infer AWS deployment defaults. [U]
- Defer Airflow authoring and deployment details to `skill://airflow`; defer Databricks and Snowflake platform specifics to their owning KBs. [U]
