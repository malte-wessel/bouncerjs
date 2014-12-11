var _ = require('lodash');
var async = require('async');
var NotAuthenticatedError = require('./errors/NotAuthenticatedError');
var operators = require('./operators.js');
var utils = require('./utils.js');

/**
 * Bouncer
 * @param {Object} options
 */
function Bouncer(options) {
	_.extend(this, options || {});

	this.activities = this.activities || {};
	this.assertions = _.extend({}, this.assertions, operators);

	_.bindAll(this, 'assert', 'permittedActivities');
}

/**
 * Passed to callback, when user is not authenticated (params.user is undefined)
 * Override with your own Error
 * @public
 * @type {Error}
 */
Bouncer.prototype.NotAuthenticatedError = NotAuthenticatedError;

/**
 * Invoked when the `Bouncer#activity` middleware is used and 
 * the user is not authenticated (params.user is undefined)
 * @public
 * @param  {express.Request}    req  Express request object
 * @param  {express.Response}   res  Express response object
 * @param  {Function} 			next Invokes next middleware
 * @return {void}
 */
Bouncer.prototype.onNotAuthenticated = function(req, res, next) {
	throw new Error('You need to implement an own `onNotAuthenticated` method');
};

/**
 * Invoked when the `Bouncer#activity` middleware is used and 
 * the user is not authorized (assertion passes an error)
 * @public
 * @param  {Error}				err  The assertion error
 * @param  {express.Request}    req  Express request object
 * @param  {express.Response}   res  Express response object
 * @param  {Function} 			next Invokes next middleware
 * @return {void}
 */
Bouncer.prototype.onNotAuthorized = function(err, req, res, next) {
	throw new Error('You need to implement an own `onNotAuthorized` method');
};

/**
 * Internal method to test if a given activity can be performed.
 * If the user is not authorized to perform the activity, an error object is
 * passed to the callback.
 * @private
 * @param  {String}           name      Name of the activity
 * @param  {Object|Function}  params    Params passed to the assertion methods
 * @param  {Function}         callback  Invoked with callback(error)
 * @return {void}
 */
Bouncer.prototype._canPerformActivity = function(name, params, callback) {
	// If `params` is a function, invoke it.
	var paramsResult = _.isFunction(params) ? params() : _.clone(params || {});
	// Not authenticated
	if(!paramsResult.user) return callback(new this.NotAuthenticatedError());
	// If no activity was provided, just ensure that the user is authenticated
	if(!name) return callback();

	var activity = this.getActivity(name),
		assertions = activity(paramsResult);

	return this.assert(assertions, function(err) {
		// Not authorized
		if(err) return callback(err);
		return callback();
	});
};

/**
 * Test if a given activity can be performed
 * If the user is not authorized to perform the activity, the passed 
 * `isAuthorized` value will be `false`. Otherwise it will be `true`.
 * @public
 * @param  {String}           name      Name of the activity
 * @param  {Object|Function}  params    Params passed to the assertion methods
 * @param  {Function}         callback  Invoked with callback(isAuthorized)
 * @return {void}
 */
Bouncer.prototype.canPerformActivity = function(name, params, callback) {
	return this._canPerformActivity(name, params, function(err) {
		if(err) return callback(false);
		return callback(true);
	});
};

/**
 * Get a list of permitted activites.
 * This method takes a list of activites and tests each activity with the
 * passed parameters. It invokes the callback with an array of the names of
 * the permitted activities.
 * @public
 * @param  {Array}            activities  Array of activity names to test against
 * @param  {Object|Function}  params      Params passed to the assertion methods
 * @param  {Function} 		  callback    Invoked with callback(['activity1', 'activity2', 'activityN'])
 * @return {void}
 */
Bouncer.prototype.permittedActivities = function(activities, params, callback) {
	var that = this;
	return async.filter(activities, 
		function(name, cb) {
			return that._canPerformActivity(name, params, function(err) {
				if(err) return cb(false);
				return cb(true);
			});
		},
		function(permittedActivities) {
			callback(null, permittedActivities);
		}
	);
};

/**
 * Returns a middleware function that tests if the user is 
 * authorized to perform the given activity
 * @public
 * @param  {String} 		  name    Name of the activity
 * @param  {Object|Function}  params  Params passed to the assertion methods
 * @return {Function}                 Middleware function
 */
Bouncer.prototype.activity = function(name, params) {
	var that = this;

	return function(req, res, next) {
		// If `params` is a function, invoke it with the request.
		var paramsResult = _.isFunction(params) ? params(req) : _.clone(params || {});
		// Not authenticated
		if(!paramsResult.user) return that.onNotAuthenticated(req, res, next);

		return that._canPerformActivity(name, paramsResult, function(err) {
			if(err) return that.onNotAuthorized(err, req, res, next);
			return next();
		});
	};
};

/**
 * Finds a activity function by its path
 * @param  {String} path 
 * @return {Function} The activity function
 */
Bouncer.prototype.getActivity = function(path) {
	var fn = utils.getPath(path, this.activities);
	if(!fn) throw new Error('Activity `' + path + '`not found.');
	return fn;
};

/**
 * Finds a assertion function by its path
 * @param  {String} path 
 * @return {Function} The assertion function
 */
Bouncer.prototype.getAssertion = function(path) {
	var fn = utils.getPath(path, this.assertions);
	if(!fn) throw new Error('Assertion `' + path + '`not found.');
	return fn;
};

/**
 * Tests an assertion 
 * @param  {Array}   assertion  Assertion definition
 * @param  {Function} callback 
 * @return {void}
 */
Bouncer.prototype.assert = function(assertion, callback) {
	var method = _.first(assertion),
		methodFn = this.getAssertion(method),
		args = _.rest(assertion);

	return methodFn.apply(this, args.concat(callback));
};

module.exports = Bouncer;