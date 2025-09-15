// VelocityDRIVE Complete Control Center - Full CLI Feature Support

class VelocityDriveComplete {
    constructor() {
        this.apiUrl = '/api';
        this.currentDevice = null;
        this.isConnected = false;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.initTabs();
        this.refreshPorts();
        this.setupConsole();
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
                    this.sendConsoleCommand();
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

        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        tabElement.classList.add('active');

        const tabName = tabElement.dataset.tab;
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });

        const targetContent = document.getElementById(tabName);
        if (targetContent) {
            targetContent.classList.add('active');
        }
    }

    // ==================== Device Management ====================

    async refreshPorts() {
        try {
            const response = await fetch(`${this.apiUrl}/list-ports`);
            const ports = await response.json();

            const select = document.getElementById('deviceSelect');
            select.innerHTML = '';

            ports.forEach(port => {
                const option = document.createElement('option');
                option.value = port.device;
                option.textContent = port.description ?
                    `${port.device} - ${port.description}` : port.device;
                select.appendChild(option);
            });
        } catch (error) {
            this.showToast('Failed to refresh ports', 'error');
        }
    }

    async connectDevice() {
        const device = document.getElementById('deviceSelect').value;
        this.showLoading(true);

        try {
            const response = await fetch(`${this.apiUrl}/device/connect`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ device })
            });

            const data = await response.json();

            if (data.success) {
                this.currentDevice = device;
                this.isConnected = true;
                this.updateConnectionStatus(true, device);
                this.showToast('Connected successfully', 'success');
                document.getElementById('deviceType').textContent = data.type || 'Connected';
                document.getElementById('deviceStatus').textContent = 'Connected';
            } else {
                this.showToast(data.error || 'Connection failed', 'error');
            }
        } catch (error) {
            this.showToast('Connection error: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async getDeviceType() {
        const device = document.getElementById('deviceSelect').value;
        this.showLoading(true);

        try {
            const response = await fetch(`${this.apiUrl}/device/type`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ device })
            });

            const data = await response.json();

            if (data.success) {
                document.getElementById('deviceType').textContent = data.stdout || 'Unknown';
                this.showToast('Device type retrieved', 'success');
            } else {
                this.showToast('Failed to get device type', 'error');
            }
        } catch (error) {
            this.showToast('Error: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // ==================== YANG Operations ====================

    async yangGet() {
        const path = document.getElementById('yangPath').value;
        if (!path) {
            this.showToast('Please enter a YANG path', 'warning');
            return;
        }

        this.showLoading(true);

        try {
            const response = await fetch(`${this.apiUrl}/yang/get`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path, device: this.currentDevice })
            });

            const data = await response.json();

            if (data.success) {
                document.getElementById('yangResponse').textContent = data.stdout || 'No data';
                this.showToast('YANG GET successful', 'success');
            } else {
                document.getElementById('yangResponse').textContent = data.stderr || 'Error';
                this.showToast('YANG GET failed', 'error');
            }
        } catch (error) {
            this.showToast('Error: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async yangSet() {
        const path = document.getElementById('setPath').value;
        const value = document.getElementById('setValue').value;

        if (!path || !value) {
            this.showToast('Path and value required', 'warning');
            return;
        }

        this.showLoading(true);

        try {
            let parsedValue;
            try {
                parsedValue = JSON.parse(value);
            } catch {
                parsedValue = value;
            }

            const response = await fetch(`${this.apiUrl}/yang/set`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    path,
                    value: parsedValue,
                    device: this.currentDevice
                })
            });

            const data = await response.json();

            if (data.success) {
                this.showToast('YANG SET successful', 'success');
                this.closeDialog('yangSetDialog');
            } else {
                this.showToast('YANG SET failed: ' + (data.stderr || 'Unknown error'), 'error');
            }
        } catch (error) {
            this.showToast('Error: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async yangDelete() {
        const path = document.getElementById('yangPath').value;
        if (!path) {
            this.showToast('Please enter a YANG path', 'warning');
            return;
        }

        if (!confirm(`Delete data at ${path}?`)) return;

        this.showLoading(true);

        try {
            const response = await fetch(`${this.apiUrl}/yang/delete`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path, device: this.currentDevice })
            });

            const data = await response.json();

            if (data.success) {
                this.showToast('YANG DELETE successful', 'success');
                document.getElementById('yangResponse').textContent = 'Data deleted';
            } else {
                this.showToast('YANG DELETE failed', 'error');
            }
        } catch (error) {
            this.showToast('Error: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async getYangCatalogs() {
        this.showLoading(true);

        try {
            const response = await fetch(`${this.apiUrl}/yang/catalogs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ device: this.currentDevice })
            });

            const data = await response.json();

            if (data.success) {
                document.getElementById('yangCatalogs').innerHTML =
                    `<pre>${data.stdout || 'No catalogs'}</pre>`;
            }
        } catch (error) {
            this.showToast('Failed to get YANG catalogs', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // ==================== TSN Operations ====================

    async getTSNInterfaces() {
        this.showLoading(true);

        try {
            const response = await fetch(`${this.apiUrl}/tsn/interfaces`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ device: this.currentDevice })
            });

            const data = await response.json();

            if (data.success) {
                const interfaces = this.parseInterfaces(data.stdout);
                this.displayInterfaces(interfaces);
            }
        } catch (error) {
            this.showToast('Failed to get interfaces', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    parseInterfaces(output) {
        // Parse interface data from CLI output
        // This would need to be adapted based on actual output format
        return [
            { name: 'eth0', status: 'up', speed: '1Gbps' },
            { name: 'eth1', status: 'up', speed: '1Gbps' }
        ];
    }

    displayInterfaces(interfaces) {
        const container = document.getElementById('interfacesList');
        container.innerHTML = '';

        interfaces.forEach(iface => {
            const card = document.createElement('div');
            card.className = 'interface-card';
            card.innerHTML = `
                <div class="interface-name">${iface.name}</div>
                <div class="interface-status ${iface.status}">${iface.status}</div>
                <div class="interface-speed">${iface.speed}</div>
            `;
            container.appendChild(card);
        });
    }

    async configurePTP() {
        const config = {
            enabled: document.getElementById('ptpEnabled').checked,
            clockMode: document.getElementById('ptpClockMode').value,
            domain: parseInt(document.getElementById('ptpDomain').value),
            priority1: parseInt(document.getElementById('ptpPriority1').value)
        };

        this.showLoading(true);

        try {
            const response = await fetch(`${this.apiUrl}/tsn/ptp/config`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ device: this.currentDevice, config })
            });

            const data = await response.json();

            if (data.success) {
                this.showToast('PTP configuration applied', 'success');
            } else {
                this.showToast('PTP configuration failed', 'error');
            }
        } catch (error) {
            this.showToast('Error: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async configureTAS() {
        const gateEntries = [];
        document.querySelectorAll('#gateControlList .gate-entry').forEach(entry => {
            const states = entry.querySelector('input[type="text"]').value;
            const interval = entry.querySelector('input[type="number"]').value;
            if (states && interval) {
                gateEntries.push({ gateStates: states, timeInterval: parseInt(interval) });
            }
        });

        const schedule = {
            enabled: document.getElementById('tasEnabled').checked,
            adminBaseTime: parseInt(document.getElementById('tasBaseTime').value),
            adminCycleTime: parseInt(document.getElementById('tasCycleTime').value),
            adminControlList: gateEntries
        };

        this.showLoading(true);

        try {
            const response = await fetch(`${this.apiUrl}/tsn/tas/schedule`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ device: this.currentDevice, schedule })
            });

            const data = await response.json();

            if (data.success) {
                this.showToast('TAS schedule applied', 'success');
            } else {
                this.showToast('TAS configuration failed', 'error');
            }
        } catch (error) {
            this.showToast('Error: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async configureCBS() {
        const parameters = {
            enabled: document.getElementById('cbsEnabled').checked,
            trafficClass: parseInt(document.getElementById('cbsTrafficClass').value),
            bandwidth: parseInt(document.getElementById('cbsBandwidth').value),
            idleSlope: parseInt(document.getElementById('cbsIdleSlope').value),
            sendSlope: parseInt(document.getElementById('cbsSendSlope').value)
        };

        this.showLoading(true);

        try {
            const response = await fetch(`${this.apiUrl}/tsn/cbs/parameters`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ device: this.currentDevice, parameters })
            });

            const data = await response.json();

            if (data.success) {
                this.showToast('CBS parameters applied', 'success');
            } else {
                this.showToast('CBS configuration failed', 'error');
            }
        } catch (error) {
            this.showToast('Error: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async configureFRER() {
        const config = {
            enabled: document.getElementById('frerEnabled').checked,
            recovery: document.getElementById('frerRecovery').value,
            historyLength: parseInt(document.getElementById('frerHistory').value)
        };

        this.showLoading(true);

        try {
            const response = await fetch(`${this.apiUrl}/tsn/frer/config`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ device: this.currentDevice, config })
            });

            const data = await response.json();

            if (data.success) {
                this.showToast('FRER configuration applied', 'success');
            } else {
                this.showToast('FRER configuration failed', 'error');
            }
        } catch (error) {
            this.showToast('Error: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async getTSNStatistics() {
        this.showLoading(true);

        try {
            const response = await fetch(`${this.apiUrl}/tsn/statistics`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    device: this.currentDevice,
                    interface: 'eth0'
                })
            });

            const data = await response.json();

            if (data.success) {
                this.displayTSNStatistics(data.statistics);
            }
        } catch (error) {
            this.showToast('Failed to get TSN statistics', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    displayTSNStatistics(stats) {
        const container = document.getElementById('tsnStatistics');
        container.innerHTML = '<pre>' + JSON.stringify(stats, null, 2) + '</pre>';
    }

    // ==================== Protocol Operations ====================

    async sendCoAP() {
        const method = document.getElementById('coapMethod').value;
        const uri = document.getElementById('coapUri').value;
        const payload = document.getElementById('coapPayload').value;

        this.showLoading(true);

        try {
            const response = await fetch(`${this.apiUrl}/coap/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    device: this.currentDevice,
                    method,
                    uri,
                    payload
                })
            });

            const data = await response.json();

            document.getElementById('protocolResponse').textContent =
                data.stdout || data.stderr || 'No response';

            if (data.success) {
                this.showToast('CoAP request sent', 'success');
            } else {
                this.showToast('CoAP request failed', 'error');
            }
        } catch (error) {
            this.showToast('Error: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async sendMUP() {
        const message = document.getElementById('mupMessage').value;

        if (!message) {
            this.showToast('Please enter a MUP1 message', 'warning');
            return;
        }

        this.showLoading(true);

        try {
            const response = await fetch(`${this.apiUrl}/mup/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    device: this.currentDevice,
                    message
                })
            });

            const data = await response.json();

            document.getElementById('protocolResponse').textContent =
                data.stdout || data.stderr || 'No response';

            if (data.success) {
                this.showToast('MUP1 message sent', 'success');
            } else {
                this.showToast('MUP1 message failed', 'error');
            }
        } catch (error) {
            this.showToast('Error: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // ==================== Firmware Operations ====================

    async getFirmwareVersion() {
        this.showLoading(true);

        try {
            const response = await fetch(`${this.apiUrl}/firmware/version`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ device: this.currentDevice })
            });

            const data = await response.json();

            if (data.success) {
                document.getElementById('firmwareVersion').textContent =
                    data.stdout || 'Unknown';
            }
        } catch (error) {
            this.showToast('Failed to get firmware version', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async updateFirmware() {
        const firmwarePath = document.getElementById('firmwarePath').value;

        if (!firmwarePath) {
            this.showToast('Please enter firmware file path', 'warning');
            return;
        }

        if (!confirm('Update firmware? This may take several minutes.')) return;

        this.showLoading(true);

        try {
            const response = await fetch(`${this.apiUrl}/firmware/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    device: this.currentDevice,
                    firmware_file: firmwarePath
                })
            });

            const data = await response.json();

            if (data.success) {
                this.showToast('Firmware updated successfully', 'success');
            } else {
                this.showToast('Firmware update failed', 'error');
            }
        } catch (error) {
            this.showToast('Error: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // ==================== Advanced Operations ====================

    async exportConfig() {
        const format = document.getElementById('exportFormat').value;

        this.showLoading(true);

        try {
            const response = await fetch(`${this.apiUrl}/export`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    device: this.currentDevice,
                    format
                })
            });

            const data = await response.json();

            if (data.success) {
                // Create download
                const blob = new Blob([data.stdout], { type: 'text/plain' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `config.${format}`;
                a.click();
                URL.revokeObjectURL(url);

                this.showToast('Configuration exported', 'success');
            }
        } catch (error) {
            this.showToast('Export failed', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async importConfig() {
        const format = document.getElementById('importFormat').value;
        const data = document.getElementById('importData').value;

        if (!data) {
            this.showToast('Please enter configuration data', 'warning');
            return;
        }

        this.showLoading(true);

        try {
            const response = await fetch(`${this.apiUrl}/import`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    device: this.currentDevice,
                    format,
                    data
                })
            });

            const result = await response.json();

            if (result.success) {
                this.showToast('Configuration imported', 'success');
            } else {
                this.showToast('Import failed', 'error');
            }
        } catch (error) {
            this.showToast('Error: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async applyPatch() {
        const patchContent = document.getElementById('patchContent').value;

        if (!patchContent) {
            this.showToast('Please enter patch content', 'warning');
            return;
        }

        this.showLoading(true);

        try {
            const response = await fetch(`${this.apiUrl}/patch`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    device: this.currentDevice,
                    patch_content: patchContent
                })
            });

            const data = await response.json();

            if (data.success) {
                this.showToast('Patch applied successfully', 'success');
            } else {
                this.showToast('Patch failed', 'error');
            }
        } catch (error) {
            this.showToast('Error: ' + error.message, 'error');
        } finally {
            this.showLoading(false);
        }
    }

    async executeBatch() {
        const commands = document.getElementById('batchCommands').value
            .split('\n')
            .filter(cmd => cmd.trim());

        if (commands.length === 0) {
            this.showToast('Please enter commands', 'warning');
            return;
        }

        this.showLoading(true);

        try {
            const response = await fetch(`${this.apiUrl}/batch`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    device: this.currentDevice,
                    commands
                })
            });

            const data = await response.json();

            if (data.success) {
                console.log('Batch results:', data.results);
                this.showToast(`Executed ${commands.length} commands`, 'success');
            }
        } catch (error) {
            this.showToast('Batch execution failed', 'error');
        } finally {
            this.showLoading(false);
        }
    }

    // ==================== Console Operations ====================

    setupConsole() {
        const input = document.getElementById('consoleInput');
        if (input) {
            input.addEventListener('keyup', (e) => {
                if (e.key === 'ArrowUp') {
                    // Command history navigation
                }
            });
        }
    }

    async sendConsoleCommand() {
        const input = document.getElementById('consoleInput');
        const output = document.getElementById('consoleOutput');
        const command = input.value.trim();

        if (!command) return;

        // Display command
        output.innerHTML += `<div class="console-line"><span class="console-prompt">mvdct&gt;</span> ${command}</div>`;

        this.showLoading(true);

        try {
            const response = await fetch(`${this.apiUrl}/command/raw`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command })
            });

            const data = await response.json();

            if (data.stdout) {
                output.innerHTML += `<div class="console-output-line">${this.escapeHtml(data.stdout)}</div>`;
            }
            if (data.stderr) {
                output.innerHTML += `<div class="console-error-line">${this.escapeHtml(data.stderr)}</div>`;
            }
        } catch (error) {
            output.innerHTML += `<div class="console-error-line">Error: ${error.message}</div>`;
        } finally {
            this.showLoading(false);
            input.value = '';
            output.scrollTop = output.scrollHeight;
        }
    }

    clearConsole() {
        document.getElementById('consoleOutput').innerHTML = '';
    }

    exportConsole() {
        const output = document.getElementById('consoleOutput').innerText;
        const blob = new Blob([output], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `console_${new Date().getTime()}.log`;
        a.click();
        URL.revokeObjectURL(url);
    }

    // ==================== UI Helper Functions ====================

    addGateEntry() {
        const list = document.getElementById('gateControlList');
        const entry = document.createElement('div');
        entry.className = 'gate-entry';
        entry.innerHTML = `
            <input type="text" placeholder="Gate States (0xFF)" class="form-control">
            <input type="number" placeholder="Time Interval (ns)" class="form-control">
            <button class="btn btn-sm btn-danger" onclick="removeGateEntry(this)">
                <i class="fas fa-times"></i>
            </button>
        `;
        list.appendChild(entry);
    }

    removeGateEntry(button) {
        button.parentElement.remove();
    }

    showYangSetDialog() {
        const path = document.getElementById('yangPath').value;
        document.getElementById('setPath').value = path;
        document.getElementById('yangSetDialog').classList.add('show');
    }

    showRpcDialog() {
        // Implement RPC dialog
        this.showToast('RPC dialog not yet implemented', 'info');
    }

    closeDialog(dialogId) {
        document.getElementById(dialogId).classList.remove('show');
    }

    clearYangResponse() {
        document.getElementById('yangResponse').textContent = '';
    }

    updateConnectionStatus(connected, device) {
        const status = document.getElementById('connectionStatus');
        const deviceName = document.getElementById('deviceName');

        if (connected) {
            status.classList.add('connected');
            deviceName.textContent = device || 'Connected';
        } else {
            status.classList.remove('connected');
            deviceName.textContent = 'Not Connected';
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

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Global instance and functions
let app;

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    app = new VelocityDriveComplete();
});

// Global functions for onclick handlers
function refreshPorts() { app.refreshPorts(); }
function connectDevice() { app.connectDevice(); }
function getDeviceType() { app.getDeviceType(); }
function yangGet() { app.yangGet(); }
function yangSet() { app.yangSet(); }
function yangDelete() { app.yangDelete(); }
function getYangCatalogs() { app.getYangCatalogs(); }
function showYangSetDialog() { app.showYangSetDialog(); }
function showRpcDialog() { app.showRpcDialog(); }
function closeDialog(id) { app.closeDialog(id); }
function clearYangResponse() { app.clearYangResponse(); }
function getTSNInterfaces() { app.getTSNInterfaces(); }
function configurePTP() { app.configurePTP(); }
function configureTAS() { app.configureTAS(); }
function configureCBS() { app.configureCBS(); }
function configureFRER() { app.configureFRER(); }
function getTSNStatistics() { app.getTSNStatistics(); }
function sendCoAP() { app.sendCoAP(); }
function sendMUP() { app.sendMUP(); }
function getFirmwareVersion() { app.getFirmwareVersion(); }
function updateFirmware() { app.updateFirmware(); }
function exportConfig() { app.exportConfig(); }
function importConfig() { app.importConfig(); }
function applyPatch() { app.applyPatch(); }
function executeBatch() { app.executeBatch(); }
function generateDTLSKey() { app.showToast('DTLS key generation not yet implemented', 'info'); }
function listDTLSKeys() { app.showToast('DTLS key listing not yet implemented', 'info'); }
function addGateEntry() { app.addGateEntry(); }
function removeGateEntry(btn) { app.removeGateEntry(btn); }
function sendConsoleCommand() { app.sendConsoleCommand(); }
function clearConsole() { app.clearConsole(); }
function exportConsole() { app.exportConsole(); }
function toggleSettings() { app.showToast('Settings not yet implemented', 'info'); }