const { EventEmitter } = require("events");

let eventEmitter;

const emitter = () => {
  if (eventEmitter) {
    return eventEmitter;
  }

  const emitter = new EventEmitter();
  return emitter;
};

eventEmitter = emitter();

module.exports = eventEmitter;
