"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvalidQueryParamsError = exports.ResourceNotFoundError = exports.NumberRangeError = exports.DatabaseError = exports.InvalidEmailError = exports.ArrayNotEmptyError = exports.StringLengthError = exports.ValueNotNullOrUndefinedError = exports.ValueGreaterThanZeroError = exports.ValidationError = exports.InvalidSchema = void 0;
class CustomError extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}
class ValueGreaterThanZeroError extends CustomError {
    constructor(valueName) {
        super(`${valueName} must be greater than zero.`);
    }
}
exports.ValueGreaterThanZeroError = ValueGreaterThanZeroError;
class ValueNotNullOrUndefinedError extends CustomError {
    constructor(valueName) {
        super(`${valueName} must not be null or undefined.`);
    }
}
exports.ValueNotNullOrUndefinedError = ValueNotNullOrUndefinedError;
class StringLengthError extends CustomError {
    constructor(valueName, minLength, maxLength) {
        super(`${valueName} must be between ${minLength} and ${maxLength} characters long.`);
    }
}
exports.StringLengthError = StringLengthError;
class ArrayNotEmptyError extends CustomError {
    constructor(arrayName) {
        super(`${arrayName} must not be empty.`);
    }
}
exports.ArrayNotEmptyError = ArrayNotEmptyError;
class InvalidEmailError extends CustomError {
    constructor(email) {
        super(`${email} is not a valid email address.`);
    }
}
exports.InvalidEmailError = InvalidEmailError;
class NumberRangeError extends CustomError {
    constructor(valueName, min, max) {
        super(`${valueName} must be between ${min} and ${max}.`);
    }
}
exports.NumberRangeError = NumberRangeError;
class InvalidQueryParamsError extends CustomError {
    constructor(key) {
        super(`${key} must not empty`);
    }
}
exports.InvalidQueryParamsError = InvalidQueryParamsError;
class InvalidSchema extends CustomError {
}
exports.InvalidSchema = InvalidSchema;
class ValidationError extends CustomError {
}
exports.ValidationError = ValidationError;
class DatabaseError extends CustomError {
}
exports.DatabaseError = DatabaseError;
class ResourceNotFoundError extends CustomError {
}
exports.ResourceNotFoundError = ResourceNotFoundError;
