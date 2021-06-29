# Making Redux TodoMVC Example a realtime multiuser app with Nun-db

This project is a copy and past of https://github.com/reduxjs/redux/tree/master/examples/todomvc + adding Nun-db as a database that makes it Realtime and durable.

Little changes are needed for doing that. (And I also believe this is true for any other Redux like projects)

I will list the changes we have made.

## Installed Nun-db in  the project


```bash
npm install nun-db
```

## Added Nun-db middleware

[Code here](https://github.com/mateusfreira/nun-db-js/blob/master/examples/react/src/nun.js)

```js
import NunDb from 'nun-db';//import nundb
const nun = new NunDb('wss://ws.nundb.org', "react", "react-pwd");//connect to your database

const dbMiddleware = store => {
	//watch events from other users
	//If you watch the events you don't need to watch the state
    nun.watch('lastEvent', action => {
        const actionToTrigger = { ignoreSave: true, ...action.value};//add ignoreSave to avoid infinity loop
        store.dispatch(actionToTrigger);//replicate the event in the current store
    });
    nun.getValue('lastState').then(state => {//In the first load you load the last state from the database
        store.dispatch({ type: 'newState', state   });//trigger the event to update all the state
    });
    return next => (action) => {
        next(action);
        if(!action.ignoreSave) {//avoid infinity loop on saving
            nun.setValue('lastEvent', action);//replicate the current event to other clients
            nun.setValue('lastState', store.getState());//save last state
        }
    };
};

export {
    nun,
    dbMiddleware
};

```


## Added Nun-db middleware to the store

[Code here](https://github.com/mateusfreira/nun-db-js/blob/master/examples/react/src/index.js#L7)

```js
import { dbMiddleware  } from './nun'
const store = createStore(reducer, applyMiddleware(dbMiddleware));
```

## Add event to update all the state in the first load

[Code here](https://github.com/mateusfreira/nun-db-js/blob/master/examples/react/src/reducers/todos.js#L14)

```js
export default function todos(state = initialState, action) {
  switch (action.type) {
    case 'newState':
      return action.state.todos;
//...
```


# That is all....

This is all I did now the app is Realtime, durable and with little changes to the code ... 
Hope it helps you to do the same on your app, if not don't  left us an issue we will be happy to make is work on your app.

