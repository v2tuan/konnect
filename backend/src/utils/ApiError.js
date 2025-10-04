class ApiError extends Error {
  constructor(statusCode, message) {
    super(message)
    this.name = 'ApiError'          // để log gọn
    this.statusCode = statusCode    // chuẩn của bạn
    this.isOperational = true
    Error.captureStackTrace(this, this.constructor)
  }
}
export default ApiError