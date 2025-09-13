const NunDb = require('../../index.js');

const timeout = ms => new Promise(res => setTimeout(res, ms));

async function a() {
  const dateTimeKey = Date.now();
  const deviceQuota = {
    wht: 100,
  };
  const db = new NunDb({
    url: 'wss://ws-staging.nundb.org/',
    db: 'ecoflow-mateus',
    user: 'admin',
    token: 'admin-token'
  });
  db._logger = console;
  await db.watch(`remove-deviceQuota-remove-${dateTimeKey}`, (newValue, oldValue) => {
    console.log('Data changed:', {
      newValue,
      oldValue
    });
  });
  await db.set(`Key1`, deviceQuota);
  await db.set(`Key2`, deviceQuota);
  await db.remove(`Key2`);
  await db.set(`Key3`, deviceQuota);


  console.log('Data saved to NunDB');
  db.goOffline();
  console.log('_pendingPromises', db._pendingPromises);
  console.log('Disconnected from NunDB, will reconnect in 3 seconds');
  await timeout(3000);
  db.goOnline();
  console.log(db._pendingPromises);
  await timeout(1000);

  setInterval(async () => {
    const newDb = new NunDb({
      url: 'wss://ws-staging.nundb.org/',
      db: 'ecoflow-mateus',
      user: 'admin',
      token: 'admin-token'
    });
    const newQuota = Math.floor(Math.random() * 1000);
    console.log('Setting new quota:', newQuota);
    await newDb.set(`remove-deviceQuota-remove-${dateTimeKey}`, {
      wht: newQuota
    });
    newDb.close();
  }, 1000);


}

a();

