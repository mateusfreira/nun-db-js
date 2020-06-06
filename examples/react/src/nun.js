import NunDb from 'nun-db';
const nun = new NunDb('wss:/nun-db.vilarika.com.br', "mateus", "mateus", "react", "react_pwd");

let ignore = false;
const dbMiddleware = store => {
  nun.watch('lastEvent', action => {
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
