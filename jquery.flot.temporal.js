(function ($) {

  const options = {
    xaxis: {
      timezone: null,     // "browser" for local to the client or timezone for timezone-js
      timeformat: null,   // format string to use
      twelveHourClock: false, // 12 or 24 time in time mode
      monthNames: null,   // list of names of months
      tolerance: 0.7,
    }
  };


  function init(plot) {
    plot.hooks.processOptions.push(function (plot, options) {
      $.each(plot.getAxes(), function (axisName, axis) {
        let opts = axis.options;

        if (opts.mode != "temporal")
          return;

        axis.tickGenerator = tickGenerator;

        axis.tickFormatter = function (v, axis) {

        };
      });
    });
  }

  const UNITS = [
    ["seconds", [1, 5, 15, 30]],
    ["minutes", [1, 5, 15, 30]],
    ["hours", [1, 2, 6, 12]],
    ["days", [1, 2, 4, 8, 16]],
    ["months", [1, 2, 6]],
    ["years", [1, 5, 25, 50, 100]],
  ];

  const DEFAULT_TOLERANCE = 0.7;

  const durations = UNITS.reduce((ds, [unit, magnitudes]) => {
    return ds.concat(magnitudes.map(m => [unit, m]))
  }, []);

  // const durations = UNITS.map(({unit, magnitudes}) => {
  //   return magnitudes.map(m => [unit, m])
  // }).reduce((flattened, l) => flattened.concat(l), []);


  function tickGenerator(axis) {
    const min              = moment.tz(axis.min, axis.options.timezone);
    const max              = moment.tz(axis.max, axis.options.timezone);
    const [unit, multiple] = findDuration(Math.floor(axis.delta));
    const tolerance        = axis.options.tolerance || DEFAULT_TOLERANCE;
    const start            = setToNextMultiple(min.clone().startOf(unit), {step: -1});

    let ticks = [start.clone()];

    for (let tick = start.clone(); tick.isSameOrBefore(max);) {
      setToNextMultiple(tick, {step: 1});
      addTick(tick)
    }
    // log(ticks[ticks.length - 1]);
    return ticks.map(t => t.valueOf());


    /* Private utility functions */
    function setToNextMultiple(tick, {step}) {
      do { tick.add(step, unit); } while (getUnit(tick) % multiple);
      return tick;
    }

    function addTick(tick) {
      const space = tick.diff(ticks[ticks.length - 1], unit);
      if (space < multiple * tolerance) {
        if (unit == "hours")
          return;   // clobber this tick
        ticks.pop();  // clobber the last tick
      }
      ticks.push(tick.clone());
    }

    function getUnit(tick) {
      return unit == "days" ?
      tick.date() - 1 :
          tick.get(unit)
    }

    function findDuration(delta) {
      return durations.find(([unit, multiple]) => {
        return moment.duration(multiple, unit).valueOf() > delta / 2
      }) || durations[durations.length - 1];
    }

    function log(t) {
      console.log(`multiple: ${multiple}`);
      console.log(`unit: ${unit}`);
      console.log(`min: ${min.format()}`);
      console.log(`start: ${start.format()}`);
      console.log(`t: ${t.format()}`);
      console.log(`tick length: ${ticks.length}`)
    }
  }


  $.plot.plugins.push({
    init: init,
    options: options,
    name: 'temporal',
    version: '1.0'
  });

})(jQuery);
