import NunDb from 'nun-db';
//const nun = new NunDb('ws://45.56.110.92:3012', "mateus", "mateus", "react", "react_pwd");
const nun = new NunDb('ws://127.0.0.1:3012', "mateus", "mateus", "react", "react_pwd");

let ignore = false;
const dbMiddleware = store => {
  nun.watch('lastevent', action => {
    ignore = true;
    store.dispatch(action.value);
  });
  nun.getValue('lastState').then(state => {
    ignore = true;
    store.dispatch({ type: 'newState', state   });
  });
  return next => (action) => {
    next(action);
    if (!ignore) {
      nun.setValue('lastEvent', action);
      nun.setValue('lastState', store.getState());
    }
    ignore = false;
  };
};

export {
  nun,
  dbMiddleware
};
