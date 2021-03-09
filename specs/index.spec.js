const nun = new NunDb('wss://ws.nundb.org', "sample", "sample-pwd");
describe('Nun-db test', () => {

  it('should set value to a key', () => {
    const now = Date.now();
    return nun.setValue('some', now).then(() => nun.getValue('some'))
      .then(value => {
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

    const nun2 = new NunDb('wss://ws.nundb.org', "sample", "sample-pwd");
    nun2.watch('some1', ({
      value
    }) => {
      values.push(value);
    });
    return wait().then(() => Promise.all([
        nun.setValue('some1', 1),
        nun.setValue('some1', 2),
        nun.setValue('some1', 3)
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
});

