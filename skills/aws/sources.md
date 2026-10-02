# AWS KB sources

Verified 2026-10-02 against AWS Well-Architected Framework and Decision Guides, accessible AWS Prescriptive Guidance article bodies, and selected Builders’ Library articles. Re-verify on AWS service or feature changes, guide revisions, and before relying on a service capability, limit, price, or model list.

| tag | source |
|---|---|
| `WA` | <https://docs.aws.amazon.com/wellarchitected/latest/framework/welcome.html> |
| `AC` | <https://aws.amazon.com/architecture/> |
| `AC:analytics` | <https://aws.amazon.com/architecture/analytics-big-data/> |
| `LENS:data-analytics` | <https://docs.aws.amazon.com/wellarchitected/latest/analytics-lens/> |
| `LENS:machine-learning` | <https://docs.aws.amazon.com/wellarchitected/latest/machine-learning-lens/> |
| `LENS:generative-ai` | <https://docs.aws.amazon.com/wellarchitected/latest/generative-ai-lens/> |
| `LENS:serverless` | <https://docs.aws.amazon.com/wellarchitected/latest/serverless-applications-lens/> |
| `DG:index` | <https://docs.aws.amazon.com/decision-guides/> |
| `DG:analytics` | <https://docs.aws.amazon.com/decision-guides/latest/decision-guides/analytics-on-aws-how-to-choose.html> |
| `DG:ml` | <https://docs.aws.amazon.com/decision-guides/latest/decision-guides/ml-guide.html> |
| `DG:genai` | <https://docs.aws.amazon.com/decision-guides/latest/decision-guides/genai-guide.html> |
| `DG:bedrock` | <https://docs.aws.amazon.com/decision-guides/latest/decision-guides/bedrock-or-sagemaker.html> |
| `DG:serverless` | <https://docs.aws.amazon.com/decision-guides/latest/decision-guides/choosing-aws-serverless-service.html> |
| `DG:app-strategy` | <https://docs.aws.amazon.com/decision-guides/latest/decision-guides/modern-apps-strategy-on-aws-how-to-choose.html> |
| `DG:integration` | <https://docs.aws.amazon.com/decision-guides/latest/decision-guides/application-integration-on-aws-how-to-choose.html> |
| `DG:database` | <https://docs.aws.amazon.com/decision-guides/latest/decision-guides/databases-on-aws-how-to-choose.html> |
| `PG:index` | <https://aws.amazon.com/prescriptive-guidance/> |
| `PG:agentic` | <https://aws.amazon.com/prescriptive-guidance/agentic-ai/> |
| `PG:agentic-foundations` | <https://docs.aws.amazon.com/prescriptive-guidance/latest/agentic-ai-foundations/new-generation.html> |
| `PG:agentic-security` | <https://docs.aws.amazon.com/prescriptive-guidance/latest/agentic-ai-security/introduction.html> |
| `PG:agentic-governance` | <https://docs.aws.amazon.com/prescriptive-guidance/latest/govern-architect-agentic-ai/introduction.html> |
| `PG:agentic-patterns` | <https://docs.aws.amazon.com/prescriptive-guidance/latest/agentic-ai-patterns/> |
| `PG:sra` | <https://aws.amazon.com/prescriptive-guidance/security-reference-architecture/> |
| `PG:sra-genai` | <https://docs.aws.amazon.com/prescriptive-guidance/latest/security-reference-architecture-generative-ai/> |
| `BL:index` | <https://builder.aws.com/learn/topics/builders-library> |
| `BL:timeouts` | <https://builder.aws.com/content/3EumjoZascWd1oZiEgL8ORlv3qE/timeouts-retries-and-backoff-with-jitter> |
| `BL:idempotency` | <https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/> |
| `BL:queues` | <https://builder.aws.com/content/3EuRcgkTP1MI0c7zM8W6HL3WIqA/avoiding-insurmountable-queue-backlogs> |
| `BL:load` | <https://builder.aws.com/content/3Eun1EEyX6p2e3VYNyRLSJzLuMV/using-load-shedding-to-avoid-overload> |
| `BL:static-stability` | <https://aws.amazon.com/builders-library/static-stability-using-availability-zones/> |
| `SECONDARY:big-data` | <https://aws.amazon.com/blogs/big-data/> |
| `SECONDARY:machine-learning` | <https://aws.amazon.com/blogs/machine-learning/> |
| `SECONDARY:architecture` | <https://aws.amazon.com/blogs/architecture/> |
| `SECONDARY:database` | <https://aws.amazon.com/blogs/database/> |
| `U` | `~/.omp/agent/AGENTS.md` and `~/.omp/agent/CONTRIBUTING.md` |

