# Technical Recommendations: Milestone 1 Part A
**Data Model Extension, Persistence & Normalization, and Canonical Master Admin Seeding**

**Working Directory**: `.agents/teamwork/teamwork_preview_explorer_m1_1/`  
**Target Files**: `server.ts`, `src/types/security.ts`, `data/users.json`  
**Integrity Mode**: demo  

---

## 1. Executive Summary

Milestone 1 Part A establishes the foundational persistence and identity architecture for Shield Labs Bot:
1. **Extended User Model**: Upgrades both server-side `StoredUser` and client-side `UserProfile` contracts to strictly support `phone: string`, `country: string`, `isVerified: boolean`, and `disabled?: boolean`.
2. **Backward-Compatible Persistence & Normalization**: Fortifies `loadUsersFromDisk()` in `server.ts` to automatically normalize legacy records in `data/users.json` (15 existing records lacking phone, country, verification, and status flags), avoiding schema errors, runtime exceptions, or account lockouts.
3. **Canonical Master Admin Seeding & Protection**: Establishes permanent auto-seeding of root authority ID `admin-master` (`admin@shieldlabs.local`) with hardcoded `ADMIN` role, pre-verified state (`isVerified: true`), active status (`disabled: false`), and permanent guards preventing accidental demotion, disabling, deletion, or registration overwrite.
4. **Atomic File Persistence**: Replaces raw `fs.writeFileSync` in `saveUsersToDisk()` with atomic write-and-rename mechanics with fallback to ensure zero data corruption during process restarts or unexpected terminations.

---

## 2. Investigation & Current State Observations

### 2.1 File: `src/types/security.ts` (Lines 604–618)
- Current definition:
  ```typescript
  export interface UserProfile {
    id: string;
    fullName: string;
    email: string;
    phone?: string;
    country?: string;
    role: UserRole;
    avatarUrl?: string;
    deviceName?: string;
    isVerified?: boolean;
    isOnline?: boolean;
    createdAtUtc?: string;
    lastLoginUtc?: string;
  }
  ```
- **Gaps**:
  - `phone` is optional (`phone?: string`).
  - `country` is optional (`country?: string`).
  - `isVerified` is optional (`isVerified?: boolean`).
  - `disabled` is completely missing from `UserProfile`.

### 2.2 File: `server.ts` (Lines 336–350)
- Current definition:
  ```typescript
  export interface StoredUser {
    id: string;
    fullName: string;
    email: string;
    phone?: string;
    country?: string;
    passwordHash: string;
    passwordSalt: string;
    role: 'ADMIN' | 'SECURITY_ANALYST' | 'AUDITOR' | 'NO_ROLE';
    deviceName: string;
    isVerified?: boolean;
    createdAtUtc: string;
    lastLoginUtc?: string;
  }
  ```
- **Gaps**:
  - `phone` and `country` are optional.
  - `isVerified` is optional.
  - `disabled` is missing.
  - `StoredUser` must have mandatory `phone: string`, `country: string`, `isVerified: boolean`, and optional `disabled?: boolean`.

### 2.3 File: `data/users.json`
- Contains 15 historical user accounts (e.g. `usr-1791577730255-4eial`, `rohanp2008.rp@gmail.com`, etc.).
- **Gaps**:
  - Zero records have `phone` or `country` attributes.
  - Zero records have `isVerified` or `disabled` attributes.
  - Zero records correspond to canonical `admin-master`.
  - Without schema normalization on boot, querying `u.phone` or gating login on `u.isVerified` / `u.disabled` would cause schema inconsistencies or unverified account lockouts for pre-existing users.

### 2.4 File: `server.ts` (Lines 371–389: `loadUsersFromDisk`)
- Current implementation directly parses JSON into `registeredUsers = data` without field validation or defaults.
- Overwrite vulnerability: `signup` currently overwrites existing users by email match without checking if the target is Master Admin.

---

## 3. Precise Code Formulations

### 3.1 Contract Modifications

