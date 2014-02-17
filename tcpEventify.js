/* NODE MODULES */
var eventEmitter = require('events').EventEmitter,
	util = require('util'),
	warning = "WARNING: JSON.parse() failed at TcpEventify socket.on('data', ...)";

/* LOCAL VARIABLES */
var delimiter = '\n\@';

/* CONSTRUCTOR */
var TcpEventEmitter = function (socket) {
	var self = this;
	this.socket = socket;
	this.socket.setEncoding('utf8');
	this.socket.on('data', function (data) {
		// Split data into packets according to 'delimiter'
		var packets = data.toString().split(delimiter);
		if (packets[packets.length - 1] === '') { 
			packets.pop();
		}
		// Handle each packet
		packets.forEach(function (packet) {
			try { 
				var message = JSON.parse(packet); 
				if (message.subject) {
					self.emit(message.subject, message.content);
					// Emit a generic 'event' event for unsubscribed events
					self.emit('event', { 
						name: message.subject, 
						message: message.content
					});
				} else {
					self.emit('other', message);
				}
			// Catch exceptions
			} catch (e) { 
				console.log(warning + ' for the message ' + packet.substring(0, 20)+' \nError: ' + e); 
			}
		});
	});
	// Route default socket events to the new emitter
	['drain','timeout','close','error','end'].forEach(function (event) {
		self.socket.on(event, function (args) { 
			self.emit(event, args); 
		});
	});
}

/* INHERITANCE */
util.inherits(TcpEventEmitter, eventEmitter);

/* PROTOTYPES */
TcpEventEmitter.prototype.send = function (event, content, callback) {
	if (this.socket.writable) {
		this.socket.write(JSON.stringify({
			subject: event,
			content: content
		}) + delimiter, function () {
			if (typeof callback == 'function') {
				callback(true);
			}
		});
	} else {
		this.emit('close');
		if (typeof callback === 'function') {
			callback(false);
		}
	}
}

/* EXPORTS */
module.exports = function (socket) {
	return new TcpEventEmitter(socket);
}