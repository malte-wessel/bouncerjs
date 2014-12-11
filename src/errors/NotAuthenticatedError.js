function NotAuthenticatedError(message) {
    this.name = 'NotAuthenticatedError';
    Error.captureStackTrace(this);
}

NotAuthenticatedError.prototype = Object.create(Error.prototype);

module.exports = NotAuthenticatedError;