#### A. Client Contract: `src/types/security.ts`
Modify `UserProfile` interface to:
```typescript
export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  country: string;
  role: UserRole;
  avatarUrl?: string;
  deviceName?: string;
  isVerified: boolean;
  disabled?: boolean;
  isOnline?: boolean;
  createdAtUtc?: string;
  lastLoginUtc?: string;
}
```

*Note on Client Consumers*:
In `src/components/UserProfileModal.tsx`, ensure initial state initialization provides `isVerified: true`:
```typescript
  const [profile, setProfile] = useState<UserProfile>({
    id: localStorage.getItem('pcb_user_id') || 'usr-local',
    fullName: localStorage.getItem('pcb_user_name') || 'Local Administrator',
    email: localStorage.getItem('pcb_user_email') || 'admin@shieldlabs.local',
    phone: localStorage.getItem('pcb_user_phone') || '',
    country: localStorage.getItem('pcb_user_country') || '',
    role: (localStorage.getItem('pcb_user_role') as UserRole) || 'ADMIN',
    deviceName: localStorage.getItem('pcb_device_name') || deviceName,
    isVerified: true,
    disabled: false,
  });
```

#### B. Server Contract: `server.ts`
Modify `StoredUser` interface to:
```typescript
export interface StoredUser {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  country: string;
  passwordHash: string;
  passwordSalt: string;
  role: 'ADMIN' | 'SECURITY_ANALYST' | 'AUDITOR' | 'NO_ROLE';
  deviceName: string;
  isVerified: boolean;
  disabled?: boolean;
  createdAtUtc: string;
  lastLoginUtc?: string;
}
```

---

### 3.2 Canonical Master Admin Constants & Normalizer

Add constants and a robust record normalizer in `server.ts`:

```typescript
const CANONICAL_ADMIN_ID = 'admin-master';
const CANONICAL_ADMIN_EMAIL = 'admin@shieldlabs.local';
const DEFAULT_ADMIN_PASSWORD = process.env.MASTER_ADMIN_PASSWORD || 'AdminMasterPassword123!';

/**
 * Normalizes user records from data/users.json to guarantee complete schema adherence,
 * prevent undefined property crashes, and preserve legacy account access.
 */
function normalizeUserRecord(raw: any): StoredUser {
  const isMaster =
    (typeof raw.id === 'string' && raw.id.trim() === CANONICAL_ADMIN_ID) ||
    (typeof raw.email === 'string' && raw.email.trim().toLowerCase() === CANONICAL_ADMIN_EMAIL);

  const cleanRole = isMaster
    ? 'ADMIN'
    : (raw.role === 'ADMIN' || raw.role === 'SECURITY_ANALYST' || raw.role === 'AUDITOR'
        ? raw.role
        : 'SECURITY_ANALYST');

  return {
    id: isMaster
      ? CANONICAL_ADMIN_ID
      : (typeof raw.id === 'string' && raw.id.trim()
          ? raw.id.trim()
          : `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`),
    fullName: typeof raw.fullName === 'string' && raw.fullName.trim()
      ? raw.fullName.trim()
      : (isMaster ? 'Master Administrator' : 'Shield Labs User'),
    email: isMaster
      ? CANONICAL_ADMIN_EMAIL
      : (typeof raw.email === 'string' ? raw.email.trim().toLowerCase() : ''),
    phone: typeof raw.phone === 'string' && raw.phone.trim()
      ? raw.phone.trim()
      : (isMaster ? '+1-800-555-0199' : ''),
    country: typeof raw.country === 'string' && raw.country.trim()
      ? raw.country.trim()
      : (isMaster ? 'United States' : ''),
    passwordHash: typeof raw.passwordHash === 'string' ? raw.passwordHash : '',
    passwordSalt: typeof raw.passwordSalt === 'string' ? raw.passwordSalt : '',
    role: cleanRole,
    deviceName: typeof raw.deviceName === 'string' && raw.deviceName.trim()
      ? raw.deviceName.trim()
      : (isMaster ? 'Console-Master-Host' : 'PRIMARY-HOST'),
    // Legacy records are pre-verified so historical accounts remain accessible
    isVerified: typeof raw.isVerified === 'boolean' ? raw.isVerified : true,
    // Master Admin can never be disabled; legacy accounts default to false
    disabled: isMaster ? false : Boolean(raw.disabled),
    createdAtUtc: typeof raw.createdAtUtc === 'string' && raw.createdAtUtc
      ? raw.createdAtUtc
      : new Date().toISOString(),
    lastLoginUtc: typeof raw.lastLoginUtc === 'string' ? raw.lastLoginUtc : undefined,
  };
}
```

