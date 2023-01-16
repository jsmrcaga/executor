class StaticEventEmitter {
	static __events = null;

	static on(event, callback) {
		if(!callback) {
			throw new Error('callback is mandatory');
		}

		if(this.__events === null) {
			this.__events = {};
		}

		// Using a Map allows us to remove listeners really easily
		this.__events[event] = this.__events[event] || new Map();
		this.__events[event].set(callback, callback);
	}

	static once(event, callback) {
		const wrapped_callback = (...args) => {
			// remove callback to prevent next calls
			this.removeEventListener(event, callback);
			// Call actual callback
			callback(...args);
		};

		return this.on(event, callback);
	}

	static addEventListener(event, callback) {
		return this.on(event, callback)
	}

	static removeEventListener(event, callback) {
		if(!this.__events?.[event]) {
			return false;
		}

		return this.__events[event].delete(callback);
	}

	static emit(event, ...args) {
		if(!this.__events?.[event]) {
			return;
		}

		const callbacks = this.__events[event].values();
		for(const cb of callbacks) {
			cb(...args)
		}
	}
}

module.exports = { StaticEventEmitter };
