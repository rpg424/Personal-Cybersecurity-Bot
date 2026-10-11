# Technical Plan: Milestone 1 Part B — Dual-Mode Email OTP Verification Engine

## 1. Executive Summary
This document provides the exhaustive architectural specification and implementation design for **Milestone 1 Part B: Dual-Mode Email OTP Verification Engine** within `server.ts` for Shield Labs Bot.

The engine delivers:
1. **Cryptographically Secure OTP Generation**: Uniform 6-digit one-time passcodes generated via `crypto.randomInt(100000, 1000000)`.
2. **In-Memory Expiring OTP Ledger**: A hardened, self-cleaning ledger tracking email, code, 10-minute expiry, failed attempt counters, resend cooldown timestamps, and verification status.
3. **Timing-Safe Constant-Time Comparison**: SHA-256 digest hashing coupled with `crypto.timingSafeEqual` to eliminate timing side-channel attacks and prevent Node.js buffer length `RangeError` crashes.
4. **Dual-Mode Delivery Engine**:
   - **Mode A (Live SMTP Dispatch)**: Dispatches via SMTP when `SMTP_HOST` credentials are configured in `.env`. Built using Node.js standard library socket/TLS transport (0 new dependencies required).
   - **Mode B (Console Logging & In-App Toast Preview)**: Formats and logs codes to server stdout and returns `previewOtp` in the API payload for automated testing and local developer workflows.
5. **Hardened API Endpoints**:
   - `POST /api/v1/auth/otp/send`
   - `POST /api/v1/auth/otp/resend`
   - `POST /api/v1/auth/otp/verify`
6. **Authentication Gating & User Model Sync**: On successful verification, the engine marks the user record in `data/users.json` with `isVerified: true` and unblocks console access.

---

## 2. Existing Baseline & Gap Analysis in `server.ts`

### 2.1 Current Implementation State
In `server.ts` (lines 354-360 and lines 755-805), a preliminary OTP flow currently exists:
- **Ledger**:
  ```typescript
  interface PendingOtp {
    email: string;
    otp: string;
    expiresAtUtc: number;
  }
  const pendingOtps = new Map<string, PendingOtp>();
  ```
- **Code Generation**:
  `const otp = Math.floor(100000 + crypto.randomInt(900000)).toString();`
- **Verification Comparison**:
  `if (entry.otp !== otp.toString().trim()) { ... }` (Standard string comparison).
- **Endpoints**: Only `/api/v1/auth/otp/send` and `/api/v1/auth/otp/verify` exist; `/api/v1/auth/otp/resend` is missing.

### 2.2 Critical Gaps to Address
| Feature | Current State | Required State | Impact |
|---|---|---|---|
| Code Generation | `Math.floor(100000 + crypto.randomInt(900000))` | `crypto.randomInt(100000, 1000000).toString()` | Cleaner, strictly uniform, no floating-point rounding |
| Resend Endpoint | Missing | `POST /api/v1/auth/otp/resend` | Enables user to request new code from modal without resetting form |
| Brute Force Defense | No attempt counter | Invalidate after 5 failed attempts (`MAX_OTP_ATTEMPTS`) | Prevents enumeration of 6-digit space (10^6 combinations) |
| Rate-Limit Cooldown | None | 30-second cooldown between sends/resends | Prevents SMTP flooding and mailbox harassment |
| Timing Attack Defense | Vulnerable `!==` string comparison | `crypto.timingSafeEqual(hashA, hashB)` | Eliminates side-channel timing leaks |
| SMTP Dispatch | Only `console.log` | Configurable SMTP dispatch via `.env` with fallback | Production email capability |
| Contract Conformity | Returns `devOtp` | Returns both `previewOtp` and `devOtp`, plus `ok: true` | Fully complies with `PROJECT.md` & `ORIGINAL_REQUEST.md` |
| Persistent Sync | Does not update `user.isVerified` on `/verify` | Updates `user.isVerified = true` in `registeredUsers` & disk | Enforces authentication gating across restarts |

---

## 3. Secure 6-Digit Code Generation
In accordance with Node.js documentation:
`crypto.randomInt([min, ]max[, callback])` generates a cryptographically strong pseudorandom integer between `min` (inclusive) and `max` (exclusive).

