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


  function resolvePeddingValue(key, version) {
    const localValue = memoryDb.get(key);
    console.log('Resolve pedding value', key, version, localValue)
    if (localValue && localValue.pendding && localValue.version === version) {
      storeLocalValue(key, {
        value: localValue.value,
        version,
        pendding: false
      });
    }
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
    const oldSend = db._connection.send;
    db._connection.send = function() {
      db._logger.log('Message Sent', arguments, { promiosesQueue : db._pendingPromises });
      if (db._connection.readyState === 1) {
        oldSend.apply(db._connection, arguments);
      } else {
        db._logger.error('Connection is not ready');
        throw new Error('Connection is not ready');
      }
    }

  }

  class NunDb {
    constructor(...args) {
      this._logger = {
        log: () => {},
        error: () => {}

      };
      this._isArbiter = false;
      this._shouldReConnect = true;
      this._resolveCallback = null;
      this._start = Date.now();
      this._messages = 0;
      this._watchers = {};
      this._ids = [];
      this._pendingPromises = [];
      if (typeof args[0] === 'object') {
        const props = args[0];
        this._databaseUrl = props.url;
        this._db = props.db;
        this._user = props.user;
        this._pwd = props.pwd;
        this._token = props.token;
      } else {
        const [dbUrl, user, pwd, db, token] = args;
        this._databaseUrl = dbUrl;
        if (!db && !token) {
          this._db = user;
          this._token = pwd;
        } else if (db) {
          this._db = user;
          this._user = pwd;
          this._token = db;
        } else {
          this._db = db;
          this._token = token;
        }
      }
      this._name = `db:${this._databaseUrl}`;
      this.connect();
    }

    _dequeuePromise() {
      if (this._pendingPromises.length) {
        const promise = this._pendingPromises.shift();
        this._logger.log('De-queueing promise: ', promise.kind);
        return promise;
      } else {
        this._logger.error('No promises in de-queue');
      }
    }

    connect() {
      this._connectionPromise = new Promise((resolve, reject) => {
        this._logger.log('Connecting to', this._databaseUrl);
        this._connection = new _webSocket(this._databaseUrl);
        setupEvents(this, {
          connectReady: () => {
            if (this._user && this._pwd) {
              this.auth(this._user, this._pwd);
            } else {
              this.useDb(this._db, this._token, this._user).then(resolve).catch(reject);
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
      return this._connectionPromise.then(() => (this._connected = true)).catch(this._logger.error);
    }

    _permissionHandler(value) {
      //No action needed here
    }
    messageHandler(message) {
      this._logger.log('Message received', message.data);
      const messageParts = message.data.split(/\s(.+)|\n/);
      const [command, value] = messageParts;
      const commandMethodName = commandToFuncion(command);
      const methodName = `_${commandMethodName.trim()}Handler`;
      if (this[methodName]) {
        this[methodName](value);
      } else {
        this._logger.error(`${commandMethodName} Handler not implemented`);
      }
    }

    nextMessageId() {
      this._messages += 1;
      return this._start + this._messages;
    }

    setValue(name, value) {
      return this.setValueSafe(name, value, -1);
    }

    _createPenddingPromise(key = '', kind = '') {
        const pendingPromise = {
          key,
          kind,
        };
        pendingPromise.promise = new Promise((resolve, reject) => {
          pendingPromise.pedingResolve = (value) => {
            resolve(value);
          };
          pendingPromise.pedingReject = reject;
        });
        this._pendingPromises.push(pendingPromise);
      return pendingPromise;
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
        const pendingPromise = this._createPenddingPromise(name, 'set');
        return pendingPromise.promise.then(()=> {
          resolvePeddingValue(name, version);
          return objValue;
        });
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

    useDb(db, token, user = undefined) {
      const command = user ? `use-db ${db} ${user} ${token}` : `use-db ${db} ${token}`;
      this._connection && this._connection.send(command);
      const pendingPromise = this._createPenddingPromise(db, 'use-db');
      return pendingPromise.promise;
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
        const pendingPromise = this._createPenddingPromise(key, 'get');
        return pendingPromise.promise;
      });
    }

    getValueSafe(key) {
      return this._checkConnectionReady().then(() => {
        this._connection.send(`get-safe ${key}`);
        const pendingPromise = this._createPenddingPromise(key, 'get-safe');

        /**
         * Get safe returns an ok saying that the message was received,
         * latter it sends the value message with the the real value
         * that is why we nee 2 promises here, no need to wait for the first one tho
         */
        const _pendingPromiseAck = this._createPenddingPromise(key, 'get-safe-sent');
        return Promise.all([pendingPromise.promise, _pendingPromiseAck.promise]).then(values => values[0]);
      });
    }

    keys(prefix = '') {
      return this._checkConnectionReady().then(() => {
        this._connection.send(`keys ${prefix}`);
        const pendingPromise = this._createPenddingPromise(prefix, 'keys');
        const _pendingPromise = this._createPenddingPromise(prefix, 'keys-sent');
        return Promise.all([pendingPromise.promise, _pendingPromise.promise]).then(values => values[0]);
      });
    }

    _onError(connectionListener, error) {
      if (this._connected) {
        this._logger.error(`WS error`, error);
      } else {
        connectionListener.connectionError();
      }
    }

    reConnect() {
      if (this._shouldReConnect) {
        this.connect()
          .then(() => {
            if (this._connected) {
              this._logger.log(this._name, 'Reconnected');
              this._checkArbiter();
              this._rewatch();
              this._pushPneeding()
            }
          })
          .catch(this._logger.error.bind(this._logger, 'Error reconecting'));
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

    close() {
      this.goOffline();
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
        const _pendingPromise = this._createPenddingPromise(name, 'watch-sent');
        this._watchers[name] = this._watchers[name] || [];
        this._watchers[name].push(callback);
        if (currentValue) {
          _pendingPromise.promise.then(() => this.getValueSafe(name).then((e) => (!e.value || e.value !== localValue) && callback({
            name,
            value: e.value,
            version: e.version
          })));
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
      const pendingPromise = this._dequeuePromise();
      if(['get', 'get-safe', 'keys-sent'].indexOf(pendingPromise.kind)) {
        throw Error('Invalid resolved promise!`');
      }
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
      const pendingPromise = this._dequeuePromise();
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
      const pendingPromise = this._dequeuePromise();
      try {
        pendingPromise && pendingPromise.pedingResolve((keys || '').split(',').filter(_ => _));
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

    errorPermissionDenied(error) {
      const pendingPromise = this._dequeuePromise();
      this._logger.log(`errorPermissionDenied`, pendingPromise);
      pendingPromise && pendingPromise.pedingReject(new Error(error));
    }

    errorErrorNoDbSelected(error) {
      const pendingPromise = this._dequeuePromise();
      this._logger.log(`errorPermissionDenied`, pendingPromise);
      pendingPromise && pendingPromise.pedingReject(new Error(error));
    }

    errorInvalidToken(error) {
      const pendingPromise = this._dequeuePromise();
      this._logger.log(`errorPermissionDenied`, pendingPromise);
      pendingPromise && pendingPromise.pedingReject(new Error(error));
    }


    _errorHandler(error) {
      this._logger.log(`_errorHandler`, error);
      const fnName = commandToFuncion(`error-${error.trim()}`);
      const fn = this[fnName];
      if (!fn) {
        this._logger.log(`Todo implement error handler ${fnName}`);
      } else {
        this._logger.log(`Found`, fn);
        fn.apply(this, [error]);
      }
    }
    _okHandler() {
      const nextPromise = this._pendingPromises[0];
      this._logger.log('Will resolve the promise', nextPromise);
      if(['set', 'use-db', 'get-safe-sent', 'keys-sent', 'watch-sent'].indexOf(nextPromise && nextPromise.kind) != -1) {
        const pendingPromise = this._dequeuePromise();
        pendingPromise && pendingPromise.pedingResolve ();
      } else {
        this._logger.log('Will ignore the message', nextPromise?.kind);
      }
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
            //this._logger.log(`Resolve ${resolveCommand}`);
            this._connection.send(resolveCommand);
          }).catch(e => {
            this._logger.log("TOdo needs error Handler here", e); /// GOMG
          })
      }
    }

    _changedHandler() {
      // Legacy method no action needed
    }
    _removedHandler() {
      // Call subscribers from remove?
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
          this._logger.error(e, { name, value});
          watcher({
            name: key,
            value: value,
            version
          });
        }
      });
    }
    _setLoggers(logger) {
      this._logger = logger;
    }
  }
  NunDb.inMemoryDb = memoryDb;
  return NunDb;
}));

