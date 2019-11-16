const freira = new FreiraDb('ws://45.56.110.92:3012');


describe('Freira Db should', () => {

  it('should set value to a key', () => {
    const now = Date.now();
    return freira.setValue('some', now).then(() => freira.getValue('some'))
      .then(value => {
        expect(value).to.be.equal(now);
      });
  });

  it('should watch a value', () => {
    const now = Date.now();
    const values = [];
    const wait = time => {
      return new Promise(resolve => {
        setTimeout(resolve, time || 500);
      });
    };

    const freira2 = new FreiraDb('ws://45.56.110.92:3012');
    freira2.watch('some', ({
      value
    }) => {
      values.push(value);
    });
    return wait().then(() => Promise.all([
        freira.setValue('some', 1),
        freira.setValue('some', 2),
        freira.setValue('some', 3)
      ]))
      .then(() => wait()).then(() => {
        expect(values.length).to.be.equals(3);
        expect(values).to.be.deep.equals([1, 2, 3]);
      });
  });
});

