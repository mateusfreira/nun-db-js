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
