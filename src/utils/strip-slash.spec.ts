jest.mock('../environment.ts', () => ({
  IS_DEV: true,
  IS_PROD: false,
}));

import { stripEndingSlash, stripSlash, stripStarterSlash } from './strip-slash';

describe(`StripSlash`, () => {
  it(`порезаны слеши`, () => {
    const actual = stripSlash('/hello/');
    const expected = 'hello';
    expect(actual).toBe(expected);
  });

  it(`порезан слеш в начале когда он там был, остальное без изменений`, () => {
    const actual = stripSlash('/hello');
    const expected = 'hello';
    expect(actual).toBe(expected);
  });

  it(`порезан слеш в конце когда он там был, остальное без изменений`, () => {
    const actual = stripSlash('hello/');
    const expected = 'hello';
    expect(actual).toBe(expected);
  });

  it(`строка без слешей без изменений`, () => {
    const actual = stripSlash('hello');
    const expected = 'hello';
    expect(actual).toBe(expected);
  });

  it(`порезан слеш в начале если есть`, () => {
    const actual = stripStarterSlash('/hello/');
    const expected = 'hello/';
    expect(actual).toBe(expected);
  });

  it(`без изменений starterSlash`, () => {
    const actual = stripStarterSlash('hello/');
    const expected = 'hello/';
    expect(actual).toBe(expected);
  });

  it(`порезан слеш в конце если есть`, () => {
    const actual = stripEndingSlash('/hello/');
    const expected = '/hello';
    expect(actual).toBe(expected);
  });

  it(`без изменений endingSlash`, () => {
    const actual = stripEndingSlash('/hello');
    const expected = '/hello';
    expect(actual).toBe(expected);
  });

  it('Пограничный случай stripSlash - строка пустая', () => {
    const actual = stripSlash('');
    const expected = '';
    expect(actual).toBe(expected);
  });

  it('Пограничный случай stripStarterSlash - строка пустая', () => {
    const actual = stripStarterSlash('');
    const expected = '';
    expect(actual).toBe(expected);
  });

  it('Пограничный случай stripEndingSlash - строка пустая', () => {
    const actual = stripEndingSlash('');
    const expected = '';
    expect(actual).toBe(expected);
  });

  it('Пограничный случай stripSlash - строка из одного слеша', () => {
    const actual = stripSlash('/');
    const expected = '';
    expect(actual).toBe(expected);
  });

  it('Пограничный случай stripStarterSlash - строка из однго слеша', () => {
    const actual = stripStarterSlash('/');
    const expected = '';
    expect(actual).toBe(expected);
  });

  it('Пограничный случай stripEndingSlash - строка из одного слеша', () => {
    const actual = stripEndingSlash('/');
    const expected = '';
    expect(actual).toBe(expected);
  });

  it('Пограничный случай stripSlash - строка из двух слеша', () => {
    const actual = stripSlash('//');
    const expected = '';
    expect(actual).toBe(expected);
  });

  it('Пограничный случай stripStarterSlash - строка из двух слеша', () => {
    const actual = stripStarterSlash('//');
    const expected = '/';
    expect(actual).toBe(expected);
  });

  it('Пограничный случай stripEndingSlash - строка из двух слеша', () => {
    const actual = stripEndingSlash('//');
    const expected = '/';
    expect(actual).toBe(expected);
  });

  it('Пограничный случай stripSlash - строка из трех слешей', () => {
    const actual = stripSlash('///');
    const expected = '/';
    expect(actual).toBe(expected);
  });

  it('Пограничный случай stripStarterSlash - строка из трех слешей', () => {
    const actual = stripStarterSlash('///');
    const expected = '//';
    expect(actual).toBe(expected);
  });

  it('Пограничный случай stripEndingSlash - строка из трех слешей', () => {
    const actual = stripEndingSlash('///');
    const expected = '//';
    expect(actual).toBe(expected);
  });
});
