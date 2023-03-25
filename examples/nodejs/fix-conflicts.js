const NunDb = require('../../index.js');
const db = new NunDb('ws://127.0.0.1:3058/', "test", "test-pwd");

const delay = n => new Promise(resolve => setTimeout(resolve, n));


const key = `jose-${Date.now()}`;
///const key = `jose`
const name1 = `DB1 ${Date.now()}`;
const name2 = `DB2 ${Date.now()}`;
const name3 = 'New name';
let resolveTo = `Resolved name ${Date.now()}`;

console.log({
  key
});

async function run() {
  const version = parseInt(new Date().getTime() / 1000, 10);
  const db1 = new NunDb('ws://127.0.0.1:3057/', "test", "test-pwd");// Secoundary
  const db2 = new NunDb('ws://127.0.0.1:3059/', "test", "test-pwd");// Secoundary 2 do I want to support this? Works as
  //expected in the secoundary 2
  const primary = new NunDb('ws://127.0.0.1:3058/', "test", "test-pwd");// Secoundary
  await db.becameArbiter((e) => {
    const concat = e.values.map( _ => _.value.name).join(', ');
    console.log('Will finally resolve to',concat);
    //console.log(e);
    //console.log('db1._resolveCallback', 'will resolve', JSON.stringify(e, null, 4, 4));
    return Promise.resolve({ id: e.values.at(0).id, value: { name: concat } });
  });

  const save2 = db1.setValueSafe(key, { name: name2 }, version).then(e => console.log("success 2", e)).catch(console.error);
  const save1 = db2.setValueSafe(key, { name: name1 }, version).then(e => console.log("success 1", e)).catch(console.error);
  //const save3 = db2.setValueSafe(key, { name: name3 }, version).then(e => console.log("many", e)).catch(console.error);
  const many = new Array(1000).fill().map((_, i)=> delay((10 * i) +1).then(e => db2.setValueSafe(key, { name: `${name3}-${i}` }, version)));
  // Remove many it works
  await Promise.all([save1, save2].concat(many));
  await delay(1000);
  const finalValue = await db.getValue(key);
  const allName = [name1, name2, name3];
  console.log({ finalValue });
  if (allName.every( name => finalValue?.name.includes(name))) {
    console.log("Final value is correct \o/ ", { finalValue });
    process.exit(0);
  } else {
    console.log(`Invalid final value, should be: ${resolveTo} \n real value:` ,  finalValue.name );
    process.exit(1);
  }
}
run();

