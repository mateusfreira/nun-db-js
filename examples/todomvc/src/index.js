import React from 'react'
import {
  render
} from 'react-dom'
import {
  createStore,
  applyMiddleware
} from 'redux'
import {
  Provider
} from 'react-redux';
import App from './components/App';
import reducer from './reducers';
import freira from './freira';
import 'todomvc-app-css/index.css';

let ignore = false;
const customMiddleWare = store => {
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

const store = createStore(reducer, applyMiddleware(customMiddleWare));

render( <
  Provider store = {
    store
  } >
  <
  App / >
  <
  /Provider>,
  document.getElementById('root')
)

