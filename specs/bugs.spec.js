if (typeof window === 'undefined' && typeof require !== 'undefined') {
  global.expect = require('chai').expect;
  global.NunDb = require('../index.js');
}

describe('Regression bugs', function() {
  this.timeout(2000);

  function makeBareDb() {
    const db = Object.create(NunDb.prototype);
    db._pendingPromises = [];
    db._watchers = {};
    db._ids = [];
    db._logger = { log: function() {}, error: function() {} };
    return db;
  }

  describe('_valueHandler kind allowlist guard (index.js:415)', function() {
    it('does not throw when the dequeued promise kind is in the allowlist', function() {
      const db = makeBareDb();
      let resolvedWith;
      let resolved = false;
      db._pendingPromises.push({
        kind: 'get-safe',
        key: 'k',
        pedingResolve: function(v) { resolved = true; resolvedWith = v; },
        pedingReject: function() {},
      });

      expect(function() { db._valueHandler('<Empty>'); }).to.not.throw();
      expect(resolved).to.equal(true);
      expect(resolvedWith).to.equal(null);
    });
  });

  describe('falsy envelope unwrapping (index.js:420, 434, 589)', function() {
    it('_valueHandler resolves with 0 when the stored envelope value is 0', function() {
      const db = makeBareDb();
      let resolvedWith;
      db._pendingPromises.push({
        kind: 'get',
        key: 'count',
        pedingResolve: function(v) { resolvedWith = v; },
        pedingReject: function() {},
      });

      db._valueHandler('{"_id":1,"value":0}');

      expect(resolvedWith).to.equal(0);
    });

    it('_valueVersionHandler resolves with empty string when the stored envelope value is ""', function() {
      const db = makeBareDb();
      let resolvedWith;
      db._pendingPromises.push({
        kind: 'get-safe',
        key: 'label',
        pedingResolve: function(v) { resolvedWith = v; },
        pedingReject: function() {},
      });

      db._valueVersionHandler('7 {"_id":1,"value":""}');

      expect(resolvedWith).to.deep.equal({ value: '', version: 7 });
    });

    it('_changedVersionHandler delivers false to watchers when the new value is false', function() {
      const db = makeBareDb();
      let received;
      db._watchers['flag'] = [function(evt) { received = evt; }];

      db._changedVersionHandler('flag 3 {"_id":1,"value":false}');

      expect(received).to.exist;
      expect(received.value).to.equal(false);
    });
  });

  describe('setValueSafe missing-version error message (index.js:207)', function() {
    it('throws a clear "version is required" error when version is omitted', function() {
      const db = makeBareDb();
      db._start = Date.now();
      db._messages = 0;

      expect(function() { db.setValueSafe('brand-new-key', 'hello'); })
        .to.throw(/requires a version/i);
    });
  });

  describe('_ids unbounded growth (index.js:215)', function() {
    it('keeps at most 1000 entries in _ids regardless of how many writes happen', function() {
      const db = makeBareDb();
      db._start = Date.now();
      db._messages = 0;
      db._connectionPromise = Promise.resolve();

      for (let i = 0; i < 1500; i++) {
        db.setValueSafe('k', 'v', 1);
      }

      expect(db._ids.length).to.be.at.most(1000);
    });
  });

  describe('_changedVersionHandler catch logging (index.js:594)', function() {
    it('logs the watcher key (not an unrelated global) when value parsing throws', function() {
      const db = makeBareDb();
      const errorCalls = [];
      db._logger = {
        log: function() {},
        error: function() { errorCalls.push(Array.prototype.slice.call(arguments)); }
      };
      db._watchers['mykey'] = [function() {}];

      db._changedVersionHandler('mykey 5 not-valid-json');

      expect(errorCalls.length).to.be.greaterThan(0);
      const ctx = errorCalls[0][1];
      expect(ctx).to.have.property('key', 'mykey');
      expect(ctx).to.have.property('value', 'not-valid-json');
    });
  });
});
