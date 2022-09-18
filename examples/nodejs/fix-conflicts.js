const NunDb = require('../../index.js');
const db = new NunDb('ws://127.0.0.1:3057/', "test", "test-pwd");

function a() {
  const version = parseInt(Date.now() / 1000, 10);
  const db1 = new NunDb('ws://127.0.0.1:3058/', "test", "test-pwd");
  setTimeout(() => {
    db1.watch("$$conflicts", e => {
      console.log("Confilct here", e);
    });
    db1._resolveCallback = (e) => {
      console.log('db1._resolveCallback', e);
      return Promise.resolve(e.newValue);
    };
    Promise.all([
        db1.setValueSafe('jose12389123849', {
          name: "Db1"
        }, version).then(e => {
          console.log("sucess 1");
          return db1.setValueSafe('jose12389123849', {
            name: "Db2"
          }, version).then(e => console.log("sucess 2"))
        }),
      ])
      .then(e => {
        console.log("Final", e)
        return db.getValue("jose12389123849").then(e => console.log("Get final", e));
      }).catch(e => console.log("Error", e));

    /*
      db1.watch('jose12389123849', event => {
        console.log(event);
        console.log(`Received ${event.value.i}`, Date.now() - event.value.send);
        if (event.value.i === 99) {
          console.log('Success!!');
          process.exit(0);
        }
      });

      for (let i = 0, len = 100; i < len; i++) {
        setTimeout(() => {
          console.log(`setting ${i}`);
          db.setValue('jose12389123849', {
            send: Date.now(),
            i: i,
          }).catch(console.log);
        }, i * 10);
      }
      */
  }, 1000)
}

a();

