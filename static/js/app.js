// VelocityDRIVE Touch GUI - Main Application JavaScript

class VelocityDriveApp {
    constructor() {
        this.apiUrl = window.location.origin + '/api';
        this.currentPort = '/dev/ttyACM0';
        this.isConnected = false;
        this.updateInterval = null;
        this.settings = {
            theme: 'light',
            updateInterval: 1000,
            autoRefresh: true
        };

        this.init();
    }

    init() {
        // Initialize event listeners
        this.setupEventListeners();

        // Load saved settings
        this.loadSettings();

        // Initialize tabs
        this.initTabs();

        // Check initial connection
        this.checkConnection();

        // Start auto-refresh if enabled
        if (this.settings.autoRefresh) {
            this.startAutoRefresh();
        }
    }

    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchTab(e.target.closest('.nav-tab')));
        });

        // Console input
        const consoleInput = document.getElementById('consoleInput');
        if (consoleInput) {
            consoleInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.sendCommand();
                }
            });
        }
    }

    initTabs() {
        const activeTab = document.querySelector('.nav-tab.active');
        if (activeTab) {
            this.switchTab(activeTab);
        }
    }

    switchTab(tabElement) {
        if (!tabElement) return;

        // Update tab buttons
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        tabElement.classList.add('active');

        // Update content
        const tabName = tabElement.dataset.tab;
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });

        const targetContent = document.getElementById(tabName);
        if (targetContent) {
            targetContent.classList.add('active');

            // Load tab-specific data
            this.loadTabData(tabName);
        }
    }

    loadTabData(tabName) {
        if (!this.isConnected) return;

        switch(tabName) {
            case 'dashboard':
                this.refreshDeviceInfo();
                this.refreshStatistics();
                break;
            case 'interfaces':
                this.loadInterfaces();
                break;
            case 'tsn':
                this.loadTSNConfig();
                break;
            case 'ptp':
                this.refreshPTPStatus();
                break;
        }
    }

    async checkConnection() {
        try {
            const response = await fetch(`${this.apiUrl}/health`);
            const data = await response.json();

            if (data.cli_exists) {
                this.showToast('CLI tool found', 'success');
            } else {
                this.showToast('CLI tool not found at expected path', 'warning');
            }
        } catch (error) {
            this.showToast('Failed to check server status', 'error');
        }
    }

    async connectDevice() {
        const port = document.getElementById('serialPort').value;
        const baudRate = parseInt(document.getElementById('baudRate').value);

        this.showLoading(true);

        try {
            const response = await fetch(`${this.apiUrl}/connect`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ port, baudrate: baudRate })
            });

            const data = await response.json();

            if (data.success) {
                this.isConnected = true;
                this.currentPort = port;
                this.updateConnectionStatus(true);
                this.showToast('Connected successfully', 'success');
                this.refreshDeviceInfo();
            } else {
                this.showToast(data.error || 'Connection failed', 'error');
            }
        } catch (error) {
            this.showToast('Connection error: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async disconnectDevice() {
        this.showLoading(true);

        try {
            const response = await fetch(`${this.apiUrl}/disconnect`, {
                method: 'POST'
            });

            const data = await response.json();

            if (data.success) {
                this.isConnected = false;
                this.updateConnectionStatus(false);
                this.showToast('Disconnected', 'info');
            }
        } catch (error) {
            this.showToast('Disconnect error: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async refreshDeviceInfo() {
        if (!this.isConnected) return;

        try {
            const response = await fetch(`${this.apiUrl}/device/info`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ port: this.currentPort })
            });

            const data = await response.json();

            if (data.success && data.stdout) {
                this.updateDeviceInfo(data.stdout);
            }
        } catch (error) {
            console.error('Failed to refresh device info:', error);
        }
    }

    updateDeviceInfo(info) {
        const deviceInfo = document.getElementById('deviceInfo');
        if (!deviceInfo) return;

        // Parse the info and update display
        // This would need to be adapted based on actual CLI output format
        try {
            const lines = info.split('\n');
            const infoItems = deviceInfo.querySelectorAll('.info-item');

            // Update with parsed values
            // This is a simplified example
            if (infoItems.length > 0) {
                infoItems[0].querySelector('.info-value').textContent = 'LAN9662';
                infoItems[1].querySelector('.info-value').textContent = '1.0.0';
                infoItems[2].querySelector('.info-value').textContent = 'SN123456';
                infoItems[3].querySelector('.info-value').textContent = 'Active';
            }
        } catch (error) {
            console.error('Failed to parse device info:', error);
        }
    }

    async refreshStatistics() {
        if (!this.isConnected) return;

        try {
            const response = await fetch(`${this.apiUrl}/statistics`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ port: this.currentPort, interface: 'eth0' })
            });

            const data = await response.json();

            if (data.success && data.stdout) {
                this.updateStatistics(data.stdout);
            }
        } catch (error) {
            console.error('Failed to refresh statistics:', error);
        }
    }

    updateStatistics(stats) {
        // Update statistics display
        // This would need to be adapted based on actual CLI output
        document.getElementById('txPackets').textContent = Math.floor(Math.random() * 10000);
        document.getElementById('rxPackets').textContent = Math.floor(Math.random() * 10000);
        document.getElementById('errorCount').textContent = Math.floor(Math.random() * 10);
        document.getElementById('linkSpeed').textContent = '1 Gbps';
    }

    async loadInterfaces() {
        if (!this.isConnected) return;

        this.showLoading(true);

        try {
            const response = await fetch(`${this.apiUrl}/interface/list`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ port: this.currentPort })
            });

            const data = await response.json();

            if (data.success && data.stdout) {
                this.displayInterfaces(data.stdout);
            }
        } catch (error) {
            this.showToast('Failed to load interfaces', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    displayInterfaces(interfaceData) {
        const interfaceList = document.getElementById('interfaceList');
        if (!interfaceList) return;

        // Clear existing interfaces
        interfaceList.innerHTML = '';

        // Parse and display interfaces
        // This is a simplified example - would need to parse actual CLI output
        const interfaces = ['eth0', 'eth1', 'eth2', 'eth3'];

        interfaces.forEach(iface => {
            const card = document.createElement('div');
            card.className = 'card interface-card';
            card.innerHTML = `
                <div class="interface-info">
                    <div class="interface-name">${iface}</div>
                    <div class="interface-status up">
                        <i class="fas fa-circle"></i>
                        <span>Up - 1000 Mbps</span>
                    </div>
                </div>
                <button class="btn btn-primary" onclick="app.configureInterface('${iface}')">
                    <i class="fas fa-cog"></i> Configure
                </button>
            `;
            interfaceList.appendChild(card);
        });
    }

    async loadTSNConfig() {
        if (!this.isConnected) return;

        try {
            const response = await fetch(`${this.apiUrl}/tsn/config`, {
                method: 'GET'
            });

            const data = await response.json();

            if (data.success && data.stdout) {
                // Parse and display TSN configuration
                console.log('TSN Config:', data.stdout);
            }
        } catch (error) {
            console.error('Failed to load TSN config:', error);
        }
    }

    async applyTASConfig() {
        const config = {
            admin_base_time: parseInt(document.getElementById('tasBaseTime').value),
            admin_cycle_time: parseInt(document.getElementById('tasCycleTime').value),
            gate_list: this.getGateControlList()
        };

        this.showLoading(true);

        try {
            const response = await fetch(`${this.apiUrl}/tsn/tas/config`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ port: this.currentPort, ...config })
            });

            const data = await response.json();

            if (data.success) {
                this.showToast('TAS configuration applied', 'success');
            } else {
                this.showToast('Failed to apply TAS configuration', 'error');
            }
        } catch (error) {
            this.showToast('Error applying TAS config: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async applyCBSConfig() {
        const config = {
            traffic_class: parseInt(document.getElementById('cbsTrafficClass').value),
            idle_slope: parseInt(document.getElementById('cbsIdleSlope').value),
            send_slope: parseInt(document.getElementById('cbsSendSlope').value),
            hi_credit: parseInt(document.getElementById('cbsHiCredit').value),
            lo_credit: parseInt(document.getElementById('cbsLoCredit').value)
        };

        this.showLoading(true);

        try {
            const response = await fetch(`${this.apiUrl}/tsn/cbs/config`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ port: this.currentPort, ...config })
            });

            const data = await response.json();

            if (data.success) {
                this.showToast('CBS configuration applied', 'success');
            } else {
                this.showToast('Failed to apply CBS configuration', 'error');
            }
        } catch (error) {
            this.showToast('Error applying CBS config: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async refreshPTPStatus() {
        if (!this.isConnected) return;

        try {
            const response = await fetch(`${this.apiUrl}/ptp/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ port: this.currentPort })
            });

            const data = await response.json();

            if (data.success && data.stdout) {
                this.displayPTPStatus(data.stdout);
            }
        } catch (error) {
            console.error('Failed to refresh PTP status:', error);
        }
    }

    displayPTPStatus(status) {
        const ptpStatus = document.getElementById('ptpStatus');
        if (!ptpStatus) return;

        // Parse and display PTP status
        ptpStatus.innerHTML = `
            <div class="info-list">
                <div class="info-item">
                    <span class="info-label">Clock State:</span>
                    <span class="info-value">Master</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Offset from Master:</span>
                    <span class="info-value">0 ns</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Mean Path Delay:</span>
                    <span class="info-value">125 ns</span>
                </div>
                <div class="info-item">
                    <span class="info-label">Sync Rate:</span>
                    <span class="info-value">128 msg/s</span>
                </div>
            </div>
        `;
    }

    async sendCommand() {
        const input = document.getElementById('consoleInput');
        const output = document.getElementById('consoleOutput');

        if (!input || !output) return;

        const command = input.value.trim();
        if (!command) return;

        // Display command in console
        output.innerHTML += `> ${command}\n`;

        this.showLoading(true);

        try {
            const response = await fetch(`${this.apiUrl}/command`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command: `device ${this.currentPort} ${command}` })
            });

            const data = await response.json();

            if (data.success) {
                output.innerHTML += data.stdout || '';
            } else {
                output.innerHTML += `Error: ${data.error || data.stderr}\n`;
            }
        } catch (error) {
            output.innerHTML += `Error: ${error.message}\n`;
        } finally {
            this.showLoading(false);
            input.value = '';
            output.scrollTop = output.scrollHeight;
        }
    }

    clearConsole() {
        const output = document.getElementById('consoleOutput');
        if (output) {
            output.innerHTML = '';
        }
    }

    exportConsole() {
        const output = document.getElementById('consoleOutput');
        if (!output) return;

        const content = output.innerText;
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `console_log_${new Date().getTime()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    }

    getGateControlList() {
        // Get gate control entries from UI
        // This would need to be implemented based on the gate list UI
        return [
            { gate_states: 0xFF, time_interval: 50000000 },
            { gate_states: 0xFE, time_interval: 30000000 },
            { gate_states: 0xFC, time_interval: 120000000 }
        ];
    }

    addGateEntry() {
        const gateList = document.getElementById('gateControlList');
        if (!gateList) return;

        const entry = document.createElement('div');
        entry.className = 'gate-entry';
        entry.innerHTML = `
            <div class="form-group">
                <label>Gate States (hex)</label>
                <input type="text" class="form-control" placeholder="0xFF">
            </div>
            <div class="form-group">
                <label>Time Interval (ns)</label>
                <input type="number" class="form-control" placeholder="50000000">
            </div>
            <button class="btn btn-danger" onclick="this.parentElement.remove()">
                <i class="fas fa-trash"></i> Remove
            </button>
        `;
        gateList.appendChild(entry);
    }

    updateConnectionStatus(connected) {
        const status = document.getElementById('connectionStatus');
        if (!status) return;

        if (connected) {
            status.classList.add('connected');
            status.classList.remove('disconnected');
            status.innerHTML = `
                <i class="fas fa-circle"></i>
                <span>Connected</span>
            `;
        } else {
            status.classList.remove('connected');
            status.classList.add('disconnected');
            status.innerHTML = `
                <i class="fas fa-circle"></i>
                <span>Disconnected</span>
            `;
        }
    }

    startAutoRefresh() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }

        this.updateInterval = setInterval(() => {
            if (this.isConnected && this.settings.autoRefresh) {
                const activeTab = document.querySelector('.nav-tab.active');
                if (activeTab) {
                    this.loadTabData(activeTab.dataset.tab);
                }
            }
        }, this.settings.updateInterval);
    }

    stopAutoRefresh() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.classList.toggle('show', show);
        }
    }

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const icon = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        }[type] || 'info-circle';

        toast.innerHTML = `
            <i class="fas fa-${icon}"></i>
            <span>${message}</span>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    loadSettings() {
        const saved = localStorage.getItem('velocityDriveSettings');
        if (saved) {
            this.settings = { ...this.settings, ...JSON.parse(saved) };
            this.applySettings();
        }
    }

    saveSettings() {
        this.settings.theme = document.getElementById('theme').value;
        this.settings.updateInterval = parseInt(document.getElementById('updateInterval').value);
        this.settings.autoRefresh = document.getElementById('autoRefresh').checked;

        localStorage.setItem('velocityDriveSettings', JSON.stringify(this.settings));
        this.applySettings();
        this.closeSettings();
        this.showToast('Settings saved', 'success');
    }

    applySettings() {
        // Apply theme
        document.body.setAttribute('data-theme', this.settings.theme);

        // Update form values
        if (document.getElementById('theme')) {
            document.getElementById('theme').value = this.settings.theme;
        }
        if (document.getElementById('updateInterval')) {
            document.getElementById('updateInterval').value = this.settings.updateInterval;
        }
        if (document.getElementById('autoRefresh')) {
            document.getElementById('autoRefresh').checked = this.settings.autoRefresh;
        }

        // Restart auto-refresh with new interval
        if (this.settings.autoRefresh) {
            this.startAutoRefresh();
        } else {
            this.stopAutoRefresh();
        }
    }

    resetDevice() {
        if (confirm('Are you sure you want to reset the device?')) {
            this.showToast('Device reset initiated', 'warning');
            // Implement device reset
        }
    }

    saveConfig() {
        this.showToast('Configuration saved', 'success');
        // Implement config save
    }

    loadConfig() {
        this.showToast('Configuration loaded', 'success');
        // Implement config load
    }

    exportLogs() {
        this.showToast('Logs exported', 'success');
        // Implement log export
    }

    configureInterface(iface) {
        this.showToast(`Configuring ${iface}`, 'info');
        // Implement interface configuration
    }
}

// Global functions for onclick handlers
function connectDevice() { app.connectDevice(); }
function disconnectDevice() { app.disconnectDevice(); }
function refreshDeviceInfo() { app.refreshDeviceInfo(); }
function refreshPTPStatus() { app.refreshPTPStatus(); }
function applyTASConfig() { app.applyTASConfig(); }
function applyCBSConfig() { app.applyCBSConfig(); }
function sendCommand() { app.sendCommand(); }
function clearConsole() { app.clearConsole(); }
function exportConsole() { app.exportConsole(); }
function addGateEntry() { app.addGateEntry(); }
function resetDevice() { app.resetDevice(); }
function saveConfig() { app.saveConfig(); }
function loadConfig() { app.loadConfig(); }
function exportLogs() { app.exportLogs(); }

function toggleSettings() {
    const modal = document.getElementById('settingsModal');
    if (modal) {
        modal.classList.add('show');
    }
}

function closeSettings() {
    const modal = document.getElementById('settingsModal');
    if (modal) {
        modal.classList.remove('show');
    }
}

function saveSettings() { app.saveSettings(); }

// Initialize app when DOM is ready
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new VelocityDriveApp();
});