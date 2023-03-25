const NunDb = require('../../index.js');
const url = "wss://ws.nundb.org";
const nun = new NunDb(url, "analitcs-blog-new", "analitcs-blog-2903uyi9ewrj-new");

async function fn() {
  const keys = await nun.keys();
  console.log(keys);
  for (const key of keys) {
    const value = await nun.get(key);
    console.log(value);
    if (value?.value?.value == null && !key.startsWith("$")) {
      console.log('Bad will fix', {
        value,
        key
      });
      await nun.setValueSafe(key, value.version, value.version || -1, true);
      //process.exit(1);
    } else {
      console.log('Good', {
        value,
        key
      });
    }
  }
}


fn();