### Implementation:
```typescript
/**
 * Generates a uniform, cryptographically secure 6-digit OTP code in the range [100000, 999999].
 * Guaranteed 6 characters, zero risk of leading zero truncation.
 */
function generateSecureOtp(): string {
  return crypto.randomInt(100000, 1000000).toString();
}
```

---

## 4. In-Memory Expiring OTP Ledger Specification

### 4.1 Interface Contract
```typescript
interface PendingOtpRecord {
  email: string;              // Lowercased, canonical email address (lookup key)
  otp: string;                // Secure 6-digit numeric string
  expiresAtUtc: number;       // Epoch milliseconds when this OTP expires (10 minutes)
  attempts: number;           // Failed verification attempt count (max 5)
  lastSentAtUtc: number;      // Epoch milliseconds when last sent (for 30s cooldown)
  sendCount: number;          // Total send count in current window (max 5)
  verified: boolean;          // Set to true upon successful verification
  verifiedAtUtc?: number;     // Timestamp of verification
}
```

### 4.2 Configuration Constants
```typescript
const OTP_EXPIRY_MS = 10 * 60 * 1000;           // 10 minutes lifetime
const OTP_MAX_ATTEMPTS = 5;                     // 5 failed attempts invalidates OTP
const OTP_RESEND_COOLDOWN_MS = 30 * 1000;       // 30 seconds anti-flood cooldown
const OTP_MAX_SENDS_PER_WINDOW = 5;             // Max 5 OTP requests per window
```

### 4.3 Memory Management & Periodic Garbage Collection
To prevent memory leaks from abandoned signups without requiring an external database:
```typescript
// Background garbage collector to prune expired OTPs every 5 minutes
const otpPruner = setInterval(() => {
  const now = Date.now();
  for (const [email, entry] of pendingOtps.entries()) {
    if (now > entry.expiresAtUtc) {
      pendingOtps.delete(email);
    }
  }
}, 5 * 60 * 1000);

// Prevent unclosed timer from blocking process exit in tests
if (otpPruner.unref) {
  otpPruner.unref();
}
```

---

## 5. Constant-Time Timing-Safe Comparison Engine
Direct string comparison (`a === b`) leaks character-by-character timing differences via early-exit branches.
`crypto.timingSafeEqual(bufA, bufB)` guarantees constant-time execution, but throws `RangeError: Input buffers must have the same length` if lengths differ.

### Safe Implementation Strategy:
Pre-hash both the candidate input and expected OTP using SHA-256 before invoking `timingSafeEqual`:
1. Both outputs are guaranteed to be exactly 32 bytes (`crypto.createHash('sha256')`).
2. Zero possibility of `RangeError`.
3. Total constant-time comparison regardless of input format or length.

```typescript
function timingSafeOtpMatch(candidate: string, expected: string): boolean {
  if (typeof candidate !== 'string' || typeof expected !== 'string') {
    return false;
  }
  const hashCandidate = crypto.createHash('sha256').update(candidate.trim()).digest();
  const hashExpected = crypto.createHash('sha256').update(expected.trim()).digest();
  return crypto.timingSafeEqual(hashCandidate, hashExpected);
}
```

---

## 6. Dual-Mode Delivery Engine Architecture

### 6.1 Mode Detection Logic
```typescript
function getSmtpConfig() {
  const host = process.env.SMTP_HOST?.trim();
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const from = process.env.SMTP_FROM?.trim() || 'Shield Labs Bot <no-reply@shieldlabs.local>';

  const isConfigured = Boolean(host && (user || port === 25));
  return { host, port, secure, user, pass, from, isConfigured };
}
```

### 6.2 Zero-Dependency Standard Library SMTP Dispatcher
Following the "lazy senior developer" rule (rely on standard library, avoid new npm dependencies):
Node.js standard library `tls` and `net` can transmit standard SMTP messages with automatic fallback.

