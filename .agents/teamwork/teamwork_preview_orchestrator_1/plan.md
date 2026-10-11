# Project Plan: User Registration & Authentication System

## Objective
Implement and verify a complete User Registration & Authentication System featuring Phone, Country, Dual-Mode Email OTP Verification, Persistent Profile Storage, zero public role selection, and dedicated Master Admin User ID with exclusive authority to delegate roles.

## Phase 0: Survey & Scope Mapping
- Dispatch 3 parallel Explorers to inspect the existing codebase structure, dependencies, frontend/backend architecture, existing auth mechanism, database/JSON storage, and test harness.
- Synthesize findings into `PROJECT.md` with full architecture, feature inventory, milestones, and interface contracts.

## Phase 1: Dual Track Launch
- **E2E Testing Track**: Deploy E2E Testing Orchestrator / Test Writers to design opaque-box test suites (Tiers 1-4) covering all features from user requirements and publish `TEST_READY.md`.
- **Implementation Track**: Break down into modular milestones:
  - Milestone 1: User Data Model & JSON Persistence (`data/users.json` with extended metadata: phone, country, salt, hash, role, verified, deviceName, timestamps; Master Admin seeding).
  - Milestone 2: Dual-Mode Email OTP Verification Engine (6-digit expiring code, SMTP + local in-app toast preview / console output, verification API/state).
  - Milestone 3: Authentication Portal UI (Zero Role Selection, Sign In with Master PIN or Email/Password, Sign Up capturing Full Name, Phone, Country, Email, Password, defaulting hardcoded to `SECURITY_ANALYST`, OTP verification modal).
  - Milestone 4: Master Admin Cockpit & Role Delegation (Exclusive access for Master Admin ID, inspect users, live status, device, phone, country; elevate/assign roles `ADMIN`, `SECURITY_ANALYST`, `AUDITOR`; disable account).

## Phase 2: Final Integration & E2E Test Pass
- Run full test suite (`npm test`, `npm run build`).
- Fix all failures until 100% pass across Tiers 1-4.

## Phase 3: Adversarial Coverage Hardening & Integrity Forensic Audit
- Dispatch Challengers for edge case stress-testing (Tier 5).
- Dispatch Forensic Auditor for integrity verification (zero cheating/facade checks).
- Upon clean audit and 100% test pass, claim victory to Sentinel.
