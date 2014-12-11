var Bouncer = require('../');
var test = require('tape');

test('passed options extend the instance', function (t) {

	var bouncer = new Bouncer({
		activities: {foo: 'bar'},
		assertions: {baz: 'foo'}
	});
	
	t.ok(bouncer.activities.foo == 'bar');
	t.ok(bouncer.assertions.baz == 'foo');
	t.end();
});


test('mixin operators', function (t) {
	var bouncer = new Bouncer({
		assertions: {baz: 'foo'}
	});

	t.ok(!!bouncer.assertions.AND);
	t.ok(!!bouncer.assertions.OR);
 	t.end();
});