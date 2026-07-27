import { containsEmoji } from '@helpdesk/shared';
import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

/**
 * Rejects strings containing emoji. Applies to any field where emoji would be
 * nonsensical or a storage/rendering risk: names, passwords, email local parts.
 */
export function NoEmoji(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'noEmoji',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          if (typeof value !== 'string') return true; // let @IsString handle type errors
          return !containsEmoji(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must not contain emoji`;
        },
      },
    });
  };
}
