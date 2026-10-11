import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ShieldCheck,
  AlertTriangle,
  ShieldAlert,
  HelpCircle,
  Settings,
  AlertOctagon,
  MessageSquareCode,
  Lock,
  Activity,
  Wifi,
  Copy,
  Check,
  Server,
  User,
  Users,
} from 'lucide-react';
import { StatusCode } from '../types/security';
import { api } from '../api/client';
import { UserProfileModal } from './UserProfileModal';
import { UserManagementModal } from './UserManagementModal';

interface TopBarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  statusCode: StatusCode;
  statusLabel: string;
  onOpenPanic: () => void;
  onOpenSettings: () => void;
  onOpenAssistant: () => void;
  onLockConsole: () => void;
  unresolvedCount: number;
  currentRole?: string;
  activeUsersCount?: number;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentTab,
  onSelectTab,
  statusCode,
  statusLabel,
  onOpenPanic,
  onOpenSettings,
  onOpenAssistant,
  onLockConsole,
  unresolvedCount,
  currentRole,
  activeUsersCount,
}) => {
  const [copiedIp, setCopiedIp] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isUserMgmtOpen, setIsUserMgmtOpen] = useState(false);
  const [userNameState, setUserNameState] = useState(
    localStorage.getItem('pcb_user_name') || 'Administrator'
  );
  const [userRoleState, setUserRoleState] = useState(
    localStorage.getItem('pcb_user_role') || 'ADMIN'
  );

  const effectiveRole = currentRole || userRoleState || 'ADMIN';
  const isAdmin = effectiveRole === 'ADMIN';

  const { data: networkData } = useQuery({
    queryKey: ['host_network'],
    queryFn: api.getNetworkInterfaces,
    refetchInterval: 12000,
  });

  const handleCopyIp = (ip: string) => {
    navigator.clipboard.writeText(ip);
    setCopiedIp(true);
    setTimeout(() => setCopiedIp(false), 2000);
  };

  const getStatusIcon = () => {
    switch (statusCode) {
      case 'green':
        return <ShieldCheck className="w-4 h-4 text-emerald-600" aria-hidden="true" />;
      case 'yellow':
        return <AlertTriangle className="w-4 h-4 text-amber-600" aria-hidden="true" />;
      case 'red':
        return <ShieldAlert className="w-4 h-4 text-rose-600" aria-hidden="true" />;
      default:
        return <HelpCircle className="w-4 h-4 text-slate-500" aria-hidden="true" />;
    }
  };

  const getStatusBadgeStyle = () => {
    switch (statusCode) {
      case 'green':
        return 'bg-emerald-50 border-emerald-200 text-emerald-800';
      case 'yellow':
        return 'bg-amber-50 border-amber-200 text-amber-800';
      case 'red':
        return 'bg-rose-50 border-rose-200 text-rose-800';
      default:
        return 'bg-slate-100 border-slate-200 text-slate-700';
    }
  };

  return (
    <>
      <header className="flex items-center justify-between px-6 py-3.5 bg-white border-b border-slate-200/90 shadow-xs select-none">
      {/* Zone 1: Wordmark, Active Status, and Live System IP Pill */}
      <div className="flex items-center gap-3">
        <a
          href="#home"
          onClick={(e) => {
            e.preventDefault();
            onSelectTab('home');
          }}
          className="text-base font-bold tracking-tight text-slate-900 hover:text-emerald-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded px-1"
        >
          Shield Labs Bot
        </a>

        {/* Live Protection Status Indicator */}
        <div
          role="status"
          aria-live="polite"
          className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-semibold ${getStatusBadgeStyle()}`}
        >
          {getStatusIcon()}
          <span>{statusLabel === 'Demo Protection' ? 'Active Protection' : statusLabel}</span>
        </div>

        {/* Live Host System IP Badge with Copy */}
        {networkData && (
          <button
            type="button"
            title={`Active Interface: ${networkData.interfaceName} | Gateway: ${networkData.gateway} | Click to copy IP`}
            onClick={() => handleCopyIp(networkData.primaryIp)}
            className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-mono font-medium transition-colors shadow-2xs"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <Wifi className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-bold text-slate-900">{networkData.primaryIp}</span>
            <span className="text-[10px] text-slate-500 font-sans font-semibold">({networkData.interfaceName})</span>
            {copiedIp ? (
              <Check className="w-3 h-3 text-emerald-600 shrink-0" />
            ) : (
              <Copy className="w-3 h-3 text-slate-400 hover:text-slate-600 shrink-0" />
            )}
          </button>
        )}

        {/* Live Active Online Users Counter */}
        {activeUsersCount !== undefined && activeUsersCount > 0 && (
          <button
            type="button"
            onClick={() => {
              if (isAdmin) setIsUserMgmtOpen(true);
            }}
            title={isAdmin ? `${activeUsersCount} active authenticated user session(s) online — Click to manage user directory & roles` : `${activeUsersCount} active authenticated user session(s) online`}
            className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold shadow-2xs ${
              isAdmin ? 'hover:bg-slate-100 cursor-pointer' : 'cursor-default'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <Users className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-bold text-slate-900">{activeUsersCount}</span>
            <span className="text-[10px] text-slate-500 font-sans font-medium">Online</span>
          </button>
        )}
      </div>

      {/* Zone 2: Navigation Links (Clean, streamlined, essential tabs only) */}
      <nav aria-label="Main Navigation" className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-600">
        {isAdmin && (
          <button
            onClick={() => onSelectTab('fleet')}
            className={`flex items-center gap-1.5 transition-colors hover:text-slate-900 pb-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded ${
              currentTab === 'fleet' ? 'text-slate-900 border-b-2 border-emerald-600 font-semibold' : ''
            }`}
          >
            <Server className="w-3.5 h-3.5 text-emerald-600" />
            Fleet & Remote Laptops
          </button>
        )}
        <button
          onClick={() => onSelectTab('safety-hardware')}
          className={`flex items-center gap-1.5 transition-colors hover:text-slate-900 pb-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded ${
            currentTab === 'safety-hardware' ? 'text-slate-900 border-b-2 border-emerald-600 font-semibold' : ''
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          Hardware & Safety
        </button>
        <button
          onClick={() => onSelectTab('home')}
          className={`transition-colors hover:text-slate-900 pb-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded ${
            currentTab === 'home' ? 'text-slate-900 border-b-2 border-emerald-600 font-semibold' : ''
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => onSelectTab('alerts')}
          className={`flex items-center gap-1.5 transition-colors hover:text-slate-900 pb-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded ${
            currentTab === 'alerts' ? 'text-slate-900 border-b-2 border-emerald-600 font-semibold' : ''
          }`}
        >
          Threats & Harmful Files
          {unresolvedCount > 0 && (
            <span className="text-[11px] font-mono px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200">
              {unresolvedCount}
            </span>
          )}
        </button>
        <button
          onClick={() => onSelectTab('timeline')}
          className={`transition-colors hover:text-slate-900 pb-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded ${
            currentTab === 'timeline' ? 'text-slate-900 border-b-2 border-emerald-600 font-semibold' : ''
          }`}
        >
          Timeline
        </button>
        <button
          onClick={() => onSelectTab('recovery')}
          className={`transition-colors hover:text-slate-900 pb-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 rounded ${
            currentTab === 'recovery' ? 'text-slate-900 border-b-2 border-emerald-600 font-semibold' : ''
          }`}
        >
          Recovery
        </button>
      </nav>

      {/* Zone 3: Primary Actions (Fleet Cockpit, Assistant, Panic Button, Settings, Lock) */}
      <div className="flex items-center gap-2.5">

        {isAdmin && (
          <button
            onClick={() => setIsUserMgmtOpen(true)}
            aria-label="Manage User Directory & Roles"
            title="Master Admin: User Directory & Live User Status"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 shadow-xs"
          >
            <Users className="w-3.5 h-3.5 text-indigo-600" aria-hidden="true" />
            <span className="hidden sm:inline">Users</span>
          </button>
        )}

        <button
          onClick={onOpenAssistant}
          aria-label="Open Security Assistant"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 shadow-xs"
        >
          <MessageSquareCode className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
          <span>Ask Assistant</span>
        </button>

        {isAdmin && (
          <button
            onClick={onOpenPanic}
            aria-label="Activate Panic Network Isolation"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 shadow-xs"
          >
            <AlertOctagon className="w-3.5 h-3.5 text-rose-600" aria-hidden="true" />
            <span className="hidden sm:inline">Emergency</span> Panic
          </button>
        )}

        {/* User Profile Avatar Badge */}
        <button
          type="button"
          onClick={() => setIsProfileOpen(true)}
          aria-label="User Profile"
          title={`User Profile: ${userNameState} (${effectiveRole})`}
          className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 shadow-2xs"
        >
          <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px]">
            {(userNameState || 'A')[0].toUpperCase()}
          </div>
          <span className="hidden sm:inline font-semibold text-slate-800 max-w-[90px] truncate">
            {userNameState}
          </span>
          <span className={`text-[9px] uppercase px-1 rounded font-bold ${
            effectiveRole === 'ADMIN'
              ? 'bg-slate-200 text-slate-700'
              : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
          }`}>
            {effectiveRole === 'SECURITY_ANALYST' ? 'Analyst' : effectiveRole}
          </span>
        </button>

        {isAdmin && (
          <button
            onClick={onOpenSettings}
            aria-label="Open Settings and Privacy"
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <Settings className="w-4 h-4" aria-hidden="true" />
          </button>
        )}

        <button
          onClick={onLockConsole}
          aria-label="Lock Console"
          title="Lock Console (Sign Out)"
          className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <Lock className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </header>

    {/* Dedicated User Profile Modal */}
    <UserProfileModal
      isOpen={isProfileOpen}
      onClose={() => setIsProfileOpen(false)}
      onSignOut={onLockConsole}
      onProfileUpdated={(updated) => {
        setUserNameState(updated.fullName);
        setUserRoleState(updated.role);
      }}
    />

    {/* Master Admin User Directory & Role Assignment Modal */}
    {isAdmin && (
      <UserManagementModal
        isOpen={isUserMgmtOpen}
        onClose={() => setIsUserMgmtOpen(false)}
        currentUserId={localStorage.getItem('pcb_user_id') || undefined}
      />
    )}
    {/* Secondary Navigation Row for viewports below lg */}
    <nav
      aria-label="Mobile Navigation"
      className="lg:hidden flex items-center gap-1.5 overflow-x-auto px-4 py-2 bg-slate-50 border-b border-slate-200/80 text-xs font-medium text-slate-600 no-scrollbar select-none"
    >
      <button
        onClick={() => onSelectTab('home')}
        className={`px-2.5 py-1 rounded-md transition-colors shrink-0 ${
          currentTab === 'home'
            ? 'bg-white text-slate-900 font-semibold shadow-2xs border border-slate-200'
            : 'hover:text-slate-900'
        }`}
      >
        Overview
      </button>
      <button
        onClick={() => onSelectTab('safety-hardware')}
        className={`px-2.5 py-1 rounded-md transition-colors shrink-0 ${
          currentTab === 'safety-hardware'
            ? 'bg-white text-slate-900 font-semibold shadow-2xs border border-slate-200'
            : 'hover:text-slate-900'
        }`}
      >
        Hardware & Safety
      </button>
      <button
        onClick={() => onSelectTab('fleet')}
        className={`px-2.5 py-1 rounded-md transition-colors shrink-0 ${
          currentTab === 'fleet'
            ? 'bg-white text-slate-900 font-semibold shadow-2xs border border-slate-200'
            : 'hover:text-slate-900'
        }`}
      >
        Fleet & Nodes
      </button>
      <button
        onClick={() => onSelectTab('alerts')}
        className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors shrink-0 ${
          currentTab === 'alerts'
            ? 'bg-white text-slate-900 font-semibold shadow-2xs border border-slate-200'
            : 'hover:text-slate-900'
        }`}
      >
        <span>Alert Center</span>
        {unresolvedCount > 0 && (
          <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200">
            {unresolvedCount}
          </span>
        )}
      </button>
      <button
        onClick={() => onSelectTab('timeline')}
        className={`px-2.5 py-1 rounded-md transition-colors shrink-0 ${
          currentTab === 'timeline'
            ? 'bg-white text-slate-900 font-semibold shadow-2xs border border-slate-200'
            : 'hover:text-slate-900'
        }`}
      >
        Timeline
      </button>
      <button
        onClick={() => onSelectTab('recovery')}
        className={`px-2.5 py-1 rounded-md transition-colors shrink-0 ${
          currentTab === 'recovery'
            ? 'bg-white text-slate-900 font-semibold shadow-2xs border border-slate-200'
            : 'hover:text-slate-900'
        }`}
      >
        Recovery
      </button>
    </nav>
  </>
  );
};
