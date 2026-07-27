import { isValidName } from '@helpdesk/shared';
import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

/**
 * Validates that a string is a plausible human name: Unicode letters (any
 * language/script) plus spaces, hyphens, and apostrophes, no emoji, no digits,
 * no repeated separators. Use alongside @Length() for size bounds.
 */
export function IsValidName(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isValidName',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string') return true; // let @IsString handle type errors
          return isValidName(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must contain only letters, spaces, hyphens, and apostrophes`;
        },
      },
    });
  };
}
