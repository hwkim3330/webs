#!/usr/bin/env python3
"""
VelocityDRIVE Touch GUI - Web interface for Raspberry Pi
Wraps the CLI tool with a touch-friendly web interface
"""

from flask import Flask, render_template, jsonify, request, Response
from flask_cors import CORS
import subprocess
import json
import os
import serial
import serial.tools.list_ports
import threading
import queue
import time
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# CLI tool path
CLI_PATH = "/home/kim/Downloads/Microchip_VelocityDRIVE_CT-CLI-linux-2025.07.12/mvdct.cli"

# Global serial connection
serial_conn = None
serial_lock = threading.Lock()
output_queue = queue.Queue()

def get_serial_ports():
    """List available serial ports"""
    ports = []
    for port in serial.tools.list_ports.comports():
        ports.append({
            'device': port.device,
            'description': port.description,
            'hwid': port.hwid
        })
    return ports

def execute_cli_command(args):
    """Execute mvdct CLI command"""
    try:
        cmd = [CLI_PATH] + args
        logger.info(f"Executing: {' '.join(cmd)}")

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=10
        )

        return {
            'success': result.returncode == 0,
            'stdout': result.stdout,
            'stderr': result.stderr,
            'command': ' '.join(cmd)
        }
    except subprocess.TimeoutExpired:
        return {
            'success': False,
            'error': 'Command timeout',
            'command': ' '.join(args)
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'command': ' '.join(args)
        }

@app.route('/')
def index():
    """Main page"""
    return render_template('index.html')

@app.route('/api/ports')
def list_ports():
    """List available serial ports"""
    return jsonify(get_serial_ports())

@app.route('/api/connect', methods=['POST'])
def connect_device():
    """Connect to device"""
    global serial_conn

    data = request.json
    port = data.get('port', '/dev/ttyACM0')
    baudrate = data.get('baudrate', 115200)

    try:
        with serial_lock:
            if serial_conn:
                serial_conn.close()

            serial_conn = serial.Serial(
                port=port,
                baudrate=baudrate,
                timeout=1
            )

        return jsonify({
            'success': True,
            'message': f'Connected to {port} at {baudrate} baud'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        })

@app.route('/api/disconnect', methods=['POST'])
def disconnect_device():
    """Disconnect from device"""
    global serial_conn

    try:
        with serial_lock:
            if serial_conn:
                serial_conn.close()
                serial_conn = None

        return jsonify({
            'success': True,
            'message': 'Disconnected'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        })

@app.route('/api/device/info', methods=['POST'])
def get_device_info():
    """Get device information"""
    data = request.json
    port = data.get('port', '/dev/ttyACM0')

    result = execute_cli_command(['device', port, 'get', '/ietf-system:system-state'])
    return jsonify(result)

@app.route('/api/device/capabilities', methods=['POST'])
def get_capabilities():
    """Get device capabilities"""
    data = request.json
    port = data.get('port', '/dev/ttyACM0')

    result = execute_cli_command(['device', port, 'get-capabilities'])
    return jsonify(result)

@app.route('/api/interface/list', methods=['POST'])
def list_interfaces():
    """List network interfaces"""
    data = request.json
    port = data.get('port', '/dev/ttyACM0')

    result = execute_cli_command(['device', port, 'get', '/ietf-interfaces:interfaces'])
    return jsonify(result)

@app.route('/api/interface/status/<interface>', methods=['POST'])
def get_interface_status(interface):
    """Get interface status"""
    data = request.json
    port = data.get('port', '/dev/ttyACM0')

    path = f'/ietf-interfaces:interfaces/interface[name="{interface}"]'
    result = execute_cli_command(['device', port, 'get', path])
    return jsonify(result)

@app.route('/api/tsn/config', methods=['GET', 'POST'])
def tsn_config():
    """Get or set TSN configuration"""
    if request.method == 'GET':
        data = request.json or {}
        port = data.get('port', '/dev/ttyACM0')

        result = execute_cli_command(['device', port, 'get', '/ieee802-dot1q-tsn-config:tsn'])
        return jsonify(result)

    elif request.method == 'POST':
        data = request.json
        port = data.get('port', '/dev/ttyACM0')
        config = data.get('config', {})

        # Build configuration command
        # This would need to be expanded based on specific TSN parameters
        result = execute_cli_command(['device', port, 'set', '/ieee802-dot1q-tsn-config:tsn', json.dumps(config)])
        return jsonify(result)

@app.route('/api/tsn/tas/config', methods=['GET', 'POST'])
def tas_config():
    """Configure Time-Aware Shaper"""
    data = request.json or {}
    port = data.get('port', '/dev/ttyACM0')

    if request.method == 'GET':
        result = execute_cli_command(['device', port, 'get', '/ieee802-dot1q-sched:sched'])
        return jsonify(result)

    elif request.method == 'POST':
        # TAS configuration parameters
        admin_base_time = data.get('admin_base_time', 0)
        admin_cycle_time = data.get('admin_cycle_time', 200000000)  # 200ms default
        gate_list = data.get('gate_list', [])

        # Build TAS configuration
        tas_config = {
            'admin-base-time': admin_base_time,
            'admin-cycle-time': admin_cycle_time,
            'admin-control-list': gate_list
        }

        result = execute_cli_command(['device', port, 'set', '/ieee802-dot1q-sched:sched', json.dumps(tas_config)])
        return jsonify(result)

@app.route('/api/tsn/cbs/config', methods=['GET', 'POST'])
def cbs_config():
    """Configure Credit-Based Shaper"""
    data = request.json or {}
    port = data.get('port', '/dev/ttyACM0')

    if request.method == 'GET':
        result = execute_cli_command(['device', port, 'get', '/ieee802-dot1q-stream-filters-gates:stream-filters-gates'])
        return jsonify(result)

    elif request.method == 'POST':
        # CBS configuration parameters
        idle_slope = data.get('idle_slope', 10000)
        send_slope = data.get('send_slope', -990000)
        hi_credit = data.get('hi_credit', 100)
        lo_credit = data.get('lo_credit', -100)

        cbs_config = {
            'idle-slope': idle_slope,
            'send-slope': send_slope,
            'hi-credit': hi_credit,
            'lo-credit': lo_credit
        }

        result = execute_cli_command(['device', port, 'set', '/ieee802-dot1q-stream-filters-gates:stream-filters-gates', json.dumps(cbs_config)])
        return jsonify(result)

@app.route('/api/ptp/status', methods=['POST'])
def ptp_status():
    """Get PTP status"""
    data = request.json
    port = data.get('port', '/dev/ttyACM0')

    result = execute_cli_command(['device', port, 'get', '/ieee1588-ptp:ptp'])
    return jsonify(result)

@app.route('/api/statistics', methods=['POST'])
def get_statistics():
    """Get interface statistics"""
    data = request.json
    port = data.get('port', '/dev/ttyACM0')
    interface = data.get('interface', 'eth0')

    path = f'/ietf-interfaces:interfaces/interface[name="{interface}"]/statistics'
    result = execute_cli_command(['device', port, 'get', path])
    return jsonify(result)

@app.route('/api/command', methods=['POST'])
def execute_command():
    """Execute raw CLI command"""
    data = request.json
    command = data.get('command', '')

    if not command:
        return jsonify({'success': False, 'error': 'No command provided'})

    args = command.split()
    result = execute_cli_command(args)
    return jsonify(result)

@app.route('/api/health')
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'cli_path': CLI_PATH,
        'cli_exists': os.path.exists(CLI_PATH)
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080, debug=True)