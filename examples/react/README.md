# Making Redux TodoMVC Example a real-time multiuser app with Nun-db

In this tutorial, we will show how to add Nun-db to an already existent react/redux app. This project is a copy and paste of https://github.com/reduxjs/redux/tree/master/examples/todomvc + adding [Nun-db](https://github.com/mateusfreira/nun-db) as a database that makes it real-time and durable.

We need to make little archive that goal. (And I also believe this is true for any other Redux like projects)

Next I will list the changes we have made.

##  1. Clone redux samples

```bash
git clone git@github.com:reduxjs/redux.git
```

## 2. Go to the examples folder

```bash
cd redux/examples/todomvc
```

## 3. Install all modules

```bash 
npm i
```

## 4. Start the dev app 

```bash
npm start
```




At this point, the app with be running without any persistence. If you reload the app, add data come back to the default state. Now the fun starts.

![App running](https://user-images.githubusercontent.com/234049/123936589-b2d58d80-d96b-11eb-8a25-cf9aeed370dd.png)


## 5. Run nun-db server in docker

In a different terminal

```bash
docker run --env NUN_USER=user-name --env NUN_PWD=user-pwd -it --rm -p 3013:3013 -p 3012:3012 -p 3014:3014 --name nun-test mateusfreira/nun-db

```

### 6. Create the nun database

```
docker exec -it nun-test  /bin/sh -c "nun-db -u user-name -p user-pwd create-db -d react-db -t reac-db-pwd"
# You should see something like
# Response "valid auth\n;create-db success\n"
```

Now back to the js project.

## 7. Installed Nun-db in the project


```bash
npm install nun-db
```

## 8. Added Nun-db middleware

[Code here](https://github.com/mateusfreira/nun-db-js/blob/master/examples/react/src/nun.js)

```bash 
# Use your favorite text editor,
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


## 9 Added Nun-db middleware to the store in the index.js

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


![Network tab](https://user-images.githubusercontent.com/234049/123936745-ddbfe180-d96b-11eb-8f7b-ba1a03516561.png)

## 10. Add event to update all the state in the first load

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
Done your app is already working with Nun-db. Now to see the magic happening, open the same page in another computer or browser to see how changing one place will reflect immediately in the other.
In summary, all you need is the following changes (git diff).

![post-print3](https://user-images.githubusercontent.com/234049/123936905-034ceb00-d96c-11eb-8723-f887c0265594.png)

And adding the nun.js to the `src` folder as shown in this post...
Happy hacking!!!

This is all I did, and now the app is real-time, durable, and with minor changes to the code. 
I hope it helps you to do the same on your app. If not, don't leave us an [issue](https://github.com/mateusfreira/nun-db/issues). We will be happy to make it work on your app.

