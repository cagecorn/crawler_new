const { rollDice } = require('../dice');

function run() {
  const orig = Math.random;
  Math.random = () => 0;
  if (rollDice('2d6+3') !== 5) {
    console.error('unexpected roll result');
    process.exit(1);
  }
  Math.random = () => 0.999;
  if (rollDice('1d4') !== 4) {
    console.error('max roll failed');
    process.exit(1);
  }
  Math.random = orig;
}

run();
