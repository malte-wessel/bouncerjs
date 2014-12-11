function index(obj, i) {
	return obj[i];
}

function getPath(path, obj) {
	return path.split(':').reduce(index, obj);
}

function andSeries(arr, iterator, callback) {
	callback = callback || function () {};
	if (!arr.length) {
		return callback(new Error('No array to iterate over'));
	}
	var completed = 0;
	var iterate = function () {
		iterator(arr[completed], function (err) {
			if (err) {
				callback(err);
				callback = function () {};
			}
			else {
				completed += 1;
				if (completed >= arr.length) {
					callback();
				}
				else {
					iterate();
				}
			}
		});
	};
	iterate();
}

function someSeries(arr, iterator, callback) {
	var error;
	callback = callback || function () {};
	if (!arr.length) {
		return callback(new Error('No array to iterate over'));
	}
	var completed = 0;
	var iterate = function () {
		iterator(arr[completed], function (err) {
			if (!err) {
				callback();
				callback = function () {};
			} else {
				error = err;
				completed += 1;
				if (completed >= arr.length) {
					callback(error);
				} else {
					iterate();
				}
			}
		});
	};
	iterate();
}

module.exports = {
	index: index,
	getPath: getPath,
	andSeries: andSeries,
	someSeries: someSeries
};