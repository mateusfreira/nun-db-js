const nunDb = new NunDb('wss://ws.nundb.org/', 'data-analysis-demo', '2iowhjiohjwidj'); //Connects to nun-db

const datasetName = new URLSearchParams(window.location.search).get('dataset'); // Get url parameter
const configKey = `${datasetName}_config`; //Config key name


function cleanProps(configCopy) {
    delete configCopy["aggregators"];
    delete configCopy["renderers"];
    delete configCopy["rendererOptions"];
    delete configCopy["localeStrings"];
    return configCopy;
}

function updateUi(dataset, config) {
    const state = {
        lasteSate: "",
        exec: 0,
    };
    state.exec = 0;
    $("#table").pivotUI(dataset, Object.assign({
        onRefresh: (config) => {
            if (state.exec == 0) return state.exec++;
            const configCopy = cleanProps(JSON.parse(JSON.stringify(config)));
            const newConfigStr = JSON.stringify(configCopy);
            if (state.lasteSate != newConfigStr) {
                state.lasteSate = newConfigStr
                nunDb.setValue(configKey, configCopy);
            }
        }
    }, config), true);
}
$(() => {
    if (datasetName) {
        $("#data-set-parent").hide();
        nunDb.getValue(datasetName)
            .then(dataset => {
                nunDb.watch(configKey, (event) => {
                    updateUi(dataset, event.value);
                }, true);
            });
    } else {
        $("#start").click(() => {
            try {
                const dsName = `${Date.now()}_ds`;
                const confName = `${Date.now()}_ds_config`;
                const data = JSON.parse($("#dataset").val());
                Promise.all([
                        nunDb.setValue(dsName, data),
                        nunDb.setValue(confName, {})
                    ])
                    .then(() => {
                        document.location.href = `./?dataset=${dsName}`
                    });
            } catch (e) {
                alert(`Invalid json dataset: ${e.message}`);
            }
        })
    }
});
