import { envValidationSchema } from './envValidation.js';

const valid = {
  API_PREFIX: 'api',
  DATABASE_URL: 'postgresql://postgres:Adrian147.t@localhost:5432/restaurante',
  JWT_SECRET:
    '65bec98d554066d7e60b5fd2e45c62512bdd737e8f7ffa0ff8193d2a6dee750a8742a4a8a0739df0b9fbdda74c615caa',
  JWT_EXPIRES_IN: '1h',
  CORS_ORIGIN: 'http://localhost:5173',
  RESTAURANT_NAME: 'La Buena Mesa',
  TAX_RATE: '0.13',
};

const validate = (env: Record<string, string>) =>
  envValidationSchema.validate(env, { abortEarly: false, allowUnknown: true });

describe('envValidationSchema', () => {
  it('acepta un .env correcto y aplica defaults', () => {
    const { error, value } = validate(valid);
    expect(error).toBeUndefined();
    expect(value.PORT).toBe(3000);
    expect(value.NODE_ENV).toBe('development');
    expect(value.BCRYPT_SALT_ROUNDS).toBe(10);
  });

  it.each([
    ['sin JWT_SECRET', { JWT_SECRET: undefined }, 'JWT_SECRET'],
    ['PORT=abc', { PORT: 'abc' }, '"PORT" must be a number'],
    ['NODE_ENV=staging', { NODE_ENV: 'staging' }, 'NODE_ENV'],
    ['JWT_SECRET corto', { JWT_SECRET: 'corto' }, 'JWT_SECRET'],
    ['TAX_RATE=13', { TAX_RATE: '13' }, 'TAX_RATE'],
    [
      'DATABASE_URL mysql',
      { DATABASE_URL: 'mysql://u:p@localhost/db' },
      'DATABASE_URL',
    ],
  ])('rechaza %s', (_, override, expected) => {
    const { error } = validate({ ...valid, ...override } as Record<
      string,
      string
    >);
    expect(error?.message).toContain(expected);
  });

  it('muestra todos los errores juntos', () => {
    const { error } = validate({
      ...valid,
      PORT: 'abc',
      NODE_ENV: 'staging',
      TAX_RATE: '13',
    });
    expect(error?.details).toHaveLength(3);
  });
});
