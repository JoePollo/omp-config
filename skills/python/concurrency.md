# Python concurrency
Tags → skill://python/sources.md.

## Choose
- Many concurrent I/O waits → asyncio; blocking I/O libraries → threads; CPU-bound → processes, or a free-threaded build (3.13t/3.14t) after verifying every C extension supports it. [SD:asyncio-dev, SD:ft, P703, P779]
- 3.14: `InterpreterPoolExecutor` / `concurrent.interpreters` for isolated parallelism; share only via queues and shareable objects. [P734]

## asyncio
- Entry: `asyncio.run(main())` once; inside coroutines `asyncio.get_running_loop()`, never `get_event_loop()`. [SD:asyncio-eventloop]
- Await every coroutine or wrap it in a task; a bare call never runs. [META]
- Related work: `async with asyncio.TaskGroup() as tg:` (3.11); failures arrive as `ExceptionGroup` → `except*`. [SD:asyncio-task, P654]
- Standalone `create_task`: keep a strong reference; await or inspect it. [SD:asyncio-task, OAI]
- Bound every wait: `async with asyncio.timeout(s):` (3.11); per-call timeouts on network and tool calls. [SD:asyncio-task, OAI]
- Never block the loop: sync I/O or CPU work → `await asyncio.to_thread(fn, …)`. [SD:asyncio-dev]
- Cancellation: clean up in `finally`, re-raise `CancelledError`, never swallow it. [SD:asyncio-task]
- Task-local state: `ContextVar` with `reset(token)` in `finally`; not globals or `threading.local`. [P567, META]
- State mutated across `await`/retry/cancel: guard with ownership, generation, or transaction checks. [OAI]
- Close async clients (`async with`) before the loop ends. [OAI]
- Debug: `asyncio.run(main(), debug=True)` or `PYTHONASYNCIODEBUG=1` flags blocking calls and unawaited coroutines. [SD:asyncio-dev]

## Threads & processes
- Hand off work via `queue.Queue`; lock shared read-modify-write (`x += 1`, check-then-set caches), which isn't atomic even with the GIL. [G2.18, META, SD:ft]
- Multi-step invariants: explicit lock, not container internals; never share one iterator across threads. [SD:ft]
- Executors: `with ThreadPoolExecutor(max_workers=n) as pool:`; same for `ProcessPoolExecutor`. [SD:concurrent.futures]
- DB-API: check the driver's `threadsafety` before sharing connections or cursors. [P249]
- Release resources explicitly; never rely on `__del__` timing (delayed in free-threaded builds). [P703]
