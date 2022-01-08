const charts = {};
const lastEvents = [];
const maxEvents = 10;

const sortByValue = (a, b) => b.value - a.value;

function pushEvent(event) {
  const element = document.createElement('div');
  element.innerHTML = `${event.key} : ${event.value}`;
  document.querySelector('#events').prepend(element);
  const lastEvent = { ...event,
    element,
  };
  lastEvents.unshift(lastEvent);
  if (lastEvents.length >= maxEvents) {
    lastEvents[lastEvents.length - 1].element.remove();
    lastEvents.length = maxEvents;
  }
}

function run() {
  performance.mark('keys-start');
  nun.watch("$connections", updateOnlineUsers, true);
  nun.watch("visits", updateTotal, true);
  nun.keys()
    .then(keys => {
      performance.mark('keys-end');
      performance.measure('keysMarker', 'keys-start', 'keys-end');
      showUserData(keys.filter(u => u.startsWith('user_')));
      buildAnalitcsData(keys, 'page_', showPageData);
      buildAnalitcsData(keys.reverse(), 'date_', showDateData);
      buildAnalitcsData(keys, 'lang_', showLangData);
      buildAnalitcsData(keys, 'location_', showLocationData);
    }).then(() => {});
}

window.onload = () => {
  run();
};


function buildAnalitcsData(allKeys, prefix, plotFunction) {
  const keys = allKeys.filter(u => u.startsWith(prefix));
  const finalObject = {};
  let count = 0;
  performance.mark(`${prefix}_start`);
  keys.map(key => nun.watch(key, ({
    value
  }) => {
    count++;
    finalObject[key] = {
      value,
      key,
      label: key.replace(prefix, '')
    };

    if (prefix === 'page_') {
      pushEvent({
        key,
        value
      });
    }

    if (count >= keys.length)
      plotFunction && plotFunction(Object.values(finalObject));
  }, true));
  return Promise.resolve([]);
}

function showUserData(userData) {
  document.getElementById('total-users').innerHTML = `<h2>${userData.length}</h2>`;
  return userData;
}

function showDateData(_dateData) {
  const dateData = _dateData.sort(({
    key: a
  }, {
    key: b
  }) => a.localeCompare(b));
  if (charts.dateChart) {
    updateChart(charts.dateChart, dateData);
  } else {
    const options = {
      series: [{
        name: 'Page virews',
        data: dateData.map(d => d.value),
      }],
      chart: {
        height: 350,
        type: 'line',
        zoom: {
          enabled: false
        }
      },
      dataLabels: {
        enabled: false
      },
      stroke: {
        curve: 'straight'
      },
      title: {
        text: 'Page virews by date',
        align: 'left'
      },
      grid: {
        row: {
          colors: ['#f3f3f3', 'transparent'], // takes an array which will be repeated on columns
          opacity: 0.5
        },
      },
      xaxis: {
        categories: dateData.map(d => d.label),
      }
    };

    const chart = new ApexCharts(document.querySelector('#chart'), options);
    chart.render();
    charts.dateChart = chart;
  }
}

function updateChart(chart, data) {
  chart.updateSeries([{
    data: data.map(_ => _.value)
  }]);
  chart.updateOptions({
    xaxis: {
      labels: {
        rotate: -45
      },
      categories: data.map(p => p.label),
      tickPlacement: 'on'
    },

  });
}


function updateTotal(event) {
  document.getElementById('total').innerHTML = event.value;
};

function updateOnlineUsers(event) {
  document.getElementById('online-users').innerHTML = event.value;
};

function showPageData(_pagesData) {
  const pagesData = _pagesData.sort(sortByValue);
  if (charts.pageChart) {
    updateChart(charts.pageChart, pagesData);
  } else {
    const pageOptions = {
      series: [{
        name: 'Reads',
        data: pagesData.map(p => p.value),
      }],
      annotations: {
        points: [{
          x: '/',
          seriesIndex: 0,
          label: {
            borderColor: '#775DD0',
            offsetY: 0,
            style: {
              color: '#fff',
              background: '#775DD0',
            },
            text: 'Home page',
          }
        }]
      },
      chart: {
        height: 350,
        type: 'bar',
      },
      plotOptions: {
        bar: {
          borderRadius: 10,
          columnWidth: '50%',
        }
      },
      dataLabels: {
        enabled: false
      },
      stroke: {
        width: 2
      },

      grid: {
        row: {
          colors: ['#fff', '#f2f2f2']
        }
      },
      xaxis: {
        labels: {
          rotate: -45
        },
        categories: pagesData.map(p => p.label),
        tickPlacement: 'on'
      },
      yaxis: {
        title: {
          text: 'Reads',
        },
      },
      fill: {
        type: 'gradient',
        gradient: {
          shade: 'light',
          type: 'horizontal',
          shadeIntensity: 0.25,
          gradientToColors: undefined,
          inverseColors: true,
          opacityFrom: 0.85,
          opacityTo: 0.85,
          stops: [50, 0, 100]
        },
      }
    };
    charts.pageChart = new ApexCharts(document.querySelector('#page-chart'), pageOptions);
    charts.pageChart.render();
  }
  return pagesData;
}

function showLangData(_languageData) {
  const languageData = _languageData.sort(sortByValue);
  document.getElementById('total-languages').innerHTML = `<h2>${languageData.length}</h2><ul>${languageData.splice(0,10).map(lang => `<li><b>${lang.label}</b> : ${lang.value}</li>`).join('')}</ul>`;
}

function showLocationData(_locationData) {
  const locationData = _locationData.sort(sortByValue);
  document.getElementById('total-locations').innerHTML = `<h2>${locationData.length}</h2><ul>${locationData.splice(0,10).map(local => `<li><b>${local.label}</b> : ${local.value}</li>`).join('')}</ul>`;
}

