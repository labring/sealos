function masterLog(...args) {
  console.info(`sealos:sdk::master::`, ...args);
}

function clientLog(...args) {
  console.info(`sealos:sdk::client::`, ...args);
}

export { masterLog, clientLog };
