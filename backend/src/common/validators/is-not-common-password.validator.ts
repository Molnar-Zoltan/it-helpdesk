import { isCommonPassword } from '@helpdesk/shared';
import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

/**
 * Rejects passwords that exactly match (case-insensitively) one of the top
 * 1000 most common leaked passwords. Synchronous, no network dependency —
 * always available. This is a hard block, run before the async HIBP check
 * in the service layer, which is a soft warning instead.
 */
export function IsNotCommonPassword(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isNotCommonPassword',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string') return true;
          return !isCommonPassword(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} is one of the most common leaked passwords — please choose a different one`;
        },
      },
    });
  };
}
