import {
  isStrongPassword,
  PASSWORD_MIN_LENGTH,
  PASSWORD_MAX_LENGTH,
} from '@helpdesk/shared';
import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

/**
 * Validates password character-class complexity: length between
 * PASSWORD_MIN_LENGTH and PASSWORD_MAX_LENGTH, plus at least one uppercase
 * letter, one lowercase letter, one digit, and one special character.
 * Length is also enforced separately via @Length() for a clearer standalone
 * error message; the redundancy is intentional.
 */
export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isStrongPassword',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string') return true; // let @IsString handle type errors
          return isStrongPassword(value);
        },
        defaultMessage(args: ValidationArguments) {
          return (
            `${args.property} must be ${PASSWORD_MIN_LENGTH}-${PASSWORD_MAX_LENGTH} characters and include ` +
            'at least one uppercase letter, one lowercase letter, one digit, and one special character'
          );
        },
      },
    });
  };
}
