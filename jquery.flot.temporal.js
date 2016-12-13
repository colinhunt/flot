(function ($) {

    const options = {
        xaxis: {
            timezone: null,     // "browser" for local to the client or timezone for timezone-js
            timeformat: null,   // format string to use
            twelveHourClock: false, // 12 or 24 time in time mode
            monthNames: null,   // list of names of months
            tolerance: 0.5,
        }
    };

    const units = ["seconds", "minutes", "hours", "days", "months", "years"];
    let durations;

    function init(plot) {
        plot.hooks.processOptions.push(function (plot, options) {
            $.each(plot.getAxes(), function (axisName, axis) {
                let opts = axis.options;

                if (opts.mode != "temporal")
                    return;

                axis.tickGenerator = function (axis) {
                    return generateTicks(
                              min = moment.tz(axis.min, opts.timezone),
                              max = moment.tz(axis.max, opts.timezone),
                         duration = findDuration(Math.floor(axis.delta)),
                        tolerance = opts.tolerance
                    );
                };

                axis.tickFormatter = function (v, axis) {

                };
            });
        });
    }

    function generateTicks(min, max, {unit, multiple}, tolerance) {
        const start = getStartTick(min, unit, multiple);
        let ticks = [start.clone()];
        for (let t = ticks[0]; t.isSameOrBefore(max);) {
            log(multiple, unit, t, min, start, ticks);
            nextMultiple(t, unit, multiple);

            const space = t.diff(ticks[ticks.length - 1], unit);
            if (space < multiple * tolerance) 
                ticks.pop();

            ticks.push(t.clone())
        }
        return ticks.map(t => {return t.valueOf()});
    }

    function initDurations() {
        durations = units.map((u, i) => {
            return factorsOf(maxValueOfUnit(i)).map(f => {
                return {[u]: f}
            })
        }).reduce((a, l) => a.concat(l), []);
    }

    function factorsOf(n) {
        return [...Array(n).keys()].filter(i => {return n % i == 0});
    }

    function maxValueOfUnit(i) {
        if (units[i + 1])
            return moment.duration(1, units[i + 1]).as(units[i]);
        return 100000;
    }

    function findDuration(delta) {
        if (!durations) initDurations();
        for (const d of durations)
            if (moment.duration(d).valueOf() > delta / 2) 
                return {unit: Object.keys(d)[0], multiple: d[Object.keys(d)[0]]};
    }

    function getStartTick(time, unit, multiple) {
        let start = time.clone().startOf(unit);
        nextMultiple(start, unit, multiple, step=-1);
        return start;
    }

    function nextMultiple(time, unit, multiple, step=1) {
        do { time.add(step, unit); } while (getUnit(time, unit) % multiple);
    }

    function getUnit(time, unit) {
        if (unit == "days")
            return time.date() - 1;
        return time.get(unit)
    }

    function log(multiple, unit, t, min, start, ticks) {
        console.log(`multiple: ${multiple}`);
        console.log(`unit: ${unit}`);
        console.log(`min: ${min.format()}`);
        console.log(`start: ${start.format()}`);
        console.log(`t: ${t.format()}`);
        console.log(`tick length: ${ticks.length}`)
    }

    $.plot.plugins.push({
        init: init,
        options: options,
        name: 'temporal',
        version: '1.0'
    });

})(jQuery);
