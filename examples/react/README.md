# Making Redux TodoMVC Example a realtime multiuser app with Nun-db

This project is a copy and past of https://github.com/reduxjs/redux/tree/master/examples/todomvc + adding Nun-db as a database that makes it Realtime and durable.

We need to do little changes for that. (And I also believe this is true for any other Redux like projects)

I will list the changes we have made.

## Clone redux samples

```bash
git clone git@github.com:reduxjs/redux.git
```

## Go to the examples folder

```bash
cd redux/examples/todomvc
```

## Install all modules

```bash 
npm i
```

## Start the dev app 

```bash
npm start
```
>>>>>>>>>>>>>>>>>>Image 1 here<<<<<<<<<<<<<<<<<<<<<<<<<

At this point the app with be running without any persistence, if you reload the app add data come back to the default state. Now the fun starts.


## Run nun-db server in docker

In a different terminal

```bash
docker run --env NUN_USER=user-name --env NUN_PWD=user-pwd -it --rm -p 3013:3013 -p 3012:3012 -p 3014:3014 --name nun-test mateusfreira/nun-db

```

### Create the nun database

```
docker exec -it nun-test  /bin/sh -c "nun-db -u user-name -p user-pwd create-db -d react-db -t reac-db-pwd"
# You should see something like
# Response "valid auth\n;create-db success\n"
```

Now back to the js project...

## Installed Nun-db in the project


```bash
npm install nun-db
```

## Added Nun-db middleware

[Code here](https://github.com/mateusfreira/nun-db-js/blob/master/examples/react/src/nun.js)

```bash 
# Use your favorite text editor
vim src/nun.js
```

```js
import NunDb from 'nun-db';
const nun = new NunDb('ws://127.0.0.1:3012', "react-db", "reac-db-pwd");

const dbMiddleware = store => {
    nun.watch('lastEvent', action => {
        const actionToTrigger = { ignoreSave: true, ...action.value};
        store.dispatch(actionToTrigger);
    });
    nun.getValue('lastState').then(state => {
        store.dispatch({ type: 'newState', state   });
    });
    return next => (action) => {
        next(action);
        if(!action.ignoreSave) {
            nun.setValue('lastEvent', action);
            nun.setValue('lastState', store.getState());
        }
    };
};

export {
    nun,
    dbMiddleware
};
```


## Added Nun-db middleware to the store in the index.js

[Code here](https://github.com/mateusfreira/nun-db-js/blob/master/examples/react/src/index.js#L7)

```js
//replace import { createStore } from 'redux' by ...
import { createStore, applyMiddleware } from 'redux'
//add the next line
import { dbMiddleware  } from './nun'
//replace const store = createStore(reducer) by ...
const store = createStore(reducer, applyMiddleware(dbMiddleware));
```

Reload the page and check the network console tab to make sure the database connected as expected.

-------------------- image 2 ------------------------------

## Add event to update all the state in the first load

[Code here](https://github.com/mateusfreira/nun-db-js/blob/master/examples/react/src/reducers/todos.js#L14)


```js
//file  src/reducers/todos.js
export default function todos(state = initialState, action) {
  switch (action.type) {
    case 'newState':
      return action.state.todos;
    case ADD_TODO:
....
//...
```
Done your app is already working with Nun-db. Now to see the magic happening open the same page in another computer or browser to see how changing one place will reflect immediate in the other.
In summary all you need it the next changes (git diff)..

-------------------- image 3 ------------------------------

And adding the nun.js to the `src` folder as shown in this post...
Happy hacking!!!

This is all I did and now the app is Realtime, durable and with little changes to the code ... 
Hope it helps you to do the same on your app, if not don't  left us an issue we will be happy to make is work on your app.

