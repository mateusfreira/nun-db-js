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

const keysPromise = nun.keys();

function run() {
  performance.mark('full-start');
  performance.mark('keys-start');
  nun.watch("$connections", updateOnlineUsers, true);
  nun.watch("visits", updateTotal, true);
  keysPromise.then(keys => {
    performance.mark('keys-end');
    performance.measure('keysMarker', 'keys-start', 'keys-end');
    buildAnalitcsData(keys, 'lang_', showLangData);
    buildAnalitcsData(keys, 'location_', showLocationData);
    showUserData(keys.filter(u => u.startsWith('user_')));
    buildAnalitcsData(keys, 'page_', showPageData);
    buildAnalitcsData(keys.reverse(), 'date_', showDateData);
  }).then(() => {});
}

window.onload = () => {
  run();
};


function buildAnalitcsData(allKeys, prefix, plotFunction) {
  performance.mark(`start-${prefix}`);
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

    if (count >= keys.length) {
      pushEvent({
        key,
        value
      });
      performance.mark(`end-${prefix}`);
      performance.measure(prefix, `start-${prefix}`, `end-${prefix}`);
      plotFunction && plotFunction(Object.values(finalObject));
    }
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
        name: 'Page views',
        data: dateData.map(d => d.value),
      }],
      colors: ['#00d4ff'],
      chart: {
        height: 350,
        type: 'area',
        background: 'transparent',
        foreColor: '#8b93c7',
        toolbar: { show: false },
        zoom: { enabled: false }
      },
      theme: { mode: 'dark' },
      dataLabels: { enabled: false },
      stroke: {
        curve: 'smooth',
        width: 3
      },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.45,
          opacityTo: 0.05,
          stops: [0, 100],
          colorStops: [
            { offset: 0, color: '#00d4ff', opacity: 0.5 },
            { offset: 100, color: '#6c5ce7', opacity: 0 }
          ]
        }
      },
      markers: {
        size: 4,
        colors: ['#00d4ff'],
        strokeColors: '#0b1020',
        strokeWidth: 2,
        hover: { size: 6 }
      },
      grid: {
        borderColor: 'rgba(255,255,255,0.06)',
        strokeDashArray: 4,
        xaxis: { lines: { show: false } },
        yaxis: { lines: { show: true } }
      },
      xaxis: {
        categories: dateData.map(d => d.label),
        axisBorder: { color: 'rgba(255,255,255,0.08)' },
        axisTicks: { color: 'rgba(255,255,255,0.08)' },
        labels: { style: { colors: '#8b93c7' } }
      },
      yaxis: {
        labels: { style: { colors: '#8b93c7' } }
      },
      tooltip: { theme: 'dark' }
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
      colors: ['#6c5ce7'],
      annotations: {
        points: [{
          x: '/',
          seriesIndex: 0,
          label: {
            borderColor: '#00d4ff',
            offsetY: 0,
            style: {
              color: '#0b1020',
              background: '#00d4ff',
              fontWeight: 600,
            },
            text: 'Home page',
          }
        }]
      },
      chart: {
        height: 350,
        type: 'bar',
        background: 'transparent',
        foreColor: '#8b93c7',
        toolbar: { show: false }
      },
      theme: { mode: 'dark' },
      plotOptions: {
        bar: {
          borderRadius: 8,
          columnWidth: '55%',
          distributed: false,
        }
      },
      dataLabels: { enabled: false },
      stroke: {
        width: 0
      },
      grid: {
        borderColor: 'rgba(255,255,255,0.06)',
        strokeDashArray: 4,
        xaxis: { lines: { show: false } },
        yaxis: { lines: { show: true } }
      },
      xaxis: {
        labels: {
          rotate: -45,
          style: { colors: '#8b93c7' }
        },
        categories: pagesData.map(p => p.label),
        tickPlacement: 'on',
        axisBorder: { color: 'rgba(255,255,255,0.08)' },
        axisTicks: { color: 'rgba(255,255,255,0.08)' }
      },
      yaxis: {
        title: {
          text: 'Reads',
          style: { color: '#8b93c7', fontWeight: 500 }
        },
        labels: { style: { colors: '#8b93c7' } }
      },
      fill: {
        type: 'gradient',
        gradient: {
          shade: 'dark',
          type: 'vertical',
          shadeIntensity: 0.4,
          gradientToColors: ['#00d4ff'],
          inverseColors: false,
          opacityFrom: 0.95,
          opacityTo: 0.75,
          stops: [0, 100]
        },
      },
      tooltip: { theme: 'dark' }
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

