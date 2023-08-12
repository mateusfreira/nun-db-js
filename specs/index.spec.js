//const url = "wss://ws-staging.nundb.org";
const url = "ws://localhost:3012";
const dbName = "sample";
const pwd = "sample-pwd";
const nun2 = new NunDb(url, dbName, pwd);
nun2._logger = console;
const nun = new NunDb(url, dbName, pwd);
nun._logger = console;

describe('Nun-db test', function() {
  this.timeout(1000);
  it('should set value to a key', () => {
    const now = Date.now();
    return nun.setValue(`some`, now)
      .then(() => nun.getValue(`some`))
      .then(value => {
        console.log(value);
        expect(value).to.be.equal(now);
      });
  });


  it('should watch a value', ()=> {
    const values = [];
    const wait = time => {
      return new Promise(resolve => {
        setTimeout(resolve, time || 300);
      });
    };

    nun2.watch('some', ({
      value
    }) => {
      values.push(value);
    });
    return wait().then(() => Promise.all([
        nun.setValue('some', 1),
        nun.setValue('some', 2),
        nun.setValue('some', 3)
      ]))
      .then(() => wait())
      .then(() => {
        expect(values.length).to.be.equals(3);
        expect(values).to.be.deep.equals([1, 2, 3]);
        return 1;
      });
  });

  it('should get the keys from the db', () => {
    return Promise.all([
      nun.setValue('some', 1),
      nun.setValue('some1', 1),
      nun.setValue('some2', 1),
      nun.setValue('some3', 1),
      nun.setValue('state', 1)
    ]).then(() => {
      return nun.keys();
    }).then(keys => {
      expect(keys.length).to.be.equals(6);
      expect(keys.sort()).to.be.deep.equals(['$connections', 'some', 'some1', 'some2', 'some3', 'state']);
    }).then(() => {
      return nun.keys('some');
    }).then(keys => {
      expect(keys.length).to.be.equals(4);
      expect(keys.sort()).to.be.deep.equals(['some', 'some1', 'some2', 'some3']);
    });
  });

  it('should return empty if the key does not exists', () => {
    return Promise.all([
      nun.getValue(`some2${new Date().getTime()}`),
    ]).then(values => {
      expect(values[0]).to.be.equals(null);
    });
  });

  it('should return empty if the key does not exists', () => {
    return nun.getValue('$connections').then(value => {
      expect(value).to.be.gt(1);
    });
  });

  it('should return value with a value key', () => {

    return nun.setValue('some', {
        value: 'some'
      })
      .then(() => {
        return nun.getValue('some').then(value => {
          expect(value).deep.equals({
            value: 'some'
          });
        });
      });
  });

  it('should delete the keys from the db', async () => {
    await Promise.all([
      nun.setValue('state', 1),
      nun.setValue('some', 1),
      nun.setValue('some1', 1),
      nun.setValue('some2', 1),
      nun.setValue('some3', 1)
    ]);
    const keys = await nun.keys();
    expect(keys.length).to.be.equals(6);
    await Promise.all([
      nun.remove('state'),
      nun.remove('some'),
      nun.remove('some1'),
      nun.remove('some2'),
      nun.remove('some3')
    ]);
    const finalKeys = await nun.keys();
    expect(finalKeys.length).to.be.equals(1);
  });

  it('should watch deleted value', () => {
    const values = [];
    const wait = time => {
      return new Promise(resolve => {
        setTimeout(resolve, time || 100);
      });
    };

    nun2.watch('someToDelete1', ({
      value
    }) => {
      values.push(value);
    });
    return wait(500)
      .then(() => wait(500))
      .then(() => nun.setValue('someToDelete1', 1))
      .then(() => nun.setValue('someToDelete1', 2))
      .then(() => nun.remove('someToDelete1'))
      .then(() => wait(500))
      .then(() => {
        // should not it be 3? and have null value
        expect(values.length).to.be.equals(2);
        expect(values).to.be.deep.equals([1, 2]);

      });
  });

  it('should store value locally', () => {
    const now = Date.now();
    return nun.setValue(`state`, now)
      .then(() => {
        return nun.watch('state', (e) => {
          expect(e.value).to.be.equals(now);
        }, true);
      });
  });

  it('should return empty array if the key does not exists', () => {
    return nun.keys('*somekey-not-existent').then(keys => {
      expect(keys).to.be.deep.equals([]);
    });
  })

  it('should connect as a user', async () => {
    const user = "test-uset";
    const userPwd = "test-user-pwd";
    const db = "sample-test";
    const nunDbUser = new NunDb(url, db, user, userPwd);
    const keys = await nunDbUser.keys();
    expect(keys.length).to.be.gt(0);
  });

  // nun-db --user $NUN_USER  -p $NUN_PWD --host "https://https.nundb.org" exec "use-db sample-test sample-pwd; create-user test-uset test-user-pwd;  set-permissions test-uset r *|rwx client-*"
  it('should connect as a user using object', async () => {
    const user = "test-uset";
    const userPwd = "test-user-pwd";
    const db = "sample-test";
    const nunDbUser = new NunDb({ url, db, user, token: userPwd});
    const keys = await nunDbUser.keys();
    expect(keys.length).to.be.gt(0);
  });

  it('should reject set if permission denied', async () => {
    const user = "test-uset";
    const userPwd = "test-user-pwd";
    const db = "sample-test";
    const nunDbUser = new NunDb({ url, db, user, token: userPwd});
    try {
      await nunDbUser.setValue('some', 1);
      fail('should not be here');
    } catch (e) {
       expect(e.message).to.be.equals("Permission denied");
    }
  });
   it('should reject set if permission denied local user', async () => {
     const nunDb = new NunDb({ url: "ws://localhost:3012", db: "sample", user: "client", token: "client-pwd"});
     nunDb._logger = console;
     const keys  = await nunDb.keys();
     const value = await nunDb.get("name");
     try {
      await nunDb.set("name", "Jose");
       throw new Error("Should not be here");
     } catch(e) {
       expect(e.message).to.be.equals("permission denied");
     }
   });
});

