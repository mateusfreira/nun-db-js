import FreiraDb from 'freira-db';
//const freira = new FreiraDb('ws://45.56.110.92:3012', "mateus", "mateus", "react", "react_pwd");
const freira = new FreiraDb('ws://127.0.0.1:3012', "mateus", "mateus", "react", "react_pwd");

let ignore = false;
const dbMiddleware = store => {
  freira.watch('lastEvent', action => {
    ignore = true;
    store.dispatch(action.value);
  });
  freira.getValue('lastState').then(state => {
    ignore = true;
    store.dispatch({ type: 'newState', state   });
  });
  return next => (action) => {
    next(action);
    if (!ignore) {
      freira.setValue('lastEvent', action);
      freira.setValue('lastState', store.getState());
    }
    ignore = false;
  };
};

export {
  freira,
  dbMiddleware
};
