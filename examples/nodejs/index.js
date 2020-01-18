const NunDb = require('../../index.js');
const db = new NunDb('ws://127.0.0.1:3012', "mateus", "mateus", "mateus", "mateus_pwd");

function a() {

  db.watch('jose', event => {
    console.log('Received', Date.now() - event.value.send);
  });
  for (var i = 0, len = 100000; i < len; i++) {
    //console.log(i);
    setTimeout(() => {
      db.setValue('jose', {
        send: Date.now()
      });
    }, i);
  }
}

a();

