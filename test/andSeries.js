var andSeries = require('../src/utils').andSeries;
var test = require('tape');

function eachIterator(args, x, callback) {
    setTimeout(function(){
        args.push(x);
        callback();
    }, x * 25);
}

test('andSeries()', function (t) {
    var args = [];
    andSeries([1, 3, 2], eachIterator.bind(this, args), function(err) {
        t.deepEqual(args, [1, 3, 2]);
        t.end();
    });
});

test('andSeries() empty array', function (t) {
    andSeries([], function(x, callback){
        t.ok(false, 'iterator should not be called');
        callback();
    }, function(err){
        t.ok(err instanceof Error, 'should pass error');
    });
    setTimeout(t.end, 25);
});

test('andSeries() break series on error', function (t) {
    var counter = 0;
    var itr = function(x, callback) {
        counter++;
        callback(new Error());
    };
    andSeries([1, 2], itr, function(err) {
        t.ok(counter === 1, 'should break series');
        t.ok(err instanceof Error, 'should pass error');
        t.end();
    });
});