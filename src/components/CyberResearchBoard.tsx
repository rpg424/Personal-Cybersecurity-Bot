import React, { useState, useEffect } from 'react';
import {
  Search,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  Tag,
  Paperclip,
  CheckCircle2,
  Clock,
  FileText,
  Trash2,
  Download,
  Play,
  RotateCcw,
  Eye,
  AlertOctagon,
  HelpCircle,
  MessageSquare,
  ShieldAlert,
  Loader2,
  Sparkles,
  Lock,
} from 'lucide-react';
import {
  ResearchFinding,
  EvidenceCard,
  AnalystReviewStatus,
  AlertItem,
  ResearchSelfTestResult,
  EvidenceClassification,
  SourceTrustLevel,
} from '../types/security';
import { api } from '../api/client';

interface CyberResearchBoardProps {
  alerts: AlertItem[];
  onEvidenceAttached?: (alertId: string) => void;
}

export const CyberResearchBoard: React.FC<CyberResearchBoardProps> = ({
  alerts,
  onEvidenceAttached,
}) => {
  const [queryInput, setQueryInput] = useState('');
  const [indicatorType, setIndicatorType] = useState<string>('keyword');
  const [isLoading, setIsLoading] = useState(false);
  const [activeFinding, setActiveFinding] = useState<ResearchFinding | null>(null);
  const [findingsHistory, setFindingsHistory] = useState<ResearchFinding[]>([]);
  const [errorMessage, setErrorMessage] = useState<{ code: string; message: string } | null>(null);
  const [showPrivacyPreview, setShowPrivacyPreview] = useState(true);

  // Self-test modal / state
  const [isSelfTesting, setIsSelfTesting] = useState(false);
  const [selfTestResult, setSelfTestResult] = useState<ResearchSelfTestResult | null>(null);

  // Attach to alert modal
  const [attachingCard, setAttachingCard] = useState<EvidenceCard | null>(null);
  const [selectedAlertId, setSelectedAlertId] = useState<string>(alerts[0]?.id || '');
  const [attachNote, setAttachNote] = useState('');
  const [isAttaching, setIsAttaching] = useState(false);
  const [attachSuccessMsg, setAttachSuccessMsg] = useState<string | null>(null);

  // Feedback note editing
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [cardNoteInput, setCardNoteInput] = useState('');

  // Delete history confirm
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Load existing research history on mount
  useEffect(() => {
    let isMounted = true;
    api.getResearchHistory()
      .then((res) => {
        if (isMounted && res && res.findings) {
          setFindingsHistory(res.findings);
          if (res.findings.length > 0) {
            setActiveFinding((prev) => prev || res.findings[0]);
          }
        }
      })
      .catch((err) => {
        console.warn('Failed to load research history on mount:', err);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Client-side quick redactor preview
  const getPreflightRedaction = (input: string) => {
    let preview = input;
    const redactions: string[] = [];

    if (/(ghp_[a-zA-Z0-9]{36}|sk-[a-zA-Z0-9]{20,}|AIza[0-9A-Za-z-_]{35})/g.test(preview)) {
      redactions.push('API Keys / Tokens');
      preview = preview.replace(/(ghp_[a-zA-Z0-9]{36}|sk-[a-zA-Z0-9]{20,}|AIza[0-9A-Za-z-_]{35})/g, '[REDACTED_API_KEY]');
    }
    if (/((?:password|passwd|secret|pin|credential|token|bearer)[=:\s]+)([^\s&",]+)/gi.test(preview)) {
      redactions.push('Credentials / Passwords');
      preview = preview.replace(/((?:password|passwd|secret|pin|credential|token|bearer)[=:\s]+)([^\s&",]+)/gi, '$1[REDACTED_CREDENTIAL]');
    }
    if (/([A-Za-z]:\\[^"'\n\r\t<>|]+|\/(?:Users|home|root|etc|var|tmp)\/[^\s"']+)/g.test(preview)) {
      redactions.push('Local File Paths');
      preview = preview.replace(/([A-Za-z]:\\[^"'\n\r\t<>|]+|\/(?:Users|home|root|etc|var|tmp)\/[^\s"']+)/g, '[REDACTED_LOCAL_PATH]');
    }
    if (/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g.test(preview)) {
      redactions.push('Email Identifiers');
      preview = preview.replace(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, '[REDACTED_EMAIL]');
    }
    return { preview, redactions };
  };

  const currentRedaction = getPreflightRedaction(queryInput);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!queryInput.trim()) return;

    setIsLoading(true);
    setErrorMessage(null);
    setAttachSuccessMsg(null);

    try {
      const finding = await api.queryResearch(queryInput.trim(), indicatorType);
      setActiveFinding(finding);
      setFindingsHistory((prev) => [finding, ...prev.filter((f) => f.id !== finding.id)]);
    } catch (err: any) {
      setErrorMessage({
        code: err.error || 'RESEARCH_QUERY_FAILED',
        message: err.message || 'Unable to execute research query. Check safe boundary constraints.',
      });
      setActiveFinding(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeedbackChange = async (cardId: string, status: AnalystReviewStatus) => {
    if (!activeFinding) return;
    try {
      const res = await api.submitResearchFeedback({
        finding_id: activeFinding.id,
        card_id: cardId,
        review_status: status,
      });

      // Local update only
      setActiveFinding((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          evidence_cards: prev.evidence_cards.map((c) => (c.id === cardId ? res.card : c)),
        };
      });
    } catch (err: any) {
      console.error('Feedback error:', err);
    }
  };

  const handleSaveCardNote = async (cardId: string) => {
    if (!activeFinding) return;
    try {
      const res = await api.submitResearchFeedback({
        finding_id: activeFinding.id,
        card_id: cardId,
        note: cardNoteInput,
      });

      setActiveFinding((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          evidence_cards: prev.evidence_cards.map((c) => (c.id === cardId ? res.card : c)),
        };
      });
      setEditingCardId(null);
      setCardNoteInput('');
    } catch (err: any) {
      console.error('Save note error:', err);
    }
  };

  const handleAttachSubmit = async () => {
    if (!activeFinding || !attachingCard || !selectedAlertId) return;
    setIsAttaching(true);
    try {
      await api.attachResearchToAlert({
        finding_id: activeFinding.id,
        card_id: attachingCard.id,
        alert_id: selectedAlertId,
        note: attachNote,
      });

      setAttachSuccessMsg(`Evidence successfully attached to alert ${selectedAlertId}. Logged in timeline.`);
      if (onEvidenceAttached) onEvidenceAttached(selectedAlertId);
      setAttachingCard(null);
      setAttachNote('');
    } catch (err: any) {
      setErrorMessage({
        code: 'ATTACH_FAILED',
        message: err.message || 'Failed to attach evidence finding to alert.',
      });
    } finally {
      setIsAttaching(false);
    }
  };

  const handleRunSelfTest = async () => {
    setIsSelfTesting(true);
    try {
      const result = await api.runResearchSelfTest();
      setSelfTestResult(result);
    } catch (err: any) {
      console.error('Self test error:', err);
    } finally {
      setIsSelfTesting(false);
    }
  };

  const handleExportData = async () => {
    try {
      const data = await api.exportResearchData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CyberResearch_Audit_${new Date().toISOString().substring(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Export error:', err);
    }
  };

  const handleDeleteHistory = async () => {
    try {
      await api.deleteResearchHistory();
      setFindingsHistory([]);
      setActiveFinding(null);
      setShowDeleteConfirm(false);
    } catch (err: any) {
      console.error('Delete error:', err);
    }
  };

  const getClassificationBadge = (cls: EvidenceClassification) => {
    const colors: Record<EvidenceClassification, string> = {
      Confirmed: 'bg-emerald-100 text-emerald-900 border-emerald-300',
      Reported: 'bg-blue-100 text-blue-900 border-blue-300',
      Inferred: 'bg-indigo-100 text-indigo-900 border-indigo-300',
      Contradicted: 'bg-rose-100 text-rose-900 border-rose-300 font-bold',
      Stale: 'bg-amber-100 text-amber-900 border-amber-300',
      Synthetic: 'bg-purple-100 text-purple-900 border-purple-300',
    };
    return (
      <span
        className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider border ${colors[cls] || 'bg-slate-100 text-slate-800 border-slate-300'}`}
        aria-label={`Classification: ${cls}`}
      >
        {cls}
      </span>
    );
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
      {/* Header Banner */}
      <section
        role="region"
        aria-label="Cyber Research Board Overview"
        className="p-6 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700">
              <ShieldCheck className="w-5 h-5" aria-hidden="true" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Cyber Research Board
            </h1>
          </div>
          <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
            Safe, read-only defensive threat intelligence lookup. Enforces strict safe-research boundaries:
            public read-only sources only, loopback/private IP blocking, pre-flight privacy redaction, and deterministic evidence attribution.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleRunSelfTest}
            disabled={isSelfTesting}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-50"
            aria-label="Run automated synthetic self test"
          >
            {isSelfTesting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 text-emerald-600" />
            )}
            <span>Run Synthetic Self-Test</span>
          </button>

          <button
            onClick={handleExportData}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            aria-label="Export research audit ledger"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Intel</span>
          </button>

          {findingsHistory.length > 0 && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
              aria-label="Purge local research history"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Purge History</span>
            </button>
          )}
        </div>
      </section>

      {/* Query Bar & Pre-flight Inspection */}
      <section
        role="region"
        aria-label="Defensive Query Interface"
        className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4"
      >
        <form onSubmit={handleSearch} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                placeholder="Search CVE (e.g. CVE-2026-1044), SHA-256 hash, domain, IP, or threat keyword..."
                className="w-full pl-9 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-colors font-mono"
                aria-label="Search threat indicator"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={indicatorType}
                onChange={(e) => setIndicatorType(e.target.value)}
                className="px-3 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                aria-label="Select indicator type"
              >
                <option value="keyword">Auto-Detect</option>
                <option value="cve">CVE ID</option>
                <option value="hash">SHA-256 Hash</option>
                <option value="domain">Domain</option>
                <option value="ip">Public IP</option>
                <option value="url">URL</option>
              </select>

              <button
                type="submit"
                disabled={isLoading || !queryInput.trim()}
                className="flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:opacity-50 shrink-0"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" />
                    <span>Run Safe Research</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Pre-Flight "What Leaves The Device" Preview */}
          {queryInput.trim().length > 0 && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <Eye className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Pre-Flight Privacy & Redaction Inspector</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">
                  {currentRedaction.redactions.length > 0
                    ? `Protected: ${currentRedaction.redactions.join(', ')}`
                    : 'Zero sensitive data patterns detected'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 font-mono text-[11px]">
                <div className="p-2 rounded bg-white border border-slate-200 text-slate-600 truncate">
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Input Query:</span>
                  {queryInput}
                </div>
                <div className="p-2 rounded bg-white border border-slate-200 text-emerald-800 truncate">
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">What Leaves Device:</span>
                  {currentRedaction.preview}
                </div>
              </div>
            </div>
          )}
        </form>

        {/* Boundary Notice */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>Strict Boundary: Localhost, 127.0.0.1, private IPs, and cloud metadata endpoints are rejected.</span>
          </div>
          <span className="font-semibold text-slate-700">Read-Only Threat Intel</span>
        </div>

        {/* Recent Lookups History Chips */}
        {findingsHistory.length > 0 && (
          <div className="pt-2 border-t border-slate-100 flex items-center gap-2 overflow-x-auto text-xs">
            <span className="text-[11px] font-semibold text-slate-500 shrink-0">Recent Lookups:</span>
            <div className="flex items-center gap-1.5 flex-nowrap">
              {findingsHistory.slice(0, 6).map((f) => (
                <button
                  key={f.id}
                  onClick={() => {
                    setActiveFinding(f);
                    setQueryInput(f.query);
                    setErrorMessage(null);
                  }}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-mono shrink-0 transition-colors border ${
                    activeFinding?.id === f.id
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {f.sanitized_query}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Error / Boundary Rejection Banner */}
      {errorMessage && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-3 shadow-xs"
        >
          <AlertOctagon className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold block uppercase tracking-wider text-[11px]">
              {errorMessage.code}
            </span>
            <p className="leading-relaxed">{errorMessage.message}</p>
          </div>
        </div>
      )}

      {/* Success Banner */}
      {attachSuccessMsg && (
        <div
          role="status"
          className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2 shadow-xs"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{attachSuccessMsg}</span>
        </div>
      )}

      {/* Self-Test Results Panel */}
      {selfTestResult && (
        <section
          role="region"
          aria-label="Built-in Self Test Results"
          className="p-6 rounded-2xl bg-white border border-emerald-200 shadow-sm space-y-4"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <h2 className="text-base font-bold text-slate-900">
                Automated Synthetic Self-Test Execution
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                100% SYNTHETIC FIXTURES
              </span>
              <button
                onClick={() => setSelfTestResult(null)}
                className="text-xs text-slate-400 hover:text-slate-600 p-1"
                aria-label="Dismiss self test results"
              >
                &times;
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Verified with synthetic values (example[.]com, 198.51.100.10, fake SHA-256 hash, CVE-0000-0000, DarkMock-Sim)
            without contacting real targets.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            {selfTestResult.checks.map((c, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1 text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">{c.name}</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                    PASSED
                  </span>
                </div>
                <p className="text-slate-600 leading-normal text-[11px]">{c.details}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Active Research Finding View */}
      {activeFinding && (
        <section
          role="region"
          aria-label="Research Evidence and Findings"
          className="space-y-6"
        >
          {/* Finding Header */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded font-mono font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                  {activeFinding.indicator_type}
                </span>
                <h2 className="text-base font-bold text-slate-900 font-mono">
                  {activeFinding.sanitized_query}
                </h2>
                {activeFinding.is_synthetic && (
                  <span className="text-[10px] px-1.5 py-0.2 rounded font-bold uppercase bg-purple-100 text-purple-800 border border-purple-200">
                    Synthetic Fixture
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Retrieval Timestamp: {new Date(activeFinding.created_at_utc).toLocaleString()} · Destination Host: {activeFinding.what_left_device.destination_host}
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 font-medium">Evidence Cards Extracted:</span>
              <span className="font-bold text-slate-900 px-2 py-0.5 rounded bg-slate-100">
                {activeFinding.evidence_cards.length}
              </span>
            </div>
          </div>

          {/* Contradiction Warning Banner if any */}
          {activeFinding.contradictions && activeFinding.contradictions.length > 0 && (
            <div
              role="alert"
              className="p-5 rounded-2xl bg-amber-50 border border-amber-200 shadow-xs space-y-3"
            >
              <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <span>Source Contradiction Detected — Marked as "Needs Review"</span>
              </div>
              {activeFinding.contradictions.map((contra) => (
                <div key={contra.id} className="text-xs text-amber-950 space-y-1 leading-relaxed">
                  <p className="font-semibold">{contra.plain_english_explanation}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
                    <div className="p-2 rounded bg-white/80 border border-amber-200">
                      <span className="font-bold text-slate-700 block">{contra.claim_a.source}:</span>
                      {contra.claim_a.claim}
                    </div>
                    <div className="p-2 rounded bg-white/80 border border-amber-200">
                      <span className="font-bold text-slate-700 block">{contra.claim_b.source}:</span>
                      {contra.claim_b.claim}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Evidence Cards List */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Extracted Evidence Cards</h3>

            <div className="grid grid-cols-1 gap-4">
              {activeFinding.evidence_cards.map((card) => {
                const isCardStale =
                  card.publication_date_utc &&
                  (Date.now() - new Date(card.publication_date_utc).getTime()) / (1000 * 3600 * 24) > 180;

                return (
                  <article
                    key={card.id}
                    className="p-5 rounded-xl bg-white border border-slate-200/90 shadow-xs hover:border-slate-300 transition-colors space-y-4"
                  >
                    {/* Card Top Details */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        {getClassificationBadge(card.classification)}
                        <span className="text-xs font-semibold text-slate-700">
                          {card.source_name}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                          Trust: {card.trust_level}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-slate-500 font-medium">Confidence:</span>
                        <span className="font-bold font-mono text-emerald-700">
                          {(card.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>

                    {/* Stale Warning Banner if >180 days */}
                    {isCardStale && (
                      <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>
                          Stale Threat Intel Warning: This publication date is over 180 days old. Verify with recent telemetry.
                        </span>
                      </div>
                    )}

                    {/* Direct Quote */}
                    <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/80 text-xs text-slate-800 leading-relaxed font-sans italic">
                      "{card.direct_quote_or_fact}"
                    </div>

                    {/* Source URLs & Technical Metadata */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-[11px] text-slate-600 font-mono">
                      <div className="truncate">
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">Exact Source URL:</span>
                        <a
                          href={card.exact_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-emerald-700 hover:underline inline-flex items-center gap-1"
                        >
                          <span className="truncate">{card.exact_url}</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      </div>

                      {card.redirect_destination && (
                        <div className="truncate">
                          <span className="text-slate-400 block text-[9px] uppercase font-bold">Redirect Destination:</span>
                          <span className="text-slate-700 truncate">{card.redirect_destination}</span>
                        </div>
                      )}

                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">Publication Date:</span>
                        <span>{card.publication_date_utc ? new Date(card.publication_date_utc).toLocaleDateString() : 'Not published'}</span>
                      </div>

                      <div>
                        <span className="text-slate-400 block text-[9px] uppercase font-bold">Retrieval Time:</span>
                        <span>{new Date(card.retrieval_timestamp_utc).toLocaleTimeString()}</span>
                      </div>
                    </div>

                    {/* ATT&CK Tactics */}
                    {card.att_ck_tactics && card.att_ck_tactics.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[10px] uppercase font-bold text-slate-400">ATT&CK Mapping:</span>
                        {card.att_ck_tactics.map((tactic, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-100 text-slate-700 border border-slate-200"
                          >
                            {tactic}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Analyst Review & Action Controls */}
                    <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
                      {/* Feedback buttons */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-semibold text-slate-500 mr-1">Analyst Status:</span>
                        {(['Relevant', 'False positive', 'Stale', 'Contradicted', 'Unresolved'] as AnalystReviewStatus[]).map((st) => (
                          <button
                            key={st}
                            onClick={() => handleFeedbackChange(card.id, st)}
                            className={`px-2.5 py-1 text-[11px] font-semibold rounded-md border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                              card.review_status === st
                                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                            }`}
                            aria-label={`Set status to ${st}`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingCardId(editingCardId === card.id ? null : card.id);
                            setCardNoteInput(card.analyst_notes || '');
                          }}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-slate-600" />
                          <span>{card.analyst_notes ? 'Edit Note' : 'Add Note'}</span>
                        </button>

                        <button
                          onClick={() => {
                            setAttachingCard(card);
                            setAttachSuccessMsg(null);
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                        >
                          <Paperclip className="w-3.5 h-3.5" />
                          <span>Attach to Alert</span>
                        </button>
                      </div>
                    </div>

                    {/* Analyst Note Editor */}
                    {editingCardId === card.id && (
                      <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                        <label htmlFor={`card-note-${card.id}`} className="block text-xs font-semibold text-slate-700">
                          Analyst Notes & Context
                        </label>
                        <textarea
                          id={`card-note-${card.id}`}
                          value={cardNoteInput}
                          onChange={(e) => setCardNoteInput(e.target.value)}
                          placeholder="Document your threat assessment, observed false positive rationale, or escalation notes..."
                          rows={2}
                          className="w-full p-2 text-xs bg-white border border-slate-300 rounded-md text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingCardId(null)}
                            className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-900"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveCardNote(card.id)}
                            className="px-3 py-1 text-xs font-semibold bg-slate-900 text-white rounded-md hover:bg-slate-800"
                          >
                            Save Note
                          </button>
                        </div>
                      </div>
                    )}

                    {card.analyst_notes && editingCardId !== card.id && (
                      <div className="p-2.5 rounded-lg bg-emerald-50/60 border border-emerald-200/80 text-xs text-emerald-950 flex items-start gap-2">
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-700 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-emerald-900">Analyst Note: </span>
                          <span>{card.analyst_notes}</span>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Empty State when no active finding is selected */}
      {!activeFinding && !isLoading && (
        <section
          role="region"
          aria-label="Threat Intel Lookup Guidance"
          className="p-8 rounded-2xl bg-white border border-slate-200 shadow-xs text-center space-y-4"
        >
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto">
            <Search className="w-6 h-6" />
          </div>

          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-sm font-bold text-slate-900">
              Safe Threat Intelligence Analysis
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Enter any CVE vulnerability ID, file SHA-256 hash, domain name, or executable name to extract structured threat evidence, ATT&CK mapping, and contradiction analysis.
            </p>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
            <span className="text-[11px] font-semibold text-slate-500">Quick Test Indicators:</span>
            {[
              { label: 'CVE-2026-1044', type: 'cve' },
              { label: 'powershell.exe', type: 'keyword' },
              { label: '198.51.100.10', type: 'ip' },
              { label: 'DarkMock-Sim', type: 'keyword' },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  setQueryInput(item.label);
                  setIndicatorType(item.type);
                }}
                className="px-2.5 py-1 rounded-md text-xs font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
              >
                {item.label}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Attach To Alert Modal */}
      {attachingCard && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Paperclip className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">Attach Finding to Existing Alert</h3>
              </div>
              <button
                onClick={() => setAttachingCard(null)}
                className="text-slate-400 hover:text-slate-600 text-lg"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Attaching research logs the source URL, retrieval timestamp, analyst action, and confidence to the alert's timeline.
              <strong className="block mt-1 text-slate-900 font-semibold">
                Invariant: This operation never automatically alters panic mode, closes alerts, or executes remediations.
              </strong>
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Target Alert
                </label>
                <select
                  value={selectedAlertId}
                  onChange={(e) => setSelectedAlertId(e.target.value)}
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-medium focus:ring-2 focus:ring-emerald-500"
                >
                  {alerts.map((alt) => (
                    <option key={alt.id} value={alt.id}>
                      [{alt.severity.toUpperCase()}] {alt.title} ({alt.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Analyst Rationale Note (Optional)
                </label>
                <input
                  type="text"
                  value={attachNote}
                  onChange={(e) => setAttachNote(e.target.value)}
                  placeholder="e.g. Confirmed IoC matches LOLBin command parameters observed in process tree."
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAttachingCard(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isAttaching}
                onClick={handleAttachSubmit}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {isAttaching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Paperclip className="w-3.5 h-3.5" />}
                <span>Attach to Alert Timeline</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-2 text-rose-700">
              <Trash2 className="w-5 h-5" />
              <h3 className="text-sm font-bold">Permanently Delete Local Research History?</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              This will permanently purge all local research findings and cached evidence cards from this device. An audit event will be recorded in the local log.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteHistory}
                className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors"
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
