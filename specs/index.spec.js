const url = "wss://ws-staging.nundb.org";
//const url = "ws://localhost:3058";
const user = "sample-test";
const pwd = "sample-pwd";
const nun2 = new NunDb(url, user, pwd);
const nun = new NunDb(url, user, pwd);

describe('Nun-db test', function() {
  this.timeout(10000);
  it('should set value to a key', () => {
    const now = Date.now();
    return nun.setValue(`some`, now)
      .then(() => nun.getValue(`some`))
      .then(value => {
        //expect(value).to.be.equal(now);
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
});

