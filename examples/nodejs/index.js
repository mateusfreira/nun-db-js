const NunDb = require('../../index.js');
const db = new NunDb('wss://ws.nundb.org/', "test", "test-pwd");
const db1 = new NunDb('wss://ws.nundb.org/', "test", "test-pwd");

function a() {

  db1.watch('jose', event => {
    console.log('Received', Date.now() - event.value.send);
  });
  for (var i = 0, len = 10000; i < len; i++) {
    //console.log(i);
    setTimeout(() => {
      db.setValue('jose', {
        send: Date.now()
      }).catch(console.log);
    }, i);
  }
}

a();
