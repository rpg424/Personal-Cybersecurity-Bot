# ==============================================================================
# Script: restore_conversation_on_laptop2.ps1
# Purpose: Automatically restores this Antigravity conversation on Laptop 2
# Conversation ID: 912e19a6-ed68-44ed-978b-16868a76f604
# ==============================================================================

$ErrorActionPreference = "Stop"

Write-Host "=== Antigravity Conversation Restoration Tool ===" -ForegroundColor Cyan
Write-Host "Target Conversation ID: 912e19a6-ed68-44ed-978b-16868a76f604`n"

# 1. Resolve Antigravity base path on this machine
$geminiDir = Join-Path $env:USERPROFILE ".gemini"
$antigravityDir = Join-Path $geminiDir "antigravity"
$conversationsDir = Join-Path $antigravityDir "conversations"
$brainDir = Join-Path $antigravityDir "brain"

if (-not (Test-Path $conversationsDir)) {
    Write-Host "[+] Creating conversations directory: $conversationsDir"
    New-Item -ItemType Directory -Path $conversationsDir -Force | Out-Null
}

if (-not (Test-Path $brainDir)) {
    Write-Host "[+] Creating brain directory: $brainDir"
    New-Item -ItemType Directory -Path $brainDir -Force | Out-Null
}

# 2. Check source files in current folder
$scriptDir = $PSScriptRoot
if (-not $scriptDir) { $scriptDir = (Get-Location).Path }

$pbSource = Join-Path $scriptDir "conversations\912e19a6-ed68-44ed-978b-16868a76f604.pb"
if (-not (Test-Path $pbSource)) {
    $pbSource = Join-Path $scriptDir "912e19a6-ed68-44ed-978b-16868a76f604.pb"
}

$brainSource = Join-Path $scriptDir "brain\912e19a6-ed68-44ed-978b-16868a76f604"
if (-not (Test-Path $brainSource)) {
    $brainSource = Join-Path $scriptDir "912e19a6-ed68-44ed-978b-16868a76f604"
}

# 3. Copy conversation state protobuf
if (Test-Path $pbSource) {
    Write-Host "[+] Restoring conversation state to $conversationsDir..."
    Copy-Item -Path $pbSource -Destination (Join-Path $conversationsDir "912e19a6-ed68-44ed-978b-16868a76f604.pb") -Force
    Write-Host "    ✔ Restored: 912e19a6-ed68-44ed-978b-16868a76f604.pb" -ForegroundColor Green
} else {
    Write-Warning "[!] Conversation protobuf file not found at: $pbSource"
}

# 4. Copy conversation brain & artifacts
if (Test-Path $brainSource) {
    Write-Host "[+] Restoring conversation brain & artifacts to $brainDir..."
    $destBrainTarget = Join-Path $brainDir "912e19a6-ed68-44ed-978b-16868a76f604"
    if (-not (Test-Path $destBrainTarget)) {
        New-Item -ItemType Directory -Path $destBrainTarget -Force | Out-Null
    }
    Copy-Item -Path "$brainSource\*" -Destination $destBrainTarget -Recurse -Force
    Write-Host "    ✔ Restored: brain\912e19a6-ed68-44ed-978b-16868a76f604" -ForegroundColor Green
} else {
    Write-Warning "[!] Conversation brain directory not found at: $brainSource"
}

Write-Host "`n=== Restoration Complete! ===" -ForegroundColor Green
Write-Host "Instructions to access on Laptop 2:"
Write-Host "1. Open Google Antigravity on this laptop."
Write-Host "2. You will find this conversation in your sidebar history, or you can access the artifacts in:"
Write-Host "   $env:USERPROFILE\.gemini\antigravity\brain\912e19a6-ed68-44ed-978b-16868a76f604\"
Write-Host "3. You can also view the full readable transcript in 'CONVERSATION_TRANSCRIPT.md' in any editor."
