import { test } from 'node:test';
import assert from 'node:assert';
import { getGenderedTitle } from './utils.ts';

test('getGenderedTitle', async (t) => {
  await t.test('returns empty string for empty title', () => {
    assert.strictEqual(getGenderedTitle('', 'male'), '');
    assert.strictEqual(getGenderedTitle('', 'female'), '');
  });

  await t.test('returns original title when gender is undefined, null or other', () => {
    assert.strictEqual(getGenderedTitle('Operator', undefined), 'Operator');
    // @ts-ignore
    assert.strictEqual(getGenderedTitle('Operator', null), 'Operator');
    assert.strictEqual(getGenderedTitle('Operator', 'other'), 'Operator');
  });

  await t.test('handles "Male / Female" pattern', () => {
    assert.strictEqual(getGenderedTitle('Sprzedawca / Sprzedawczyni', 'male'), 'Sprzedawca');
    assert.strictEqual(getGenderedTitle('Sprzedawca / Sprzedawczyni', 'female'), 'Sprzedawczyni');
  });

  await t.test('handles "Male/Female" pattern (no spaces)', () => {
    assert.strictEqual(getGenderedTitle('Sprzedawca/Sprzedawczyni', 'male'), 'Sprzedawca');
    assert.strictEqual(getGenderedTitle('Sprzedawca/Sprzedawczyni', 'female'), 'Sprzedawczyni');
  });

  await t.test('handles "Male\\Female" pattern', () => {
    assert.strictEqual(getGenderedTitle('Sprzedawca\\Sprzedawczyni', 'male'), 'Sprzedawca');
    assert.strictEqual(getGenderedTitle('Sprzedawca\\Sprzedawczyni', 'female'), 'Sprzedawczyni');
  });

  await t.test('handles Polish gender markers (k/m)', () => {
    assert.strictEqual(getGenderedTitle('Magazynier (k/m)', 'male'), 'Magazynier');
    assert.strictEqual(getGenderedTitle('Magazynier (k/m)', 'female'), 'Magazynier');
    assert.strictEqual(getGenderedTitle('Kierowca (m/k)', 'male'), 'Kierowca');
  });

  await t.test('handles case-insensitive Polish gender markers', () => {
    assert.strictEqual(getGenderedTitle('Magazynier (K/M)', 'male'), 'Magazynier');
    assert.strictEqual(getGenderedTitle('Magazynier (M/K)', 'female'), 'Magazynier');
  });

  await t.test('returns original title when no pattern is matched', () => {
    assert.strictEqual(getGenderedTitle('Programmer', 'male'), 'Programmer');
    assert.strictEqual(getGenderedTitle('Programmer', 'female'), 'Programmer');
  });

  await t.test('handles titles with more than one slash by returning original', () => {
    assert.strictEqual(getGenderedTitle('Junior / Middle / Senior', 'male'), 'Junior / Middle / Senior');
  });
});
