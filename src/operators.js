var _ = require('lodash');
var utils = require('./utils.js');

module.exports = {

	AND: function() {
		var assertions = _.initial(arguments),
			callback = _.last(arguments);
		return utils.andSeries(assertions, this.assert, callback);
	},
	
	OR: function() {
		var assertions = _.initial(arguments),
			callback = _.last(arguments);
		return utils.someSeries(assertions, this.assert, callback);
	}
	
};