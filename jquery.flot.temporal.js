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

    const units = ["seconds", "minutes", "hours", "days", "months", "years"];
    let durations;

    function tickGenerator(axis) {
        const min              = moment.tz(axis.min, axis.options.timezone);
        const max              = moment.tz(axis.max, axis.options.timezone);
        const [unit, multiple] = findDuration(Math.floor(axis.delta));
        const tolerance        = axis.options.tolerance;
        const start            = setToNextMultiple(min.clone().startOf(unit), step=-1);

        let ticks = [start.clone()];

        for (let tick = start.clone(); tick.isSameOrBefore(max);) {

            setToNextMultiple(tick);

            addTick(tick)
        }
        // log(ticks[ticks.length - 1]);
        return ticks.map(t => {return t.valueOf()});
        

        /* Private utility functions */
        function setToNextMultiple(tick, step=1) {
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
            if (!durations) initDurations();

            return durations.find(([unit, multiple]) => {
                return moment.duration(multiple, unit).valueOf() > delta / 2
            });
        }

        function initDurations() {
            durations = units.map((u, i) => {
                return factorsOf(maxValueOfUnit(i)).map(f => {return [u, f]})
            }).reduce((a, l) => a.concat(l), []);
        }

        function factorsOf(n) {
            return [...Array(n).keys()].filter(i => {return n % i == 0});
        }

        function maxValueOfUnit(i) {
            return units[i + 1] ?
                moment.duration(1, units[i + 1]).as(units[i]) :
                100000;
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
