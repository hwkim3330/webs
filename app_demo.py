#!/usr/bin/env python3
"""
VelocityDRIVE Touch GUI - Demo Mode
Works without actual hardware for testing and demonstration
"""

from flask import Flask, render_template, jsonify, request, Response, send_file
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
import tempfile
import random

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# CLI tool path
CLI_PATH = "/home/kim/Downloads/Microchip_VelocityDRIVE_CT-CLI-linux-2025.07.12/mvdct.cli"

# Demo mode settings
DEMO_MODE = True
current_device = None
demo_connected = False

def generate_demo_response(command_type, success=True):
    """Generate realistic demo responses"""

    demo_responses = {
        'device_type': {
            'success': True,
            'stdout': 'Microchip LAN9662 VelocityDRIVE Evaluation Board',
            'stderr': '',
            'command': 'demo command'
        },
        'yang_get_system': {
            'success': True,
            'stdout': '''{
    "ietf-system:system-state": {
        "platform": {
            "os-name": "VelocityDRIVE",
            "os-release": "2025.07.12",
            "machine": "LAN9662",
            "processor": "ARM Cortex-A7"
        },
        "clock": {
            "current-datetime": "2025-09-15T12:00:00Z",
            "boot-datetime": "2025-09-15T10:00:00Z"
        }
    }
}''',
            'stderr': '',
            'command': 'demo command'
        },
        'interfaces': {
            'success': True,
            'stdout': '''{
    "ietf-interfaces:interfaces": {
        "interface": [
            {
                "name": "eth0",
                "type": "iana-if-type:ethernetCsmacd",
                "enabled": true,
                "oper-status": "up",
                "speed": 1000000000,
                "mtu": 1500
            },
            {
                "name": "eth1",
                "type": "iana-if-type:ethernetCsmacd",
                "enabled": true,
                "oper-status": "up",
                "speed": 1000000000,
                "mtu": 1500
            },
            {
                "name": "eth2",
                "type": "iana-if-type:ethernetCsmacd",
                "enabled": false,
                "oper-status": "down",
                "speed": 1000000000,
                "mtu": 1500
            }
        ]
    }
}''',
            'stderr': '',
            'command': 'demo command'
        },
        'ptp_status': {
            'success': True,
            'stdout': '''{
    "ieee1588-ptp:ptp": {
        "instance-list": {
            "instance": [
                {
                    "instance-index": 0,
                    "default-ds": {
                        "clock-identity": "00:04:A3:FF:FE:12:34:56",
                        "clock-quality": {
                            "clock-class": 248,
                            "clock-accuracy": "0x21",
                            "offset-scaled-log-variance": 17258
                        },
                        "priority1": 128,
                        "priority2": 128,
                        "domain-number": 0,
                        "slave-only": false,
                        "two-step-flag": true
                    },
                    "current-ds": {
                        "steps-removed": 0,
                        "offset-from-master": 125,
                        "mean-path-delay": 250
                    },
                    "port-ds-list": {
                        "port-ds": [
                            {
                                "port-number": 1,
                                "port-state": "master",
                                "log-min-delay-req-interval": 0,
                                "peer-mean-path-delay": 0,
                                "log-announce-interval": 1,
                                "announce-receipt-timeout": 3,
                                "log-sync-interval": 0,
                                "delay-mechanism": "E2E",
                                "log-min-pdelay-req-interval": 0,
                                "version-number": 2
                            }
                        ]
                    }
                }
            ]
        }
    }
}''',
            'stderr': '',
            'command': 'demo command'
        },
        'statistics': {
            'success': True,
            'stdout': '''{
    "ietf-interfaces:interfaces": {
        "interface": [
            {
                "name": "eth0",
                "statistics": {
                    "in-octets": ''' + str(random.randint(1000000, 9999999)) + ''',
                    "in-unicast-pkts": ''' + str(random.randint(10000, 99999)) + ''',
                    "in-discards": ''' + str(random.randint(0, 100)) + ''',
                    "in-errors": ''' + str(random.randint(0, 10)) + ''',
                    "out-octets": ''' + str(random.randint(1000000, 9999999)) + ''',
                    "out-unicast-pkts": ''' + str(random.randint(10000, 99999)) + ''',
                    "out-discards": ''' + str(random.randint(0, 50)) + ''',
                    "out-errors": ''' + str(random.randint(0, 5)) + '''
                }
            }
        ]
    }
}''',
            'stderr': '',
            'command': 'demo command'
        },
        'firmware_version': {
            'success': True,
            'stdout': 'VelocityDRIVE Firmware v2025.07.12-release\nBuild: Jul 12 2025 14:30:00\nBootloader: v1.2.3',
            'stderr': '',
            'command': 'demo command'
        },
        'yang_catalogs': {
            'success': True,
            'stdout': '''Available YANG modules:
- ietf-system
- ietf-interfaces
- ieee1588-ptp
- ieee802-dot1q-sched
- ieee802-dot1q-stream-filters-gates
- ieee802-dot1cb-frer
- microchip-lan966x''',
            'stderr': '',
            'command': 'demo command'
        },
        'success_operation': {
            'success': True,
            'stdout': 'Operation completed successfully',
            'stderr': '',
            'command': 'demo command'
        },
        'error_operation': {
            'success': False,
            'stdout': '',
            'stderr': 'Demo error: Operation failed for demonstration',
            'command': 'demo command'
        }
    }

    if not success:
        return demo_responses.get('error_operation', demo_responses['success_operation'])

    return demo_responses.get(command_type, demo_responses['success_operation'])

