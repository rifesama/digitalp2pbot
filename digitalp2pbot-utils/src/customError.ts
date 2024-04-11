class CustomError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
class ValueGreaterThanZeroError extends CustomError {
  constructor(valueName: string) {
    super(`${valueName} must be greater than zero.`);
  }
}

class ValueNotNullOrUndefinedError extends CustomError {
  constructor(valueName: string) {
    super(`${valueName} must not be null or undefined.`);
  }
}

class StringLengthError extends CustomError {
  constructor(valueName: string, minLength: number, maxLength: number) {
    super(`${valueName} must be between ${minLength} and ${maxLength} characters long.`);
  }
}

class ArrayNotEmptyError extends CustomError {
  constructor(arrayName: string) {
    super(`${arrayName} must not be empty.`);
  }
}

class InvalidEmailError extends CustomError {
  constructor(email: string) {
    super(`${email} is not a valid email address.`);
  }
}

class NumberRangeError extends CustomError {
  constructor(valueName: string, min: number, max: number) {
    super(`${valueName} must be between ${min} and ${max}.`);
  }
}
class InvalidQueryParamsError extends CustomError {
  constructor(key: string) {
    super(`${key} must not empty`);
  }
}
class InvalidSchema extends CustomError {}
class ValidationError extends CustomError {}
class DatabaseError extends CustomError {}
class ResourceNotFoundError extends CustomError {}
export {
  InvalidSchema,
  ValidationError,
  ValueGreaterThanZeroError,
  ValueNotNullOrUndefinedError,
  StringLengthError,
  ArrayNotEmptyError,
  InvalidEmailError,
  DatabaseError,
  NumberRangeError,
  ResourceNotFoundError,
  InvalidQueryParamsError,
};
