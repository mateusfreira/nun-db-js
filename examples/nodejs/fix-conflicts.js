const NunDb = require('../../index.js');
const db = new NunDb('ws://127.0.0.1:3058/', "test", "test-pwd");

const delay = n => new Promise( resolve => setTimeout(resolve, n));


const key = `jose-${Date.now()}`
const name1 = `DB1 ${Date.now()}`
const name2 = `DB2 ${Date.now()}`

console.log({ key} );
function a() {
  const version = parseInt(2, 10);
  const db1 = new NunDb('ws://127.0.0.1:3058/', "test", "test-pwd");
  setTimeout(() => {
    db1.watch("$$conflicts", e => {
      console.log("Confilct here", e);
    });

    db1._resolveCallback = (e) => {
      console.log('db1._resolveCallback', 'will resolve', e.values[1]);
      return Promise.resolve({ name: "Mateus" });
    };

    Promise.all([
        db1.setValueSafe(key, {
          name: name1
        }, version).then(e => {
          console.log("sucess 1");
          return db1.setValueSafe(key, {
            name: name2
          }, version - 1).then(e => console.log("sucess 2"))
        }),
      ])
      .then(e => {
        console.log("Final", e);
        return db.getValue(key);
      })
      .catch(e => console.log("Error", e))
      .then(finalValue => {
        if (finalValue?.value?.name === name2) {
          console.log("Final value is correct");
          process.exit(0);
        } else {
          console.log(`Invalid final value, should be: ${name2}`, finalValue, );
          process.exit(1);
        }
      });

  }, 1000);
}

a();

