const NunDb = require('../../index.js');
const db = new NunDb('wss://ws.nundb.org/', "test", "test-pwd");

function a() {

  const db1 = new NunDb('wss://ws.nundb.org/', "test", "test-pwd");
  db1.getValue('jose12389123849').then(event => {
    console.log(`Received ${event.value.i}`, Date.now() - event.value.send);
  }).catch(()=> console.log('here'));
  for (let i = 0, len = 1000; i < len; i++) {
    //console.log(i);
    setTimeout(() => {
      db.setValue('jose', {
        send: Date.now(),
        i: i,
      }).catch(console.log);
    }, i);
  }
}

a();

