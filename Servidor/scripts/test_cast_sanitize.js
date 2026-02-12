const h = require('../helpers/analysisHelper.js');
const dfd = require('danfojs-node');
const data = [{loss:'1'},{loss:'2'},{loss:'3'},{loss:'4'}];
const codes = [
 `const s = df.loss.cast('float32'); return { mean: (new dfd.Series(s.values)).mean() };`,
 `const s = df['loss'].CAST('float32'); return { mean: (new dfd.Series(s.values)).mean() };`,
 `const s = df . loss . cast ( 'float32' ); return { mean: (new dfd.Series(s.values)).mean() };`
];

codes.forEach((c, idx) => {
  try {
    console.log('\n--- Test', idx + 1, '---');
    const r = h.executeDanfoCode(data, c);
    console.log('RESULT:', r.stats);
  } catch (e) {
    console.error('ERROR:', e.message);
  }
});
