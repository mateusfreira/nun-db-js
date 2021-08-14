const NunDb = require('../../index.js');
const db = new NunDb('wss://ws.nundb.org/', "test", "test-pwd");

function a() {

  const db1 = new NunDb('wss://ws.nundb.org/', "test", "test-pwd");
  db1.watch('jose12389123849', event => {
    console.log(event);
    console.log(`Received ${event.value.i}`, Date.now() - event.value.send);
  });
  for (let i = 0, len = 10000; i < len; i++) {
    //console.log(i);
    setTimeout(() => {
      db.setValue('jose12389123849', {
        send: Date.now(),
        i: i,
      }).catch(console.log);
    }, i);
  }
}

a();

