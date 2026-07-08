const { Decimal } = require('decimal.js');

const DECIMAL_SI_EXPONENTS = {
  n: -9,
  u: -6,
  m: -3,
  '': 0,
  k: 3,
  K: 3,
  M: 6,
  G: 9,
  T: 12,
  P: 15,
  E: 18
};

const BINARY_SI_EXPONENTS = {
  Ki: 10,
  Mi: 20,
  Gi: 30,
  Ti: 40,
  Pi: 50,
  Ei: 60
};

const QUANTITY_RE = /^([+-]?(?:\d+(?:\.\d*)?|\.\d+))([numkKMGTPE]i?)?$/;

function parseKubernetesQuantity(value) {
  const input = String(value ?? '').trim();
  const match = input.match(QUANTITY_RE);

  if (!match) {
    throw new Error(`Invalid Kubernetes quantity: ${input}`);
  }

  const amount = new Decimal(match[1]);
  const suffix = match[2] || '';

  if (suffix in BINARY_SI_EXPONENTS) {
    return amount.times(Decimal.pow(2, BINARY_SI_EXPONENTS[suffix]));
  }

  if (suffix in DECIMAL_SI_EXPONENTS) {
    return amount.times(Decimal.pow(10, DECIMAL_SI_EXPONENTS[suffix]));
  }

  throw new Error(`Unsupported Kubernetes quantity suffix: ${suffix}`);
}

module.exports = {
  parseKubernetesQuantity
};
