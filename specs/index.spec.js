const nun = new NunDb('ws://45.56.110.92:3012');


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
        setTimeout(resolve, time || 500);
      });
    };

    const nun2 = new NunDb('ws://45.56.110.92:3012');
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

