# AWS AI engineering

Tags → skill://aws/sources.md.

## Frame and select

- define the business problem and verify that machine learning is appropriate before selecting a model or service. [DG:ml]
- compare task-specific capabilities, hosted model platforms, custom-model services, and lower-level infrastructure by problem fit, required customization and control, team expertise, security, latency, and operational responsibility. [DG:ml, DG:genai, DG:bedrock]
- distinguish retrieving current or private evidence for a response from changing model behavior through customization; evaluate the approach against the use case and current service capabilities. [DG:genai, DG:bedrock]
- evaluate model candidates against the data modality, output quality, latency, context needs, and cost; assess model size as one factor rather than a quality verdict. [DG:genai]
- prepare and assess data for relevance, accuracy, consistency, bias, annotation quality, and preprocessing; reassess quality as the application and data evolve. [DG:genai]
- evaluate outputs for accuracy, relevance, toxicity, fairness, and robustness to adversarial inputs, using criteria appropriate to the application’s risk and audience. [DG:genai]
- include privacy, intellectual property, acceptable use, fairness, and toxicity in responsible-AI and threat reviews where relevant to the workload. [DG:ml, DG:genai]

## Agent security and governance

- threat-model hosted agents for their workload and risk posture; select controls for identified threats and use controls from more than one security-control type. [PG:agentic-security]
- phase and strengthen agent security controls over the system lifecycle according to organizational priorities and risk appetite. [PG:agentic-security]
- start with one or two focused agent use cases and add architecture incrementally; do not build an enterprise-wide reference architecture for the first pilot. [PG:agentic-governance]
- make the governance model explicit—centralized, federated, or hybrid—and define how agent, tool, and model registries, platform standards, access controls, and audit requirements will be managed. [PG:agentic-governance]
- increase permission and audit rigor as agent deployments move from internal productivity use to team, business, and customer-facing applications. [PG:agentic-governance]