---

### 3.3 Atomic Disk Persistence (`saveUsersToDisk`)

Replace raw write in `saveUsersToDisk()` with atomic write + fallback:

```typescript
function saveUsersToDisk() {
  try {
    ensureDataDir();
    const tmpFile = `${USERS_FILE}.tmp-${process.pid}-${Date.now()}`;
    fs.writeFileSync(tmpFile, JSON.stringify(registeredUsers, null, 2), 'utf-8');
    try {
      fs.renameSync(tmpFile, USERS_FILE);
    } catch {
      // Direct write fallback for Windows file locking edge cases
      fs.writeFileSync(USERS_FILE, JSON.stringify(registeredUsers, null, 2), 'utf-8');
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    }
  } catch (err) {
    console.error('[Shield Labs Bot] Failed to write users to disk:', err);
  }
}
```

---

### 3.4 Comprehensive Bootstrapping & Auto-Seeding (`loadUsersFromDisk`)

Update `loadUsersFromDisk()` in `server.ts`:

```typescript
function loadUsersFromDisk() {
  try {
    ensureDataDir();
    let parsed: any[] = [];
    if (fs.existsSync(USERS_FILE)) {
      const raw = fs.readFileSync(USERS_FILE, 'utf8').trim();
      if (raw) {
        try {
          const data = JSON.parse(raw);
          if (Array.isArray(data)) {
            parsed = data;
          } else {
            console.warn('[Shield Labs Bot] users.json root is not an array, initializing empty.');
          }
        } catch (parseErr) {
          console.error('[Shield Labs Bot] Corrupt users.json detected, archiving backup:', parseErr);
          try {
            fs.copyFileSync(USERS_FILE, `${USERS_FILE}.bak-${Date.now()}`);
          } catch {}
          parsed = [];
        }
      }
    }

    // 1. Normalize all existing records
    let normalizedUsers = parsed.map(normalizeUserRecord);

    // 2. Identify or seed Canonical Master Admin
    const adminIdx = normalizedUsers.findIndex(
      (u) => u.id === CANONICAL_ADMIN_ID || u.email === CANONICAL_ADMIN_EMAIL
    );

    if (adminIdx >= 0) {
      // Force invariant enforcement on existing admin
      const existingAdmin = normalizedUsers[adminIdx];
      existingAdmin.id = CANONICAL_ADMIN_ID;
      existingAdmin.email = CANONICAL_ADMIN_EMAIL;
      existingAdmin.role = 'ADMIN';
      existingAdmin.isVerified = true;
      existingAdmin.disabled = false;
      if (!existingAdmin.phone) existingAdmin.phone = '+1-800-555-0199';
      if (!existingAdmin.country) existingAdmin.country = 'United States';
      if (!existingAdmin.fullName) existingAdmin.fullName = 'Master Administrator';
      // Ensure password hash & salt exist
      if (!existingAdmin.passwordSalt || !existingAdmin.passwordHash) {
        existingAdmin.passwordSalt = crypto.randomBytes(16).toString('hex');
        existingAdmin.passwordHash = hashPin(DEFAULT_ADMIN_PASSWORD, existingAdmin.passwordSalt);
      }
      normalizedUsers[adminIdx] = existingAdmin;
    } else {
      // Auto-seed canonical Master Admin account
      const adminSalt = crypto.randomBytes(16).toString('hex');
      const adminHash = hashPin(DEFAULT_ADMIN_PASSWORD, adminSalt);
      const masterAdmin: StoredUser = {
        id: CANONICAL_ADMIN_ID,
        fullName: 'Master Administrator',
        email: CANONICAL_ADMIN_EMAIL,
        phone: '+1-800-555-0199',
        country: 'United States',
        passwordHash: adminHash,
        passwordSalt: adminSalt,
        role: 'ADMIN',
        deviceName: 'Console-Master-Host',
        isVerified: true,
        disabled: false,
        createdAtUtc: new Date().toISOString(),
        lastLoginUtc: new Date().toISOString(),
      };
      normalizedUsers.unshift(masterAdmin);
      console.log(`[Shield Labs Bot] Auto-seeded canonical Master Admin (${CANONICAL_ADMIN_ID} / ${CANONICAL_ADMIN_EMAIL}).`);
    }

    registeredUsers = normalizedUsers;
    saveUsersToDisk();
    console.log(`[Shield Labs Bot] Loaded and normalized ${registeredUsers.length} persistent user account(s).`);
  } catch (err) {
    console.error('[Shield Labs Bot] Failed to load users from disk:', err);
    if (!registeredUsers) registeredUsers = [];
  }
}
```

