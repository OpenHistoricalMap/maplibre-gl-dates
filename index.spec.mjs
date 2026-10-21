import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { featureFilter } from '@maplibre/maplibre-gl-style-spec';

import {
  filterByDate,
  dateRangeFromISODate,
  decimalYearFromDate,
  dateRangeFromDate,
  constrainFilter,
} from './index.js';

const startDecimalYearVariable = 'maplibre_gl_dates__startDecimalYear';
const startISODateVariable = 'maplibre_gl_dates__startISODate';
const endDecimalYearVariable = 'maplibre_gl_dates__endDecimalYear';
const endISODateVariable = 'maplibre_gl_dates__endISODate';

describe('filterByDate', () => {
  it('should set global state properties', () => {
    const map = {
      globalState: {},
      getGlobalState: () => {
        return map.globalState;
      },
      setGlobalStateProperty: (propertyName, value) => {
        map.globalState[propertyName] = value;
      },
      getStyle: () => ({ layers: [] }),
    };
    assert.deepEqual(map.getGlobalState(), {});
    filterByDate(map, '2013');
    const globalState = map.getGlobalState();
    assert.equal(globalState[startDecimalYearVariable], 2013);
    assert.equal(globalState[startISODateVariable], '2013-01-01');
    assert.equal(globalState[endDecimalYearVariable], 2014);
    assert.equal(globalState[endISODateVariable], '2014-01-01');
  });
});

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
    assert.equal(+yearPrecision.startDecimalYear.toFixed(5), -48);
    assert.equal(+yearPrecision.endDate, +new Date('-000047-01-01T00:00:00Z'));
    assert.equal(+yearPrecision.endDecimalYear.toFixed(5), -47);

    let monthPrecision = dateRangeFromISODate('-0048-01');
    assert.equal(+monthPrecision.startDate, +new Date('-000048-01-01T00:00:00Z'));
    assert.equal(+monthPrecision.startDecimalYear.toFixed(5), -48);
    assert.equal(+monthPrecision.endDate, +new Date('-000048-02-01T00:00:00Z'));
    assert.equal(+monthPrecision.endDecimalYear.toFixed(5), -47.9153);

    let dayPrecision = dateRangeFromISODate('-0048-01-01');
    assert.equal(+dayPrecision.startDate, +new Date('-000048-01-01T00:00:00Z'));
    assert.equal(+dayPrecision.startDecimalYear.toFixed(5), -48);
    assert.equal(+dayPrecision.endDate, +new Date('-000048-01-01T00:00:00Z'));
    assert.equal(+dayPrecision.endDecimalYear.toFixed(5), -48);
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
    assert.equal(decimalYearFromDate(new Date('-010000-01-01')), -10000);
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

describe('constrainFilter', () => {
  it('should create a filter from scratch', () => {
    let filter = constrainFilter(undefined);
    assert.ok(Array.isArray(filter));
    assert.equal(filter.length, 3);
    assert.equal(filter[0], 'all');
  });

  it('should upgrade filter', () => {
    let original = ['match', ['get', 'class'], ['primary', 'secondary', 'tertiary'], true, false];
    let upgraded = constrainFilter(structuredClone(original));
    assert.equal(upgraded.length, 4);
    assert.equal(upgraded[0], 'all');
    let startDecimalYearVariable = 'maplibre_gl_dates__startDecimalYear';
    let endDecimalYearVariable = 'maplibre_gl_dates__endDecimalYear';
    assert.match(JSON.stringify(upgraded[1]), new RegExp(endDecimalYearVariable));
    assert.match(JSON.stringify(upgraded[2]), new RegExp(startDecimalYearVariable));
    assert.deepEqual(upgraded[3], original);
  });

  it('should upgrade already upgraded filter', () => {
    let original = ['match', ['get', 'class'], ['primary', 'secondary', 'tertiary'], true, false];
    let upgraded = constrainFilter(structuredClone(original));
    let reupgraded = constrainFilter(structuredClone(upgraded));
    assert.equal(upgraded.length, reupgraded.length);
    assert.equal(reupgraded[0], 'all');
    assert.deepEqual(upgraded[1], reupgraded[1]);
    assert.deepEqual(upgraded[2], reupgraded[2]);
    assert.deepEqual(upgraded, reupgraded[3]);
  });

  it('should include features matching the selected date', () => {
    const startDecimalYear = 2013.5;
    const dayDelta = 1/365;
    const globalState = {};
    globalState[startDecimalYearVariable] = startDecimalYear;
    globalState[startISODateVariable] = '2013-07-02';
    globalState[endDecimalYearVariable] = startDecimalYear + dayDelta;
    globalState[endISODateVariable] = '2013-07-03';

    let upgraded = constrainFilter(['has', 'building']);

    let includesFeature = (start, end) => {
      let properties = { building: 'yes' };
      if (typeof start !== 'undefined') {
        properties.start_decdate = start;
      }
      if (typeof end !== 'undefined') {
        properties.end_decdate = end;
      }
      return featureFilter(upgraded, 'layers[0].filter', globalState)
        .filter(undefined, { properties });
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
    const globalState = {};
    globalState[startDecimalYearVariable] = startDecimalYear;
    globalState[startISODateVariable] = '2013-04-14';
    globalState[endDecimalYearVariable] = startDecimalYear + dayDelta;
    globalState[endISODateVariable] = '2013-04-15';

    let upgraded = constrainFilter(['has', 'building']);

    let includesFeature = (start, end) => {
      let properties = { building: 'yes' };
      if (typeof start !== 'undefined') {
        properties.start_date = start;
      }
      if (typeof end !== 'undefined') {
        properties.end_date = end;
      }
      return featureFilter(upgraded, 'layers[0].filter', globalState)
        .filter(undefined, { properties });
    };

    assert.ok(includesFeature(undefined, undefined));
    assert.ok(!includesFeature(undefined, '2013-04-13'));
    assert.ok(includesFeature('2013-04-13', undefined));
    assert.ok(includesFeature(undefined, '2013-04-15'));
    assert.ok(!includesFeature('2013-04-15', undefined));
  });
});