def execute_cli_command(args, timeout=30, demo_mode_override=None):
    """Execute CLI command or return demo response"""
    global demo_connected

    # Check if we should use demo mode
    use_demo = DEMO_MODE if demo_mode_override is None else demo_mode_override

    if use_demo:
        # Parse command to determine demo response type
        command_str = ' '.join(args)

        if 'list' in command_str:
            return {
                'success': True,
                'stdout': '/dev/ttyACM0 - Demo VelocityDRIVE Device\n/dev/ttyUSB0 - Demo Serial Port\n192.168.1.100 - Demo Network Device',
                'stderr': '',
                'command': command_str
            }
        elif 'type' in command_str:
            return generate_demo_response('device_type')
        elif 'get /ietf-system' in command_str:
            return generate_demo_response('yang_get_system')
        elif 'get /ietf-interfaces' in command_str:
            return generate_demo_response('interfaces')
        elif 'get /ieee1588-ptp' in command_str:
            return generate_demo_response('ptp_status')
        elif 'statistics' in command_str:
            return generate_demo_response('statistics')
        elif 'firmware' in command_str and len(args) == 3:
            return generate_demo_response('firmware_version')
        elif 'yang' in command_str:
            return generate_demo_response('yang_catalogs')
        elif 'set' in command_str or 'delete' in command_str or 'call' in command_str:
            return generate_demo_response('success_operation')
        else:
            return generate_demo_response('success_operation')

    # Real CLI execution (for when hardware is connected)
    try:
        cmd = [CLI_PATH] + args
        logger.info(f"Executing: {' '.join(cmd)}")

        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout
        )

        return {
            'success': result.returncode == 0,
            'stdout': result.stdout,
            'stderr': result.stderr,
            'command': ' '.join(cmd),
            'returncode': result.returncode
        }
    except subprocess.TimeoutExpired:
        return {
            'success': False,
            'error': f'Command timeout after {timeout}s',
            'command': ' '.join(args)
        }
    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'command': ' '.join(args)
        }

# ==================== Routes ====================

@app.route('/')
def index():
    """Main page"""
    return render_template('index_complete.html')

@app.route('/api/demo/toggle', methods=['POST'])
def toggle_demo_mode():
    """Toggle demo mode on/off"""
    global DEMO_MODE
    data = request.json
    DEMO_MODE = data.get('enabled', True)

    return jsonify({
        'success': True,
        'demo_mode': DEMO_MODE,
        'message': f'Demo mode {"enabled" if DEMO_MODE else "disabled"}'
    })

@app.route('/api/list-ports')
def list_serial_ports():
    """List available serial ports"""
    if DEMO_MODE:
        return jsonify([
            {'device': '/dev/ttyACM0', 'description': 'Demo VelocityDRIVE Device', 'hwid': 'DEMO:001'},
            {'device': '/dev/ttyUSB0', 'description': 'Demo Serial Port', 'hwid': 'DEMO:002'},
            {'device': '192.168.1.100', 'description': 'Demo Network Device', 'hwid': 'NET:DEMO'}
        ])

    result = execute_cli_command(['list'], demo_mode_override=False)
    ports = []

    if result['success']:
        lines = result['stdout'].strip().split('\n')
        for line in lines:
            if '/dev/' in line or 'COM' in line or '192.168.' in line:
                ports.append({'device': line.strip()})

    # Also get system ports
    for port in serial.tools.list_ports.comports():
        ports.append({
            'device': port.device,
            'description': port.description,
            'hwid': port.hwid
        })

    return jsonify(ports)

@app.route('/api/device/connect', methods=['POST'])
def connect_device():
    """Connect to a device"""
    global current_device, demo_connected

    data = request.json
    device = data.get('device', '/dev/ttyACM0')

    if DEMO_MODE:
        current_device = device
        demo_connected = True
        return jsonify({
            'success': True,
            'device': device,
            'type': 'Microchip LAN9662 VelocityDRIVE (Demo Mode)',
            'message': f'Connected to {device} in demo mode'
        })

    # Real connection attempt
    result = execute_cli_command(['device', device, 'type'], demo_mode_override=False)

    if result['success']:
        current_device = device
        return jsonify({
            'success': True,
            'device': device,
            'type': result['stdout'].strip(),
            'message': f'Connected to {device}'
        })
    else:
        return jsonify({
            'success': False,
            'error': result.get('stderr', 'Connection failed'),
            'suggestion': 'Try demo mode if no hardware is available'
        })

