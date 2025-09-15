#!/usr/bin/env python3
"""
VelocityDRIVE Touch GUI - Complete Web interface with all CLI features
Comprehensive wrapper for all mvdct CLI commands
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
import yaml

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

# CLI tool path
CLI_PATH = "/home/kim/Downloads/Microchip_VelocityDRIVE_CT-CLI-linux-2025.07.12/mvdct.cli"

# Global variables
serial_conn = None
serial_lock = threading.Lock()
output_queue = queue.Queue()
current_device = None

def execute_cli_command(args, timeout=30):
    """Execute mvdct CLI command with timeout"""
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

# ==================== Basic Device Management ====================

@app.route('/')
def index():
    """Main page"""
    return render_template('index_complete.html')

@app.route('/api/list-ports')
def list_serial_ports():
    """List available serial ports"""
    result = execute_cli_command(['list'])
    ports = []

    if result['success']:
        # Parse the output to extract port information
        lines = result['stdout'].strip().split('\n')
        for line in lines:
            if '/dev/' in line or 'COM' in line:
                ports.append({'device': line.strip()})

    # Also get system ports
    for port in serial.tools.list_ports.comports():
        ports.append({
            'device': port.device,
            'description': port.description,
            'hwid': port.hwid
        })

    return jsonify(ports)

@app.route('/api/device/type', methods=['POST'])
def get_device_type():
    """Get device type"""
    data = request.json
    device = data.get('device', '/dev/ttyACM0')

    result = execute_cli_command(['device', device, 'type'])
    return jsonify(result)

@app.route('/api/device/connect', methods=['POST'])
def connect_device():
    """Connect to a device and verify connection"""
    global current_device

    data = request.json
    device = data.get('device', '/dev/ttyACM0')

    # Test connection by getting device type
    result = execute_cli_command(['device', device, 'type'])

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
            'error': result.get('stderr', 'Connection failed')
        })

# ==================== YANG Data Management ====================

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

    # Convert value to JSON string if it's a dict/list
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

@app.route('/api/yang/call', methods=['POST'])
def yang_call_rpc():
    """Call RPC/action according to YANG catalog"""
    data = request.json
    device = data.get('device', current_device or '/dev/ttyACM0')
    rpc_id = data.get('id')
    value = data.get('value', '{}')

    if not rpc_id:
        return jsonify({'success': False, 'error': 'RPC ID required'})

    if isinstance(value, dict):
        value = json.dumps(value)

    result = execute_cli_command(['device', device, 'call', rpc_id, value])
    return jsonify(result)

# ==================== Firmware Management ====================

@app.route('/api/firmware/version', methods=['POST'])
def get_firmware_version():
    """Get firmware version"""
    data = request.json
    device = data.get('device', current_device or '/dev/ttyACM0')

    result = execute_cli_command(['device', device, 'firmware'])
    return jsonify(result)

@app.route('/api/firmware/update', methods=['POST'])
def update_firmware():
    """Update firmware"""
    data = request.json
    device = data.get('device', current_device or '/dev/ttyACM0')
    firmware_file = data.get('firmware_file')

    if not firmware_file:
        return jsonify({'success': False, 'error': 'Firmware file path required'})

    if not os.path.exists(firmware_file):
        return jsonify({'success': False, 'error': 'Firmware file not found'})

    result = execute_cli_command(['device', device, 'firmware', firmware_file], timeout=300)
    return jsonify(result)

# ==================== Patch and Fetch Operations ====================

@app.route('/api/patch', methods=['POST'])
def apply_patch():
    """Apply YANG patch file"""
    data = request.json
    device = data.get('device', current_device or '/dev/ttyACM0')
    patch_content = data.get('patch_content')

    if not patch_content:
        return jsonify({'success': False, 'error': 'Patch content required'})

    # Write patch to temporary file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.patch', delete=False) as f:
        f.write(patch_content)
        patch_file = f.name

    try:
        result = execute_cli_command(['device', device, 'patch', patch_file])
        return jsonify(result)
    finally:
        os.unlink(patch_file)

@app.route('/api/fetch', methods=['POST'])
def fetch_data():
    """Fetch data using fetch file"""
    data = request.json
    device = data.get('device', current_device or '/dev/ttyACM0')
    fetch_spec = data.get('fetch_spec')

    if not fetch_spec:
        return jsonify({'success': False, 'error': 'Fetch specification required'})

    # Write fetch spec to temporary file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.fetch', delete=False) as f:
        f.write(fetch_spec)
        fetch_file = f.name

    try:
        result = execute_cli_command(['device', device, 'fetch', fetch_file])
        return jsonify(result)
    finally:
        os.unlink(fetch_file)

# ==================== CoAP and MUP1 Protocol ====================

@app.route('/api/coap/send', methods=['POST'])
def send_coap():
    """Send CoAP message"""
    data = request.json
    device = data.get('device', current_device or '/dev/ttyACM0')
    method = data.get('method', 'GET')
    uri = data.get('uri', '/')
    payload = data.get('payload', '')

    coap_args = ['device', device, 'coap', method, uri]
    if payload:
        coap_args.append(payload)

    result = execute_cli_command(coap_args)
    return jsonify(result)

@app.route('/api/mup/send', methods=['POST'])
def send_mup():
    """Send MUP1 message"""
    data = request.json
    device = data.get('device', current_device or '/dev/ttyACM0')
    message = data.get('message', '')

    if not message:
        return jsonify({'success': False, 'error': 'MUP1 message required'})

    result = execute_cli_command(['device', device, 'mup', message])
    return jsonify(result)

# ==================== Import/Export ====================

@app.route('/api/export/formats', methods=['POST'])
def get_export_formats():
    """Get available export formats"""
    data = request.json
    device = data.get('device', current_device or '/dev/ttyACM0')

    result = execute_cli_command(['device', device, 'export'])
    return jsonify(result)

@app.route('/api/import/formats', methods=['POST'])
def get_import_formats():
    """Get available import formats"""
    data = request.json
    device = data.get('device', current_device or '/dev/ttyACM0')

    result = execute_cli_command(['device', device, 'import'])
    return jsonify(result)

@app.route('/api/export', methods=['POST'])
def export_config():
    """Export configuration"""
    data = request.json
    device = data.get('device', current_device or '/dev/ttyACM0')
    format_type = data.get('format', 'json')
    path = data.get('path', '/')

    result = execute_cli_command(['device', device, 'export', format_type, path])
    return jsonify(result)

@app.route('/api/import', methods=['POST'])
def import_config():
    """Import configuration"""
    data = request.json
    device = data.get('device', current_device or '/dev/ttyACM0')
    format_type = data.get('format', 'json')
    config_data = data.get('data')

    if not config_data:
        return jsonify({'success': False, 'error': 'Configuration data required'})

    # Write config to temporary file
    with tempfile.NamedTemporaryFile(mode='w', suffix=f'.{format_type}', delete=False) as f:
        f.write(config_data)
        config_file = f.name

    try:
        result = execute_cli_command(['device', device, 'import', format_type, config_file])
        return jsonify(result)
    finally:
        os.unlink(config_file)

# ==================== DTLS Key Management ====================

@app.route('/api/key/generate', methods=['POST'])
def generate_key():
    """Generate DTLS key"""
    result = execute_cli_command(['key', 'generate'])
    return jsonify(result)

@app.route('/api/key/list', methods=['GET'])
def list_keys():
    """List available DTLS keys"""
    result = execute_cli_command(['key', 'list'])
    return jsonify(result)

# ==================== TSN Specific Endpoints ====================

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

@app.route('/api/tsn/tas/schedule', methods=['GET', 'POST'])
def tas_schedule():
    """Get or set TAS schedule"""
    device = request.json.get('device', current_device or '/dev/ttyACM0') if request.json else current_device or '/dev/ttyACM0'

    if request.method == 'GET':
        result = execute_cli_command(['device', device, 'get', '/ieee802-dot1q-sched:sched'])
    else:
        schedule = request.json.get('schedule', {})
        result = execute_cli_command(['device', device, 'set', '/ieee802-dot1q-sched:sched', json.dumps(schedule)])

    return jsonify(result)

@app.route('/api/tsn/cbs/parameters', methods=['GET', 'POST'])
def cbs_parameters():
    """Get or set CBS parameters"""
    device = request.json.get('device', current_device or '/dev/ttyACM0') if request.json else current_device or '/dev/ttyACM0'

    if request.method == 'GET':
        result = execute_cli_command(['device', device, 'get', '/ieee802-dot1q-stream-filters-gates:stream-filters-gates'])
    else:
        params = request.json.get('parameters', {})
        result = execute_cli_command(['device', device, 'set', '/ieee802-dot1q-stream-filters-gates:stream-filters-gates', json.dumps(params)])

    return jsonify(result)

@app.route('/api/tsn/frer/config', methods=['GET', 'POST'])
def frer_config():
    """Get or set FRER configuration"""
    device = request.json.get('device', current_device or '/dev/ttyACM0') if request.json else current_device or '/dev/ttyACM0'

    if request.method == 'GET':
        result = execute_cli_command(['device', device, 'get', '/ieee802-dot1cb:frer'])
    else:
        config = request.json.get('config', {})
        result = execute_cli_command(['device', device, 'set', '/ieee802-dot1cb:frer', json.dumps(config)])

    return jsonify(result)

@app.route('/api/tsn/statistics', methods=['POST'])
def get_tsn_statistics():
    """Get TSN statistics"""
    data = request.json
    device = data.get('device', current_device or '/dev/ttyACM0')
    interface = data.get('interface', 'eth0')

    paths = [
        f'/ietf-interfaces:interfaces/interface[name="{interface}"]/statistics',
        f'/ieee802-dot1q-bridge:bridges/bridge/port[name="{interface}"]/statistics'
    ]

    results = {}
    for path in paths:
        result = execute_cli_command(['device', device, 'get', path])
        if result['success']:
            results[path] = result['stdout']

    return jsonify({
        'success': True,
        'statistics': results
    })

# ==================== Advanced Operations ====================

@app.route('/api/command/raw', methods=['POST'])
def execute_raw_command():
    """Execute raw CLI command with full argument support"""
    data = request.json
    command = data.get('command', '')
    timeout = data.get('timeout', 30)

    if not command:
        return jsonify({'success': False, 'error': 'No command provided'})

    # Parse command string into arguments
    import shlex
    args = shlex.split(command)

    result = execute_cli_command(args, timeout=timeout)
    return jsonify(result)

@app.route('/api/log/config', methods=['POST'])
def configure_logging():
    """Configure CLI logging"""
    data = request.json
    log_file = data.get('log_file')
    console = data.get('console', False)
    continue_log = data.get('continue_log', False)

    global CLI_OPTIONS
    CLI_OPTIONS = []

    if log_file:
        CLI_OPTIONS.extend(['--log-file', log_file])
    if console:
        CLI_OPTIONS.append('--console')
    if continue_log:
        CLI_OPTIONS.append('--continue-log')

    return jsonify({
        'success': True,
        'options': CLI_OPTIONS
    })

@app.route('/api/batch', methods=['POST'])
def execute_batch():
    """Execute multiple commands in batch"""
    data = request.json
    commands = data.get('commands', [])
    device = data.get('device', current_device or '/dev/ttyACM0')

    results = []
    for cmd in commands:
        if isinstance(cmd, str):
            args = ['device', device] + cmd.split()
        else:
            args = ['device', device] + cmd

        result = execute_cli_command(args)
        results.append({
            'command': ' '.join(args),
            'result': result
        })

    return jsonify({
        'success': True,
        'results': results
    })

@app.route('/api/health')
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'cli_path': CLI_PATH,
        'cli_exists': os.path.exists(CLI_PATH),
        'current_device': current_device
    })

@app.route('/api/capabilities')
def get_capabilities():
    """Get all supported CLI capabilities"""
    return jsonify({
        'device_management': [
            'connect', 'list_ports', 'get_type', 'firmware'
        ],
        'yang_operations': [
            'get', 'set', 'delete', 'call_rpc', 'catalogs'
        ],
        'protocols': [
            'coap', 'mup1'
        ],
        'tsn_features': [
            'ptp', 'tas', 'cbs', 'frer', 'statistics'
        ],
        'data_operations': [
            'import', 'export', 'patch', 'fetch'
        ],
        'security': [
            'dtls_keys'
        ],
        'utilities': [
            'batch_execution', 'raw_commands', 'logging'
        ]
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080, debug=True)