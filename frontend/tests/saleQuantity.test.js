import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSaleQuantity, isValidSaleItem } from '../src/utils/saleQuantity.js';

test('manual quantities exceed the old four-character input limit', () => {
  for (const quantity of [1001, 9999, 10000, 100000, 1000000]) {
    assert.equal(parseSaleQuantity(String(quantity)), quantity);
    assert.equal(isValidSaleItem({ quantity, unitPrice: 3500 }), true);
  }
  assert.equal(parseSaleQuantity('10 000'), 10000);
  assert.equal(parseSaleQuantity('10\u202f000'), 10000);
});

test('a draft can be cleared and replaced without becoming a valid sale', () => {
  assert.equal(parseSaleQuantity('1000'), 1000);
  assert.equal(parseSaleQuantity(''), null);
  assert.equal(isValidSaleItem({ quantity: null, unitPrice: 3500 }), false);
  assert.equal(parseSaleQuantity('25000'), 25000);
  assert.equal(isValidSaleItem({ quantity: 25000, unitPrice: 3500 }), true);
});

test('zero, fractions, negative values and malformed pasted numbers are rejected', () => {
  for (const draft of ['0', '000', '-1', '1.5', '1,5', '1e4', 'abc', 'Infinity']) {
    assert.equal(parseSaleQuantity(draft), null, draft);
  }
  for (const quantity of [0, -1, 1.5, NaN, Infinity]) {
    assert.equal(isValidSaleItem({ quantity, unitPrice: 3500 }), false);
  }
});

test('unsafe quantities and overflowing amounts cannot be submitted', () => {
  assert.equal(parseSaleQuantity('9007199254740992'), null);
  assert.equal(parseSaleQuantity('9007199254740991'), Number.MAX_SAFE_INTEGER);
  assert.equal(isValidSaleItem({ quantity: Number.MAX_SAFE_INTEGER, unitPrice: 3500 }), false);
  assert.equal(isValidSaleItem({ quantity: 10000, unitPrice: Infinity }), false);
  assert.equal(isValidSaleItem({ quantity: 10000, unitPrice: -1 }), false);
  assert.equal(isValidSaleItem({ quantity: 10000, unitPrice: 3500, discount: Infinity }), false);
  assert.equal(isValidSaleItem({ quantity: 10000, unitPrice: 3500, discount: 35000001 }), false);
  assert.equal(isValidSaleItem({ quantity: 10000, unitPrice: 3500, discount: 500 }), true);
});
