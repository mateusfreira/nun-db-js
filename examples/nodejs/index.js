const NunDb = require('../../index.js');
const db = new NunDb('wss://ws.nundb.org/', "test", "test-pwd");

function a() {

  const db1 = new NunDb('wss://ws.nundb.org/', "test", "test-pwd");
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
      db.setValue('jose12389123849', {
        send: Date.now(),
        i: i,
      }).catch(console.log);
    }, i * 10);
  }
}

a();

