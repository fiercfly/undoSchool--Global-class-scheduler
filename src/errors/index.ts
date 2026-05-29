import { AppError } from "./AppError";

export { AppError };

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 409, details);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, details);
  }
}

export class CapacityExceededError extends AppError {
  constructor(message: string) {
    super(message, 422);
  }
}
