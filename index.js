function init(window) {
  const RECONNECT_TIME = 1000;

  function setupEvents(db, connectionListener) {
    db._connection.onmessage = db.messageHandler.bind(db);
    db._connection.onopen = db._onOpen.bind(db, connectionListener);
    db._connection.onerror = db._onError.bind(db, connectionListener);
    db._connection.onclose = db._onClose.bind(db);
  }
  class FreiraDb {
    constructor(dbUrl) {
      this._databaseUrl = dbUrl;
      this.connect();
      this._watchers = {};
      this._ids = [];
    }
    connect() {
      this._connectionPromise = new Promise((resolve, reject) => {
        this._connection = new WebSocket(this._databaseUrl);
        setupEvents(this, {
          connectReady: resolve,
          connectionError: reject
        });
      });
      return this._connectionPromise.then(() => (this._connected = true));
    }

    messageHandler(message) {
      const messageParts = message.data.split(' ');
      const [command, name, value] = messageParts;
      console.log(command, name, value);
      const methodName = `_${command}Handler`;
      if (this[methodName]) {
        this[methodName](name, value);
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
        this._connection.send(`set ${name} ${JSON.stringify(objValue)}`);
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

    _changedHandler(name, value) {
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
  window.FreiraDb = FreiraDb;
}

init(window);

