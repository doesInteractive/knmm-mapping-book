/**
 * Power management scripts for NEC projectors
 * Usage example:
 * node projector_power.js [on|off] [ip address]
 */
const net = require('net')
const _socket = new net.Socket()

_socket.setEncoding('hex')
_socket.connect(7142, process.argv[3], function() {
  let command = process.argv[2] == 'on' ? '020000000002' : '020100000003'
  _socket.write(new Buffer.alloc(7, command, 'hex'))
})
_socket.on('data', function(data) { _socket.destroy()})
_socket.on('error', function(err) { console.log('projector unreachable') })