---

### 3.5 Root Authority Invariant Protection Guards

To prevent regression or security bypasses, implement the following server-side guards:

1. **Signup Overwrite Guard**:
   In `POST /api/v1/auth/signup`:
   ```typescript
   if (cleanEmail === CANONICAL_ADMIN_EMAIL) {
     return res.status(409).json({
       error: 'CANNOT_OVERWRITE_MASTER_ADMIN',
       message: 'The Master Admin account is permanently reserved and cannot be created via public registration.',
     });
   }
   ```
2. **Role Tamper Protection**:
   In `POST` / `PATCH /api/v1/admin/users/:id/role`:
   ```typescript
   if (user.id === CANONICAL_ADMIN_ID || user.email === CANONICAL_ADMIN_EMAIL) {
     return res.status(400).json({
       error: 'CANNOT_DEMOTE_MASTER_ADMIN',
       message: 'Security policy violation: Master Administrator clearance cannot be altered.',
     });
   }
   ```
3. **Account Deletion & Status Protection**:
   In `POST /api/v1/admin/users/:id/delete`:
   ```typescript
   if (target.id === CANONICAL_ADMIN_ID || target.email === CANONICAL_ADMIN_EMAIL) {
     return res.status(400).json({
       error: 'CANNOT_DELETE_MASTER_ADMIN',
       message: 'The root Master Administrator account is permanent and cannot be deleted.',
     });
   }
   ```
   In `PATCH /api/v1/admin/users/:id/status`:
   ```typescript
   if (target.id === CANONICAL_ADMIN_ID || target.email === CANONICAL_ADMIN_EMAIL) {
     return res.status(400).json({
       error: 'CANNOT_DISABLE_MASTER_ADMIN',
       message: 'The Master Administrator account cannot be disabled.',
     });
   }
   ```

---

## 4. Verification & Testing Strategy

1. **Compilation Check**:
   - `cmd /c "npm run lint"` (`tsc --noEmit`) to verify zero type mismatches across `UserProfile` and `StoredUser`.
   - `cmd /c "npm run build"` to verify Vite bundle compilation.
2. **Persistence & Seeding Assertions**:
   - Verify `data/users.json` contains `admin-master` as the first entry with `role: 'ADMIN'`, `isVerified: true`, `disabled: false`.
   - Verify all 15 legacy records now include `phone`, `country`, `isVerified: true`, and `disabled: false`.
3. **RBAC Self-Check**:
   - `cmd /c "npm run test:rbac"` to ensure existing RBAC concurrency tests continue to pass.
