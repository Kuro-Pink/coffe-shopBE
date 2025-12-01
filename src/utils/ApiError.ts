export class ApiError extends Error {
  statusCode: number;
  isOperational: boolean;
  errors?: any;

  constructor(
    statusCode: number, 
    message: string, 
    errorsOrOperational?: any[] | boolean
  ) {
    super(message);
    this.statusCode = statusCode;
    
    if (Array.isArray(errorsOrOperational)) {
      this.errors = errorsOrOperational;
      this.isOperational = true;
    } else {
      this.isOperational = errorsOrOperational ?? true;
    }
    
    Error.captureStackTrace(this, this.constructor);
  }
}