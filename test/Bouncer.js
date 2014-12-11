var Bouncer = require('../');
var test = require('tape');
var NotAuthenticatedError  = require('../src/errors/NotAuthenticatedError');

var activities = {
	foo: {
		pass: function(params) {
			return ['ok', params.ok];
		}
	},
	nested: {
		success: function(params) {
			return ['OR', 
				['ok', false],
				['AND',
					['ok', true],
					['ok', true],
					['OR', 
						['ok', false],
						['ok', true]
					],
				]
			];
		},
		fail: function(params) {
			return ['OR', 
				['ok', false],
				['AND',
					['ok', true],
					['ok', true],
					['OR', 
						['ok', false],
						['ok', false]
					],
				]
			];
		}
	}
};

var notOkError = new Error('Not ok');

var assertions = {
	ok: function(ok, callback) {
		if(!ok) return callback(notOkError);
		callback();
	}
};

test('Bouncer() passed options extend the instance', function (t) {
	var b = new Bouncer({
		activities: {foo: 'bar'},
		assertions: {baz: 'foo'}
	});
	t.ok(b.activities.foo == 'bar', 'should mixin');
	t.ok(b.assertions.baz == 'foo', 'should mixin');
	t.end();
});


test('Bouncer() mixin operators', function (t) {
	var b = new Bouncer({assertions: {baz: 'foo'}});
	t.ok(!!b.assertions.AND, 'should mixin AND operator');
	t.ok(!!b.assertions.OR, 'should mixin OR operator');
 	t.end();
});

test('Bouncer#getActivity()', function(t){
	var b = new Bouncer({activities: {foo: {bar: 'baz'}}});
	t.ok(b.getActivity('foo:bar') == 'baz', 'should return the activity');
	t.end();
});

test('Bouncer#getActivity() not found', function(t){
	var b = new Bouncer();
	var fn = function() { b.getActivity('foo:bar'); };
	t.throws(fn, 'should throw error');
	t.end();
});

test('Bouncer#getAssertion()', function(t){
	var b = new Bouncer({assertions: {foo: {bar: 'baz'}}});
	t.ok(b.getAssertion('foo:bar') == 'baz', 'should return the assertion');
	t.end();
});

test('Bouncer#getAssertion() not found', function(t){
	var b = new Bouncer();
	var fn = function() { b.getAssertion('foo:bar'); };
	t.throws(fn, 'should throw error');
	t.end();
});

test('Bouncer#_canPerformActivity() authentication', function(t){
	var b = new Bouncer();
	var params = {};
	b._canPerformActivity(null, params, function(err) {
		t.ok(err instanceof NotAuthenticatedError, 
			'should pass `NotAuthenticatedError` if params.user is undefined');
		t.end();
	});
});

test('Bouncer#_canPerformActivity() no activity', function(t){
	var b = new Bouncer();
	var params = { user: true };
	var invokedAssert = false;
	b.assert = function() { invokedAssert = true; };
	b._canPerformActivity(null, params, function(err) {
		t.notOk(err instanceof Error, 'should not pass error');
		t.notOk(invokedAssert, 'should only ensure that params.user is not undefined');
		t.end();
	});
});

test('Bouncer#_canPerformActivity() params function', function(t){
	var b = new Bouncer();
	var params = function() {
		return { user: true };
	};
	b._canPerformActivity(null, params, function(err) {
		t.notOk(err instanceof Error, 'should invoke params function');
		t.end();
	});
});

test('Bouncer#_canPerformActivity() invoke activity method', function(t){
	var b = new Bouncer({activities: activities, assertions: assertions});
	var assertionsResult;
	b.assert = function(assertions, callback) {
		assertionsResult = assertions;
		callback();
	};
	var params = {user: true, ok: true};
	b._canPerformActivity('foo:pass', params, function(err) {
		t.deepEqual(assertionsResult, ['ok', true], 'should invoke the activity method');
		t.notOk(err instanceof Error, 'should pass');
		t.end();
	});
});

test('Bouncer#_canPerformActivity() invoke activity method arguments', function(t){
	var fooArguments;
	var foo = function(params) {
		fooArguments = Array.prototype.slice.call(arguments, 0);
		return ['ok', params.ok];
	};
	var b = new Bouncer({activities: {foo: foo}, assertions: assertions});
	var params = {user: true, ok: true};
	b._canPerformActivity('foo', params, function(err) {
		t.deepEqual(fooArguments, [params], 'should invoke the activity method with the passed params');
		t.notOk(err instanceof Error, 'should pass');
		t.end();
	});
});

test('Bouncer#_canPerformActivity() nested success', function(t){
	var b = new Bouncer({activities: activities, assertions: assertions});
	var assertCounter = 0;
	b.assert = function() {
		assertCounter++;
		Bouncer.prototype.assert.apply(b, arguments);
	};
	b._canPerformActivity('nested:success', {user: true}, function(err) {
		t.ok(assertCounter === 8, 'should succeed after 8 assertions');
		t.notOk(err instanceof Error, 'should succeed');
		t.end();
	});
});

