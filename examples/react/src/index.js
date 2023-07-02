import React from 'react';
import { render } from 'react-dom';
import { createStore, applyMiddleware } from 'redux';
import { Provider } from 'react-redux';
import App from './components/App';
import reducer from './reducers';
import { dbMiddleware, startWatchFeatureFlag } from './nun';
import 'todomvc-app-css/index.css';

const store = createStore(reducer, applyMiddleware(dbMiddleware));
startWatchFeatureFlag();

render(<Provider store ={store}>
    <App />
  </Provider>,
  document.getElementById('root')
);

