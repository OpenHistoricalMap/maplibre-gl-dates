import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  dateFromISODate,
  decimalYearFromDate,
} from './index.js';

describe('dateFromISODate', () => {
  it('should convert date strings to Date objects', () => {
    assert.equal(+dateFromISODate('2013-01-01'), +new Date('2013-01-01'));
    assert.equal(+dateFromISODate('2013-04-14'), +new Date('2013-04-14'));
    assert.equal(+dateFromISODate('2013-12-31'), +new Date('2013-12-31'));
  });

  it('should support BCE dates', () => {
    assert.equal(+dateFromISODate('0001-01-01'), +new Date('0001-01-01'));
    assert.equal(+dateFromISODate('0000-01-01'), +new Date('0000-01-01'));
    assert.equal(+dateFromISODate('-0000-01-01'), +new Date('0000-01-01'));
    assert.equal(+dateFromISODate('-0001-01-01'), +new Date('-000001-01-01'));
    assert.equal(+dateFromISODate('-9999-01-01'), +new Date('-009999-01-01'));
  });
});

describe('decimalYearFromDate', () => {
  it('should convert date objects to decimal years', () => {
    assert.equal(decimalYearFromDate(new Date('2013-01-01')), 2013);
    assert.equal(+decimalYearFromDate(new Date('2013-04-14')).toFixed(5), 2013.28219);
    assert.equal(+decimalYearFromDate(new Date('2013-12-31')).toFixed(5), 2013.99726);
  });

  it('should support BCE dates', () => {
    assert.equal(decimalYearFromDate(new Date('0001-01-01')), 1);
    assert.equal(decimalYearFromDate(new Date('0000-01-01')), 0);
    assert.equal(decimalYearFromDate(new Date('-000001-01-01')), -1);
    assert.equal(decimalYearFromDate(new Date('-009999-01-01')), -9999);
  });
});
