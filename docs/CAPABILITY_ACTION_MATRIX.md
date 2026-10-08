# Personal Cybersecurity Bot — Capability & Action Matrix

## 1. Capability Matrix

| Capability ID | Target | Description | Elevation Req. | Rollback Supported | Preview Behavior | Unavailable / Fallback Behavior |
|---|---|---|---|---|---|---|
| `cap:process:stop` | Suspicious Process PID | Terminates process with graceful terminate followed by force kill. | No (own-session) / Yes (system) | No (process cannot be un-killed) | Shows target PID, image path, CPU/RAM, child processes that will be killed. | Button disabled with tooltip: `"Process has already exited or elevation required."` |
| `cap:file:quarantine` | File Path | Moves file to encrypted vault, replaces with safety stub file. | No (user files) / Yes (system files) | Yes (restore to original path or custom folder) | Shows file path, size, hash, origin alert, and warning if file is in active use. | Button disabled with tooltip: `"File not found or locked by system."` |
| `cap:process:freeze` | Process PID | Suspends process execution threads via Windows NtSuspendProcess / Win32. | No (own-session) | Yes (resume process threads) | Shows active threads, open handles, and explains that the app is paused safely. | Disabled if process already suspended or terminated. |
| `cap:file:restore` | Quarantine ID | Decrypts and moves file back to designated location. | No | Yes (can be re-quarantined) | Shows original file name, scan summary, and asks confirmation for target path. | Disabled if file payload has been permanently purged. |
| `cap:network:isolate` (Panic) | Local Adapter / WFP | Restricts non-loopback network traffic while leaving `127.0.0.1` security IPC alive. | Yes | Yes (1-click immediate un-isolate) | Shows active network connections that will drop and warns about internet loss. | If Windows Filtering Platform unavailable, displays honest `"Feature Mocked/Unavailable on this host"` state. |

---

## 2. Operation State Machine

```
              [requested]
                   |
                   v
              [previewed]
                   |
                   v
        [awaiting_confirmation]
            /             \
 (cancel)  /               \ (authorize)
          v                 v
     [cancelled]       [authorized]
                            |
                            v
                       [executing]
                     /      |     \
                    /       |      \
                   v        v       v
             [succeeded] [failed] [timed_out]
                   \        |       /
                    v       v      v
                    [reconcile / audit]
```

### 2.1 State Transition Invariants
1. **Pre-execution Revalidation**: Right before entering `executing`, the service re-verifies that the target still exists and has not mutated (e.g., verifying PID image checksum matches original alert).
2. **Strict Expiry**: An operation in `awaiting_confirmation` older than `expires_at_utc` automatically transitions to `timed_out`.
3. **Idempotency Guarantee**: If a request with an existing `idempotency_key` is received:
   - If currently `executing` or `awaiting_confirmation`, returns existing `operation_id` with current status.
   - If in a terminal state (`succeeded`, `failed`, `cancelled`), returns cached terminal response. Never executes twice.
4. **Audit Trail**: Every state transition emits an immutable `EventEnvelope` with correlation ID tied to the user action.
