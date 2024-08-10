import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { featureFilter } from '@maplibre/maplibre-gl-style-spec';

import {
  dateRangeFromISODate,
  decimalYearFromDate,
  dateRangeFromDate,
  constrainFilterByDateRange,
  constrainLegacyFilterByDateRange,
  constrainExpressionFilterByDateRange,
  isLegacyFilter,
  updateVariable,
} from './index.js';

describe('dateRangeFromISODate', () => {
  it('should convert date strings to date ranges', () => {
    assert.equal(+dateRangeFromISODate('2013-01-01').startDate, +new Date('2013-01-01'));
    assert.equal(+dateRangeFromISODate('2013-01-01').endDate, +new Date('2013-01-01'));
    assert.equal(+dateRangeFromISODate('2013-04-14').startDate, +new Date('2013-04-14'));
    assert.equal(+dateRangeFromISODate('2013-04-14').endDate, +new Date('2013-04-14'));
    assert.equal(+dateRangeFromISODate('2013-12-31').startDate, +new Date('2013-12-31'));
    assert.equal(+dateRangeFromISODate('2013-12-31').endDate, +new Date('2013-12-31'));
  });

  it('should convert imprecise ISO 8601-1 dates', () => {
    assert.deepEqual(dateRangeFromISODate('2013'), {
      startDate: new Date('2013-01-01'),
      startDecimalYear: 2013,
      startISODate: '2013-01-01',
      endDate: new Date('2014-01-01'),
      endDecimalYear: 2014,
      endISODate: '2014-01-01',
    });

    let monthPrecision = dateRangeFromISODate('2013-04');
    assert.equal(+monthPrecision.startDate, +new Date('2013-04-01'));
    assert.equal(+monthPrecision.startDecimalYear.toFixed(5), 2013.24658);
    assert.equal(+monthPrecision.endDate, +new Date('2013-05-01'));
    assert.equal(+monthPrecision.endDecimalYear.toFixed(5), 2013.32877);

    let dayPrecision = dateRangeFromISODate('2013-04-14');
    assert.equal(+dayPrecision.startDate, +new Date('2013-04-14'));
    assert.equal(+dayPrecision.startDecimalYear.toFixed(5), 2013.28219);
    assert.equal(+dayPrecision.endDate, +new Date('2013-04-14'));
    assert.equal(+dayPrecision.endDecimalYear.toFixed(5), 2013.28219);
  });

  it('should support BCE dates', () => {
    assert.equal(+dateRangeFromISODate('0001-01-01').startDate, +new Date('0001-01-01'));
    assert.equal(+dateRangeFromISODate('0001-01-01').endDate, +new Date('0001-01-01'));
    assert.equal(+dateRangeFromISODate('0000-01-01').startDate, +new Date('0000-01-01'));
    assert.equal(+dateRangeFromISODate('0000-01-01').endDate, +new Date('0000-01-01'));
    assert.equal(+dateRangeFromISODate('-0000-01-01').startDate, +new Date('0000-01-01'));
    assert.equal(+dateRangeFromISODate('-0000-01-01').endDate, +new Date('0000-01-01'));
    assert.equal(+dateRangeFromISODate('-0001-01-01').startDate, +new Date('-000001-01-01'));
    assert.equal(+dateRangeFromISODate('-0001-01-01').endDate, +new Date('-000001-01-01'));
    assert.equal(+dateRangeFromISODate('-9999-01-01').startDate, +new Date('-009999-01-01'));
    assert.equal(+dateRangeFromISODate('-9999-01-01').endDate, +new Date('-009999-01-01'));
  });

  it('should support imprecise BCE dates', () => {
    let yearPrecision = dateRangeFromISODate('-0048');
    assert.equal(+yearPrecision.startDate, +new Date('-000048-01-01T00:00:00Z'));
    assert.equal(+yearPrecision.startDecimalYear.toFixed(5), -49);
    assert.equal(+yearPrecision.endDate, +new Date('-000047-01-01T00:00:00Z'));
    assert.equal(+yearPrecision.endDecimalYear.toFixed(5), -48);

    let monthPrecision = dateRangeFromISODate('-0048-01');
    assert.equal(+monthPrecision.startDate, +new Date('-000048-01-01T00:00:00Z'));
    assert.equal(+monthPrecision.startDecimalYear.toFixed(5), -49);
    assert.equal(+monthPrecision.endDate, +new Date('-000048-02-01T00:00:00Z'));
    assert.equal(+monthPrecision.endDecimalYear.toFixed(5), -48.9153);

    let dayPrecision = dateRangeFromISODate('-0048-01-01');
    assert.equal(+dayPrecision.startDate, +new Date('-000048-01-01T00:00:00Z'));
    assert.equal(+dayPrecision.startDecimalYear.toFixed(5), -49);
    assert.equal(+dayPrecision.endDate, +new Date('-000048-01-01T00:00:00Z'));
    assert.equal(+dayPrecision.endDecimalYear.toFixed(5), -49);
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
    assert.equal(decimalYearFromDate(new Date('-000001-01-01')), -2);
    assert.equal(decimalYearFromDate(new Date('-009999-01-01')), -10000);
  });
});

