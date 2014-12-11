var someSeries = require('../src/utils').someSeries;
var test = require('tape');

test('someSeries() continue loop until the first iterator passes', function (t) {
    var counter = 0;
    var itr = function(x, callback) {
        counter++;
        callback(x < 2 ? new Error() : null);
    };
    
    someSeries([1, 2, 3], itr, function(err) {
        t.ok(counter === 2, 'should break loop when the first iterator passes');
        t.notOk(err instanceof Error, 'should not pass an error');
        t.end();
    });
});

test('someSeries() no iterator passses', function(t) {
    var counter = 0;
    var itr = function(x, callback) {
        counter++;
        callback(new Error(counter));
    };

    someSeries([1, 2, 3], itr, function(err) {
        t.ok(counter === 3, 'should iterate until the end');
        t.ok(err instanceof Error, 'should pass an error');
        t.ok(err.message == 3, 'should pass the last error');
        t.end();
    });
});

test('someSeries() empty array', function (t) {
    someSeries([], function(x, callback){
        t.ok(false, 'iterator should not be called');
        callback();
    }, function(err){
        t.ok(err instanceof Error, 'should pass error');
    });

    setTimeout(t.end, 25);
});