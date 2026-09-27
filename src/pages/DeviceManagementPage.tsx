import React, { useState } from 'react';
import { 
  Cpu, 
  Plus, 
  Trash2, 
  Power, 
  Activity, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Search, 
  Filter, 
  ExternalLink,
  Sliders,
  Radio,
  Zap,
  RefreshCw,
  KeyRound,
  Shield,
  Layers,
  X,
  User
} from 'lucide-react';
import { IoTDevice, DeviceStatus, ViewTab, UserAccount } from '../types';
import { StorageService } from '../services/storageService';

interface DeviceManagementPageProps {
  devices: IoTDevice[];
  activeUser?: UserAccount | null;
  onRefreshData: () => void;
  onRequestAccessForDevice: (device: IoTDevice) => void;
  onNavigate: (tab: ViewTab) => void;
}

export const DeviceManagementPage: React.FC<DeviceManagementPageProps> = ({
  devices,
  activeUser,
  onRefreshData,
  onRequestAccessForDevice,
  onNavigate
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedDevice, setSelectedDevice] = useState<IoTDevice | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const isAdmin = activeUser?.role === 'ADMIN';
  const allUsers = StorageService.getUsers();

  // New Device Form State
  const [newDeviceId, setNewDeviceId] = useState('');
  const [newDeviceType, setNewDeviceType] = useState('Surveillance Camera');
  const [newIpAddress, setNewIpAddress] = useState('192.168.1.109');
  const [newLocation, setNewLocation] = useState('Building B, Floor 2');
  const [newAssignedUserId, setNewAssignedUserId] = useState('');

  const filteredDevices = devices.filter((d) => {
    const matchSearch = d.deviceId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.deviceType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.ipAddress.includes(searchQuery);
    const matchStatus = statusFilter === 'ALL' || d.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const handleSimulate = (deviceId: string, type: 'NORMAL' | 'SUSPICIOUS' | 'HIGH_RISK') => {
    StorageService.simulateDeviceActivity(deviceId, type);
    onRefreshData();
    if (selectedDevice && selectedDevice.deviceId === deviceId) {
      const updated = StorageService.getDevices().find(d => d.deviceId === deviceId);
      if (updated) setSelectedDevice(updated);
    }
  };

  const handleTogglePower = (device: IoTDevice) => {
    const newStatus: DeviceStatus = device.status === 'OFFLINE' ? 'ONLINE' : 'OFFLINE';
    StorageService.updateDevice(device.id, { status: newStatus });
    onRefreshData();
  };

  const handleDeleteDevice = (id: string) => {
    if (confirm('Are you sure you want to remove this simulated IoT device?')) {
      StorageService.deleteDevice(id);
      if (selectedDevice && selectedDevice.id === id) {
        setSelectedDevice(null);
      }
      onRefreshData();
    }
  };

  const handleAssignUser = (deviceId: string, userId: string | null) => {
    StorageService.assignDeviceToUser(deviceId, userId);
    onRefreshData();
  };

  const handleCreateDevice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeviceId.trim()) return;

    const created = StorageService.addDevice({
      deviceId: newDeviceId.trim(),
      deviceType: newDeviceType,
      ipAddress: newIpAddress.trim(),
      location: newLocation,
      status: 'ONLINE',
      trustScore: 90,
      riskScore: 10,
      assignedUserId: newAssignedUserId || undefined,
      features: {
        device_trust: 90,
        failed_attempts: 0,
        request_frequency: 4.0,
        network_anomaly: 5.0,
        time_anomaly: 0,
        previous_behavior: 95
      }
    });

    if (newAssignedUserId) {
      StorageService.assignDeviceToUser(created.deviceId, newAssignedUserId);
    }

    setShowAddModal(false);
    setNewDeviceId('');
    setNewAssignedUserId('');
    onRefreshData();
  };

  return (
    <div className="space-y-6">
      
      {/* Header & Controls */}
      <div className="p-6 rounded-3xl bg-[#001032] border border-white/10 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-[#00e5ff] animate-pulse" />
            <span className="text-[10px] font-mono font-bold tracking-widest text-[#00e5ff] uppercase">
              {isAdmin ? 'Fleet Directory' : 'Identity Scope'}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2">
            <Cpu className="w-6 h-6 text-[#00e5ff]" />
            <span>{isAdmin ? 'Simulated IoT Fleet Manager' : 'My Authorized IoT Resources'}</span>
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            {isAdmin 
              ? 'Manage simulated nodes, inspect trust factors, and inject behavioral telemetry in real-time'
              : 'Hardware and sensor endpoints authorized for your zero-trust identity profile'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {isAdmin ? (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-5 py-3 rounded-full bg-[#00646e] hover:bg-[#00828f] text-white font-bold text-xs uppercase tracking-wider transition-all shadow-[0_4px_16px_rgba(0,100,110,0.4)] hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Simulated Node</span>
            </button>
          ) : (
            <button
              onClick={() => onNavigate('access-request')}
              className="flex items-center gap-2 px-5 py-3 rounded-full bg-[#00646e] hover:bg-[#00828f] text-white font-bold text-xs uppercase tracking-wider transition-all shadow-[0_4px_16px_rgba(0,100,110,0.4)] hover:scale-105 active:scale-95 cursor-pointer"
            >
              <KeyRound className="w-4 h-4" />
              <span>Request Access</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-[#001032] border border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search device ID, type, IP..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#000028] border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00646e]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
            <Filter className="w-3.5 h-3.5 text-[#00e5ff]" /> Filter:
          </span>
          {['ALL', 'ONLINE', 'SUSPICIOUS', 'BLOCKED', 'OFFLINE'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-mono font-bold transition-all cursor-pointer ${
                statusFilter === st
                  ? 'bg-[#00646e] text-white shadow-md shadow-[#00646e]/40 border border-[#00e5ff]/40'
                  : 'bg-[#000028] text-slate-300 hover:text-white hover:bg-white/10 border border-white/10'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Devices Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDevices.map((device) => {
          const isSelected = selectedDevice?.id === device.id;
          const assignedUser = allUsers.find(u => 
            u.id === device.assignedUserId || (u.assignedDevices && u.assignedDevices.includes(device.deviceId))
          );

          return (
            <div
              key={device.id}
              className={`p-5 rounded-3xl border transition-all flex flex-col justify-between shadow-lg ${
                isSelected
                  ? 'bg-[#001032] border-[#00e5ff] shadow-[0_0_25px_rgba(0,229,255,0.25)]'
                  : 'bg-[#001032] border-white/10 hover:border-[#00646e]/60'
              }`}
            >
              <div>
                {/* Top Row: Device ID & Status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#000028] border border-white/10 flex items-center justify-center text-[#00e5ff]">
                      <Cpu className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-mono font-bold text-sm text-white">
                        {device.deviceId}
                      </h4>
                      <p className="text-xs text-slate-400">{device.deviceType}</p>
                    </div>
                  </div>

                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                    device.status === 'ONLINE' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                    device.status === 'SUSPICIOUS' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                    device.status === 'BLOCKED' ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                    'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}>
                    {device.status}
                  </span>
                </div>

                {/* Device Attributes */}
                <div className="mt-4 p-3 rounded-2xl bg-[#000028] border border-white/10 space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between text-slate-400">
                    <span>IP Address:</span>
                    <span className="text-slate-200 font-semibold">{device.ipAddress}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Location:</span>
                    <span className="text-slate-200 truncate max-w-[140px]">{device.location}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Last Activity:</span>
                    <span className="text-slate-300">{device.lastActivity}</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>Total Requests:</span>
                    <span className="text-[#00e5ff] font-bold">{device.requestCount}</span>
                  </div>
                </div>

                {/* Assigned User Display & Admin Reassignment Control */}
                <div className="mt-3 p-3 rounded-2xl bg-[#000028] border border-white/10 text-xs">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono font-bold uppercase text-slate-400 flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-[#00e5ff]" />
                      <span>Assigned User:</span>
                    </span>
                    {assignedUser ? (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                        {assignedUser.role}
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-800 font-bold">
                        Unassigned
                      </span>
                    )}
                  </div>

                  {isAdmin ? (
                    <div>
                      <select
                        value={assignedUser?.id || ''}
                        onChange={(e) => handleAssignUser(device.deviceId, e.target.value || null)}
                        className="w-full px-2.5 py-1.5 rounded-xl bg-[#001032] border border-white/15 text-xs text-white focus:outline-none focus:border-[#00e5ff] cursor-pointer"
                        title="Change or remove user assignment"
                      >
                        <option value="">-- No User (Unassigned) --</option>
                        {allUsers.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.name} ({u.role}) - {u.email}
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-slate-400 mt-1 font-mono">
                        {assignedUser ? `Currently assigned to ${assignedUser.name}` : 'Device is unassigned. Select a user to assign.'}
                      </p>
                    </div>
                  ) : (
                    <div className="text-white font-medium truncate font-sans">
                      {assignedUser ? assignedUser.name : 'Authorized to your profile'}
                    </div>
                  )}
                </div>

                {/* Trust & Risk Bar */}
                <div className="mt-3.5 space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Trust: <strong className="text-white">{device.trustScore}/100</strong></span>
                    <span className="text-slate-400">Risk: <strong className={device.riskScore > 60 ? 'text-rose-400' : device.riskScore > 30 ? 'text-amber-400' : 'text-emerald-400'}>{device.riskScore}/100</strong></span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden flex">
                    <div className="bg-[#00646e] h-full transition-all duration-500" style={{ width: `${device.trustScore}%` }} />
                    <div className="bg-rose-500 h-full transition-all duration-500" style={{ width: `${device.riskScore}%` }} />
                  </div>
                </div>
              </div>

              {/* Action Controls (Role-Protected: NO Request Access for Admin) */}
              <div className="mt-4 pt-3.5 border-t border-white/10 space-y-2">
                {isAdmin ? (
                  <>
                    <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400 block font-bold">
                      Simulate Software Behavior Scenario:
                    </span>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        onClick={() => handleSimulate(device.deviceId, 'NORMAL')}
                        className="px-2 py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/50 text-[10px] font-mono font-bold transition-all text-center cursor-pointer"
                        title="Simulate normal device telemetry"
                      >
                        Normal
                      </button>
                      <button
                        onClick={() => handleSimulate(device.deviceId, 'SUSPICIOUS')}
                        className="px-2 py-1.5 rounded-lg bg-amber-950/60 hover:bg-amber-900 text-amber-300 border border-amber-800/50 text-[10px] font-mono font-bold transition-all text-center cursor-pointer"
                        title="Simulate suspicious jitter and retry bursts"
                      >
                        Suspicious
                      </button>
                      <button
                        onClick={() => handleSimulate(device.deviceId, 'HIGH_RISK')}
                        className="px-2 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/50 text-[10px] font-mono font-bold transition-all text-center cursor-pointer"
                        title="Simulate rogue anomaly attack burst"
                      >
                        High-Risk
                      </button>
                    </div>

                    {/* Admin Device Management Triggers (No Request Access button) */}
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-[11px] text-slate-400 font-mono">
                        Hardware Controls:
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleTogglePower(device)}
                          className={`p-1.5 rounded-lg border text-xs transition-colors cursor-pointer flex items-center gap-1 ${
                            device.status === 'OFFLINE'
                              ? 'bg-slate-800 text-slate-400 border-slate-700 hover:text-emerald-400'
                              : 'bg-emerald-950/60 text-emerald-300 border-emerald-800/50 hover:bg-emerald-900'
                          }`}
                          title="Toggle Device Power State"
                        >
                          <Power className="w-3.5 h-3.5" />
                          <span className="text-[10px] font-mono hidden sm:inline">{device.status === 'OFFLINE' ? 'Power On' : 'Active'}</span>
                        </button>

                        <button
                          onClick={() => handleDeleteDevice(device.id)}
                          className="p-1.5 rounded-lg bg-rose-950/40 text-rose-300 border border-rose-800/50 hover:bg-rose-900 transition-colors cursor-pointer"
                          title="Delete Device Node"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  /* Normal User Direct Access Action */
                  <button
                    onClick={() => onRequestAccessForDevice(device)}
                    className="w-full py-2.5 rounded-xl bg-[#00646e] hover:bg-[#00828f] text-white border border-[#00e5ff]/30 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
                  >
                    <KeyRound className="w-4 h-4 text-[#00e5ff]" />
                    <span>Request Resource Access</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Device Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#001032] border border-white/20 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Cpu className="w-5 h-5 text-[#00e5ff]" />
                <span>Add Simulated IoT Node</span>
              </h3>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDevice} className="space-y-3.5">
              <div>
                <label className="text-xs font-mono text-slate-300 block mb-1">
                  Device Identifier (e.g. CCTV_04, SENSOR_03)
                </label>
                <input
                  type="text"
                  required
                  placeholder="CCTV_04"
                  value={newDeviceId}
                  onChange={(e) => setNewDeviceId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#000028] border border-white/15 text-xs text-white focus:outline-none focus:border-[#00646e]"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-slate-300 block mb-1">Device Hardware Type</label>
                <select
                  value={newDeviceType}
                  onChange={(e) => setNewDeviceType(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#000028] border border-white/15 text-xs text-white focus:outline-none focus:border-[#00646e]"
                >
                  <option value="Surveillance Camera">Surveillance Camera</option>
                  <option value="Smart Biometric Lock">Smart Biometric Lock</option>
                  <option value="Environmental Sensor">Environmental Sensor</option>
                  <option value="Industrial Gateway">Industrial Gateway</option>
                  <option value="Medical Telemetry Hub">Medical Telemetry Hub</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-mono text-slate-300 block mb-1">Assigned Local IP Address</label>
                <input
                  type="text"
                  value={newIpAddress}
                  onChange={(e) => setNewIpAddress(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#000028] border border-white/15 text-xs text-white focus:outline-none focus:border-[#00646e]"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-slate-300 block mb-1">Physical Location</label>
                <input
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#000028] border border-white/15 text-xs text-white focus:outline-none focus:border-[#00646e]"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-slate-300 block mb-1">Assign to User (Optional)</label>
                <select
                  value={newAssignedUserId}
                  onChange={(e) => setNewAssignedUserId(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-[#000028] border border-white/15 text-xs text-white focus:outline-none focus:border-[#00646e]"
                >
                  <option value="">-- Leave Unassigned --</option>
                  {allUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role}) - {u.email}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1 font-mono">
                  You can assign this device to a user now or configure it later.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-full text-xs text-slate-400 hover:text-white border border-transparent hover:border-white/10 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-full bg-[#00646e] hover:bg-[#00828f] text-white text-xs font-bold uppercase tracking-wide cursor-pointer shadow-md"
                >
                  Save Device
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
