# Original User Request

## 2026-10-09T21:55:59Z

Implement a comprehensive User Registration & Authentication System featuring Phone, Country, Dual-Mode Email OTP Verification, Persistent Profile Storage, zero public role selection, and a dedicated Master Admin User ID with exclusive authority to delegate roles.

Working directory: C:\Users\BNPInteriors\antigravity\Personal-Cybersecurity-Bot
Integrity mode: demo

## Requirements

### R1. Universal Sign In & Sign Up Interface (Zero Role Selection)
Provide a persistent, unified authentication portal upon logout and page refresh:
- **Sign In Tab**: Supports Master PIN authentication and Email + Password for registered users.
- **Create Account (Sign Up) Tab**: Collects Full Name, Phone Number, Country, Email Address, and Password.
- **Zero Role Selection**: Absolutely no role selector, dropdown, or option is displayed anywhere during sign up or in user profile settings. Every newly registered account is hardcoded to default to `SECURITY_ANALYST`.

### R2. Canonical Master Admin User ID & Authority
- Establish a canonical, persistent Master Admin User ID (e.g. `admin-master` / `admin@shieldlabs.local`) configured with highest clearance (`ADMIN`).
- Master Admin account is permanently recognized as the root authority.
- Only the Master Admin ID has access to the User Management Cockpit to review registered users, view who is actively online, and elevate/assign roles (`ADMIN`, `SECURITY_ANALYST`, `AUDITOR`).

### R3. Dual-Mode Email OTP Verification Engine
Implement a secure OTP verification flow for user registration and authentication:
- Generates a secure, expiring 6-digit one-time passcode (OTP).
- Dual-mode delivery: Supports live SMTP email dispatch (configurable via `.env`) with an instant in-app toast/modal preview and console output for seamless local and offline testing.
- Blocks account activation and dashboard entry until the 6-digit OTP is successfully verified.

### R4. Persistent User Profiles & Extended Metadata
Persist all user records reliably in `data/users.json` and synchronize with database tables:
- Store extended profile fields: `id`, `fullName`, `email`, `phone`, `country`, `passwordHash`, `passwordSalt`, `role`, `isVerified`, `deviceName`, `createdAtUtc`, and `lastLoginUtc`.
- Ensure user sessions and profile metadata survive browser refreshes, logouts, and server restarts without data loss.

### R5. Master Admin User Management Cockpit
- Dedicated Admin dashboard to inspect all registered users, their online status, device names, phone number, and country.
- Only Master Admin can modify roles or disable accounts.

## Acceptance Criteria

### Authentication & Role Isolation
- [ ] Sign up interface captures Full Name, Phone Number, Country, Email, and Password with ZERO role-selection options anywhere in the UI.
- [ ] Every registered user automatically receives the `SECURITY_ANALYST` role by default.
- [ ] A canonical Master Admin ID is established with exclusive authority to assign and change user roles.
- [ ] Non-admin users cannot alter their own or peer roles.

### Email OTP Verification
- [ ] A 6-digit OTP is issued during sign up and required before granting dashboard access.
- [ ] Instant in-app/toast preview displays the OTP during local testing, with optional SMTP dispatch when credentials exist.
- [ ] Incorrect or expired OTPs return clear validation feedback and deny access.

### Data Persistence & Admin Management
- [ ] Registered user records persist permanently in `data/users.json` across server restarts and page refreshes.
- [ ] Master Admin dashboard displays registered users, live activity status, device names, and contact details (phone, country).
- [ ] Master Admin can successfully reassign a user's role from the management dashboard.

### Automated Verification
- [ ] `cmd /c "npm test"` passes cleanly with automated assertions verifying the OTP flow, user persistence, default roles, and Master Admin role delegation.
- [ ] `cmd /c "npm run build"` compiles with zero TypeScript or Vite errors.
