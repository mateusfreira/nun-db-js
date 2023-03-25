const NunDb = require('../../index.js');
const db = new NunDb('ws://127.0.0.1:3058/', "test", "test-pwd");

const delay = n => new Promise(resolve => setTimeout(resolve, n));


const key = `jose-${Date.now()}`;
///const key = `jose`
const name1 = `DB1 ${Date.now()}`;
const name2 = `DB2 ${Date.now()}`;
let resolveTo = `Resolved name ${Date.now()}`;

console.log({
  key
});
async function run() {
  const version = parseInt(new Date().getTime() / 1000, 10);
  const db1 = new NunDb('ws://127.0.0.1:3057/', "test", "test-pwd");// Secoundary
  const db2 = new NunDb('ws://127.0.0.1:3059/', "test", "test-pwd");// Secoundary 2 do I want to support this? Works as
  //expected in the secoundary 2
  const primary = new NunDb('ws://127.0.0.1:3058/', "test", "test-pwd");// Primary
  await db.becameArbiter();

  db._resolveCallback = (e) => {
    console.log('db1._resolveCallback', 'will resolve', JSON.stringify(e, null, 4, 4));
    return Promise.resolve({ id: e.values[0].id, value: { name: resolveTo } });
  };


  const save2 = db1.setValueSafe(key, { name: name2 }, version).then(e => console.log("sucess 2", e)).catch(console.error);
  const save1 = db2.setValueSafe(key, { name: name1 }, version).then(e => console.log("sucess 1", e)).catch(console.error);
  resolveTo = `${name1} and ${name2} all the same time!!`;
  await Promise.all([save1, save2]);
  await delay(2000);
  const finalValue = await db.getValue(key);
  console.log(finalValue);
  if (finalValue?.name === resolveTo) {
    console.log("Final value is correct");
    process.exit(0);
  } else {
    console.log(`Invalid final value, should be: ${resolveTo}`, finalValue.name, );
    process.exit(1);
  }
}
run();

