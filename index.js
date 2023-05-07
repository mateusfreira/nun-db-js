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
  const IN_CONFLICT_RESOLUTION_KEY_VERSION = -2;
  const memoryDb = new Map();
  const shouldSoreLocal = typeof localStorage !== 'undefined';
  const _webSocket = typeof WebSocket != 'undefined' ? WebSocket : require('websocket').w3cwebsocket;
  const RECONNECT_TIME = 1000;
  const EMPTY = '<Empty>';
  const LAST_SERVER_KEY = 'nundb_$$last_server_';

  function commandToFuncion(command) {
    return command.trim().split(/-|\s/)
      .map((c, i) => i === 0 ? c : c.charAt(0).toUpperCase() + c.slice(1)).join('')
  }

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

    if (shouldSoreLocal && value && !value.pendding) {
      localStorage.setItem(`${LAST_SERVER_KEY}${key}`, JSON.stringify(value));
    }
    memoryDb.set(key, value);
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
      this._isArbiter = false;
      this._shouldReConnect = true;
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
      const messageParts = message.data.split(/\s(.+)|\n/);
      const [command, value] = messageParts;
      const commandMethodName = commandToFuncion(command);
      const methodName = `_${commandMethodName.trim()}Handler`;
      if (this[methodName]) {
        this[methodName](value);
      } else {
        console.error(`${commandMethodName} Handler not implemented`);
      }
    }

    nextMessageId() {
      this._messages += 1;
      return this._start + this._messages;
    }

    setValue(name, value) {
      return this.setValueSafe(name, value, -1);
    }

    setValueSafe(name, value, _version, basicType) {
      const localValue = getLocalValue(name);
      const objValue = {
        _id: this.nextMessageId(),
        value,
      };
      const version = _version ? _version : localValue.version;
      storeLocalValue(name, {
        value: objValue,
        version,
        pendding: true
      });
      this._ids.push(objValue._id);
      return this._checkConnectionReady().then(() => {
          const command = `set-safe ${name} ${version} ${ basicType ? value : objToValue(objValue)}`;
          this._connection.send(command);
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


    becameArbiter(resolveCallback) {
      this._isArbiter = true;
      this._resolveCallback = resolveCallback;
      return this._checkConnectionReady().then(() => {
        return this._connection.send(`arbiter`);
      });
    }

    _getValueLastServerValue(key) {
      return JSON.parse(localStorage.getItem(`${LAST_SERVER_KEY}${key}`));
    }

    _getLocalValue(key) {
      return getLocalValue(key);
    }

    get(key) {
      return this.getValueSafe(key);
    }

    getValue(key) {
      return this._checkConnectionReady().then(() => {
        this._connection.send(`get ${key}`);
        const pendingPromise = {
          key,
          kind: 'get'
        };
        pendingPromise.promise = new Promise((resolve, reject) => {
          pendingPromise.pedingResolve = (value) => {
            resolve(value);
          };
          pendingPromise.pedingReject = reject;
        });
        this._pendingPromises.push(pendingPromise);
        return pendingPromise.promise;
      });
    }

    getValueSafe(key) {
      return this._checkConnectionReady().then(() => {
        this._connection.send(`get-safe ${key}`);
        const pendingPromise = {
          key,
          kind: 'get-safe'
        };
        pendingPromise.promise = new Promise((resolve, reject) => {
          pendingPromise.pedingResolve = (value) => {
            resolve(value);
          };
          pendingPromise.pedingReject = reject;
        });
        this._pendingPromises.push(pendingPromise);
        return pendingPromise.promise;
      });
    }

    keys(prefix = '') {
      return this._checkConnectionReady().then(() => {
        this._connection.send(`keys ${prefix}`);
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

    reConnect() {
      if (this._shouldReConnect) {
        this.connect()
          .then(() => {
            if (this._connected) {
              console.log(this._name, 'Reconnected');
              this._checkArbiter();
              this._rewatch();
              this._pushPneeding()
            }
          })
          .catch(console.error.bind(console, 'Error reconecting'));
      }
    }
    _onClose(connectionListener, error) {
      if (this._connected) {
        this._connected = false;
      }
      setTimeout(() => this.reConnect(), RECONNECT_TIME);
    }
    _onOpen(connectionListener) {
      connectionListener.connectReady();
    }

    _checkConnectionReady() {
      return this._connectionPromise;
    }

    goOffline() {
      this._shouldReConnect = false;
      this._connection.close();
    }

    goOnline() {
      this._shouldReConnect = true;
      this.reConnect();
    }

    watch(name, callback, currentValue, useLocalValue) {
      const localValue = getLocalValue(name);
      if (useLocalValue) {
        if (localValue && currentValue) {
          setTimeout(() => {
            const has_value = (typeof localValue.value) !== 'undefined' && (typeof localValue.value.value) !== 'undefined';
            const value = has_value ? localValue.value.value : localValue.value;
            callback({
              name,
              value,
              version: localValue.version,
              pedding: localValue.pendding,
            })
          });
        }
      }
      return this._checkConnectionReady().then(() => {
        this._connection.send(`watch ${name}`);
        this._watchers[name] = this._watchers[name] || [];
        this._watchers[name].push(callback);
        if (currentValue) {
          this.getValueSafe(name).then((e) => (!e.value || e.value !== localValue) && callback({
            name,
            value: e.value,
            version: e.version
          }));
        }

      });

    }

    _pushPneeding() {
      const allValues = memoryDb.entries();
      for (const [key, storedValue] of allValues) {
        if (storedValue.pendding === true) {
          this.setValueSafe(key, storedValue.value.value, storedValue.version);
        }
      }
    }
    _checkArbiter() {
      if (this._isArbiter) {
        this.becameArbiter(this._resolveCallback);
      }
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

    _valueVersionHandler(valueServer) {
      const valueParts = valueServer.split(/\s(.+)/);
      const [version, value] = valueParts;
      const pendingPromise = this._pendingPromises.shift();
      try {
        const jsonValue = value !== EMPTY ? valueToObj(value) : null;
        const valueToSend = jsonValue && jsonValue.value ? jsonValue.value : jsonValue;
        storeLocalValue(pendingPromise.key, {
          id: jsonValue && jsonValue.id,
          value: valueToSend,
          pendding: false,
          version: parseInt(version)
        });
        pendingPromise && pendingPromise.pedingResolve({
          value: valueToSend,
          version: parseInt(version)
        });
      } catch (e) {
        storeLocalValue(pendingPromise.key, {
          value,
          pendding: false,
          version: parseInt(version)
        });
        pendingPromise && pendingPromise.pedingResolve({
          value: value,
          version: parseInt(version)
        });
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
      const fnName = commandToFuncion(`error-${error.trim()}`);
      console.log(`Todo implement error handler ${fnName}`);
    }
    _okHandler() {
      //@todo resouve and promise if pedding
    }

    valueObjOrPromise(value, key) {
      if (value.startsWith('$conflicts_')) {
        return new Promise((resolve, reject) => {
          this.watch(value, e => {
            const parts = (e.value && e.value.split && e.value.split(" ")) || [];
            const command = parts.at(0);
            switch (command) {
              case 'resolved':
                return resolve(valueToObj(parts[1]));
              case undefined:
                return resolve(this.getValue(key).then(v => ({
                  value: v,
                  id: this.nextMessageId()
                })));
              default:
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
      const [opp_id, db, _version, key] = parts;
      const version = parseInt(_version, 10);
      if (this._resolveCallback) {
        Promise.all(values.map(value => this.valueObjOrPromise(value, key)))
          .then(values_resolved => this._resolveCallback({
            opp_id,
            db,
            version,
            key,
            values: values_resolved,
          })).then(value => {
            const nextVersion = version === IN_CONFLICT_RESOLUTION_KEY_VERSION ? this.nextMessageId() : version;
            const resolveCommand = `resolve ${opp_id} ${db} ${key} ${nextVersion} ${objToValue(value)}`;
            //console.log(`Resolve ${resolveCommand}`);
            this._connection.send(resolveCommand);
          }).catch(e => {
            console.log("TOdo needs error Handler here", e); /// GOMG
          })
      }
    }

    _changedVersionHandler(event) {
      const [key, rest] = event.split(/\s(.+)/);
      const [version, value] = rest.split(/\s(.+)/);
      const watchers = this._watchers[key] || [];
      watchers.forEach(watcher => {
        try {
          const parsedValue = value !== EMPTY ? valueToObj(value) : null;

          storeLocalValue(key, {
            value: parsedValue,
            pendding: false,
            version: parseInt(version)
          });
          if (!parsedValue || this._ids.indexOf(parsedValue._id) === -1) {
            watcher({
              name: key,
              value: (parsedValue && parsedValue.value) || parsedValue,
              version,
            });
          }
        } catch (e) {
          //console.error(e, { name, value});
          watcher({
            name: key,
            value: value,
            version
          });
        }
      });
    }
  }
  return NunDb;
}));

