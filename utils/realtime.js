const EventEmitter = require('events');

function createRealtime({ enabled = true, serverUrl = '' } = {}) {
  const emitter = new EventEmitter();

  async function forward(event) {
    if (!enabled || !serverUrl) {
      return;
    }

    try {
      await fetch(`${serverUrl.replace(/\/$/, '')}/api/events`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        },
        body: JSON.stringify(event)
      });
    } catch (_error) {
      // Keep scan running even when realtime backend is unavailable.
    }
  }

  function emit(type, payload = {}) {
    const event = {
      type,
      payload,
      timestamp: new Date().toISOString()
    };

    emitter.emit(type, event);
    emitter.emit('event', event);
    forward(event);
  }

  function on(type, handler) {
    emitter.on(type, handler);
    return () => emitter.off(type, handler);
  }

  return {
    emit,
    on
  };
}

module.exports = {
  createRealtime
};