describe('dateRangeFromDate', () => {
  it('should convert ISO 8601-1 dates to date ranges', () => {
    assert.deepEqual(dateRangeFromDate('2013'), {
      startDate: new Date('2013-01-01'),
      startDecimalYear: 2013,
      startISODate: '2013-01-01',
      endDate: new Date('2014-01-01'),
      endDecimalYear: 2014,
      endISODate: '2014-01-01',
    });
  });

  it('should convert date objects to date ranges', () => {
    assert.deepEqual(dateRangeFromDate(new Date('2013')), {
      startDate: new Date('2013-01-01'),
      startDecimalYear: 2013,
      startISODate: '2013-01-01',
      // Despite an imprecise input string, a Date object is always a point in time.
      endDate: new Date('2013-01-01'),
      endDecimalYear: 2013,
      endISODate: '2013-01-01',
    });
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
    const variable = 'maplibre_gl_dates__startDecimalYear';
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

describe('constrainFilterByDateRange', () => {
  it('should upgrade nonexistent filter to expression-based filter', () => {
    let upgraded = constrainFilterByDateRange(undefined, { startDecimalYear: 2013 });
    assert.equal(upgraded.length, 10);
    assert.equal(upgraded[0], 'let');
  });
});

describe('constrainLegacyFilterByDateRange', () => {
  it('should upgrade top-level non-combining filter', () => {
    let original = ['in', 'class', 'primary', 'secondary', 'tertiary'];
    let upgraded = constrainLegacyFilterByDateRange(structuredClone(original), { startDecimalYear: 2013 });
    assert.equal(upgraded.length, 4);
    assert.equal(upgraded[0], 'all');
    assert.deepEqual(upgraded[3], original);
    assert.match(JSON.stringify(upgraded), /2013/);
  });

  it('should update already upgraded filter', () => {
    let original = ['in', 'class', 'primary', 'secondary', 'tertiary'];
    let upgraded = constrainLegacyFilterByDateRange(structuredClone(original), { startDecimalYear: 2013 });
    let updated = constrainLegacyFilterByDateRange(structuredClone(upgraded), { startDecimalYear: 2014 });
    assert.equal(upgraded.length, updated.length);
    assert.doesNotMatch(JSON.stringify(updated), /2013/);
    assert.match(JSON.stringify(updated), /2014/);
  });

  it('should include features matching the selected date', () => {
    let startDecimalYear = 2013.5;
    let dayDelta = 1/365;
    let dateRange = {
      startDecimalYear,
      startISODate: '2013-07-02',
      endDecimalYear: startDecimalYear + dayDelta,
      endISODate: '2013-07-03',
    };
    let upgraded = constrainLegacyFilterByDateRange(['has', 'building'], dateRange);

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

    assert.ok(includesFeature(undefined, undefined));
    assert.ok(!includesFeature(undefined, startDecimalYear - dayDelta));
    assert.ok(includesFeature(startDecimalYear - dayDelta, undefined));
    assert.ok(includesFeature(startDecimalYear + dayDelta/2, startDecimalYear + dayDelta/2));
    assert.ok(includesFeature(undefined, startDecimalYear + dayDelta));
    assert.ok(!includesFeature(startDecimalYear + dayDelta, undefined));
  });

  it('should fall back to date string properties if decimal year properties are missing', () => {
    let startDecimalYear = 2013.28219; 
    let dayDelta = 1/365;
    let dateRange = {
      startDecimalYear: startDecimalYear,
      startISODate: '2013-04-14',
      endDecimalYear: startDecimalYear + dayDelta,
      endISODate: '2013-04-15', 
    };
    let upgraded = constrainLegacyFilterByDateRange(['has', 'building'], dateRange);

    let includesFeature = (start, end) => {
      let properties = { building: 'yes' };
      if (typeof start !== 'undefined') {
        properties.start_date = start;
      }
      if (typeof end !== 'undefined') {
        properties.end_date = end;
      }
      return featureFilter(upgraded).filter(undefined, { properties: properties });
    };

    assert.ok(includesFeature(undefined, undefined));
    assert.ok(!includesFeature(undefined, '2013-04-13'));
    assert.ok(includesFeature('2013-04-13', undefined));
    assert.ok(includesFeature(undefined, '2013-04-15'));
    assert.ok(!includesFeature('2013-04-15', undefined));
  });
});

describe('constrainExpressionFilterByDateRange', () => {
  it('should create a filter from scratch', () => {
    let dateRange = {
      startDecimalYear: 2013,
      startISODate: '2013-01-01',
      endDecimalYear: 2014,
      endISODate: '2014-01-01',
    };
    let filter = constrainExpressionFilterByDateRange(undefined, dateRange);
    assert.ok(Array.isArray(filter));
  });

  it('should upgrade non-variable-binding filter', () => {
    let original = ['match', ['get', 'class'], ['primary', 'secondary', 'tertiary'], true, false];
    let dateRange = {
      startDecimalYear: 2013,
      startISODate: '2013-01-01',
      endDecimalYear: 2014,
      endISODate: '2014-01-01',
    };
    let upgraded = constrainExpressionFilterByDateRange(structuredClone(original), dateRange);
    assert.equal(upgraded.length, 10);
    assert.equal(upgraded[0], 'let');
    let startDecimalYearVariable = 'maplibre_gl_dates__startDecimalYear';
    let startISODateVariable = 'maplibre_gl_dates__startISODate';
    let endDecimalYearVariable = 'maplibre_gl_dates__endDecimalYear';
    let endISODateVariable = 'maplibre_gl_dates__endISODate';
    assert.equal(upgraded[1], startDecimalYearVariable);
    assert.equal(upgraded[2], 2013);
    assert.equal(upgraded[3], startISODateVariable);
    assert.equal(upgraded[4], '2013-01-01');
    assert.equal(upgraded[5], endDecimalYearVariable);
    assert.equal(upgraded[6], 2014);
    assert.equal(upgraded[7], endISODateVariable);
    assert.equal(upgraded[8], '2014-01-01');
    assert.equal(upgraded[9].length, 4);
    assert.equal(upgraded[9][0], 'all');
    assert.match(JSON.stringify(upgraded[9][1]), new RegExp(endDecimalYearVariable));
    assert.match(JSON.stringify(upgraded[9][2]), new RegExp(startDecimalYearVariable));
    assert.deepEqual(upgraded[9][3], original);
  });

  it('should update variable-binding filter', () => {
    let original = ['let', 'language', 'sux', ['get', ['+', 'name', ['var', 'language']]]];
    let dateRange = {
      startDecimalYear: 2013,
      startISODate: '2013-01-01',
      endDecimalYear: 2014,
      endISODate: '2014-01-01',
    };
    let updated = constrainExpressionFilterByDateRange(structuredClone(original), dateRange);
    assert.equal(original.length + 8, updated.length);
    assert.equal(updated[0], 'let');
    assert.equal(original[1], updated[1]);
    assert.equal(original[2], updated[2]);
    assert.equal(updated[3], 'maplibre_gl_dates__startDecimalYear');
    assert.equal(updated[4], 2013);
    assert.equal(updated[5], 'maplibre_gl_dates__startISODate');
    assert.equal(updated[6], '2013-01-01');
    assert.equal(updated[7], 'maplibre_gl_dates__endDecimalYear');
    assert.equal(updated[8], 2014);
    assert.equal(updated[9], 'maplibre_gl_dates__endISODate');
    assert.equal(updated[10], '2014-01-01');
    assert.deepEqual(original[3], updated[11]);
  });

  it('should update already upgraded filter', () => {
    let original = ['match', ['get', 'class'], ['primary', 'secondary', 'tertiary'], true, false];
    let upgraded = constrainExpressionFilterByDateRange(structuredClone(original), {
      startDecimalYear: 2013,
      startISODate: '2013-01-01',
    });
    let updated = constrainExpressionFilterByDateRange(structuredClone(upgraded), {
      startDecimalYear: 2014,
      startISODate: '2014-01-01',
    });
    assert.equal(upgraded.length, updated.length);
    assert.equal(updated[0], 'let');
    assert.equal(upgraded[1], updated[1]);
    assert.equal(updated[2], 2014);
    assert.deepEqual(upgraded[3], updated[3]);
  });

  it('should include features matching the selected date', () => {
    let startDecimalYear = 2013.5;
    let dayDelta = 1/365;
    let dateRange = {
      startDecimalYear,
      startISODate: '2013-07-02',
      endDecimalYear: startDecimalYear + dayDelta,
      endISODate: '2013-07-03',
    };
    let upgraded = constrainExpressionFilterByDateRange(['has', 'building'], dateRange);

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

    assert.ok(includesFeature(undefined, undefined));
    assert.ok(!includesFeature(undefined, startDecimalYear - dayDelta));
    assert.ok(includesFeature(startDecimalYear - dayDelta, undefined));
    assert.ok(includesFeature(startDecimalYear + dayDelta/2, startDecimalYear + dayDelta/2));
    assert.ok(includesFeature(undefined, startDecimalYear + dayDelta));
    assert.ok(!includesFeature(startDecimalYear + dayDelta, undefined));
  });

  it('should fall back to date string properties if decimal year properties are missing', () => {
    let startDecimalYear = 2013.28219; 
    let dayDelta = 1/365;
    let dateRange = {
      startDecimalYear: startDecimalYear,
      startISODate: '2013-04-14',
      endDecimalYear: startDecimalYear + dayDelta,
      endISODate: '2013-04-15', 
    };
    let upgraded = constrainExpressionFilterByDateRange(['has', 'building'], dateRange);

    let includesFeature = (start, end) => {
      let properties = { building: 'yes' };
      if (typeof start !== 'undefined') {
        properties.start_date = start;
      }
      if (typeof end !== 'undefined') {
        properties.end_date = end;
      }
      return featureFilter(upgraded).filter(undefined, { properties: properties });
    };

    assert.ok(includesFeature(undefined, undefined));
    assert.ok(!includesFeature(undefined, '2013-04-13'));
    assert.ok(includesFeature('2013-04-13', undefined));
    assert.ok(includesFeature(undefined, '2013-04-15'));
    assert.ok(!includesFeature('2013-04-15', undefined));
  });
});

describe('updateVariable', () => {
  it('should ignore non-let expressions', () => {
    let original = ['has', 'building'];
    let updated = structuredClone(original);
    updateVariable(updated, 'startISODate', '2013-04-14');
    assert.deepEqual(original, updated);
  });
});
