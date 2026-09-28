---
alwaysApply: true
---

Domain KBs load deterministically. At startup in a git repo the domain-router extension generates `<repo>/.omp/project-index.yaml` (listed in the repo's .gitignore) from every KB skill's `kb` frontmatter rules: synopsis, detected domains, and an area map. The first prompt receives the index summary and the KB catalog; each area's KB indexes and topic files load when a call first touches that area; matching commands and MCP tools load their KBs; code edits in a git working tree load the commit-bound KBs. An edit or write that would land before its KBs is blocked once, then re-issued. Delivery resets after compaction. The index file is generated: change KB routing in the skills' `kb` rules, never in the index. Read any other topic file an index selects yourself, and read a catalog KB yourself when work it covers starts before any call touches its files. Precedence: repo config > AGENTS.md > KB.
