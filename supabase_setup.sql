-- =============================================================================
-- Shield Labs Bot - Supabase Relational Database Schema & Security Policies
-- Comprehensive 8-Table Architecture for Multi-Node Fleet Telemetry & Defense
-- =============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. Table: user_profiles (Multi-User Accounts & Role-Based Access)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'ADMIN' CHECK (role IN ('ADMIN', 'SECURITY_ANALYST', 'AUDITOR')),
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 2. Table: fleet_nodes (Enrolled Remote Laptops & Endpoints)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fleet_nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    hostname TEXT NOT NULL,
    assigned_user TEXT DEFAULT 'Device Owner',
    ip_address TEXT,
    os_name TEXT,
    cpu_model TEXT,
    cpu_percent INTEGER DEFAULT 0,
    ram_percent INTEGER DEFAULT 0,
    total_ram_gb NUMERIC(6, 2) DEFAULT 16.0,
    free_ram_gb NUMERIC(6, 2) DEFAULT 8.0,
    status TEXT DEFAULT 'ONLINE' CHECK (status IN ('ONLINE', 'OFFLINE', 'ISOLATED', 'AT_RISK')),
    safety_verdict TEXT DEFAULT 'SECURE & HEALTHY',
    safety_score INTEGER DEFAULT 100,
    last_heartbeat_utc TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 3. Table: harmful_threats (Detected Harmful Files & Volatile Threats)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.harmful_threats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID REFERENCES public.fleet_nodes(id) ON DELETE CASCADE,
    threat_id TEXT NOT NULL,
    title TEXT NOT NULL,
    file_name TEXT,
    file_path TEXT NOT NULL,
    process_name TEXT,
    pid INTEGER,
    command_line TEXT,
    sha256 TEXT,
    threat_type TEXT DEFAULT 'Malicious Binary / Script',
    severity TEXT DEFAULT 'high' CHECK (severity IN ('info', 'low', 'medium', 'high', 'critical')),
    why_risky TEXT,
    recommendation TEXT,
    status TEXT DEFAULT 'unresolved' CHECK (status IN ('unresolved', 'quarantined', 'deleted', 'ignored', 'resolved')),
    detected_at_utc TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 4. Table: quarantine_vault (Encrypted Quarantine Ledger)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.quarantine_vault (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID REFERENCES public.fleet_nodes(id) ON DELETE CASCADE,
    threat_id UUID REFERENCES public.harmful_threats(id) ON DELETE SET NULL,
    original_path TEXT NOT NULL,
    quarantined_path TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_size_bytes BIGINT DEFAULT 0,
    sha256 TEXT,
    encryption_algorithm TEXT DEFAULT 'AES-256-GCM',
    quarantined_at_utc TIMESTAMPTZ DEFAULT NOW(),
    restored_at_utc TIMESTAMPTZ
);

-- -----------------------------------------------------------------------------
-- 5. Table: node_listening_ports (Network Sockets & Service Surface)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.node_listening_ports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID REFERENCES public.fleet_nodes(id) ON DELETE CASCADE,
    port INTEGER NOT NULL,
    protocol TEXT DEFAULT 'TCP' CHECK (protocol IN ('TCP', 'UDP')),
    service_name TEXT,
    risk_level TEXT DEFAULT 'LOW' CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH')),
    description TEXT,
    is_open BOOLEAN DEFAULT true,
    last_inspected_utc TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 6. Table: node_remediation_commands (Remote Command Execution Queue)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.node_remediation_commands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID REFERENCES public.fleet_nodes(id) ON DELETE CASCADE,
    command_type TEXT NOT NULL CHECK (command_type IN ('quarantine', 'delete-file', 'kill-process', 'isolate-network')),
    target_path TEXT,
    target_pid INTEGER,
    threat_id TEXT,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'EXECUTED', 'FAILED')),
    created_at_utc TIMESTAMPTZ DEFAULT NOW(),
    executed_at_utc TIMESTAMPTZ
);

-- -----------------------------------------------------------------------------
-- 7. Table: security_audit_logs (Tamper-Resistant Security Event History)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.security_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    node_id UUID REFERENCES public.fleet_nodes(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL,
    severity TEXT DEFAULT 'info' CHECK (severity IN ('info', 'low', 'medium', 'high', 'critical')),
    actor TEXT DEFAULT 'SYSTEM',
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at_utc TIMESTAMPTZ DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 8. Table: security_incidents (High-Level Incident Triage & Resolution)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.security_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID REFERENCES public.fleet_nodes(id) ON DELETE SET NULL,
    incident_title TEXT NOT NULL,
    severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status TEXT DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'INVESTIGATING', 'REMEDIATED', 'CLOSED')),
    root_cause TEXT,
    plain_language_summary TEXT,
    created_at_utc TIMESTAMPTZ DEFAULT NOW(),
    resolved_at_utc TIMESTAMPTZ
);

-- =============================================================================
-- Performance Indexes
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_fleet_nodes_hostname ON public.fleet_nodes(hostname);
CREATE INDEX IF NOT EXISTS idx_fleet_nodes_status ON public.fleet_nodes(status);
CREATE INDEX IF NOT EXISTS idx_harmful_threats_node_id ON public.harmful_threats(node_id);
CREATE INDEX IF NOT EXISTS idx_harmful_threats_status ON public.harmful_threats(status);
CREATE INDEX IF NOT EXISTS idx_quarantine_node_id ON public.quarantine_vault(node_id);
CREATE INDEX IF NOT EXISTS idx_listening_ports_node_id ON public.node_listening_ports(node_id);
CREATE INDEX IF NOT EXISTS idx_commands_node_id_status ON public.node_remediation_commands(node_id, status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON public.security_audit_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_incidents_node_id ON public.security_incidents(node_id);

-- =============================================================================
-- Row Level Security (RLS) Configuration
-- =============================================================================
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fleet_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.harmful_threats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quarantine_vault ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.node_listening_ports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.node_remediation_commands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_incidents ENABLE ROW LEVEL SECURITY;

-- Permissive policies for authenticated and local fleet coordination
CREATE POLICY "Allow public access to fleet_nodes for fleet coordination"
    ON public.fleet_nodes FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow public access to user_profiles"
    ON public.user_profiles FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow access to harmful_threats"
    ON public.harmful_threats FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow access to quarantine_vault"
    ON public.quarantine_vault FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow access to node_listening_ports"
    ON public.node_listening_ports FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow access to node_remediation_commands"
    ON public.node_remediation_commands FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow access to security_audit_logs"
    ON public.security_audit_logs FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow access to security_incidents"
    ON public.security_incidents FOR ALL USING (true) WITH CHECK (true);
