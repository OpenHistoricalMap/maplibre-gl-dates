import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { featureFilter } from '@maplibre/maplibre-gl-style-spec';

import {
  dateFromISODate,
  decimalYearFromDate,
  constrainLegacyFilterByDate,
  constrainExpressionFilterByDate,
  isLegacyFilter,
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

describe('isLegacyFilter', () => {
  it('should reject expression primitives', () => {
    assert.ok(!isLegacyFilter(true));
    assert.ok(!isLegacyFilter(false));
    assert.ok(!isLegacyFilter(3.1415));
    assert.ok(!isLegacyFilter(['pi']));
  });

  it('should accept legacy-only operators', () => {
    assert.ok(isLegacyFilter(['!has', 'end_date']));
    assert.ok(isLegacyFilter(['!in', 'class', 'primary', 'secondary', 'tertiary']));
    assert.ok(isLegacyFilter(['none', ['has', 'start_date'], ['has', 'end_date']]));
  });

  it('should reject expression-only operators', () => {
    assert.ok(!isLegacyFilter(['coalesce', false, true]));
    const variable = 'maplibre_gl_dates__decimalYear';
    assert.ok(!isLegacyFilter(['let', variable, 2013, ['var', variable]]));
  });

  it('should accept special keys', () => {
    assert.ok(isLegacyFilter(['has', '$id']));
    assert.ok(isLegacyFilter(['has', '$type']));
    assert.ok(isLegacyFilter(['in', '$id', 0, 1, 2, 3]));
    assert.ok(isLegacyFilter(['in', '$type', 'Point', 'LineString']));
  });

  it('should reject non-key first arguments', () => {
    assert.ok(!isLegacyFilter(['==', ['get', 'name'], 'North']));
    assert.ok(!isLegacyFilter(['in', ['get', 'name'], 'North South East West']));
  });

  it('should accept inlined `in` values', () => {
    assert.ok(isLegacyFilter(['in', 'class', 'primary', 'secondary', 'tertiary']));
    assert.ok(isLegacyFilter(['in', 'class', 'primary']));
    assert.ok(!isLegacyFilter(['in', 'class', ['primary']]));
  });

  it('should accept string-string comparisons', () => {
    assert.ok(isLegacyFilter(['==', 'name', 'North']));
    assert.ok(isLegacyFilter(['in', 'name', 'North']));
  });

  it('should accept legacy combining filters', () => {
    assert.ok(!isLegacyFilter(['any', true, false]));
    assert.ok(!isLegacyFilter(['all', true, false]));
    assert.ok(!isLegacyFilter(['any', ['has', 'start_date'], ['has', 'end_date']]));
    assert.ok(!isLegacyFilter(['all', ['has', 'start_date'], ['has', 'end_date']]));
    assert.ok(isLegacyFilter(['any', ['==', '$type', 'Polygon'], ['has', 'end_date']]));
    assert.ok(isLegacyFilter(['all', ['==', '$type', 'Polygon'], ['has', 'end_date']]));
  });
});

describe('constrainLegacyFilterByDate', () => {
  it('should upgrade top-level non-combining filter', () => {
    let original = ['in', 'class', 'primary', 'secondary', 'tertiary'];
    let upgraded = constrainLegacyFilterByDate(structuredClone(original), 2013);
    assert.equal(upgraded.length, 4);
    assert.equal(upgraded[0], 'all');
    assert.deepEqual(upgraded[3], original);
    assert.match(JSON.stringify(upgraded), /2013/);
  });

  it('should update already upgraded filter', () => {
    let original = ['in', 'class', 'primary', 'secondary', 'tertiary'];
    let upgraded = constrainLegacyFilterByDate(structuredClone(original), 2013);
    let updated = constrainLegacyFilterByDate(structuredClone(upgraded), 2014);
    assert.equal(upgraded.length, updated.length);
    assert.doesNotMatch(JSON.stringify(updated), /2013/);
    assert.match(JSON.stringify(updated), /2014/);
  });

  it('should include features matching the selected date', () => {
    let decimalYear = 2013.5;
    let upgraded = constrainLegacyFilterByDate(['has', 'building'], decimalYear);

    let includesFeature = (start, end) => {
      let properties = { building: 'yes' };
      if (typeof start !== 'undefined') {
        properties.start_decdate = start;
      }
      if (typeof end !== 'undefined') {
        properties.end_decdate = end;
      }
      return featureFilter(upgraded).filter(undefined, { properties: properties });
    };

    let dayDelta = 1/365;
    assert.ok(includesFeature(undefined, undefined));
    assert.ok(!includesFeature(undefined, decimalYear - dayDelta))
    assert.ok(includesFeature(decimalYear - dayDelta, undefined))
    assert.ok(includesFeature(undefined, decimalYear + dayDelta))
    assert.ok(!includesFeature(decimalYear + dayDelta, undefined))
  });
});

describe('constrainExpressionFilterByDate', () => {
  it('should upgrade non-variable-binding filter', () => {
    let original = ['match', ['get', 'class'], ['primary', 'secondary', 'tertiary'], true, false];
    let upgraded = constrainExpressionFilterByDate(structuredClone(original), 2013);
    assert.equal(upgraded.length, 4);
    assert.equal(upgraded[0], 'let');
    let variable = 'maplibre_gl_dates__decimalYear';
    assert.equal(upgraded[1], variable);
    assert.equal(upgraded[2], 2013);
    assert.equal(upgraded[3].length, 4);
    assert.equal(upgraded[3][0], 'all');
    assert.match(JSON.stringify(upgraded[3][1]), new RegExp(variable));
    assert.match(JSON.stringify(upgraded[3][2]), new RegExp(variable));
    assert.deepEqual(upgraded[3][3], original);
  });

  it('should update variable-binding filter', () => {
    let original = ['let', 'language', 'sux', ['get', ['+', 'name', ['var', 'language']]]];
    let updated = constrainExpressionFilterByDate(structuredClone(original), 2014);
    assert.equal(original.length + 2, updated.length);
    assert.equal(updated[0], 'let');
    assert.equal(original[1], updated[1]);
    assert.equal(original[2], updated[2]);
    assert.equal(updated[3], 'maplibre_gl_dates__decimalYear');
    assert.equal(updated[4], 2014);
    assert.deepEqual(original[3], updated[5]);
  });

  it('should update already upgraded filter', () => {
    let original = ['match', ['get', 'class'], ['primary', 'secondary', 'tertiary'], true, false];
    let upgraded = constrainExpressionFilterByDate(structuredClone(original), 2013);
    let updated = constrainExpressionFilterByDate(structuredClone(upgraded), 2014);
    assert.equal(upgraded.length, updated.length);
    assert.equal(updated[0], 'let');
    assert.equal(upgraded[1], updated[1]);
    assert.equal(updated[2], 2014);
    assert.deepEqual(upgraded[3], updated[3]);
  });

  it('should include features matching the selected date', () => {
    let decimalYear = 2013.5;
    let upgraded = constrainExpressionFilterByDate(['has', 'building'], decimalYear);

    let includesFeature = (start, end) => {
      let properties = { building: 'yes' };
      if (typeof start !== 'undefined') {
        properties.start_decdate = start;
      }
      if (typeof end !== 'undefined') {
        properties.end_decdate = end;
      }
      return featureFilter(upgraded).filter(undefined, { properties: properties });
    };

    let dayDelta = 1/365;
    assert.ok(includesFeature(undefined, undefined));
    assert.ok(!includesFeature(undefined, decimalYear - dayDelta))
    assert.ok(includesFeature(decimalYear - dayDelta, undefined))
    assert.ok(includesFeature(undefined, decimalYear + dayDelta))
    assert.ok(!includesFeature(decimalYear + dayDelta, undefined))
  });
});