```typescript
/**
 * Lightweight standard library SMTP mail dispatcher.
 * Supports port 465 (SMTPS) or port 25/587 direct transport.
 * Falls back gracefully to console preview on network or authentication failure.
 */
async function dispatchSmtpEmail(to: string, subject: string, bodyText: string): Promise<boolean> {
  const cfg = getSmtpConfig();
  if (!cfg.isConfigured || !cfg.host) {
    return false; // Mode B (Console Preview Mode)
  }

  return new Promise((resolve) => {
    let resolved = false;
    const finish = (success: boolean) => {
      if (!resolved) {
        resolved = true;
        resolve(success);
      }
    };

    const timeout = setTimeout(() => {
      console.warn(`[Shield Labs Bot] ⚠️ SMTP connection to ${cfg.host}:${cfg.port} timed out.`);
      finish(false);
    }, 5000);

    try {
      const socket = cfg.secure
        ? tls.connect({ host: cfg.host, port: cfg.port, rejectUnauthorized: false })
        : net.createConnection({ host: cfg.host, port: cfg.port });

      socket.setEncoding('utf8');

      let step = 0;
      socket.on('data', (data: string) => {
        const code = parseInt(data.substring(0, 3), 10);
        if (code >= 400) {
          console.warn(`[Shield Labs Bot] ⚠️ SMTP server returned error: ${data.trim()}`);
          socket.end();
          clearTimeout(timeout);
          return finish(false);
        }

        switch (step) {
          case 0: // Connected, send EHLO
            socket.write(`EHLO localhost\r\n`);
            step++;
            break;
          case 1: // EHLO answered, send AUTH LOGIN if credentials exist
            if (cfg.user && cfg.pass) {
              socket.write(`AUTH LOGIN\r\n`);
              step = 2;
            } else {
              socket.write(`MAIL FROM:<${cfg.from.replace(/.*<(.+?)>.*/, '$1')}>\r\n`);
              step = 4;
            }
            break;
          case 2: // Send username
            socket.write(`${Buffer.from(cfg.user).toString('base64')}\r\n`);
            step = 3;
            break;
          case 3: // Send password
            socket.write(`${Buffer.from(cfg.pass).toString('base64')}\r\n`);
            step = 4;
            break;
          case 4: // Send MAIL FROM
            socket.write(`MAIL FROM:<${cfg.from.replace(/.*<(.+?)>.*/, '$1')}>\r\n`);
            step = 5;
            break;
          case 5: // Send RCPT TO
            socket.write(`RCPT TO:<${to}>\r\n`);
            step = 6;
            break;
          case 6: // Send DATA
            socket.write(`DATA\r\n`);
            step = 7;
            break;
          case 7: // Send email headers & body
            const emailContent = [
              `From: ${cfg.from}`,
              `To: ${to}`,
              `Subject: ${subject}`,
              `Content-Type: text/plain; charset=utf-8`,
              ``,
              bodyText,
              `\r\n.\r\n`,
            ].join('\r\n');
            socket.write(emailContent);
            step = 8;
            break;
          case 8: // Finished, QUIT
            socket.write(`QUIT\r\n`);
            socket.end();
            clearTimeout(timeout);
            finish(true);
            break;
        }
      });

      socket.on('error', (err) => {
        console.warn(`[Shield Labs Bot] ⚠️ SMTP socket error: ${err.message}`);
        clearTimeout(timeout);
        finish(false);
      });
    } catch (err: any) {
      console.warn(`[Shield Labs Bot] ⚠️ SMTP dispatch exception: ${err.message}`);
      clearTimeout(timeout);
      finish(false);
    }
  });
}
```

### 6.3 Dual-Mode Orchestration Helper
```typescript
async function deliverOtpCode(email: string, otp: string, purpose: string = 'Verification'): Promise<{ mode: 'SMTP_LIVE' | 'CONSOLE_PREVIEW'; sent: boolean }> {
  const cfg = getSmtpConfig();
  let smtpSuccess = false;

  if (cfg.isConfigured) {
    const subject = `Your Shield Labs Bot ${purpose} Code: ${otp}`;
    const body = `Hello,\n\nYour 6-digit Shield Labs verification code is: ${otp}\n\nThis code expires in 10 minutes.\nIf you did not request this code, please ignore this email.\n\nShield Labs Security Operations`;
    smtpSuccess = await dispatchSmtpEmail(email, subject, body);
  }

  // Always log to console in local/demo mode and for audit transparency
  console.log(`[Shield Labs Bot] 📧 ${purpose} OTP for ${email}: ${otp} [${smtpSuccess ? 'SMTP_LIVE' : 'CONSOLE_PREVIEW'}]`);

  return {
    mode: smtpSuccess ? 'SMTP_LIVE' : 'CONSOLE_PREVIEW',
    sent: true,
  };
}
```

