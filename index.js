(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['freira-db'], factory);
  } else if (typeof module === 'object' && module.exports) {
    // Node.
    module.exports = factory(require('freira-db'));
  } else {
    // Browser globals (root is window)
    root.FreiraDb = factory(root.FreiraDb);
  }
}(typeof self !== 'undefined' ? self : this, function(b) {
  const RECONNECT_TIME = 1000;

  function setupEvents(db, connectionListener) {
    db._connection.onmessage = db.messageHandler.bind(db);
    db._connection.onopen = db._onOpen.bind(db, connectionListener);
    db._connection.onerror = db._onError.bind(db, connectionListener);
    db._connection.onclose = db._onClose.bind(db);
    db._connectionListener = connectionListener;
  }
  class FreiraDb {
    constructor(dbUrl, user = "", pwd = "") {
      this._databaseUrl = dbUrl;
      this.connect();
      this._watchers = {};
      this._ids = [];
      this._user = user;
      this._pwd = pwd;
    }
    connect() {
      this._connectionPromise = new Promise((resolve, reject) => {
        this._connection = new WebSocket(this._databaseUrl);
        setupEvents(this, {
          connectReady: () => {
            this.auth(this._user, this._pwd);
          },
          authSuccess: resolve,
          authFail: reject,
          connectionError: reject
        });
      });
      return this._connectionPromise.then(() => (this._connected = true));
    }

    messageHandler(message) {
      const messageParts = message.data.split(/\s(.+)/);
      console.log(messageParts);
      const [command, value] = messageParts;
      const methodName = `_${command}Handler`;
      if (this[methodName]) {
        this[methodName](value);
      } else {
        console.error(`${command} Handler not implemented`);
      }
    }

    setValue(name, value) {
      const objValue = {
        _id: Date.now(),
        value
      };
      this._ids.push(objValue._id);
      return this._checkConnectionReady().then(() => {
        this._connection.send(`set ${name} ${JSON.stringify(objValue, null, 0)}`);
      });
    }

    auth(user, pwd) {
      this._connection && this._connection.send(`auth ${user} ${pwd}`);
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

    watch(name, callback) {
      return this._checkConnectionReady().then(() => {
        this._connection.send(`watch ${name}`);
        this._watchers[name] = this._watchers[name] || [];
        this._watchers[name].push(callback);
      });
    }
    _rewatch() {
      const keysToWatch = Object.keys(this._watchers);
      keysToWatch.forEach(key => this._connection.send(`watch ${key}`));
    }

    _valueHandler(value) {
      try {
        this.pedingResolve && this.pedingResolve(JSON.parse(value).value);
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

    _changedHandler(event) {
      const [name, value] = event.split(/\s(.+)/);
      const watchers = this._watchers[name] || [];
      watchers.forEach(watcher => {
        try {
          const parsedValue = JSON.parse(value);
          if (this._ids.indexOf(parsedValue._id) === -1) {
            watcher({
              name,
              value: parsedValue.value
            });
          }
        } catch (e) {
          console.error(e);
        }
      });
    }
  }
  return FreiraDb;
}));

