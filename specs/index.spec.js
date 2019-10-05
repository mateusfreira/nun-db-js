const freira = new FreiraDb('ws://45.56.110.92:3012');


describe('Freira Db should', () => {

  it('set value to a key', done => {
    freira.getValue('some', Date.now()).then(done);
  });

});

