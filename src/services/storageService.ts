import { 
  IoTDevice, 
  AccessRequest, 
  BlockchainTransaction, 
  NotificationItem, 
  UserAccount,
  AccessDecision,
  RiskAnalysisResult,
  DeviceStatus
} from '../types';
import { 
  INITIAL_DEVICES, 
  INITIAL_USERS, 
  INITIAL_ACCESS_LOGS, 
  INITIAL_TRANSACTIONS, 
  INITIAL_NOTIFICATIONS 
} from '../data/initialData';
import { IoTRiskAIEngine, AiEngine } from './aiEngine';
import { BlockchainService } from './blockchainService';
import { supabase, isSupabaseConfigured } from './supabaseClient';

const STORAGE_KEYS = {
  DEVICES: 'secureiot_devices_v1',
  USERS: 'secureiot_users_v1',
  LOGS: 'secureiot_access_logs_v1',
  TXS: 'secureiot_blockchain_txs_v1',
  NOTIFICATIONS: 'secureiot_notifications_v1',
  CURRENT_USER: 'secureiot_active_user_v1'
};

export class StorageService {
  public static getDevices(): IoTDevice[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.DEVICES);
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    this.saveDevices(INITIAL_DEVICES);
    return INITIAL_DEVICES;
  }

  public static saveDevices(devices: IoTDevice[]): void {
    localStorage.setItem(STORAGE_KEYS.DEVICES, JSON.stringify(devices));
  }

  public static getDevice(deviceId: string): IoTDevice | undefined {
    const devices = this.getDevices();
    return devices.find(d => d.deviceId === deviceId);
  }

  public static addDevice(device: Omit<IoTDevice, 'id' | 'requestCount' | 'lastActivity'>): IoTDevice {
    const devices = this.getDevices();
    const newDevice: IoTDevice = {
      ...device,
      id: `dev_${Date.now()}`,
      requestCount: 0,
      lastActivity: 'Just added'
    };
    devices.unshift(newDevice);
    this.saveDevices(devices);
    this.addNotification({
      title: 'New Device Registered',
      message: `${newDevice.deviceId} (${newDevice.deviceType}) connected at ${newDevice.ipAddress}.`,
      type: 'info',
      deviceId: newDevice.deviceId
    });
    return newDevice;
  }

  public static updateDevice(idOrDeviceId: string, updates: Partial<IoTDevice>): void {
    const devices = this.getDevices().map(d => {
      if (d.id === idOrDeviceId || d.deviceId === idOrDeviceId) {
        return { ...d, ...updates };
      }
      return d;
    });
    this.saveDevices(devices);
  }

  public static deleteDevice(idOrDeviceId: string): void {
    const devices = this.getDevices().filter(d => d.id !== idOrDeviceId && d.deviceId !== idOrDeviceId);
    this.saveDevices(devices);
    this.addNotification({
      title: 'Device Removed',
      message: `Device was deleted from the IoT fleet.`,
      type: 'warning'
    });
  }

  public static removeDevice(deviceId: string): void {
    this.deleteDevice(deviceId);
  }

  public static updateDeviceStatus(deviceId: string, status: DeviceStatus): void {
    const devices = this.getDevices().map(d => {
      if (d.deviceId === deviceId) {
        return { ...d, status, lastActivity: 'Status changed' };
      }
      return d;
    });
    this.saveDevices(devices);
  }

  /**
   * Assign or remove a device assignment to a user, keeping both device and users in sync
   */
  public static assignDeviceToUser(deviceId: string, userId: string | null): void {
    const devices = this.getDevices();
    const devIndex = devices.findIndex(d => d.deviceId === deviceId || d.id === deviceId);
    if (devIndex === -1) return;

    const targetDev = devices[devIndex];
    const previousUserId = targetDev.assignedUserId;
    targetDev.assignedUserId = userId || undefined;
    devices[devIndex] = targetDev;
    this.saveDevices(devices);

    const users = this.getUsers();
    let updatedUsers = false;

    // Remove from previous user
    if (previousUserId && previousUserId !== userId) {
      const prevUserIndex = users.findIndex(u => u.id === previousUserId);
      if (prevUserIndex !== -1) {
        users[prevUserIndex].assignedDevices = (users[prevUserIndex].assignedDevices || []).filter(
          id => id !== targetDev.deviceId
        );
        updatedUsers = true;
      }
    }

    // Add to new user
    if (userId) {
      const newUserIndex = users.findIndex(u => u.id === userId);
      if (newUserIndex !== -1) {
        const assigned = new Set(users[newUserIndex].assignedDevices || []);
        assigned.add(targetDev.deviceId);
        users[newUserIndex].assignedDevices = Array.from(assigned);
        updatedUsers = true;
      }
    }

    if (updatedUsers) {
      this.saveUsers(users);
      // Sync active user if affected
      const activeUser = this.getActiveUser();
      if (activeUser) {
        const refreshed = users.find(u => u.id === activeUser.id);
        if (refreshed) this.setActiveUser(refreshed);
      }
    }

    this.addNotification({
      title: userId ? 'Device Assigned' : 'Device Unassigned',
      message: userId 
        ? `${targetDev.deviceId} assigned to user.` 
        : `${targetDev.deviceId} is now unassigned.`,
      type: 'info',
      deviceId: targetDev.deviceId
    });
  }

  /**
   * Set multiple assigned devices for a specific user
   */
  public static setUserAssignedDevices(userId: string, deviceIds: string[]): void {
    const users = this.getUsers();
    const uIndex = users.findIndex(u => u.id === userId);
    if (uIndex === -1) return;

    users[uIndex].assignedDevices = deviceIds;
    this.saveUsers(users);

    // Sync devices
    const devices = this.getDevices();
    const updatedDevices = devices.map(d => {
      if (deviceIds.includes(d.deviceId)) {
        return { ...d, assignedUserId: userId };
      } else if (d.assignedUserId === userId) {
        return { ...d, assignedUserId: undefined };
      }
      return d;
    });
    this.saveDevices(updatedDevices);

    // Sync active user if modified
    const active = this.getActiveUser();
    if (active && active.id === userId) {
      this.setActiveUser(users[uIndex]);
    }
  }

  /**
   * Generates realistic IoT behavioral patterns:
   * NORMAL: Trust 90-100, low failed requests, normal frequency, low anomaly
   * SUSPICIOUS: Trust 40-70, multiple failed requests, higher frequency, medium anomaly
   * HIGH-RISK: Trust 0-30, many failed requests, very high frequency, high anomaly
   */
  public static simulateDeviceActivity(
    deviceId: string, 
    type: 'NORMAL' | 'SUSPICIOUS' | 'HIGH_RISK'
  ): { device: IoTDevice; evalResult: RiskAnalysisResult } {
    const devices = this.getDevices();
    const index = devices.findIndex(d => d.deviceId === deviceId);
    if (index === -1) throw new Error(`Device ${deviceId} not found`);

    const dev = { ...devices[index] };

    if (type === 'NORMAL') {
      const generatedTrust = Math.floor(Math.random() * 8) + 92; // 92 - 100
      dev.features = {
        device_trust: generatedTrust,
        failed_attempts: Math.random() > 0.85 ? 1 : 0,
        request_frequency: Math.round((Math.random() * 4 + 3) * 10) / 10,
        network_anomaly: Math.round((Math.random() * 4 + 1) * 10) / 10,
        time_anomaly: Math.round((Math.random() * 3 + 1) * 10) / 10,
        previous_behavior: Math.floor(Math.random() * 6) + 94
      };
    } else if (type === 'SUSPICIOUS') {
      const generatedTrust = Math.floor(Math.random() * 21) + 45; // 45 - 65
      dev.features = {
        device_trust: generatedTrust,
        failed_attempts: Math.floor(Math.random() * 3) + 3, // 3 - 5
        request_frequency: Math.round((Math.random() * 15 + 22) * 10) / 10, // 22 - 37
        network_anomaly: Math.round((Math.random() * 20 + 38) * 10) / 10, // 38 - 58%
        time_anomaly: Math.round((Math.random() * 20 + 30) * 10) / 10,
        previous_behavior: Math.floor(Math.random() * 15) + 55
      };
    } else {
      // HIGH_RISK
      const generatedTrust = Math.floor(Math.random() * 16) + 12; // 12 - 27
      dev.features = {
        device_trust: generatedTrust,
        failed_attempts: Math.floor(Math.random() * 6) + 8, // 8 - 13
        request_frequency: Math.round((Math.random() * 40 + 75) * 10) / 10, // 75 - 115 req/min
        network_anomaly: Math.round((Math.random() * 15 + 80) * 10) / 10, // 80 - 95%
        time_anomaly: Math.round((Math.random() * 20 + 70) * 10) / 10,
        previous_behavior: Math.floor(Math.random() * 15) + 18
      };
    }

    dev.lastActivity = 'Just now';
    dev.requestCount += 1;

    // Run real ML evaluation on the generated features
    const evalResult = IoTRiskAIEngine.evaluateRisk(dev.deviceId, dev.features);
    dev.riskScore = evalResult.riskScore;
    dev.trustScore = evalResult.trustScore;

    // Adaptive policy application:
    // 0 - 30 -> ALLOW (ONLINE)
    // 31 - 60 -> LIMITED (SUSPICIOUS)
    // 61 - 100 -> DENY (BLOCKED)
    if (evalResult.decision === 'DENY') {
      dev.status = 'BLOCKED';
    } else if (evalResult.decision === 'LIMITED') {
      dev.status = 'SUSPICIOUS';
    } else {
      dev.status = 'ONLINE';
    }

    devices[index] = dev;
    this.saveDevices(devices);

    // Asynchronously notify backend simulation endpoint if active
    fetch('/api/devices/simulate-activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        device_id: deviceId,
        activity_type: type
      })
    }).catch(() => {});

    // Notify
    if (type === 'HIGH_RISK') {
      this.addNotification({
        title: 'High-Risk Activity Detected',
        message: `${deviceId} exhibited abnormal request frequency and severe network anomalies. Status set to BLOCKED.`,
        type: 'error',
        deviceId
      });
    } else if (type === 'SUSPICIOUS') {
      this.addNotification({
        title: 'Suspicious Behavior Flagged',
        message: `${deviceId} generated multiple failed authentication requests. Trust degraded to ${dev.trustScore}.`,
        type: 'warning',
        deviceId
      });
    } else {
      this.addNotification({
        title: 'Normal Activity Verified',
        message: `${deviceId} telemetry stabilized. Trust score restored to ${dev.trustScore}.`,
        type: 'success',
        deviceId
      });
    }

    return { device: dev, evalResult };
  }

  // Access Requests & Blockchain Integration
  public static getAccessLogs(): AccessRequest[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.LOGS);
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    this.saveAccessLogs(INITIAL_ACCESS_LOGS);
    return INITIAL_ACCESS_LOGS;
  }

  public static saveAccessLogs(logs: AccessRequest[]): void {
    localStorage.setItem(STORAGE_KEYS.LOGS, JSON.stringify(logs));
  }

  public static getBlockchainTxs(): BlockchainTransaction[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.TXS);
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    this.saveBlockchainTxs(INITIAL_TRANSACTIONS);
    return INITIAL_TRANSACTIONS;
  }

  public static saveBlockchainTxs(txs: BlockchainTransaction[]): void {
    localStorage.setItem(STORAGE_KEYS.TXS, JSON.stringify(txs));
  }

  public static async processAccessRequest(
    userId: string,
    userName: string,
    deviceId: string,
    resource: string,
    reason: string
  ): Promise<{ 
    request: AccessRequest; 
    transaction: BlockchainTransaction;
    evalResult: RiskAnalysisResult;
    device: IoTDevice 
  }> {
    const devices = this.getDevices();
    const devIndex = devices.findIndex(d => d.deviceId === deviceId);
    if (devIndex === -1) throw new Error('Device not found');

    const device = devices[devIndex];

    // Verify whether the device is actually assigned / authorized to this user
    const users = this.getUsers();
    const requestingUser = users.find(u => 
      u.id === userId || 
      u.email.toLowerCase() === userId.toLowerCase() || 
      u.name.toLowerCase() === userName.toLowerCase()
    );

    // Admin has fleet-wide authorization; Normal user MUST be assigned to this device
    const isAuthorized = requestingUser 
      ? (
          (requestingUser.role === 'ADMIN' && requestingUser.email.toLowerCase() === StorageService.FIXED_ADMIN_EMAIL.toLowerCase()) ||
          Boolean(requestingUser.assignedDevices && requestingUser.assignedDevices.includes(deviceId)) ||
          device.assignedUserId === requestingUser.id
        )
      : false;

    // If the device is not assigned to the user, the request must be rejected
    if (!isAuthorized) {
      const rejectedTx = await BlockchainService.recordAccessOnChain(
        deviceId,
        resource,
        100, // Maximum risk score
        0,   // Zero trust score
        'DENY',
        `Unauthorized Attempt: Device ${deviceId} is not assigned or authorized to user ${userName}. Access REJECTED.`
      );

      const txs = this.getBlockchainTxs();
      txs.unshift(rejectedTx);
      this.saveBlockchainTxs(txs);

      const rejectedLog: AccessRequest = {
        id: `req_${Date.now()}`,
        userId,
        userName,
        deviceId,
        resource,
        reason: reason || 'Access request rejected (unauthorized device)',
        riskScore: 100,
        trustScore: 0,
        decision: 'DENY',
        reasons: [`Access Control Violation: Device ${deviceId} is not assigned to ${userName}.`],
        prediction: 'HIGH_RISK',
        probabilities: { NORMAL: 0.0, SUSPICIOUS: 0.0, HIGH_RISK: 1.0 },
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
        transactionHash: rejectedTx.transactionHash,
        blockNumber: rejectedTx.blockNumber
      };

      const logs = this.getAccessLogs();
      logs.unshift(rejectedLog);
      this.saveAccessLogs(logs);

      this.addNotification({
        title: 'Unauthorized Request Rejected',
        message: `${userName} was denied access to unassigned node ${deviceId}.`,
        type: 'error',
        deviceId
      });

      const rejectedEval: RiskAnalysisResult = {
        id: `eval_${Date.now()}`,
        deviceId,
        trustScore: 0,
        riskScore: 100,
        riskLevel: 'HIGH',
        decision: 'DENY',
        confidence: 1.0,
        explanation: `Access Request Rejected: Device ${deviceId} is not assigned or authorized to this user profile.`,
        reasons: [`Device ${deviceId} is not in user's authorized resource list.`],
        features: device.features,
        timestamp: new Date().toISOString(),
        prediction: 'HIGH_RISK',
        reason: `Unauthorized: Device ${deviceId} is not assigned to ${userName}.`
      };

      return {
        request: rejectedLog,
        transaction: rejectedTx,
        evalResult: rejectedEval,
        device
      };
    }

    // 1. If authorized, send the six behavioral features to the AI risk-analysis system
    const evalResult = await AiEngine.analyzeRiskApi({
      deviceId,
      device_trust: device.features.device_trust,
      failed_attempts: device.features.failed_attempts,
      request_frequency: device.features.request_frequency,
      network_anomaly: device.features.network_anomaly,
      time_anomaly: device.features.time_anomaly,
      previous_behavior: device.features.previous_behavior
    });

    // 2. Adaptive Access Control Policy Update
    device.trustScore = evalResult.trustScore;
    device.riskScore = evalResult.riskScore;
    device.requestCount += 1;
    device.lastActivity = 'Just now';

    if (evalResult.decision === 'DENY') {
      device.status = 'BLOCKED';
    } else if (evalResult.decision === 'LIMITED') {
      device.status = 'SUSPICIOUS';
    } else {
      device.status = 'ONLINE';
    }
    devices[devIndex] = device;
    this.saveDevices(devices);

    // 3. Smart Contract / Blockchain Logging
    const transaction = await BlockchainService.recordAccessOnChain(
      deviceId,
      resource,
      evalResult.riskScore,
      evalResult.trustScore,
      evalResult.decision,
      evalResult.reason || evalResult.explanation
    );

    const txs = this.getBlockchainTxs();
    txs.unshift(transaction);
    this.saveBlockchainTxs(txs);

    // 4. Record Access Log
    const newLog: AccessRequest = {
      id: `req_${Date.now()}`,
      userId,
      userName,
      deviceId,
      resource,
      reason,
      riskScore: evalResult.riskScore,
      trustScore: evalResult.trustScore,
      decision: evalResult.decision,
      reasons: evalResult.reasons,
      prediction: evalResult.prediction,
      probabilities: evalResult.probabilities,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC',
      transactionHash: transaction.transactionHash,
      blockNumber: transaction.blockNumber
    };

    const logs = this.getAccessLogs();
    logs.unshift(newLog);
    this.saveAccessLogs(logs);

    // 4b. Also insert the same access log into Supabase access_logs table (additional database copy)
    try {
      if (isSupabaseConfigured) {
        Promise.resolve(
          supabase
            .from('access_logs')
            .insert([
              {
                user_id: userId,
                user_name: userName,
                device_id: deviceId,
                resource: resource,
                risk_score: evalResult.riskScore,
                trust_score: evalResult.trustScore,
                decision: evalResult.decision,
                reason: reason,
                transaction_hash: transaction.transactionHash,
                block_number: transaction.blockNumber,
                is_simulated: transaction.isSimulated !== false
              }
            ])
        )
          .then((res) => {
            if (res && res.error) {
              console.error('[Supabase] Failed to insert access log:', res.error.message || res.error);
            } else {
              console.log('[Supabase] Access log successfully inserted into access_logs table');
            }
          })
          .catch((err: unknown) => {
            console.error('[Supabase] Unexpected error inserting access log:', err);
          });
      } else {
        console.warn('[Supabase] Access log not synced to Supabase: VITE_SUPABASE_URL and/or VITE_SUPABASE_PUBLISHABLE_KEY are not configured in .env.local');
      }
    } catch (supabaseErr) {
      console.error('[Supabase] Error during Supabase access log sync attempt:', supabaseErr);
    }

    // 5. Notify
    const decisionColor = evalResult.decision === 'ALLOW' ? 'success' : evalResult.decision === 'LIMITED' ? 'warning' : 'error';
    this.addNotification({
      title: `Access ${evalResult.decision}: ${deviceId}`,
      message: `Request for ${resource} decided as ${evalResult.decision} (Risk: ${evalResult.riskScore}). Block #${transaction.blockNumber}.`,
      type: decisionColor,
      deviceId
    });

    return {
      request: newLog,
      transaction,
      evalResult,
      device
    };
  }

  // Notifications
  public static getNotifications(): NotificationItem[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    this.saveNotifications(INITIAL_NOTIFICATIONS);
    return INITIAL_NOTIFICATIONS;
  }

  public static saveNotifications(notifs: NotificationItem[]): void {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifs));
  }

  public static addNotification(item: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>): void {
    const notifs = this.getNotifications();
    const newNotif: NotificationItem = {
      ...item,
      id: `notif_${Date.now()}`,
      timestamp: 'Just now',
      read: false
    };
    notifs.unshift(newNotif);
    this.saveNotifications(notifs.slice(0, 30));
  }

  public static markAllNotificationsRead(): void {
    const notifs = this.getNotifications().map(n => ({ ...n, read: true }));
    this.saveNotifications(notifs);
  }

  // Single Fixed Admin Policy Constants
  public static readonly FIXED_ADMIN_EMAIL = 'admin@iotsecurity.com';
  public static readonly FIXED_ADMIN_DEFAULT_PASSWORD = 'AdminSecurityPass2026!';

  // User Accounts
  public static getUsers(): UserAccount[] {
    let users: UserAccount[] = [];
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.USERS);
      if (stored) {
        users = JSON.parse(stored);
      }
    } catch (e) {}

    if (!users || users.length === 0) {
      users = [...INITIAL_USERS];
    }

    // STRICT SINGLE-ADMIN ENFORCEMENT:
    // 1. Ensure the single fixed admin account exists and has role 'ADMIN'.
    // 2. Ensure NO OTHER user has role 'ADMIN' (sanitize any non-admin users to 'USER').
    const adminIndex = users.findIndex(
      u => u.email.toLowerCase() === StorageService.FIXED_ADMIN_EMAIL.toLowerCase()
    );

    let needsSave = false;
    if (adminIndex === -1) {
      const defaultAdmin = INITIAL_USERS.find(
        u => u.email.toLowerCase() === StorageService.FIXED_ADMIN_EMAIL.toLowerCase()
      ) || {
        id: 'usr_admin',
        name: 'Chief Security Officer',
        email: StorageService.FIXED_ADMIN_EMAIL,
        role: 'ADMIN' as const,
        status: 'ACTIVE' as const,
        lastLogin: 'Today, 10:45 AM',
        assignedDevices: ['CCTV_01', 'CCTV_02', 'SmartDoor_01', 'MotionSensor_01', 'Temperature_01'],
        password: StorageService.FIXED_ADMIN_DEFAULT_PASSWORD
      };
      users.unshift(defaultAdmin);
      needsSave = true;
    } else {
      if (users[adminIndex].role !== 'ADMIN') {
        users[adminIndex].role = 'ADMIN';
        needsSave = true;
      }
    }

    // Guarantee that all other users strictly have role 'USER'
    users = users.map(u => {
      if (u.email.toLowerCase() !== StorageService.FIXED_ADMIN_EMAIL.toLowerCase() && u.role === 'ADMIN') {
        needsSave = true;
        return { ...u, role: 'USER' as const };
      }
      return u;
    });

    if (needsSave) {
      this.saveUsers(users);
    }

    return users;
  }

  public static saveUsers(users: UserAccount[]): void {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  }

  public static addUser(user: Omit<UserAccount, 'id'>): UserAccount {
    const emailLower = user.email.trim().toLowerCase();

    // Prevent creating duplicate admin accounts
    if (emailLower === StorageService.FIXED_ADMIN_EMAIL.toLowerCase()) {
      throw new Error('Cannot register duplicate admin account. There is only one fixed admin account.');
    }

    const users = this.getUsers();
    const existing = users.find(u => u.email.toLowerCase() === emailLower);
    if (existing) {
      throw new Error('An account with this email address already exists. Please sign in instead.');
    }

    // Every normal user strictly receives role 'USER'
    const newUser: UserAccount = {
      ...user,
      id: `usr_${Date.now()}`,
      role: 'USER',
      status: user.status || 'ACTIVE',
      lastLogin: user.lastLogin || 'Just now',
      assignedDevices: user.assignedDevices && user.assignedDevices.length > 0 
        ? user.assignedDevices 
        : ['CCTV_01', 'Temperature_01']
    };

    users.push(newUser);
    this.saveUsers(users);
    this.addNotification({
      title: 'New User Registered',
      message: `${newUser.name} (USER) was added to the identity registry.`,
      type: 'info'
    });
    return newUser;
  }

  public static registerUser(name: string, email: string, password: string): UserAccount {
    return this.addUser({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: 'USER',
      status: 'ACTIVE',
      lastLogin: 'Just now',
      assignedDevices: ['CCTV_01', 'Temperature_01'],
      password: password.trim()
    });
  }

  public static authenticate(email: string, password: string): { user?: UserAccount; error?: string } {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail || !cleanPassword) {
      return { error: 'Please enter both your email address and password.' };
    }

    const users = this.getUsers();
    const matched = users.find(u => u.email.toLowerCase() === cleanEmail);

    if (!matched) {
      return { error: 'No account found with this email. Please check your credentials or register.' };
    }

    if (matched.status === 'DISABLED') {
      return { error: 'This account has been disabled by the administrator.' };
    }

    // Fixed Single Admin validation
    if (cleanEmail === StorageService.FIXED_ADMIN_EMAIL.toLowerCase()) {
      const validAdminPass = matched.password || StorageService.FIXED_ADMIN_DEFAULT_PASSWORD;
      if (cleanPassword !== validAdminPass && cleanPassword !== StorageService.FIXED_ADMIN_DEFAULT_PASSWORD) {
        return { error: 'Invalid password for the fixed Chief Security Officer (Admin) account.' };
      }
      const updatedAdmin = { ...matched, role: 'ADMIN' as const, lastLogin: 'Just now' };
      this.updateUser(matched.id, { lastLogin: 'Just now' });
      this.setActiveUser(updatedAdmin);
      return { user: updatedAdmin };
    }

    // Normal User validation
    if (matched.password && matched.password !== cleanPassword) {
      return { error: 'Incorrect password for this user account.' };
    }

    const updatedUser = { ...matched, role: 'USER' as const, lastLogin: 'Just now' };
    this.updateUser(matched.id, { lastLogin: 'Just now' });
    this.setActiveUser(updatedUser);
    return { user: updatedUser };
  }

  public static updateUser(userId: string, updates: Partial<UserAccount>): void {
    const users = this.getUsers().map(u => {
      if (u.id === userId) {
        const isFixedAdmin = u.email.toLowerCase() === StorageService.FIXED_ADMIN_EMAIL.toLowerCase();
        let targetRole = u.role;
        if (isFixedAdmin) {
          targetRole = 'ADMIN';
        } else if (updates.role) {
          targetRole = 'USER'; // Non-admin users are strictly 'USER'
        }
        return { 
          ...u, 
          ...updates, 
          role: targetRole,
          email: isFixedAdmin ? StorageService.FIXED_ADMIN_EMAIL : (updates.email || u.email)
        };
      }
      return u;
    });
    this.saveUsers(users);
  }

  public static deleteUser(userId: string): void {
    const user = this.getUsers().find(u => u.id === userId);
    if (user && user.email.toLowerCase() === StorageService.FIXED_ADMIN_EMAIL.toLowerCase()) {
      throw new Error('The single fixed admin account cannot be deleted.');
    }
    const filtered = this.getUsers().filter(u => u.id !== userId);
    this.saveUsers(filtered);
    this.addNotification({
      title: 'User Removed',
      message: `User ${user?.name || userId} was removed from the identity list.`,
      type: 'warning'
    });
  }

  public static toggleUserStatus(userId: string): void {
    const users = this.getUsers().map(u => {
      if (u.id === userId) {
        if (u.email.toLowerCase() === StorageService.FIXED_ADMIN_EMAIL.toLowerCase()) {
          return u; // Fixed admin is always active
        }
        return { ...u, status: (u.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE') as any };
      }
      return u;
    });
    this.saveUsers(users);
  }

  public static getActiveUser(): UserAccount | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (stored && stored !== 'null' && stored !== 'undefined') {
        return JSON.parse(stored);
      }
    } catch (e) {}
    return null; // Unauthenticated by default: prompts Admin Login when accessing SOC
  }

  public static setActiveUser(user: UserAccount | null): void {
    if (!user) {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    } else {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    }
  }

  public static resetToFactoryDefaults(): void {
    localStorage.removeItem(STORAGE_KEYS.DEVICES);
    localStorage.removeItem(STORAGE_KEYS.LOGS);
    localStorage.removeItem(STORAGE_KEYS.TXS);
    localStorage.removeItem(STORAGE_KEYS.NOTIFICATIONS);
    localStorage.removeItem(STORAGE_KEYS.USERS);
    this.saveDevices(INITIAL_DEVICES);
    this.saveUsers(INITIAL_USERS);
    this.saveAccessLogs(INITIAL_ACCESS_LOGS);
    this.saveBlockchainTxs(INITIAL_TRANSACTIONS);
    this.saveNotifications(INITIAL_NOTIFICATIONS);
    this.setActiveUser(null);
  }
}