@app.route('/api/device/type', methods=['POST'])
def get_device_type():
    """Get device type"""
    data = request.json
    device = data.get('device', current_device or '/dev/ttyACM0')

    result = execute_cli_command(['device', device, 'type'])
    return jsonify(result)

# ==================== YANG Operations ====================

@app.route('/api/yang/catalogs', methods=['POST'])
def get_yang_catalogs():
    """Get YANG catalogs"""
    data = request.json
    device = data.get('device', current_device or '/dev/ttyACM0')

    result = execute_cli_command(['device', device, 'yang'])
    return jsonify(result)

@app.route('/api/yang/get', methods=['POST'])
def yang_get():
    """Get data according to YANG catalog"""
    data = request.json
    device = data.get('device', current_device or '/dev/ttyACM0')
    path = data.get('path', '/')

    result = execute_cli_command(['device', device, 'get', path])
    return jsonify(result)

@app.route('/api/yang/set', methods=['POST'])
def yang_set():
    """Set data according to YANG catalog"""
    data = request.json
    device = data.get('device', current_device or '/dev/ttyACM0')
    path = data.get('path')
    value = data.get('value')

    if not path or value is None:
        return jsonify({'success': False, 'error': 'Path and value required'})

    if isinstance(value, (dict, list)):
        value = json.dumps(value)

    result = execute_cli_command(['device', device, 'set', path, value])
    return jsonify(result)

@app.route('/api/yang/delete', methods=['POST'])
def yang_delete():
    """Delete data from datastore"""
    data = request.json
    device = data.get('device', current_device or '/dev/ttyACM0')
    path = data.get('path')

    if not path:
        return jsonify({'success': False, 'error': 'Path required'})

    result = execute_cli_command(['device', device, 'delete', path])
    return jsonify(result)

# ==================== TSN Operations ====================

@app.route('/api/tsn/interfaces', methods=['POST'])
def get_tsn_interfaces():
    """Get TSN-capable interfaces"""
    data = request.json
    device = data.get('device', current_device or '/dev/ttyACM0')

    result = execute_cli_command(['device', device, 'get', '/ietf-interfaces:interfaces'])
    return jsonify(result)

@app.route('/api/tsn/ptp/config', methods=['GET', 'POST'])
def ptp_config():
    """Get or set PTP configuration"""
    device = request.json.get('device', current_device or '/dev/ttyACM0') if request.json else current_device or '/dev/ttyACM0'

    if request.method == 'GET':
        result = execute_cli_command(['device', device, 'get', '/ieee1588-ptp:ptp'])
    else:
        config = request.json.get('config', {})
        result = execute_cli_command(['device', device, 'set', '/ieee1588-ptp:ptp', json.dumps(config)])

    return jsonify(result)

@app.route('/api/tsn/statistics', methods=['POST'])
def get_tsn_statistics():
    """Get TSN statistics"""
    data = request.json
    device = data.get('device', current_device or '/dev/ttyACM0')
    interface = data.get('interface', 'eth0')

    result = execute_cli_command(['device', device, 'get', f'/ietf-interfaces:interfaces/interface[name="{interface}"]/statistics'])

    return jsonify({
        'success': result['success'],
        'statistics': result['stdout'] if result['success'] else None,
        'error': result.get('stderr')
    })

# ==================== Console and Raw Commands ====================

@app.route('/api/command/raw', methods=['POST'])
def execute_raw_command():
    """Execute raw CLI command"""
    data = request.json
    command = data.get('command', '')
    timeout = data.get('timeout', 30)

    if not command:
        return jsonify({'success': False, 'error': 'No command provided'})

    import shlex
    try:
        args = shlex.split(command)
    except ValueError as e:
        return jsonify({'success': False, 'error': f'Invalid command syntax: {e}'})

    result = execute_cli_command(args, timeout=timeout)
    return jsonify(result)

@app.route('/api/health')
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'cli_path': CLI_PATH,
        'cli_exists': os.path.exists(CLI_PATH),
        'current_device': current_device,
        'demo_mode': DEMO_MODE,
        'demo_connected': demo_connected
    })

@app.route('/api/capabilities')
def get_capabilities():
    """Get all supported CLI capabilities"""
    return jsonify({
        'demo_mode': DEMO_MODE,
        'device_management': ['connect', 'list_ports', 'get_type'],
        'yang_operations': ['get', 'set', 'delete', 'call_rpc', 'catalogs'],
        'tsn_features': ['ptp', 'tas', 'cbs', 'frer', 'statistics'],
        'utilities': ['raw_commands', 'demo_mode_toggle']
    })

# Copy other routes from app_complete.py for full functionality
# (Adding key routes here for brevity)

if __name__ == '__main__':
    print("🎭 VelocityDRIVE Demo Mode Server Starting...")
    print("📱 Access GUI at: http://localhost:8080")
    print("🔧 Demo mode:", "ENABLED" if DEMO_MODE else "DISABLED")
    if DEMO_MODE:
        print("💡 No hardware required - using simulated responses")

    app.run(host='0.0.0.0', port=8080, debug=True)