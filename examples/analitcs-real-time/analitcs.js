window.onload = () => {
  performance.mark('keys-start');
  nun.keys()
    .then(keys => {
      performance.mark('keys-end');
      performance.measure('keysMarker', 'keys-start', 'keys-end');
      performance.mark('load-start');
      const data = {
        users: {
          keys: showUserData(keys.filter(u => u.startsWith("user_"))),
        },
        pages: buildAnalitcsData(keys, "page_").then(showPageData),
        dates: buildAnalitcsData(keys.reverse(), "date_").then(showDateData),
        languages: buildAnalitcsData(keys, "lang_").then(showLangData),
        locations: buildAnalitcsData(keys, "location_").then(showLocationData),
      };
      return Promise.all([data.pages, data.dates, data.users, data.languages, data.locations]);
    }).then(([_pagesData, _dateData, userData, _languageData, _locationData]) => {
      performance.mark('load-end');
      performance.measure('loadMarker', 'load-start', 'load-end');
    });
};


function buildAnalitcsData(allKeys, prefix) {
  const keys = allKeys.filter(u => u.startsWith(prefix));
  const valueChain = keys.map(key => nun.getValue(key).then((value) => ({
    key,
    value,
    label: key.replace(prefix, "")
  })));
  return Promise.all(valueChain);
}

function showUserData(userData) {
  document.getElementById('total-users').innerHTML = `<h2>${userData.length}</h2>`;
  return userData;
}

function showDateData(_dateData) {
  const dateData = _dateData.sort((p1, p2) => p1.key.localeCompare(p2.key));
  const options = {
    series: [{
      name: "Page virews",
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

  const chart = new ApexCharts(document.querySelector("#chart"), options);
  chart.render();
}

function showPageData(_pagesData) {
  const pagesData = _pagesData.sort((p1, p2) => p2.value - p1.value);
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
        type: "horizontal",
        shadeIntensity: 0.25,
        gradientToColors: undefined,
        inverseColors: true,
        opacityFrom: 0.85,
        opacityTo: 0.85,
        stops: [50, 0, 100]
      },
    }
  };

  const pageChart = new ApexCharts(document.querySelector("#page-chart"), pageOptions);
  pageChart.render();
  return pagesData;
}

function showLangData(_languageData) {
  const languageData = _languageData.sort((p1, p2) => p2.value - p1.value);
  document.getElementById('total-languages').innerHTML = `<h2>${languageData.length}</h2><ul>${languageData.splice(0,10).map(lang => `<li><b>${lang.label}</b> : ${lang.value}</li>`).join("")}</ul>`;
}

function showLocationData(_locationData) {
  const locationData = _locationData.sort((p1, p2) => p2.value - p1.value);
  document.getElementById('total-locations').innerHTML = `<h2>${locationData.length}</h2><ul>${locationData.splice(0,10).map(local => `<li><b>${local.label}</b> : ${local.value}</li>`).join("")}</ul>`;
}

