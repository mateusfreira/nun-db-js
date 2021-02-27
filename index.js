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
  const _webSocket = typeof WebSocket != 'undefined' ? WebSocket : require('websocket').w3cwebsocket;
  const RECONNECT_TIME = 1000;
  const EMPTY = '<Empty>';

  function setupEvents(db, connectionListener) {
    db._connection.onmessage = db.messageHandler.bind(db);
    db._connection.onopen = db._onOpen.bind(db, connectionListener);
    db._connection.onerror = db._onError.bind(db, connectionListener);
    db._connection.onclose = db._onClose.bind(db);
    db._connectionListener = connectionListener;
  }
  class NunDb {
    constructor(dbUrl, user = "", pwd = "", db, token) {
      this._start = Date.now();
      this._messages = 0;
      this._databaseUrl = dbUrl;
      this.connect();
      this._watchers = {};
      this._ids = [];

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
      const objValue = {
        _id: this.nextMessageId(),
        value
      };
      this._ids.push(objValue._id);
      return this._checkConnectionReady().then(() => {
        this._connection.send(`set ${name} ${JSON.stringify(objValue, null, 0)}`);
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


    getValue(name) {
      return this._checkConnectionReady().then(() => {
        this._connection.send(`get ${name}`);
        const pendingPromise = new Promise((resolve, reject) => {
          this.pedingResolve = resolve;
          this.pedingReject = reject;
        });
        return pendingPromise;
      });
    }

    keys() {
      return this._checkConnectionReady().then(() => {
        this._connection.send('keys');
        const pendingPromise = new Promise((resolve, reject) => {
          this.pedingResolve = resolve;
          this.pedingReject = reject;
        });
        return pendingPromise;
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
            console.log('Reconnected');
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
        currentValue && this.getValue(name).then(value => callback({
          name,
          value
        }));

      });
    }

    _rewatch() {
      const keysToWatch = Object.keys(this._watchers);
      keysToWatch.forEach(key => this._connection.send(`watch ${key}`));
    }

    _valueHandler(value) {
      try {
        const jsonValue = JSON.parse(value);
        const valueToSend = value !== EMPTY ? (jsonValue.value || jsonValue) : null;
        this.pedingResolve && this.pedingResolve(valueToSend);
      } catch (e) {
        this.pedingReject && this.pedingReject(e);
      }
      delete this.pedingResolve;
      delete this.pedingReject;
    }

    _keysHandler(keys) {
      try {
        this.pedingResolve && this.pedingResolve(keys.split(',').filter(_ => _));
      } catch (e) {
        this.pedingReject && this.pedingReject(e);
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
      console.log(`Todo implement error handler ${error}`);
    }
    _okHandler() {
      //@todo resouve and promise if pedding
    }

    _changedHandler(event) {
      const [name, value] = event.split(/\s(.+)/);
      const watchers = this._watchers[name] || [];
      watchers.forEach(watcher => {
        try {
          const parsedValue = JSON.parse(value);
          if (this._ids.indexOf(parsedValue._id) === -1) {
            watcher({
              name,
              value: parsedValue.value || parsedValue
            });
          }
        } catch (e) {
          console.error(e);
        }
      });
    }
  }
  return NunDb;
}));

