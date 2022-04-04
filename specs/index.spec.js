const url = "wss://ws.nundb.org";
//const url = "ws://localhost:3012";
const user = "sample";
const pwd = "sample-pwd";
const nun = new NunDb(url, user, pwd);
describe('Nun-db test', () => {

  it('should set value to a key', () => {
    const now = Date.now();
    return nun.setValue(`some-${now}`, now).then(() => nun.getValue(`some-${now}`))
      .then(value => {
        console.log(value);
        expect(value).to.be.equal(now);
      });
  });

  it('should watch a value', () => {
    const now = Date.now();
    const values = [];
    const wait = time => {
      return new Promise(resolve => {
        setTimeout(resolve, time || 900);
      });
    };

    const nun2 = new NunDb(url, user, pwd);
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
      .then(() => wait()).then(() => {
        expect(values.length).to.be.equals(3);
        expect(values).to.be.deep.equals([1, 2, 3]);
      });
  });

  it('should get the keys from the db', () => {
    return Promise.all([
      nun.setValue('some', 1),
      nun.setValue('some1', 1),
      nun.setValue('some2', 1),
      nun.setValue('some3', 1)
    ]).then(() => {
      return nun.keys();
    }).then(keys => {
      expect(keys.length).to.be.equals(5);
      expect(keys.sort()).to.be.deep.equals(['$connections', 'some', 'some1', 'some2', 'some3']);
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
      nun.setValue('some', 1),
      nun.setValue('some1', 1),
      nun.setValue('some2', 1),
      nun.setValue('some3', 1)
    ]);
    const keys = await nun.keys();
    expect(keys.length).to.be.equals(5);
    await Promise.all([
      nun.remove('some'),
      nun.remove('some1'),
      nun.remove('some2', 1),
      nun.remove('some3', 1)
    ]);
    const finalKeys = await nun.keys();
    expect(finalKeys.length).to.be.equals(1);
  });

  it('should watch deleted value', () => {
    const now = Date.now();
    const values = [];
    const wait = time => {
      return new Promise(resolve => {
        setTimeout(resolve, time || 900);
      });
    };

    const nun2 = new NunDb(url, user, pwd);
    nun2.watch('someToDelete', ({
      value
    }) => {
      values.push(value);
    });
    return wait().then(() => Promise.all([
      nun.setValue('someToDelete', 1),
      nun.setValue('someToDelete', 2),
    ]))
      .then(()=>nun.remove('someToDelete'))
      .then(() => wait()).then(() => {
        expect(values.length).to.be.equals(3);
        expect(values).to.be.deep.equals([1, 2, null]);
      });
  });
});