## Snapshot

- The Well-Architected Framework was published November 6, 2024. The Architecture Center describes the six pillars; the Framework characterizes review as a constructive conversation. [WA, AC]
- The analytics decision guide body says last updated September 24, 2025; the index says April 2025. The ML guide body says May 3, 2024; the index says December 2024. Other body dates observed: GenAI February 14, 2025; Bedrock or SageMaker AI July 23, 2026; serverless service selection September 4, 2026; modern application strategy May 16, 2025; application integration April 16, 2025; database selection June 2, 2026. [DG:index, DG:analytics, DG:ml, DG:genai, DG:bedrock, DG:serverless, DG:app-strategy, DG:integration, DG:database]
- Decision-guide product names, service mappings, model lists, limits, and pricing are date-sensitive; the topics retain workload and selection criteria, not service catalogs as durable rules. [DG:analytics, DG:ml, DG:genai, DG:serverless, DG:database]
- The four Well-Architected Lens landing pages exposed SPA/meta abstracts rather than detailed article bodies. The Serverless Applications Lens lists publication date July 14, 2022; treat it as stale for current application-service guidance. [LENS:data-analytics, LENS:machine-learning, LENS:generative-ai, LENS:serverless]
- Prescriptive Guidance and Builders’ Library index pages showed dynamic/loading content. Agentic AI and Security Reference Architecture collection pages were catalogued; detailed rules use only the accessible agentic security and governance introductions. The agentic patterns landing page and GenAI Security Reference Architecture page exposed meta abstracts only. [PG:index, PG:agentic, PG:agentic-security, PG:agentic-governance, PG:agentic-patterns, PG:sra, PG:sra-genai]
- The accessible agentic foundations article supplies a general definition, not detailed implementation patterns. No data-mesh-specific or detailed MLOps-planning rules are encoded because their source bodies were not verified. [PG:agentic-foundations, PG:index]
- Builders’ Library articles are author-written engineering guidance; some fetched article pages state that the author’s opinions may not reflect AWS. Treat these as engineering perspectives, not a replacement for Well-Architected or service documentation. [BL:index, BL:timeouts, BL:idempotency, BL:queues, BL:load, BL:static-stability]
- AWS Big Data, Machine Learning, Architecture, and Database blog landing pages are dated secondary feeds only; no blog is used to support a KB rule. [SECONDARY:big-data, SECONDARY:machine-learning, SECONDARY:architecture, SECONDARY:database]

## Conflicts resolved

- Use the article-body update dates for analytics and ML guides when they differ from the Decision Guides index. [DG:index, DG:analytics, DG:ml]
- Do not infer detailed Well-Architected Lens rules from SPA/meta abstracts; do not use the 2022 Serverless Lens as current service guidance. [LENS:data-analytics, LENS:machine-learning, LENS:generative-ai, LENS:serverless]
- Treat AWS service and product mappings as dated examples; the durable rules are requirements and decision criteria, and current service behavior must be checked in service documentation. [DG:analytics, DG:ml, DG:genai, DG:bedrock, DG:serverless, DG:app-strategy, DG:integration, DG:database]
- Keep AWS blog feeds secondary; do not promote landing-page content, product announcements, or case studies into KB rules. [SECONDARY:big-data, SECONDARY:machine-learning, SECONDARY:architecture, SECONDARY:database]

## Open

- Revisit the official Prescriptive Guidance bodies for modern data analytics, data mesh, and MLOps planning before adding topic-specific rules; the fetched landing pages did not expose those bodies. [PG:index]
