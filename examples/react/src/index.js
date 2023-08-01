import React from 'react';
import { render } from 'react-dom';
import { createStore, applyMiddleware } from 'redux';
import { Provider } from 'react-redux';
import App from './components/App';
import reducer from './reducers';
import { dbMiddleware, startWatchFeatureFlag, connect } from 'nun-db-react';
import 'todomvc-app-css/index.css';

connect(React, 'wss://ws-staging.nundb.org', "react", "react-pwd");
startWatchFeatureFlag();
const store = createStore(reducer, applyMiddleware(dbMiddleware));

render(<Provider store ={store}>
    <App />
  </Provider>,
  document.getElementById('root')
);

