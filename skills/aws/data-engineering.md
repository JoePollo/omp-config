# AWS data engineering

Tags → skill://aws/sources.md.

## Workload and data

- start with source systems, data types, update frequency, and quality risks before choosing ingestion, storage, or processing approaches. [DG:analytics]
- derive processing cadence from required freshness; distinguish batch, near-real-time, and streaming needs, then account for volume, throughput, latency, processing complexity, and concurrency. [DG:analytics]
- define cleansing, transformation, validation, and handling of failed quality checks as part of the pipeline design. [DG:analytics]
- choose analytical capabilities from the business outcome; assess data availability and quality, computational needs, and decision risk for descriptive, diagnostic, predictive, or prescriptive analysis. [DG:analytics]

## Storage, integration, and operations

- fit storage to current and forecast volume, retention, access patterns, locality, security, integration needs, and lifecycle cost. [DG:analytics]
- design data movement, transformation, replication or synchronization, validation, failure handling, scalability, and resilience together; choose batch or streaming from the required data freshness. [DG:analytics]
- plan how lakes, warehouses, operational databases, applications, and federated sources fit together; evaluate interoperability and open formats where they meet workload needs. [DG:analytics]
- apply governance and security across the data lifecycle: classify data, control access, audit use, meet retention and compliance requirements, protect data in transit and at rest, and assess masking, anonymization, sharing, and disaster recovery needs. [DG:analytics]
- compare managed and self-managed approaches by the desired infrastructure control and the operational burden the team can own; do not assume a managed or serverless option fits every workload. [DG:analytics]
- evaluate growth, geographic needs, service-level requirements, scaling, and cost-performance together; size resources and storage policies against workload needs. [DG:analytics]
