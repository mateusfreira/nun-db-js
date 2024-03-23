# Nun-db JS

Nun-db js library for web and Node

## Instalation

```
npm install --save nun-db

```


## Simple usage get set

```javascript

//import nundb
const NunDb = require('nun-db');

//Connect to the database using db main token
//const db = new NunDb('wss://ws.nundb.org/', 'db-name', 'db-token');

//Connect to the database limited user
const db = new NunDb({ url: 'wss://ws.nundb.org/', db: 'db-name', user: 'user-name', token: 'db-token' });

db.setValue('someKey', 'someValue');
db.set('someKey', 'someValue');//Alias to setValue

// get a key
db.getValue('someKey').then( value => {
  console.log(`Here is the key value: ${value}`);
  // Here is the key value: someValue
});

```




##  Watch


```javascript
//import nundb
const NunDb = require('nun-db');

//Connect to the databse
const db = new NunDb('wss://ws.nundb.org/', 'db-name', 'db-token');

// get a key
db.watch('someKey', value => {
  console.log(`Here is the key value: ${value}`);
  // Here is the key value: someValue
  // Here is the key value: someValue1
});
db.setValue('someKey', 'someValue');
db.setValue('someKey', 'someValue1');

```