test('Bouncer#_canPerformActivity() nested fail', function(t){
	var b = new Bouncer({activities: activities, assertions: assertions});
	var assertCounter = 0;
	b.assert = function() {
		assertCounter++;
		Bouncer.prototype.assert.apply(b, arguments);
	};
	b._canPerformActivity('nested:fail', {user: true}, function(err) {
		t.ok(assertCounter === 8, 'should fail after 8 assertions');
		t.ok(err instanceof Error, 'should pass error');
		t.end();
	});
});

test('Bouncer#canPerformActivity() authorized', function(t) {
	var b = new Bouncer({activities: activities, assertions: assertions});
	var params = {user: true, ok: true};
	b.canPerformActivity('foo:pass', params, function(isAuthorized) {
		t.ok(isAuthorized === true, '`isAuthorized` should be true');
		t.end();
	});
});

test('Bouncer#canPerformActivity() not authorized', function(t) {
	var b = new Bouncer({activities: activities, assertions: assertions});
	var params = {user: true, ok: false};
	b.canPerformActivity('foo:pass', params, function(isAuthorized) {
		t.notOk(isAuthorized === true, '`isAuthorized` should be false');
		t.end();
	});
});

test('Bouncer#permittedActivities()', function(t) {
	var b = new Bouncer({activities: activities, assertions: assertions});
	var params = {user: true, ok: true};
	b.permittedActivities([
		'foo:pass',
		'nested:success',
		'nested:fail'
	], params, function(err, permittedActivities) {
		t.deepEqual(permittedActivities, ['foo:pass', 'nested:success'], 'should pass a list of permitted activities');
		t.end();
	});
});

test('Bouncer#activity() middleware no onNotAuthenticated callback', function(t) {
	var b = new Bouncer({activities: activities, assertions: assertions});
	var middleware = b.activity();

	var fn = function() {
		middleware('req', 'res', function(){});
	};

	t.throws(fn, 
		'You need to implement an own `onNotAuthenticated` method', 
		'should throw an error if no onNotAuthenticated method implemented'
	);
	t.end();
});

test('Bouncer#activity() middleware no onNotAuthorized callback', function(t) {
	var b = new Bouncer({activities: activities, assertions: assertions});
	var params = function() {return {user: true, ok: false};};
	var middleware = b.activity('foo:pass', params);

	var fn = function() { 
		middleware('req', 'res', function(){});
	};
	
	t.throws(fn, 
		'You need to implement an own `onNotAuthorized` method', 
		'should throw an error if no onNotAuthenticated method implemented'
	);
	t.end();
});

test('Bouncer#activity() middleware not authenticated', function(t) {
	var invokedOnNotAuthenticated = false;
	var onNotAuthenticatedArguments;
	var invokedNext = false;
	var next = function(){
		invokedNext = true;
	};
	var b = new Bouncer({
		activities: activities, 
		assertions: assertions,
		onNotAuthenticated: function() {
			onNotAuthenticatedArguments = Array.prototype.slice.call(arguments, 0);
			invokedOnNotAuthenticated = true;
		}
	});
	var middleware = b.activity();
	middleware('req', 'res', next);
	t.notOk(invokedNext, 'should not call next middleware');
	t.ok(invokedOnNotAuthenticated, 'should invoke `onNotAuthenticated` method');
	t.deepEqual(onNotAuthenticatedArguments, ['req', 'res', next], 'should invoke `onNotAuthenticated` method with middleware arguments');
	t.end();
});

test('Bouncer#activity() middleware authorized', function(t) {
	var b = new Bouncer({activities: activities, assertions: assertions});
	var invokedNext = false;
	var params = function() {return {user: true, ok: true};};
	var middleware = b.activity('foo:pass', params);
	middleware('req', 'res', function(){ invokedNext = true;});
	t.ok(invokedNext, 'should `next` callback');
	t.end();
});

test('Bouncer#activity() middleware not authorized', function(t) {
	var invokedOnNotAuthorized = false;
	var onNotAuthenticatedArguments;
	var invokedNext = false;
	var next = function(){
		invokedNext = true;
	};
	var b = new Bouncer({
		activities: activities, 
		assertions: assertions,
		onNotAuthorized: function() {
			onNotAuthenticatedArguments = Array.prototype.slice.call(arguments, 0);
			invokedOnNotAuthorized = true;
		}
	});
	var params = function() {return {user: true, ok: false};};
	var middleware = b.activity('foo:pass', params);
	middleware('req', 'res', next);
	t.notOk(invokedNext, 'should not call next middleware');
	t.ok(invokedOnNotAuthorized, 'should invoke `onNotAuthorized` method');
	t.deepEqual(onNotAuthenticatedArguments, [notOkError, 'req', 'res', next], 
		'should invoke `onNotAuthorized` method with error and middleware arguments');
	t.end();
});

test('Bouncer#assert()', function(t) {
	var okArguments;
	var assertions = {
		ok: function(one, two, three, callback) {
			okArguments = [one, two, three];
			callback();
		}
	};
	var b = new Bouncer({assertions: assertions});

	b.assert(['ok', 1, 2, 3], function(err){
		t.deepEqual(okArguments, [1, 2, 3], 'should invoke assertion with arguments');
		t.notOk(err instanceof Error, 'should succeed');
		t.end();
	});
});
