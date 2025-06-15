(function(global){
  function rollDice(notation) {
    if (typeof notation !== 'string') throw new Error('notation must be a string');
    const match = notation.trim().match(/^(\d*)d(\d+)([+-]\d+)?$/i);
    if (!match) throw new Error('invalid dice notation');
    const count = parseInt(match[1] || '1', 10);
    const sides = parseInt(match[2], 10);
    const mod = match[3] ? parseInt(match[3], 10) : 0;
    let total = 0;
    for (let i = 0; i < count; i++) {
      total += Math.floor(Math.random() * sides) + 1;
    }
    return total + mod;
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { rollDice };
    global.rollDice = rollDice;
  } else {
    global.rollDice = rollDice;
  }
})(this);
