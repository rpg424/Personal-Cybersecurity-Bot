# Personal Cybersecurity Bot — Service Lifecycle Design

## 1. Lifecycle States

```
[Uninstalled] ---> [Installed] ---> [Starting] ---> [Healthy / Active] <---> [Degraded]
                         ^              |                     |                     |
                         |              v                     v                     v
                    [Rollback] <--- [Updating]            [Stopping]            [Crashed]
                         ^                                    |                     |
                         |                                    v                     v
                         +----------------------------- [Stopped] <--------- [Safe Mode]
```

### 1.1 Install Phase
- Registered as a Windows Service named `PersonalCybersecurityBotService` or run in user-mode supervisor via Tauri depending on installation type.
- Generates a local instance GUID (`bot_instance_id`) and creates the local SQLite schema version 1.
- Derives DPAPI-protected database encryption key.
- Establishes permissions baseline and coexistence registry keys alongside Windows Defender.

### 1.2 Start Phase
- Verifies binary signature against embedded vendor root certificate.
- Validates SQLite integrity (`PRAGMA integrity_check`).
- Generates ephemeral IPC session token written to `%LOCALAPPDATA%\PersonalCybersecurityBot\run\ipc.token` with ACL restricted to current user SID.
- Spawns background telemetry watchers in passive discovery mode.
- Publishes initial health check and status (`yellow` until all detectors report initialized, then `green` if healthy).

### 1.3 Stop & Restart Phase
- Clean shutdown signal: Flushes pending encrypted queue to disk within 3,000 ms.
- Closes loopback IPC listeners.
- Releases native ETW handles.
- Restarts gracefully within 2,500 ms without losing queued audit events.

### 1.4 Crash Recovery & Safe Mode
- Supervised by Tauri Rust parent process or Windows Service Control Manager (SCM).
- If the service crashes $\ge 3$ times within 5 minutes:
  - Enters **Safe Mode**.
  - Telemetry adapters disable aggressive heuristics and fall back to passive logging only.
  - Generates a critical alert: `"Service entered Safe Mode due to repeated restarts"`.
  - Provides the user with a 1-click diagnostic review and safe restore options.

### 1.5 Update & Cryptographic Rollback
- Update payload downloaded to isolated temp directory.
- Cryptographic ed25519 signature verified before execution.
- Staged migration test executed on a clone of the SQLite database.
- If migration or smoke health check fails within 30 seconds of launch:
  - Automated atomic rollback restores previous executable binary and database snapshot.
  - Generates audit event: `UPDATE_FAILED_ROLLBACK_SUCCEEDED`.

### 1.6 Uninstall Phase
- Clean uninstaller prompts the user:
  1. Complete purge: Deletes all logs, encrypted vault, quarantined files (with explicit warning), and configuration.
  2. Retention export: Exports audit summary to user's Documents folder before wiping.
- Removes Windows registry keys, named pipes, and scheduled tasks.
