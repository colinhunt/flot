(function($) {

	var options = {
		xaxis: {
			timezone: null,		// "browser" for local to the client or timezone for timezone-js
			timeformat: null,	// format string to use
			twelveHourClock: false,	// 12 or 24 time in time mode
			monthNames: null	// list of names of months
		}
	};

	const units = ["seconds", "minutes", "hours", "days", "months", "years"]
	const durations = []
	const overflowValueOf = {}

	function multiplesOf(multiple, unit, t) {
		let overflow = overflowValueOf[unit]
		let i = 0
		let multiples = []
		if (unit == "days") {
			overflow = t.daysInMonth()
		}

		for (; i < overflow; i += multiple)
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

	function setUnit(t, unit, value) {
		if (unit == "days")
			t.date(value + 1)
		else
			t.set(unit, value)
	}

	function init(plot) {
		// init durations & overflowValueOf
		for (var i = 0; i < units.length - 1; i++) {
			let maxValue = moment.duration(1, units[i + 1]).as(units[i])
			overflowValueOf[units[i]] = maxValue
			durations.splice(durations.length, 0, ...factorsOf(maxValue).map(f => {return {[units[i]]: f}}))
		};

		// console.log(JSON.stringify(durations))

		plot.hooks.processOptions.push(function (plot, options) {
			$.each(plot.getAxes(), function(axisName, axis) {

				let opts = axis.options;

				if (opts.mode != "temporal")
					return;

				axis.tickGenerator = function(axis) {
					let min = moment.tz(axis.min, opts.timezone);
					let max = moment.tz(axis.max, opts.timezone);
					let delta = Math.floor(axis.delta);

					let d = durations.find(d => {return moment.duration(d).valueOf() > delta / 2})
					if (!d)
						d = durations[durations.length - 1]

					let unit = Object.entries(d)[0][0]
					let multiple = Object.entries(d)[0][1]

					// console.log(unit)
					// console.log(multiple)

					setUnit(min, unit, 0)
					min.startOf(unit)

					let ticks = [min.clone()]

					for (let t = min.clone(); t.isSameOrBefore(max);) {
						// rotate through multiples, setting the unit value of t
						// each iteration we get a new multiples array, last value will cause t to bubble up to the next higher unit
						// (example: unit = hours, multiples = [0, 12, 24], we set hour to 0, then 12, then 24, which causes t to advance to the next day, then repeat)
						// console.log(multiple)
						// console.log(unit)
						// console.log(multiplesOf(multiple, unit, min))
						// console.log(t.format())
						// console.log(ticks.length)
						for (const m of multiplesOf(multiple, unit, t)) {
							setUnit(t, unit, m)
							let space = t.diff(ticks[ticks.length - 1], unit)
						
							if (space < multiple * 0.7)
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
