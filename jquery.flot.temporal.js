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

    const units = ["seconds", "minutes", "hours", "days", "months", "years"];
    const durations = [];

    function factorsOf(n) {
        return [...new Array(n).keys()].reduce((acc, v, i) => {
            if (n % i == 0)
                acc.push(i);
            return acc
        }, [])
    }

    function nextMultiple(time, unit, multiple, step=1) {
        do { time.add(step, unit); } while (getUnit(time, unit) % multiple);
    }

    function getUnit(time, unit) {
        if (unit == "days")
            return time.date() - 1;
        return time.get(unit)
    }


    function getStartTick(time, unit, multiple) {
        let start = time.clone().startOf(unit);
        nextMultiple(start, unit, multiple, -1);
        return start;
    }

    function log(multiple, unit, t, min, start, ticks) {
        console.log(`multiple: ${multiple}`);
        console.log(`unit: ${unit}`);
        console.log(`min: ${min.format()}`);
        console.log(`start: ${start.format()}`);
        console.log(`t: ${t.format()}`);
        console.log(`tick length: ${ticks.length}`)
    }

    function init(plot) {
        // init durations
        // for (let i = 0; i < units.length - 1; i++) {
        //     let maxValue = moment.duration(1, units[i + 1]).as(units[i]);
        //     durations.splice(durations.length, 0, ...factorsOf(maxValue).map(f => {
        //         return {[units[i]]: f}
        //     }))
        // }

        function* durations() {
            function maxValueOfUnit(i) {
                if (units[i] == "years")
                    return 1000;
                return moment.duration(1, units[i + 1]).as(units[i]);
            }

            for (let i = 0; i < units.length - 1; i++) {
                for (const f of factorsOf(maxValueOfUnit(i)))
                    yield {[units[i]]: f}
            }
            // for (let i = 1; i <= 1000; i *= 10)
            //     yieldDurations(10, ["years"], 0, i)
        }

        function findDuration(delta) {
            return durations().find(d => {
                return moment.duration(d).valueOf() > delta / 2;
            });

            // for (let i = 1; !d; i *= 10) {
            //     d = factorsOf(10).map(f => {
            //         return {[units[units.length - 1]]: i * f}
            //     }).find(check);
            // }
            // return d;
        }

        plot.hooks.processOptions.push(function (plot, options) {
            $.each(plot.getAxes(), function (axisName, axis) {
                let opts = axis.options;

                if (opts.mode != "temporal")
                    return;

                axis.tickGenerator = function (axis) {
                    let min = moment.tz(axis.min, opts.timezone);
                    let max = moment.tz(axis.max, opts.timezone);
                    let delta = Math.floor(axis.delta);
                    let duration = findDuration(delta);

                    let unit = Object.keys(duration)[0];
                    let multiple = duration[unit];

                    axis.tickSize = [multiple, unit];

                    // console.log(unit)
                    // console.log(multiple)
                    let start = getStartTick(min, unit, multiple);
                    let ticks = [start.clone()];

                    for (let t = ticks[0]; t.isSameOrBefore(max);) {
                        // rotate through multiples, setting the unit value of t
                        // each iteration we get a new multiples array, last value will cause t to bubble up to the next higher unit
                        // (example: unit = hours, multiples = [0, 12, 24], we set hour to 0, then 12, then 24, which causes t to advance to the next day, then repeat)
                        log(multiple, unit, t, min, start, ticks);

                        nextMultiple(t, unit, multiple);

                        let space = t.diff(ticks[ticks.length - 1], unit);

                        if (space < multiple * opts.tolerance)
                            ticks.pop();

                        ticks.push(t.clone())
                    }
                    return ticks.map(t => {
                        return t.valueOf()
                    });
                };

                axis.tickFormatter = function (v, axis) {

                };
            });
        });
    }

    $.plot.plugins.push({
        init: init,
        options: options,
        name: 'temporal',
        version: '1.0'
    });

})(jQuery);
