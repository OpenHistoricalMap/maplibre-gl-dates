import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  dateFromISODate,
  decimalYearFromDate,
  constrainFilterByDate,
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

describe('constrainFilterByDate', () => {
  it('should upgrade top-level non-combining filter', () => {
    let original = ['in', 'class', 'primary', 'secondary', 'tertiary'];
    let upgraded = constrainFilterByDate(original, 2013);
    assert.equal(upgraded.length, 4);
    assert.equal(upgraded[0], 'all');
    assert.deepEqual(upgraded[3], original);
    assert.match(JSON.stringify(upgraded), /2013/);
  });

  it('should update already upgraded filter', () => {
    let original = ['in', 'class', 'primary', 'secondary', 'tertiary'];
    let upgraded = constrainFilterByDate(original, 2013);
    let updated = constrainFilterByDate(upgraded, 2014);
    assert.equal(upgraded.length, updated.length);
    assert.doesNotMatch(JSON.stringify(updated), /2013/);
    assert.match(JSON.stringify(updated), /2014/);
  });
});
