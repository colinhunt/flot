(function($) {

    var options = {
        xaxis: {
            timezone: null,     // "browser" for local to the client or timezone for timezone-js
            timeformat: null,   // format string to use
            twelveHourClock: false, // 12 or 24 time in time mode
            monthNames: null,   // list of names of months
            tolerance: 0.7,
        }
    };

    const units = ["seconds", "minutes", "hours", "days", "months", "years"]
    const durations = []
    const overflowValueOf = {}

    function multiplesOf(multiple, unit, t) {
        let overflow = overflowValueOf[unit]

        let multiples = []
        if (unit == "days") {
            overflow = t.daysInMonth()
        } else if (unit == "years") {
            overflow = multiple
        }

        for (let i = 0; i < overflow; i += multiple)
            multiples.push(i)

        multiples.push(overflow)

        return multiples.slice(1)
    }

    function factorsOf(n) {
        return [...Array(n).keys()].reduce((acc, v, i) => {
            if (n % i == 0)
                acc.push(i)
            return acc
        }, [])
    }

    function increment(t, unit, value) {
        if (unit == "years")
            t.add(value, unit)
        else if (unit == "days")
            t.date(value + 1)
        else
            t.set(unit, value)
    }

    function getUnit(time, unit) {
        if (unit == "days")
            return time.date() - 1
        return time.get(unit)
    }


    function getStartTick(time, unit, multiple) {
        let start = time.clone()
        start.startOf(unit)
        for (; getUnit(start, unit) % multiple; start.subtract(1, unit)) {}
        return start;
    }

    function log(multiple, unit, t, start, ticks) {
        console.log(`multiple: ${multiple}`)
        console.log(`unit: ${unit}`)
        console.log(multiplesOf(multiple, unit, t))
        console.log(`start: ${start.format()}`)
        console.log(`t: ${t.format()}`)
        console.log(`tick length: ${ticks.length}`)
    }

    function init(plot) {
        // init durations & overflowValueOf
        for (var i = 0; i < units.length - 1; i++) {
            let maxValue = moment.duration(1, units[i + 1]).as(units[i])
            overflowValueOf[units[i]] = maxValue
            durations.splice(durations.length, 0, ...factorsOf(maxValue).map(f => {return {[units[i]]: f}}))
        };


        // console.log(JSON.stringify(durations))

        function getMultiples(delta) {
            let d = durations.find(d => {
                return moment.duration(d).valueOf() > delta / 2
            })
            if (!d)
                for (let i = 1; moment.duration(d).valueOf() <= delta / 2; i *= 10) {
                    for (const m of [1, 2, 5]) {
                        d = {"years": i * m}
                        if (moment.duration(d).valueOf() > delta / 2) break;
                    }
                }
            return d;
        }

        plot.hooks.processOptions.push(function (plot, options) {
            $.each(plot.getAxes(), function(axisName, axis) {
                let opts = axis.options;

                if (opts.mode != "temporal")
                    return;

                axis.tickGenerator = function(axis) {
                    let min = moment.tz(axis.min, opts.timezone);
                    let max = moment.tz(axis.max, opts.timezone);
                    let delta = Math.floor(axis.delta);
                    let d = getMultiples(delta);

                    let unit = Object.keys(d)[0]
                    let multiple = d[unit]

                    axis.tickSize = [multiple, unit]

                    // console.log(unit)
                    // console.log(multiple)
                    let start = getStartTick(min, unit, multiple)
                    let ticks = [start.clone()]

                    for (let t = ticks[0]; t.isSameOrBefore(max);) {
                        // rotate through multiples, setting the unit value of t
                        // each iteration we get a new multiples array, last value will cause t to bubble up to the next higher unit
                        // (example: unit = hours, multiples = [0, 12, 24], we set hour to 0, then 12, then 24, which causes t to advance to the next day, then repeat)
                        log(multiple, unit, t, start, ticks);

                        for (const m of multiplesOf(multiple, unit, t)) {
                            increment(t, unit, m)
                            let space = t.diff(ticks[ticks.length - 1], unit)

                            if (space < multiple * opts.tolerance)
                                ticks.pop()

                            ticks.push(t.clone())
                        }
                    }
                    return ticks.map(t => {return t.valueOf()});
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
