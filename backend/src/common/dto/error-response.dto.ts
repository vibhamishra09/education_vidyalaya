export class ErrorResponseDto {
  code: string;
  message: string;
  details?: any;
  field?: string;
  timestamp: string;

  constructor(code: string, message: string, details?: any, field?: string) {
    this.code = code;
    this.message = message;
    this.details = details;
    this.field = field;
    this.timestamp = new Date().toISOString();
  }
}
