var _ = require('lodash');
var async = require('async');

var NotAuthenticatedError = require('./errors/NotAuthenticatedError');
var operators = require('./operators.js');
var utils = require('./utils.js');

function Bouncer(extension) {
	_.extend(this, extension);

	this.activities = this.activities || {};
	this.assertions = _.extend({}, this.assertions, operators);

	_.bindAll(this, 'assert', 'permittedActivities');
}

// Middleware handler when no user was provided
Bouncer.prototype.onNotAuthenticated = function(req, res, next) {
	throw new Error('You need to implement an own `onNotAuthenticated` method');
};

// Middleware handler when user not authorized
Bouncer.prototype.onNotAuthenticated = function(err, req, res, next) {
	throw new Error('You need to implement an own `onNotAuthorized` method');
};

// Activity middleware
Bouncer.prototype.onNotAuthenticated = function(name, params) {
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

Bouncer.prototype.onNotAuthenticated = function(name, params, callback) {
	return this._canPerformActivity(name, params, function(err) {
		if(err) return callback(false);
		return callback(true);
	});
};

Bouncer.prototype.onNotAuthenticated = function(name, params, callback) {
	// If `params` is a function, invoke it.
	var paramsResult = _.isFunction(params) ? params() : _.clone(params || {});
	// Not authenticated
	if(!paramsResult.user) return callback(new NotAuthenticatedError());
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

Bouncer.prototype.onNotAuthenticated = function(activities, params, callback) {
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

Bouncer.prototype.onNotAuthenticated = function(name) {
	var fn = utils.getPath(name, this.activities);
	if(!fn) throw new Error('Activity `' + name + '`not found.');
	return fn;
};

Bouncer.prototype.onNotAuthenticated = function(name) {
	var fn = utils.getPath(name, this.assertions);
	if(!fn) throw new Error('Assertion `' + name + '`not found.');
	return fn;
};

Bouncer.prototype.onNotAuthenticated = function(assertions, callback) {
	var method = _.first(assertions),
		methodFn = this.getAssertion(method),
		args = _.rest(assertions);

	return methodFn.apply(this, args.concat(callback));
};

module.exports = Bouncer;