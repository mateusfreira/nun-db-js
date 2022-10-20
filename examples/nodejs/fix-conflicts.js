const NunDb = require('../../index.js');
const db = new NunDb('ws://127.0.0.1:3058/', "test", "test-pwd");

const delay = n => new Promise(resolve => setTimeout(resolve, n));


const key = `jose-${Date.now()}`;
//const key = `jose`
const name1 = `DB1 ${Date.now()}`;
const name2 = `DB2 ${Date.now()}`;
const resolveTo = `Resolved name ${Date.now()}`;

console.log({
  key
});
async function run() {
  const version = parseInt(new Date().getTime() / 1000, 10);
  const db1 = new NunDb('ws://127.0.0.1:9093/', "test", "test-pwd");// Secoundary
  //const db1 = new NunDb('ws://127.0.0.1:3058/', "test", "test-pwd");// Secoundary
  await delay(1000);
  db1.watch("$$conflicts", e => {
    console.log("Confilct here", e);
  });

  db1._resolveCallback = (e) => {
    console.log('db1._resolveCallback', 'will resolve', e);
  return Promise.resolve({ id: e.values[0].id, value: { name: resolveTo } });
  };

  const save1 = db.setValueSafe(key, { name: name1 }, version).then(e => console.log("sucess 1"));
  const save2 = db1.setValueSafe(key, { name: name2 }, version).then(e => console.log("sucess 2"));
  await Promise.all([save1, save2]);
  await delay(300);
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