---

## 7. Concrete Endpoints Implementation Specification

### 7.1 `POST /api/v1/auth/otp/send`
- **Path**: `/api/v1/auth/otp/send`
- **Method**: `POST`
- **Request Body**: `{ email: string, purpose?: string }`
- **Status Codes**:
  - `200 OK`: Code generated and dispatched.
  - `400 Bad Request`: Missing or invalid email.
  - `429 Too Many Requests`: Rate-limited by 30s cooldown or max window count.

```typescript
app.post('/api/v1/auth/otp/send', async (req: Request, res: Response) => {
  const { email, purpose } = req.body;
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ ok: false, success: false, error: 'INVALID_EMAIL', message: 'Valid email address is required.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const existing = pendingOtps.get(cleanEmail);
  const now = Date.now();

  // 1. Anti-Flood Cooldown Check (30 seconds)
  if (existing && now - existing.lastSentAtUtc < OTP_RESEND_COOLDOWN_MS) {
    const waitSec = Math.ceil((OTP_RESEND_COOLDOWN_MS - (now - existing.lastSentAtUtc)) / 1000);
    return res.status(429).json({
      ok: false,
      success: false,
      error: 'RATE_LIMITED',
      message: `Please wait ${waitSec} second(s) before requesting another code.`,
      retryAfterSeconds: waitSec,
    });
  }

  // 2. Sliding Window Request Limit (Max 5 per 10-minute window)
  if (existing && existing.sendCount >= OTP_MAX_SENDS_PER_WINDOW && now < existing.expiresAtUtc) {
    return res.status(429).json({
      ok: false,
      success: false,
      error: 'MAX_SENDS_EXCEEDED',
      message: 'Maximum verification requests reached for this window. Please wait a few minutes and try again.',
    });
  }

  // 3. Generate Secure 6-digit Code
  const otp = generateSecureOtp();
  pendingOtps.set(cleanEmail, {
    email: cleanEmail,
    otp,
    expiresAtUtc: now + OTP_EXPIRY_MS,
    attempts: 0,
    lastSentAtUtc: now,
    sendCount: (existing ? existing.sendCount + 1 : 1),
    verified: false,
  });

  // 4. Dual-Mode Delivery
  const delivery = await deliverOtpCode(cleanEmail, otp, purpose || 'Verification');

  // 5. Audit Logging
  recordEvent('auth.otp.sent', 'info', 1.0, 'auth_service', cleanEmail, {
    email: cleanEmail,
    expiresInSeconds: 600,
    deliveryMode: delivery.mode,
  });

  return res.json({
    ok: true,
    success: true,
    message: `A 6-digit verification code has been dispatched to ${cleanEmail}.`,
    previewOtp: otp,
    devOtp: otp,
    deliveryMode: delivery.mode,
    expiresInSeconds: 600,
  });
});
```

---

### 7.2 `POST /api/v1/auth/otp/resend`
- **Path**: `/api/v1/auth/otp/resend`
- **Method**: `POST`
- **Request Body**: `{ email: string }`
- **Status Codes**:
  - `200 OK`: Fresh OTP generated and resent.
  - `400 Bad Request`: Missing email.
  - `429 Too Many Requests`: Rate-limited by 30s cooldown or max window count.

