var getPath = require('../src/utils').getPath;
var test = require('tape');

test('getPath()', function (t) {
    var obj = {
        foo: 'bar',
        baz: {
            fux: 'faz'
        }
    };
    
    t.ok(getPath('foo', obj) == 'bar');
    t.deepEqual(getPath('baz', obj), {fux: 'faz'});
    t.ok(getPath('baz:fux', obj) == 'faz');
    t.end();
});