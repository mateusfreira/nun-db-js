import { useLayoutEffect } from 'react';
//import NunDb from 'nun-db';
const nun = new window.NunDb('wss://ws.nundb.org', "react", "react-pwd");
window._nundb = nun;
const valueHolder = {
    features : {
        toogleAll: false,
        clearCompleted: true,
    }
};

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

export function startWatchFeatureFlag() {

    const start = performance.now();
    evalFeatures(valueHolder.features);
    // Todo prefix with user id
    nun.watch('featureToggle', event => {
        performance.measure('featureToggle-read', {
            start,
        });
        evalFeatures(event.value);
        valueHolder.features = event.value;
    }, true, true);
}

//@Todo use with moderation
export function useNunDbFeatureFlagsReRender() {
  useLayoutEffect(() => {
    reEvalFeatures();
  });
}
export function reEvalFeatures() {
    performance.mark('reEvalFeatures-called');
    evalFeatures(valueHolder.features);
}

function evalFeatures(features) {
    Object.keys(features).forEach(featureName => {
        const isFeatureEnabled = features[featureName];
        const elements = document.querySelectorAll(`[data-feature="${featureName}"]`);
        elements.forEach(element => {
            const displayProp = isFeatureEnabled ? 'block' : 'none';
            element.style.display = displayProp;
        });
    });
}

export {
    nun,
    dbMiddleware
};
