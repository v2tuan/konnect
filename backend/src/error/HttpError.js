export default class HttpError extends Error {
    constructor(status, message, meta) {
        super(message);
        this.name = 'HttpError';
        this.status = status || 500;
        if (meta) this.meta = meta;
        Error.captureStackTrace?.(this, HttpError);
    }
}