```typescript
app.post('/api/v1/auth/otp/resend', async (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ ok: false, success: false, error: 'INVALID_EMAIL', message: 'Valid email address is required.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const existing = pendingOtps.get(cleanEmail);
  const now = Date.now();

  // Cooldown check
  if (existing && now - existing.lastSentAtUtc < OTP_RESEND_COOLDOWN_MS) {
    const waitSec = Math.ceil((OTP_RESEND_COOLDOWN_MS - (now - existing.lastSentAtUtc)) / 1000);
    return res.status(429).json({
      ok: false,
      success: false,
      error: 'RATE_LIMITED',
      message: `Please wait ${waitSec} second(s) before resending.`,
      retryAfterSeconds: waitSec,
    });
  }

  // Max resend check
  if (existing && existing.sendCount >= OTP_MAX_SENDS_PER_WINDOW && now < existing.expiresAtUtc) {
    return res.status(429).json({
      ok: false,
      success: false,
      error: 'MAX_RESENDS_EXCEEDED',
      message: 'Maximum OTP resend limit reached for this session. Please try again later.',
    });
  }

  const otp = generateSecureOtp();
  pendingOtps.set(cleanEmail, {
    email: cleanEmail,
    otp,
    expiresAtUtc: now + OTP_EXPIRY_MS,
    attempts: 0, // Reset attempt count for new code
    lastSentAtUtc: now,
    sendCount: (existing ? existing.sendCount + 1 : 1),
    verified: false,
  });

  const delivery = await deliverOtpCode(cleanEmail, otp, 'Resend');

  recordEvent('auth.otp.resent', 'info', 1.0, 'auth_service', cleanEmail, {
    email: cleanEmail,
    deliveryMode: delivery.mode,
  });

  return res.json({
    ok: true,
    success: true,
    message: `A new 6-digit verification code has been dispatched to ${cleanEmail}.`,
    previewOtp: otp,
    devOtp: otp,
    deliveryMode: delivery.mode,
    expiresInSeconds: 600,
  });
});
```

---

### 7.3 `POST /api/v1/auth/otp/verify`
- **Path**: `/api/v1/auth/otp/verify`
- **Method**: `POST`
- **Request Body**: `{ email: string, otp: string }`
- **Status Codes**:
  - `200 OK`: Code matches; email verified; user updated in store.
  - `400 Bad Request`: Missing fields, invalid format, code expired, incorrect code, or no code requested.
  - `429 Too Many Requests`: Max failed attempts exceeded (invalidated).

```typescript
app.post('/api/v1/auth/otp/verify', (req: Request, res: Response) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ ok: false, success: false, error: 'MISSING_FIELDS', message: 'Email and 6-digit OTP code are required.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const candidateOtp = otp.toString().trim();

  // Validate format
  if (!/^\d{6}$/.test(candidateOtp)) {
    return res.status(400).json({ ok: false, success: false, error: 'INVALID_FORMAT', message: 'Verification code must be exactly 6 numeric digits.' });
  }

  const entry = pendingOtps.get(cleanEmail);
  if (!entry) {
    return res.status(400).json({ ok: false, success: false, error: 'NO_OTP_REQUESTED', message: 'No verification code requested for this email. Please request a new code.' });
  }

  // Check expiration
  if (Date.now() > entry.expiresAtUtc) {
    pendingOtps.delete(cleanEmail);
    return res.status(400).json({ ok: false, success: false, error: 'OTP_EXPIRED', message: 'Verification code has expired. Please request a new code.' });
  }

  // Check attempt lockout threshold
  if (entry.attempts >= OTP_MAX_ATTEMPTS) {
    pendingOtps.delete(cleanEmail);
    return res.status(429).json({ ok: false, success: false, error: 'MAX_ATTEMPTS_EXCEEDED', message: 'Too many incorrect attempts. Verification code has been invalidated. Please request a new code.' });
  }

  // Constant-time timing-safe comparison
  const isMatch = timingSafeOtpMatch(candidateOtp, entry.otp);
  if (!isMatch) {
    entry.attempts++;
    const remaining = Math.max(0, OTP_MAX_ATTEMPTS - entry.attempts);
    if (remaining === 0) {
      pendingOtps.delete(cleanEmail);
      return res.status(400).json({ ok: false, success: false, error: 'OTP_INVALIDATED', message: 'Too many incorrect attempts. Code invalidated. Please request a new code.' });
    }
    return res.status(400).json({
      ok: false,
      success: false,
      error: 'INVALID_OTP',
      message: `Invalid 6-digit verification code. ${remaining} attempt(s) remaining.`,
      remainingAttempts: remaining,
    });
  }

  // Code verified successfully!
  entry.verified = true;
  entry.verifiedAtUtc = Date.now();

  // Synchronize with registered user in persistent users.json
  const user = registeredUsers.find((u) => u.email.toLowerCase() === cleanEmail);
  if (user) {
    user.isVerified = true;
    saveUsersToDisk();

    // Unlock / authenticate current session
    const session = getClientSession(req);
    session.isLocked = false;
    session.role = user.role;
    session.userName = user.fullName;
    session.email = user.email;
    session.deviceName = user.deviceName;
    session.lastActivityUtc = Date.now();
  }

  // Consume OTP
  pendingOtps.delete(cleanEmail);

  recordEvent('auth.otp.verified', 'info', 1.0, 'auth_service', cleanEmail, { email: cleanEmail });

  return res.json({
    ok: true,
    success: true,
    message: 'Email address verified successfully.',
    user: user ? {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      isVerified: true,
      deviceName: user.deviceName,
    } : undefined,
  });
});
```

