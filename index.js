(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['nun-db'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // Node.
    module.exports = factory(root.NunDb);
  } else {
    // Browser globals (root is window)
    root.NunDb = factory(root.NunDb);
  }
}(typeof self !== 'undefined' ? self : this, function(b) {
  const shouldSoreLocal = typeof localStorage !== 'undefined';
  const _webSocket = typeof WebSocket != 'undefined' ? WebSocket : require('websocket').w3cwebsocket;
  const RECONNECT_TIME = 1000;
  const EMPTY = '<Empty>';

  /*
   * Remove the spaces
   */
  function objToValue(obj) {
    return JSON.stringify(obj, null, 0).replace(/\s/g, '^');
  }
  /*
   * Put the spaces back
   */
  function valueToObj(value) {
    return value && value !== EMPTY ? JSON.parse(value.replace(/\^/g, ' ')) : null;
  }


  function storeLocalValue(key, value) {
    if (shouldSoreLocal) {
      localStorage.setItem(`nundb_${key}`, JSON.stringify(value));
    }
  }

  function getLocalValue(key) {
    if (shouldSoreLocal) {
      return JSON.parse(localStorage.getItem(`nundb_${key}`));
    }
  }

  function setupEvents(db, connectionListener) {
    db._connection.onmessage = db.messageHandler.bind(db);
    db._connection.onopen = db._onOpen.bind(db, connectionListener);
    db._connection.onerror = db._onError.bind(db, connectionListener);
    db._connection.onclose = db._onClose.bind(db);
    db._connectionListener = connectionListener;
  }
  class NunDb {
    constructor(dbUrl, user = "", pwd = "", db, token) {
      this._resolveCallback = null;
      this._start = Date.now();
      this._messages = 0;
      this._databaseUrl = dbUrl;
      this.connect();
      this._watchers = {};
      this._ids = [];
      this._pendingPromises = [];
      this._name = `db:${this._databaseUrl}`;

      if (!db && !token) {
        this._db = user;
        this._token = pwd;
      } else {
        this._user = user;
        this._pwd = pwd;
        this._db = db;
        this._token = token;
      }
    }
    connect() {
      this._connectionPromise = new Promise((resolve, reject) => {
        this._connection = new _webSocket(this._databaseUrl);
        setupEvents(this, {
          connectReady: () => {
            if (this._user && this._pwd)
              this.auth(this._user, this._pwd);
            else {
              this.useDb(this._db, this._token);
              resolve();
            }
          },
          authSuccess: () => {
            this.useDb(this._db, this._token);
            resolve();
          },
          authFail: reject,
          connectionError: reject
        });
      });
      return this._connectionPromise.then(() => (this._connected = true)).catch(console.error);
    }

    messageHandler(message) {
      console.log('messageHandler', message.data);
      const messageParts = message.data.split(/\s(.+)|\n/);
      console.log(messageParts);
      const [command, value] = messageParts;
      const methodName = `_${command.trim()}Handler`;
      if (this[methodName]) {
        this[methodName](value);
      } else {
        console.error(`${command} Handler not implemented`);
      }
    }

    nextMessageId() {
      this._messages += 1;
      return this._start + this._messages;
    }

    setValue(name, value) {
      return this.setValueSafe(name, value, -1);
    }

    setValueSafe(name, value, version = -1) {
      const objValue = {
        _id: this.nextMessageId(),
        value
      };
      this._ids.push(objValue._id);
      return this._checkConnectionReady().then(() => {
        this._connection.send(`set-safe ${name} ${version} ${objToValue(objValue)}`);
      });
    }

    increment(name, value = "") {
      return this._checkConnectionReady().then(() => {
        this._connection.send(`increment ${name} ${value}`);
      });
    }

    set(name, value) {
      return this.setValue(name, value);
    }

    remove(name) {
      return this._checkConnectionReady().then(() => {
        this._connection.send(`remove ${name}`);
      });
    }

    createDb(name, token) {
      return this._checkConnectionReady().then(() => {
        this._connection.send(`create-db ${name} ${token}`);
      });
    }


    auth(user, pwd) {
      this._connection && this._connection.send(`auth ${user} ${pwd}`);
    }

    useDb(db, token) {
      this._connection && this._connection.send(`use-db ${db} ${token}`);
    }


    becameArbiter() {
      return this._checkConnectionReady().then(() => {
        return this._connection.send(`arbiter`);
      });
    }

    getValue(name) {
      return this._checkConnectionReady().then(() => {
        this._connection.send(`get ${name}`);
        const pendingPromise = {};
        pendingPromise.promise = new Promise((resolve, reject) => {
          pendingPromise.pedingResolve = (value) => {
            storeLocalValue(name, value);
            resolve(value);
          };
          pendingPromise.pedingReject = reject;
        });
        this._pendingPromises.push(pendingPromise);
        return pendingPromise.promise;
      });
    }

    keys() {
      return this._checkConnectionReady().then(() => {
        this._connection.send('keys');
        const pendingPromise = {};
        pendingPromise.promise = new Promise((resolve, reject) => {
          pendingPromise.pedingResolve = resolve;
          pendingPromise.pedingReject = reject;
        });
        this._pendingPromises.push(pendingPromise);
        return pendingPromise.promise;
      });
    }

    _onError(connectionListener, error) {
      if (this._connected) {
        console.error(`WS error`, error);
      } else {
        connectionListener.connectionError();
      }
    }

    _onClose(connectionListener, error) {
      if (this._connected) {
        this._connected = false;
      }
      setTimeout(() => {
        this.connect()
          .then(() => {
            console.log(this._name, 'Reconnected');
            this._rewatch();
          })
          .catch(console.error.bind(console, 'Error reconecting'));
      }, RECONNECT_TIME);
    }
    _onOpen(connectionListener) {
      connectionListener.connectReady();
    }

    _checkConnectionReady() {
      return this._connectionPromise;
    }

    watch(name, callback, currentValue) {
      return this._checkConnectionReady().then(() => {
        this._connection.send(`watch ${name}`);
        this._watchers[name] = this._watchers[name] || [];
        this._watchers[name].push(callback);
        if (currentValue) {
          const localValue = getLocalValue(name);
          if (localValue) {
            setTimeout(() =>
              callback({
                name,
                value: localValue
              })
            );
          }
          this.getValue(name).then(value => (!value || value != localValue) && callback({
            name,
            value
          }));
        }

      });

    }

    _rewatch() {
      const keysToWatch = Object.keys(this._watchers);
      keysToWatch.forEach(key => this._connection.send(`watch ${key}`));
    }

    _valueHandler(value) {
      const pendingPromise = this._pendingPromises.shift();
      try {
        const jsonValue = value !== EMPTY ? valueToObj(value) : null;
        const valueToSend = jsonValue && jsonValue.value ? jsonValue.value : jsonValue;
        pendingPromise && pendingPromise.pedingResolve(valueToSend);
      } catch (e) {
        //pendingPromise && pendingPromise.pedingReject(e);
        pendingPromise && pendingPromise.pedingResolve(value);
      }
    }

    _keysHandler(keys) {
      const pendingPromise = this._pendingPromises.shift();
      try {
        pendingPromise && pendingPromise.pedingResolve(keys.split(',').filter(_ => _));
      } catch (e) {
        pendingPromise && pendingPromise.pedingReject(e);
      }
      delete this.pedingResolve;
      delete this.pedingReject;
    }

    _validHandler(value) {
      this._connectionListener.authSuccess();
    }

    _invalidHandler(value) {
      this._connectionListener.authFail();
    }

    _errorHandler(error) {
      console.log(`Todo implement error handler ${error.trim()}`);
    }
    _okHandler() {
      //@todo resouve and promise if pedding
    }

    valueObjOrPromise(value, key) {
      if (value.startsWith('$$conflicts_')) {
        return new Promise((resolve, reject) => {
          console.log(`will watch for the key ${value} key resolved to `);
          this.watch(value, e => {
            console.log(`Conflicted key resolved to `, {
              e
            });

            const parts = e.value.split(" ");
            const command = parts.at(0);

            if(command === 'resolved') {
              resolve(valueToObj(parts[1]));
            } else {
              console.log(`${key} not resolved yet, will wait for resolution!!`);
            }
          }, true);
        });
      } else {
        return Promise.resolve(valueToObj(value));
      }
    }
    _resolveHandler(message) {
      const splitted = message.split(' ')
      const parts = splitted.slice(0, 4)
      const values = splitted.slice(4); // Todo part non json files
      const [opp_id, db, version, key] = parts;
      if (this._resolveCallback) {
          Promise.all(values.map(value => this.valueObjOrPromise(value, key)))
          .then(values_resolved => this._resolveCallback({
            opp_id,
            db,
            version,
            key,
            values: values_resolved,
          })).then(value => {
            const resolveCommand = `resolve ${opp_id} ${db} ${key} ${version} ${objToValue(value)}`;
            console.log(`Resolve ${resolveCommand}`);
            this._connection.send(resolveCommand);
          }).catch(e => {
            console.log("TOdo needs error Handler here", e); /// GOMG
          })
      }
    }

    _changedHandler(event) {
      const [name, value] = event.split(/\s(.+)/);
      const watchers = this._watchers[name] || [];
      watchers.forEach(watcher => {
        try {
          const parsedValue = value !== EMPTY ? JSON.parse(value) : null;
          if (!parsedValue || this._ids.indexOf(parsedValue._id) === -1) {
            watcher({
              name,
              value: parsedValue && parsedValue.value || parsedValue
            });
          }
        } catch (e) {
          //console.error(e, { name, value});
          watcher({
              name,
              value: value
          });
        }
      });
    }
  }
  return NunDb;
}));

