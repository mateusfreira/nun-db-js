const FreiraDb = require('../../index.js');
const db = new FreiraDb('ws://127.0.0.1:3012', "mateus", "mateus", "mateus", "mateus_pwd");
console.log(db);

