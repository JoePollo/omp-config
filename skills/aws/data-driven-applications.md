# AWS data-driven applications

Tags → skill://aws/sources.md.

## Application and data choices

- choose compute workload by workload within the organization’s operating strategy; combine serverless and Kubernetes approaches when the workload portfolio and team model call for both. [DG:app-strategy]
- weigh operational ownership, team expertise, autonomy, standardization, portability, and workload lifecycle needs; do not assume one compute model fits every application. [DG:app-strategy, DG:serverless]
- choose integration semantics before a product: distinguish request-response, queue buffering, pub/sub fan-out, event routing, streaming, and multi-step workflow needs. [DG:integration, DG:serverless]
- make ordering, retention, message size, push or pull, replay, recovery, and multi-Region requirements explicit; verify delivery guarantees and limits in current service documentation. [DG:integration]
- combine integration services when buffering, routing, fan-out, analytics, or workflow orchestration are distinct requirements; assess the added operational and integration burden. [DG:integration]
- choose databases from data model and access patterns, including transaction, query, latency, throughput, resiliency, security, and capacity variability requirements. [DG:database]
- keep OLTP and analytical requirements distinct; use the database guide’s OLTP comparisons only within that scope. [DG:database]

## Distributed reliability

- set timeouts for remote calls, including cross-process calls; choose them from downstream latency and acceptable false-timeout risk, and verify which connection and request work the timeout covers. [BL:timeouts]
- retry only failures that may be transient; bound retries, use backoff and jitter, and avoid independent retry loops at multiple layers that amplify load. [BL:timeouts]
- do not retry side-effecting operations unless the API contract makes retries safe; for APIs you own, bind a stable caller-supplied idempotency key to the request intent and make recording the key and its effects atomic. [BL:idempotency]
- monitor asynchronous work for backlog and message age; plan capacity and recovery, and do not rely on dead-letter-queue volume as the only early-warning signal. [BL:queues]
- protect queue consumers and upstream producers from overload with workload-appropriate limits, prioritization, or backpressure; bound stale work where the application semantics permit it. [BL:queues]
- shed excess work when needed to preserve useful successful throughput; load-test beyond expected capacity and measure client-visible latency, goodput, and rejected work. [BL:load]
- separate control-plane changes from data-plane continuity where availability requires it; keep serving capacity or warm standby ready before an impairment rather than relying on just-in-time provisioning. [BL:static-stability]
