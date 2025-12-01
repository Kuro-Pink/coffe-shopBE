export class ApiResponse {
  static success(data: any, message = 'Success', statusCode = 200) {
    return {
      success: true,
      message,
      data,
      statusCode,
    };
  }

  static error(message: string, statusCode = 500, errors: any = null) {
    return {
      success: false,
      message,
      statusCode,
      errors,
    };
  }
}