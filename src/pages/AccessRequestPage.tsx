import React, { useState } from 'react';
import { 
  KeyRound, 
  Cpu, 
  Database, 
  ShieldCheck, 
  ArrowRight, 
  HelpCircle, 
  Sparkles, 
  Info, 
  Layers, 
  Lock, 
  Camera, 
  Server, 
  Radio, 
  SlidersHorizontal,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Blocks,
  User,
  Copy,
  Check,
  ChevronRight,
  ExternalLink,
  Eye,
  AlertCircle
} from 'lucide-react';
import { IoTDevice, UserAccount, ViewTab, AccessRequest, BlockchainTransaction } from '../types';
import { StorageService } from '../services/storageService';

interface AccessRequestPageProps {
  devices: IoTDevice[];
  activeUser: UserAccount | null;
  accessLogs?: AccessRequest[];
  transactions?: BlockchainTransaction[];
  preselectedDevice?: IoTDevice | null;
  onInitiateAnalysis: (
    deviceId: string, 
    resource: string, 
    reason: string,
    result: any
  ) => void;
  onNavigate: (tab: ViewTab) => void;
}

const RESOURCES = [
  { id: 'Smart Door', name: 'Smart Door Biometrics', icon: Lock, desc: 'Perimeter physical entry & magnetic turnstiles' },
  { id: 'Security Camera Stream', name: 'Camera H.265 Stream', icon: Camera, desc: 'Real-time encrypted video surveillance telemetry feed' },
  { id: 'Temperature Sensor Feed', name: 'Environmental Telemetry', icon: Radio, desc: 'Server room HVAC, humidity and rack temperature data' },
  { id: 'Database Logs', name: 'Database Audit Ledger', icon: Database, desc: 'Encrypted SQL & Spanner historical transaction logs' },
  { id: 'Network Gateway', name: 'Edge Gateway VLAN Core', icon: Server, desc: 'Hardware switch routing tables and boundary firewall ports' },
  { id: 'Admin Configuration', name: 'Cryptographic Key Vault', icon: SlidersHorizontal, desc: 'Zero-trust root certificate & authorization policy manager' },
];

