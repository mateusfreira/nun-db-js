const nun = new NunDb('wss://nun-db.vilarika.com.br',"sample", "sample-pwd");
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
        setTimeout(resolve, time || 800);
      });
    };

    const nun2 = new NunDb('wss://nun-db.vilarika.com.br', "sample", "sample-pwd");
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
});

