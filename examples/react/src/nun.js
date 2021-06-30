import NunDb from 'nun-db';
const nun = new NunDb('wss://ws.nundb.org', "react", "react-pwd");

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
