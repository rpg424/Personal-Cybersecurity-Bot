# Personal Cybersecurity Bot — Windows Deployment, Packaging & Operational Guide

## 1. Prerequisites for Windows Host
- Windows 10/11 x64 (Build 19041+)
- Rust Toolchain (`cargo 1.78+`, `rustc`) with `x86_64-pc-windows-msvc` target
- Node.js 22 LTS & npm 10+
- Java 21 LTS (Temurin / OpenJDK 21) & Maven / Gradle
- Windows SDK (10.0.22621.0+) for Win32 & SignTool
- EV Code Signing Certificate or local test certificate (`TestCert.pfx`)

---

## 2. Windows Commands (Build, Test, Package, Sign)

### 2.1 Build Java Protection Service Backend
```powershell
# In Java Service directory:
mvn clean package -DskipTests=false
# Creates target/personal-cybersecurity-bot-service-1.0.0.jar

# Build minimal JRE runtime via jlink to avoid shipping full JDK
jlink --no-header-files --no-man-pages --compress=2 `
  --add-modules java.base,java.sql,java.net.http,java.logging,jdk.crypto.cryptoki `
  --output ./dist/runtime-jre
```

### 2.2 Build Frontend Assets
```powershell
# Install npm dependencies
npm ci

# Typecheck and production bundle
npm run lint
npm run build
# Distributes production static assets to ./dist/
```

### 2.3 Build and Package Tauri v2 Application (MSI / NSIS)
```powershell
# Tauri packaging command
cargo tauri build --bundles msi,nsis

# Output binaries located at:
# ./src-tauri/target/release/bundle/msi/PersonalCybersecurityBot_1.0.0_x64_en-US.msi
# ./src-tauri/target/release/bundle/nsis/PersonalCybersecurityBot_1.0.0_x64-setup.exe
```

### 2.4 Code Signing (SignTool)
```powershell
# Sign the executable and MSI with RFC 3161 timestamping
signtool sign /fd SHA256 /a /f "C:\Certs\PersonalCybersecurityBot_Sign.pfx" /p "$CERT_PASSWORD" `
  /tr "http://timestamp.digicert.com" /td SHA256 `
  "./src-tauri/target/release/bundle/msi/PersonalCybersecurityBot_1.0.0_x64_en-US.msi"

# Verify signature
signtool verify /pa /v "./src-tauri/target/release/bundle/msi/PersonalCybersecurityBot_1.0.0_x64_en-US.msi"
```

---

## 3. Installation, Update & Uninstall Lifecycle Commands

### 3.1 Silent Enterprise / System Install
```powershell
# Run MSI installation with quiet logging
msiexec /i "PersonalCybersecurityBot_1.0.0_x64_en-US.msi" /qn /L*V "C:\ProgramData\PersonalCybersecurityBot\install.log"
```

### 3.2 Service Verification
```powershell
# Check Windows Service status
Get-Service -Name "PersonalCybersecurityBotService"

# Test local IPC health endpoint
curl.exe -H "Authorization: Bearer $(Get-Content $env:LOCALAPPDATA\PersonalCybersecurityBot\run\ipc.token)" `
  http://127.0.0.1:3000/api/v1/health
```

### 3.3 Safe In-Place Update & Rollback Verification
```powershell
# Automated update trigger via updater executable
& "C:\Program Files\Personal Cybersecurity Bot\updater.exe" --check-now

# Rollback command if post-update health check fails
& "C:\Program Files\Personal Cybersecurity Bot\updater.exe" --rollback --backup-dir "C:\ProgramData\PersonalCybersecurityBot\backup_v1.0.0"
```

### 3.4 Clean Uninstall
```powershell
# Clean uninstall via Windows MSI installer
msiexec /x "PersonalCybersecurityBot_1.0.0_x64_en-US.msi" /qn /L*V "C:\ProgramData\PersonalCybersecurityBot\uninstall.log"

# Clean user app data if requested by user
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\PersonalCybersecurityBot"
```

---

## 4. Software Bill of Materials (SBOM) & License Compatibility

| Component / Package | Version | License | Compatibility / Usage Notes |
|---|---|---|---|
| Tauri Core & Runtime | 2.x | MIT / Apache 2.0 | Approved for desktop shell distribution. |
| React | 19.x | MIT | Approved for renderer layer. |
| TanStack Query | 5.x | MIT | Approved for server state caching. |
| Lucide React | 0.546.0 | ISC | Approved for calm UI iconography. |
| Tailwind CSS | 4.x | MIT | Approved for accessible design tokens. |
| Express & TSX | 4.x / 4.x | MIT | Approved for local IPC loopback server. |
| SQLite3 (JDBC / C) | 3.45+ | Public Domain | Approved for local database storage. |
| Google GenAI SDK | 2.4.0 | Apache 2.0 | Approved for server-side AI triage assistant. |

*No GPL, AGPL, or restrictive proprietary components with copyleft constraints are bundled.*
