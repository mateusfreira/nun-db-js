const nun = new NunDb('wss://ws.nundb.org', "vue", "vue-pwd");
//const nun = new NunDb('ws://localhost:3058', "vue", "vue_pwd");
// The raw data to observe
var initialStats = [{
    label: 'A',
    value: 100
  },
  {
    label: 'B',
    value: 100
  },
  {
    label: 'C',
    value: 100
  },
  {
    label: 'D',
    value: 100
  },
  {
    label: 'E',
    value: 100
  },
  {
    label: 'F',
    value: 100
  },
  {
    label: 'H',
    value: 100
  }
];
let send = true;
const setState = state => {
  send && nun && nun.setValue('state', state);
};
nun.getValue('state').catch(() => {}).then(stats => {
  stats = stats || initialStats;
  // A resusable polygon graph component
  Vue.component('polygraph', {
    props: ['stats'],
    template: '#polygraph-template',
    computed: {
      // a computed property for the polygon's points
      points: function() {
        setState(this.stats);
        send = true;
        var total = this.stats.length;
        return this.stats.map(function(stat, i) {
          var point = valueToPoint(stat.value, i, total);
          return point.x + ',' + point.y;
        }).join(' ');
      }
    },
    components: {
      // a sub component for the labels
      'axis-label': {
        props: {
          stat: Object,
          index: Number,
          total: Number
        },
        template: '#axis-label-template',
        computed: {
          point: function() {
            return valueToPoint(+this.stat.value + 10,
              this.index,
              this.total
            );
          }
        }
      }
    }
  });

  // math helper...
  //
  function valueToPoint(value, index, total) {
    var x = 0;
    var y = -value * 0.8;
    var angle = Math.PI * 2 / total * index;
    var cos = Math.cos(angle);
    var sin = Math.sin(angle);
    var tx = x * cos - y * sin + 100;
    var ty = x * sin + y * cos + 100;
    return {
      x: tx,
      y: ty
    };
  }

  // bootstrap the demo
  new Vue({
    el: '#demo',
    data: {
      newLabel: '',
      stats: stats
    },
    mounted: function() {
      nun.watch('state', event => {
        send = false;
        this.stats = event.value;
      });
    },
    methods: {
      add: function(e) {
        send = true;
        e.preventDefault();
        if (!this.newLabel) return;
        this.stats.push({
          label: this.newLabel,
          value: 100
        });
        this.newLabel = '';
      },
      remove: function(stat) {
        send = true;
        if (this.stats.length > 3) {
          this.stats.splice(this.stats.indexOf(stat), 1);
        } else {
          alert('Can\'t delete more!');
        }
      }
    }
  });
});