---

## 8. Integration Contract with Registration & Login Flows

### 8.1 Registration (`POST /api/v1/auth/signup`)
1. User provides `fullName`, `email`, `phone`, `country`, `password`, `deviceName`.
2. Server creates the account in `registeredUsers` with `isVerified: false`.
3. Server generates 6-digit OTP using `generateSecureOtp()`, records in `pendingOtps`, dispatches via dual-mode, and returns:
   ```json
   {
     "ok": true,
     "success": true,
     "message": "Account created. Please verify your email with the 6-digit code.",
     "user": {
       "id": "usr-...",
       "fullName": "Jane Doe",
       "email": "jane@example.com",
       "phone": "+1 555-0199",
       "country": "US",
       "role": "SECURITY_ANALYST",
       "isVerified": false
     },
     "previewOtp": "834192",
     "devOtp": "834192"
   }
   ```
4. Client displays the OTP verification modal displaying the instant preview in demo mode.

### 8.2 Login (`POST /api/v1/auth/login`)
1. If email + password match, check:
   ```typescript
   if (user.isVerified === false) {
     return res.status(403).json({
       ok: false,
       success: false,
       error: 'ACCOUNT_UNVERIFIED',
       message: 'Account email has not been verified. Please complete 6-digit email OTP verification.',
       email: user.email,
     });
   }
   ```
2. Unverified users are blocked from dashboard entry and given the option to trigger `POST /api/v1/auth/otp/resend`.

---

## 9. Environment Configuration Updates (`.env` & `.env.example`)
To document the SMTP parameters for developers and operators:
```ini
# =============================================================================
# Dual-Mode Email OTP Delivery Configuration
# Mode A: Live SMTP dispatch if SMTP_HOST is configured
# Mode B: Automatic fallback to console logging & in-app toast preview
# =============================================================================
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM="Shield Labs Bot <no-reply@shieldlabs.local>"
```

---

## 10. Automated Test & Self-Verification Plan
Create an automated test suite (`tests/otp_verification_test.ts` or integrated in `tests/user_auth_verification.ts`) that verifies:
1. **6-Digit Range**: 100 iterations of `generateSecureOtp()` all produce strings of length 6 matching `/^\d{6}$/` and parse to values in `[100000, 999999]`.
2. **Send Endpoint**: Calling `POST /api/v1/auth/otp/send` returns HTTP 200, valid `previewOtp`, and `expiresInSeconds: 600`.
3. **Resend Cooldown**: Calling `POST /api/v1/auth/otp/send` twice immediately triggers HTTP 429 `RATE_LIMITED`.
4. **Resend Endpoint**: Calling `POST /api/v1/auth/otp/resend` after cooldown generates a new code and resets attempt count.
5. **Brute Force Lockout**: Calling `POST /api/v1/auth/otp/verify` with wrong code 5 times in a row produces `MAX_ATTEMPTS_EXCEEDED` and purges the code.
6. **Timing-Safe Comparison**: SHA-256 + `crypto.timingSafeEqual` comparison successfully rejects wrong codes and accepts matching code without throwing `RangeError` on strings of length 0, 5, 6, 12, or 100.
7. **User Record Verification**: Successful OTP verification sets `isVerified: true` in `registeredUsers` and persists to `data/users.json`.
8. **Regression Suite**: `cmd /c "npm test"` passes 100% cleanly (0 errors).
9. **Compilation**: `cmd /c "npm run build"` compiles with 0 TypeScript/Vite errors.