export const AccessRequestPage: React.FC<AccessRequestPageProps> = ({
  devices,
  activeUser,
  accessLogs,
  transactions,
  preselectedDevice,
  onInitiateAnalysis,
  onNavigate
}) => {
  const isAdmin = activeUser?.role === 'ADMIN' && activeUser?.email.toLowerCase() === StorageService.FIXED_ADMIN_EMAIL.toLowerCase();

  // Admin View State
  const [adminSearchQuery, setAdminSearchQuery] = useState('');
  const [adminDecisionFilter, setAdminDecisionFilter] = useState<'ALL' | 'ALLOW' | 'LIMITED' | 'DENY'>('ALL');
  const [inspectRequest, setInspectRequest] = useState<AccessRequest | null>(null);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  // Normal User Request Form State
  const assignedDeviceIds = activeUser?.assignedDevices || [];
  const userAuthorizedDevices = devices.filter(d => 
    assignedDeviceIds.includes(d.deviceId) || d.assignedUserId === activeUser?.id
  );

  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(
    preselectedDevice?.deviceId || (userAuthorizedDevices[0]?.deviceId || '')
  );
  const [selectedResource, setSelectedResource] = useState<string>('Security Camera Stream');
  const [reason, setReason] = useState<string>('Routine operational audit and sensor telemetry inspection');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSubmissionResult, setLastSubmissionResult] = useState<any | null>(null);

  const allLogs = accessLogs || StorageService.getAccessLogs();

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  // Normal User Submission Handler
  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeviceId || !selectedResource || !activeUser) return;

    setIsSubmitting(true);
    setLastSubmissionResult(null);

    try {
      const result = await StorageService.processAccessRequest(
        activeUser.id,
        activeUser.name,
        selectedDeviceId,
        selectedResource,
        reason
      );

      setLastSubmissionResult(result);
      onInitiateAnalysis(selectedDeviceId, selectedResource, reason, result);
    } catch (err) {
      console.error('Access request failed:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // =========================================================================
  // 1. ADMIN VIEW: Viewing and Monitoring Access Requests from ALL users
  // (NO "Request Access" button or form for Admin)
  // =========================================================================
  if (isAdmin) {
    const filteredAdminLogs = allLogs.filter(log => {
      const matchesSearch = 
        log.userName.toLowerCase().includes(adminSearchQuery.toLowerCase()) ||
        log.deviceId.toLowerCase().includes(adminSearchQuery.toLowerCase()) ||
        log.resource.toLowerCase().includes(adminSearchQuery.toLowerCase()) ||
        (log.transactionHash && log.transactionHash.toLowerCase().includes(adminSearchQuery.toLowerCase())) ||
        log.reason.toLowerCase().includes(adminSearchQuery.toLowerCase());
      const matchesFilter = adminDecisionFilter === 'ALL' || log.decision === adminDecisionFilter;
      return matchesSearch && matchesFilter;
    });

    const allowTotal = allLogs.filter(l => l.decision === 'ALLOW').length;
    const limitedTotal = allLogs.filter(l => l.decision === 'LIMITED').length;
    const denyTotal = allLogs.filter(l => l.decision === 'DENY').length;

    return (
      <div className="space-y-6">
        
        {/* Admin Header */}
        <div className="p-6 rounded-3xl bg-[#001032] border border-white/10 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#000028] border border-white/10 flex items-center justify-center text-[#00e5ff] shadow-[0_0_15px_rgba(0,229,255,0.25)]">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-mono font-bold tracking-widest text-[#00e5ff] uppercase">Central SOC Monitoring</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                Access Requests Monitoring
              </h2>
              <p className="text-xs text-slate-300">
                Surveillance and verification of access requests submitted by all users across the IoT environment
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono px-3 py-1.5 rounded-full bg-[#00646e]/30 text-[#00e5ff] border border-[#00646e] font-bold">
              Admin Surveillance Mode Active
            </span>
          </div>
        </div>

        {/* 4 Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-[#001032] border border-white/10 shadow-md">
            <span className="text-[10px] uppercase font-mono text-slate-400 font-bold block">Total Requests</span>
            <div className="text-2xl sm:text-3xl font-black font-mono text-white mt-1">
              {allLogs.length}
            </div>
            <span className="text-[10px] text-slate-400 mt-1 block">From All Users</span>
          </div>

          <div className="p-4 rounded-2xl bg-[#001032] border border-white/10 shadow-md">
            <span className="text-[10px] uppercase font-mono text-emerald-400 font-bold block">ALLOW Decisions</span>
            <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-400 mt-1">
              {allowTotal}
            </div>
            <span className="text-[10px] text-emerald-300/80 mt-1 block">Risk 0–30 Baseline</span>
          </div>

          <div className="p-4 rounded-2xl bg-[#001032] border border-white/10 shadow-md">
            <span className="text-[10px] uppercase font-mono text-amber-400 font-bold block">LIMITED Decisions</span>
            <div className="text-2xl sm:text-3xl font-black font-mono text-amber-400 mt-1">
              {limitedTotal}
            </div>
            <span className="text-[10px] text-amber-300/80 mt-1 block">Risk 31–60 Policy</span>
          </div>

          <div className="p-4 rounded-2xl bg-[#001032] border border-white/10 shadow-md">
            <span className="text-[10px] uppercase font-mono text-rose-400 font-bold block">DENY Decisions</span>
            <div className="text-2xl sm:text-3xl font-black font-mono text-rose-400 mt-1">
              {denyTotal}
            </div>
            <span className="text-[10px] text-rose-300/80 mt-1 block">Risk 61–100 Blocked</span>
          </div>
        </div>

        {/* Requests Table Container */}
        <div className="p-6 rounded-3xl bg-[#001032] border border-white/10 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-[#00e5ff]" />
                <span>Submitted User Access Requests ({filteredAdminLogs.length})</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Inspect AI risk classification, policy outcome, and on-chain verification hash
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
              {/* Search Input */}
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Filter by user, device, hash..."
                  value={adminSearchQuery}
                  onChange={(e) => setAdminSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#000028] border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00646e]"
                />
              </div>

              {/* Decision Filter Pills */}
              <div className="flex items-center gap-1 bg-[#000028] p-1 rounded-xl border border-white/10">
                {(['ALL', 'ALLOW', 'LIMITED', 'DENY'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setAdminDecisionFilter(filter)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer ${
                      adminDecisionFilter === filter
                        ? 'bg-[#00646e] text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {filteredAdminLogs.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs font-mono">
                No access requests match the specified search or filter criteria.
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 font-mono text-[10px] uppercase bg-[#000028]/60">
                    <th className="py-3 px-3.5 rounded-l-lg">User</th>
                    <th className="py-3 px-3.5">Device</th>
                    <th className="py-3 px-3.5">Resource</th>
                    <th className="py-3 px-3.5">Risk Score</th>
                    <th className="py-3 px-3.5">Trust Score</th>
                    <th className="py-3 px-3.5">AI Classification</th>
                    <th className="py-3 px-3.5">Decision</th>
                    <th className="py-3 px-3.5">Reason</th>
                    <th className="py-3 px-3.5">Timestamp</th>
                    <th className="py-3 px-3.5 text-right rounded-r-lg">Transaction Hash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono">
                  {filteredAdminLogs.map((log) => {
                    const aiClass = log.prediction || (
                      log.decision === 'ALLOW' ? 'NORMAL' :
                      log.decision === 'LIMITED' ? 'SUSPICIOUS' : 'HIGH_RISK'
                    );

                    return (
                      <tr 
                        key={log.id}
                        onClick={() => setInspectRequest(log)}
                        className="hover:bg-white/5 transition-colors cursor-pointer group"
                      >
                        {/* User */}
                        <td className="py-3 px-3.5">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-[#00646e] text-white flex items-center justify-center font-bold text-[10px] font-sans">
                              {log.userName.charAt(0)}
                            </div>
                            <span className="font-bold text-white font-sans truncate max-w-[120px]">
                              {log.userName}
                            </span>
                          </div>
                        </td>

                        {/* Device */}
                        <td className="py-3 px-3.5 font-bold text-[#00e5ff]">
                          {log.deviceId}
                        </td>

                        {/* Resource */}
                        <td className="py-3 px-3.5 text-slate-200 font-sans">
                          {log.resource}
                        </td>

                        {/* Risk Score */}
                        <td className="py-3 px-3.5">
                          <span className={`font-bold ${
                            log.riskScore > 60 ? 'text-rose-400' : 
                            log.riskScore > 30 ? 'text-amber-400' : 'text-emerald-400'
                          }`}>
                            {log.riskScore}/100
                          </span>
                        </td>

                        {/* Trust Score */}
                        <td className="py-3 px-3.5 text-slate-200">
                          {log.trustScore}/100
                        </td>

                        {/* AI Classification */}
                        <td className="py-3 px-3.5">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider ${
                            aiClass === 'NORMAL' 
                              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800' 
                              : aiClass === 'SUSPICIOUS'
                              ? 'bg-amber-950/80 text-amber-300 border border-amber-800'
                              : 'bg-rose-950/80 text-rose-300 border border-rose-800'
                          }`}>
                            {aiClass}
                          </span>
                        </td>

                        {/* Decision */}
                        <td className="py-3 px-3.5 font-bold">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] inline-block ${
                            log.decision === 'ALLOW' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                            log.decision === 'LIMITED' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                            'bg-rose-950 text-rose-300 border border-rose-800'
                          }`}>
                            {log.decision}
                          </span>
                        </td>

                        {/* Reason */}
                        <td className="py-3 px-3.5 text-slate-300 font-sans text-xs max-w-[180px] truncate" title={log.reason}>
                          {log.reason}
                        </td>

                        {/* Timestamp */}
                        <td className="py-3 px-3.5 text-slate-400 font-sans text-[11px] whitespace-nowrap">
                          {log.timestamp}
                        </td>

                        {/* Transaction Hash */}
                        <td className="py-3 px-3.5 text-right font-mono text-[#00e5ff] whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <span title={log.transactionHash}>
                              {log.transactionHash ? `${log.transactionHash.substring(0, 8)}...${log.transactionHash.slice(-4)}` : '0x...'}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); handleCopy(log.transactionHash); }}
                              className="p-1 hover:bg-white/10 rounded text-slate-400 hover:text-white"
                              title="Copy transaction hash"
                            >
                              {copiedHash === log.transactionHash ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Request Inspection Modal */}
        {inspectRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
            <div className="w-full max-w-xl bg-[#001032] border border-white/20 rounded-3xl shadow-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#000028] border border-white/10 flex items-center justify-center text-[#00e5ff]">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Access Request Details</h3>
                    <p className="text-[11px] text-slate-400 font-mono">ID: {inspectRequest.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setInspectRequest(null)}
                  className="px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 text-xs"
                >
                  Close
                </button>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div className="grid grid-cols-2 gap-3 p-3.5 rounded-2xl bg-[#000028] border border-white/10">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Requesting User</span>
                    <span className="text-white font-bold font-sans">{inspectRequest.userName}</span>
                    <span className="text-[10px] text-slate-500 block truncate">{inspectRequest.userId}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Target Device & Resource</span>
                    <span className="text-[#00e5ff] font-bold">{inspectRequest.deviceId}</span>
                    <span className="text-[11px] text-slate-300 font-sans block">{inspectRequest.resource}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2.5 p-3.5 rounded-2xl bg-[#000028] border border-white/10 text-center">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Decision</span>
                    <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                      inspectRequest.decision === 'ALLOW' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                      inspectRequest.decision === 'LIMITED' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                      'bg-rose-950 text-rose-300 border border-rose-800'
                    }`}>
                      {inspectRequest.decision}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Risk Score</span>
                    <span className="text-white font-bold text-base mt-1 block">
                      {inspectRequest.riskScore}<span className="text-slate-500 text-xs">/100</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Trust Score</span>
                    <span className="text-[#00e5ff] font-bold text-base mt-1 block">
                      {inspectRequest.trustScore}<span className="text-slate-500 text-xs">/100</span>
                    </span>
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#000028] border border-white/10 space-y-1.5">
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">AI Explanation & Policy Justification</span>
                  <p className="text-slate-200 font-sans text-xs leading-relaxed">
                    {inspectRequest.reason}
                  </p>
                  {inspectRequest.reasons && inspectRequest.reasons.length > 0 && (
                    <ul className="list-disc pl-4 text-[11px] text-slate-300 font-sans space-y-0.5 mt-1">
                      {inspectRequest.reasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="p-3.5 rounded-2xl bg-[#000028] border border-white/10 space-y-1">
                  <div className="flex justify-between items-center text-[10px] uppercase font-bold text-slate-400">
                    <span>Smart Contract Proof (Remix VM)</span>
                    <span className="text-emerald-400 font-bold">Block #{inspectRequest.blockNumber}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-xs text-[#00e5ff] break-all bg-black/40 p-2 rounded-xl flex-1 border border-white/10">
                      {inspectRequest.transactionHash}
                    </code>
                    <button
                      onClick={() => handleCopy(inspectRequest.transactionHash)}
                      className="p-2 rounded-xl bg-[#00646e] hover:bg-[#00828f] text-white"
                      title="Copy Hash"
                    >
                      {copiedHash === inspectRequest.transactionHash ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1 font-sans">
                    Committed on: {inspectRequest.timestamp}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end pt-2 border-t border-white/10">
                <button
                  onClick={() => setInspectRequest(null)}
                  className="px-5 py-2.5 rounded-full bg-[#00646e] text-white font-bold text-xs uppercase cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    );
  }

  // =========================================================================
  // 2. NORMAL USER VIEW: Zero-Trust Access Request Page
  // User selects an assigned device, resource, and submits for AI evaluation
  // =========================================================================
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="p-6 rounded-3xl bg-[#001032] border border-white/10 shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#000028] border border-white/10 flex items-center justify-center text-[#00e5ff] shadow-[0_0_15px_rgba(0,229,255,0.25)]">
            <KeyRound className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-mono font-bold tracking-widest text-[#00e5ff] uppercase">Zero-Trust Gate</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-white">
              Request IoT Resource Access
            </h2>
            <p className="text-xs text-slate-300">
              Submit an access request for your authorized devices for continuous AI risk evaluation
            </p>
          </div>
        </div>

        <span className="text-[10px] font-mono px-3 py-1 rounded-full bg-[#00646e]/30 text-[#00e5ff] border border-[#00646e] hidden sm:inline-block font-bold">
          Policy: 0-30 ALLOW | 31-60 LIMITED | 61-100 DENY
        </span>
      </div>

      {/* Immediate Result Card if Just Submitted */}
      {lastSubmissionResult && (
        <div className={`p-6 rounded-3xl border shadow-2xl space-y-4 animate-in fade-in slide-in-from-top-4 ${
          lastSubmissionResult.evalResult.decision === 'ALLOW'
            ? 'bg-[#001a1a] border-emerald-500/50 shadow-emerald-950/40'
            : lastSubmissionResult.evalResult.decision === 'LIMITED'
            ? 'bg-[#1a1400] border-amber-500/50 shadow-amber-950/40'
            : 'bg-[#1a0006] border-rose-500/50 shadow-rose-950/40'
        }`}>
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-3">
              {lastSubmissionResult.evalResult.decision === 'ALLOW' ? (
                <CheckCircle2 className="w-7 h-7 text-emerald-400" />
              ) : lastSubmissionResult.evalResult.decision === 'LIMITED' ? (
                <AlertTriangle className="w-7 h-7 text-amber-400" />
              ) : (
                <XCircle className="w-7 h-7 text-rose-400" />
              )}
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold block">
                  Adaptive Access Decision
                </span>
                <h3 className="text-xl font-black text-white flex items-center gap-2">
                  <span>{lastSubmissionResult.evalResult.decision}</span>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-bold ${
                    lastSubmissionResult.evalResult.decision === 'ALLOW' ? 'bg-emerald-950 text-emerald-300 border border-emerald-700' :
                    lastSubmissionResult.evalResult.decision === 'LIMITED' ? 'bg-amber-950 text-amber-300 border border-amber-700' :
                    'bg-rose-950 text-rose-300 border border-rose-700'
                  }`}>
                    Risk: {lastSubmissionResult.evalResult.riskScore}/100
                  </span>
                </h3>
              </div>
            </div>

            <span className="text-[10px] font-mono px-3 py-1 rounded-full bg-white/10 text-white border border-white/20 font-bold">
              AI Class: {lastSubmissionResult.evalResult.prediction || (lastSubmissionResult.evalResult.decision === 'ALLOW' ? 'NORMAL' : lastSubmissionResult.evalResult.decision === 'LIMITED' ? 'SUSPICIOUS' : 'HIGH_RISK')}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
            <div className="p-3 rounded-2xl bg-black/40 border border-white/10 space-y-1">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Request Details</span>
              <p className="text-white font-bold">{lastSubmissionResult.request.deviceId} &rarr; {lastSubmissionResult.request.resource}</p>
              <p className="text-[11px] text-slate-300 font-sans">{lastSubmissionResult.evalResult.explanation || lastSubmissionResult.request.reason}</p>
            </div>

            <div className="p-3 rounded-2xl bg-black/40 border border-white/10 space-y-1">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Smart Contract Commit</span>
              <p className="text-emerald-400 font-bold">Block #{lastSubmissionResult.transaction.blockNumber} (Remix VM)</p>
              <p className="text-[10px] text-[#00e5ff] break-all truncate font-mono" title={lastSubmissionResult.transaction.transactionHash}>
                Tx: {lastSubmissionResult.transaction.transactionHash}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setLastSubmissionResult(null)}
              className="text-xs text-slate-400 hover:text-white font-mono cursor-pointer"
            >
              &larr; Submit Another Request
            </button>
            <button
              onClick={() => onNavigate('blockchain')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#00646e] hover:bg-[#00828f] text-white text-xs font-bold font-mono transition-all cursor-pointer shadow-md"
            >
              <span>View in My Access History</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Request Form */}
      {userAuthorizedDevices.length === 0 ? (
        <div className="p-8 rounded-3xl bg-[#001032] border border-amber-500/30 text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-amber-400 mx-auto" />
          <h3 className="text-base font-bold text-white">No IoT Devices Assigned</h3>
          <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
            Your user account does not currently have any assigned IoT devices. Under the zero-trust policy, requests for unassigned devices are strictly rejected.
          </p>
          <div className="pt-2">
            <span className="text-[11px] font-mono text-[#00e5ff] bg-[#000028] px-3 py-1.5 rounded-xl border border-white/10">
              Please contact the Chief Security Officer to assign hardware nodes to your identity.
            </span>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left 2 Cols: Interactive Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleUserSubmit} className="p-6 sm:p-7 rounded-3xl bg-[#001032] border border-white/10 shadow-xl space-y-5">
              
              {/* Device Selection (User Authorized Devices Only) */}
              <div>
                <label className="block text-xs font-bold text-white uppercase tracking-wider font-mono mb-2.5">
                  1. Select Your Assigned IoT Node ({userAuthorizedDevices.length} Authorized)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-52 overflow-y-auto pr-1">
                  {userAuthorizedDevices.map((dev) => {
                    const isSelected = selectedDeviceId === dev.deviceId;
                    return (
                      <div
                        key={dev.id}
                        onClick={() => setSelectedDeviceId(dev.deviceId)}
                        className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between shadow-md ${
                          isSelected
                            ? 'bg-[#00646e]/30 border-[#00e5ff] shadow-[0_0_15px_rgba(0,229,255,0.25)]'
                            : 'bg-[#000028] border-white/10 hover:border-white/30'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Cpu className={`w-4 h-4 ${isSelected ? 'text-[#00e5ff]' : 'text-slate-400'}`} />
                          <div>
                            <p className="text-xs font-bold font-mono text-white">{dev.deviceId}</p>
                            <p className="text-[10px] text-slate-400 truncate max-w-[120px]">{dev.deviceType}</p>
                          </div>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase ${
                          dev.status === 'ONLINE' ? 'bg-emerald-950 text-emerald-300' : 'bg-amber-950 text-amber-300'
                        }`}>
                          {dev.status}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Resource Selection */}
              <div>
                <label className="block text-xs font-bold text-white uppercase tracking-wider font-mono mb-2.5">
                  2. Target Resource Capability
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {RESOURCES.map((res) => {
                    const Icon = res.icon;
                    const isSelected = selectedResource === res.id;
                    return (
                      <div
                        key={res.id}
                        onClick={() => setSelectedResource(res.id)}
                        className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                          isSelected
                            ? 'bg-[#00646e]/30 border-[#00e5ff] shadow-[0_0_15px_rgba(0,229,255,0.2)]'
                            : 'bg-[#000028] border-white/10 hover:border-white/20'
                        }`}
                      >
                        <div className={`p-2 rounded-xl mt-0.5 ${isSelected ? 'bg-[#00646e] text-white' : 'bg-white/5 text-slate-400'}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-white truncate">{res.name}</p>
                          <p className="text-[10px] text-slate-400 leading-snug line-clamp-2 mt-0.5">{res.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Reason / Purpose */}
              <div>
                <label className="block text-xs font-bold text-white uppercase tracking-wider font-mono mb-1.5">
                  3. Access Reason / Justification
                </label>
                <textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Explain the security purpose for this access request..."
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-[#000028] border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00646e]"
                  required
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isSubmitting || !selectedDeviceId}
                className="w-full py-3.5 rounded-full bg-[#00646e] hover:bg-[#00828f] disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-[0_4px_16px_rgba(0,100,110,0.4)] cursor-pointer"
              >
                {isSubmitting ? (
                  <span>Evaluating AI Behavioral Features...</span>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Submit Access Request</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Right 1 Col: Zero-Trust Security Scope Info */}
          <div className="space-y-4">
            <div className="p-6 rounded-3xl bg-[#001032] border border-white/10 shadow-xl space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Authorization Pipeline
                </h3>
              </div>

              <div className="space-y-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-[#000028] border border-white/10">
                  <span className="text-[#00e5ff] font-bold block text-[11px]">1. Device Verification</span>
                  <span className="text-[10px] text-slate-400">Verifies node is authorized for your profile.</span>
                </div>
                <div className="p-3 rounded-xl bg-[#000028] border border-white/10">
                  <span className="text-emerald-400 font-bold block text-[11px]">2. Random Forest Evaluation</span>
                  <span className="text-[10px] text-slate-400">Scores 6 behavioral features to output 0-100 risk score.</span>
                </div>
                <div className="p-3 rounded-xl bg-[#000028] border border-white/10">
                  <span className="text-amber-400 font-bold block text-[11px]">3. Smart Contract Commit</span>
                  <span className="text-[10px] text-slate-400">Commits decision immutably to EVM ledger.</span>
                </div>
              </div>

              <div className="pt-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => onNavigate('blockchain')}
                  className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#00e5ff] text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer font-mono"
                >
                  <span>My Access History</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
