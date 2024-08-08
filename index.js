/// A prefix that uniquely identifies this plugin, prepended onto the name of any variable generated by this plugin.
const variablePrefix = 'maplibre_gl_dates';

/**
 * Filters the map’s features by a date.
 *
 * @param map The MapboxGL map object to filter the style of.
 * @param date The date object or date string to filter by.
 */
function filterByDate(map, date) {
  let dateRange = dateRangeFromDate(date);
  map.getStyle().layers.map(function (layer) {
    if (!('source-layer' in layer)) return;

    let filter = constrainFilterByDateRange(map.getFilter(layer.id), dateRange);
    map.setFilter(layer.id, filter);
  });
}

/**
 * Converts the given date to a date range object.
 *
 * @param date A date object or date string in ISO 8601-1 format.
 * @returns A date range object.
 */
function dateRangeFromDate(date) {
  let dateRange;
  if (typeof date === 'string') {
    dateRange = dateRangeFromISODate(date);
  } else if (date instanceof Date && !isNaN(date)) {
    let decimalYear = decimalYearFromDate(date);
    let isoDate = date.toISOString().split('T')[0];
    dateRange = {
      startDate: date,
      startDecimalYear: decimalYear,
      startISODate: isoDate,
      endDate: date,
      endDecimalYear: decimalYear,
      endISODate: isoDate,
    };
  }
  return dateRange;
}

/**
 * Converts the given ISO 8601-1 date to a date range object.
 *
 * @param isoDate A date string in ISO 8601-1 format.
 * @returns A date range object indicating the minimum (inclusive) and maximum
 *  (exclusive) possible dates represented by the given date string.
 */
function dateRangeFromISODate(isoDate) {
  // Require a valid YYYY, YYYY-MM, or YYYY-MM-DD date, but allow the year
  // to be a variable number of digits or negative, unlike ISO 8601-1.
  if (!isoDate || !/^-?\d{1,4}(?:-\d\d){0,2}$/.test(isoDate)) return;

  let ymd = isoDate.split('-');
  // A negative year results in an extra element at the beginning.
  let isBCE = ymd[0] === '';
  if (isBCE) {
    ymd.shift();
    ymd[0] *= -1;
  }
  let startYear = +ymd[0];
  let endYear = +ymd[0];

  let startMonth, endMonth;
  if (ymd[1]) {
    // Date.UTC() uses zero-based months.
    startMonth = endMonth = +ymd[1] - 1;
  } else {
    endYear++;
    startMonth = endMonth = 0;
  }

  let startDay, endDay;
  if (ymd[2]) {
    startDay = endDay = +ymd[2];
  } else if (ymd[1]) {
    // Months still count forwards in BCE.
    endMonth++;
    startDay = endDay = 1;
  }
  
  let startDate = dateFromUTC(startYear, startMonth, startDay);
  let endDate = dateFromUTC(endYear, endMonth, endDay);
  return {
    startDate: !isNaN(startDate) && startDate,
    startDecimalYear: !isNaN(startDate) && decimalYearFromDate(startDate),
    startISODate: !isNaN(startDate) && startDate.toISOString().split('T')[0],
    endDate: !isNaN(endDate) && endDate,
    endDecimalYear: !isNaN(endDate) && decimalYearFromDate(endDate),
    endISODate: !isNaN(endDate) && endDate.toISOString().split('T')[0],
  };
}

/**
 * Returns a `Date` object representing the given UTC date components.
 *
 * @param year A one-based year in the proleptic Gregorian calendar.
 * @param month A zero-based month.
 * @param day A one-based day.
 * @returns A date object.
 */
function dateFromUTC(year, month, day) {
  let date = new Date(Date.UTC(year, month, day));
  // Date.UTC() treats a two-digit year as an offset from 1900.
  date.setUTCFullYear(year);
  return date;
}

/**
 * Converts the given date to a decimal year.
 *
 * @param date A date object.
 * @returns A floating point number of years since year 0.
 */
function decimalYearFromDate(date) {
  // Add the year and the fraction of the date between two New Year’s Days.
  let year = date.getUTCFullYear();
  let nextNewYear = dateFromUTC(year + 1, 0, 1).getTime();
  let lastNewYear = dateFromUTC(year, 0, 1).getTime();
  if (year < 0) {
    // New Year’s 1 BCE is closer to -2 than -1.
    year--;
  }
  return year + (date.getTime() - lastNewYear) / (nextNewYear - lastNewYear);
}

/**
 * Returns a modified version of the given filter that only evaluates to
 * true if the feature overlaps with the given date range.
 *
 * @param filter The original layer filter.
 * @param dateRange The date range to filter by.
 * @returns A filter similar to the given filter, but with added conditions
 *	that require the feature to overlap with the date range.
 */
function constrainFilterByDateRange(filter, dateRange) {
  if (typeof filter !== 'undefined' || isLegacyFilter(filter)) {
    return constrainLegacyFilterByDateRange(filter, dateRange);
  } else {
    return constrainExpressionFilterByDateRange(filter, dateRange);
  }
}

/**
 * Returns a modified version of the given legacy filter that only evaluates to
 * true if the feature overlaps with the given date range.
 *
 * @param filter The original layer filter using the legacy syntax.
 * @param dateRange The date range to filter by.
 * @returns A filter similar to the given filter, but with added conditions
 *	that require the feature to overlap with the date range. If the filter has
 *  previously been passed into this function, it surgically updates the filter.
 */
function constrainLegacyFilterByDateRange(filter, dateRange) {
  if (filter[0] === 'all' &&
      filter[2] && filter[1][0] === 'any' && filter[2][0] === 'any') {
    if (filter[1][1] && filter[1][1][0] === 'all' &&
        filter[1][1][2] && filter[1][1][2][0] === '<' &&
        filter[1][1][2][1] === 'start_decdate') {
      filter[1][1][2][2] = dateRange.endDecimalYear;
    }
    if (filter[1][2] && filter[1][2][0] === 'all' &&
        filter[1][2][2] && filter[1][2][2][0] === '<' &&
        filter[1][2][2][2] === 'start_date') {
      filter[1][2][2][3] = dateRange.endISODate;
    }
    if (filter[2][1] && filter[2][1][0] === 'all' &&
        filter[2][1][2] && filter[2][1][2][0] === '>=' &&
        filter[2][1][2][1] === 'end_decdate') {
      filter[2][1][2][2] = dateRange.startDecimalYear;
    }
    if (filter[2][2] && filter[2][2][0] === 'all' &&
        filter[2][2][2] && filter[2][2][2][0] === '>=' &&
        filter[2][2][2][2] === 'end_date') {
      filter[2][2][2][3] = dateRange.startISODate;
    }
    return filter;
  }

  return [
    'all',
    [
      'any',
      [
        'all',
        ['has', 'start_decdate'],
        ['<', 'start_decdate', dateRange.endDecimalYear],
      ],
      [
        'all',
        ['!has', 'start_decdate'],
        ['has', 'start_date'],
        ['<', 'start_date', dateRange.endISODate],
      ],
      [
        'all',
        ['!has', 'start_decdate'],
        ['!has', 'start_date'],
      ],
    ],
    [
      'any',
      [
        'all',
        ['has', 'end_decdate'],
        ['>=', 'end_decdate', dateRange.startDecimalYear],
      ],
      [
        'all',
        ['!has', 'end_decdate'],
        ['has', 'end_date'],
        ['>=', 'end_date', dateRange.startISODate],
      ],
      [
        'all',
        ['!has', 'end_decdate'],
        ['!has', 'end_date'],
      ],
    ],
    filter,
  ];
}

/**
 * Returns a modified version of the given expression-based filter that only
 * evaluates to true if the feature overlaps with the given date range.
 *
 * @param filter The original layer filter using the expression syntax.
 * @param dateRange The date range to filter by.
 * @returns A filter similar to the given filter, but with added conditions
 *  that require the feature to overlap with the date range. If the filter has
 *  previously been passed into this function, or if it already has a `let`
 *  expression at the top level, it merely updates a variable.
 */
function constrainExpressionFilterByDateRange(filter, dateRange) {
  const startDecimalYearVariable = `${variablePrefix}__startDecimalYear`;
  const startISODateVariable = `${variablePrefix}__startISODate`;
  const endDecimalYearVariable = `${variablePrefix}__endDecimalYear`;
  const endISODateVariable = `${variablePrefix}__endISODate`;
  if (Array.isArray(filter) && filter[0] === 'let') {
    updateVariable(filter, startDecimalYearVariable, dateRange.startDecimalYear);
    updateVariable(filter, startISODateVariable, dateRange.startISODate);
    updateVariable(filter, endDecimalYearVariable, dateRange.endDecimalYear);
    updateVariable(filter, endISODateVariable, dateRange.endISODate);
    return filter;
  }

  let allExpression = [
    'all',
    [
      'any',
      [
        'all',
        ['has', 'start_decdate'],
        ['<', ['get', 'start_decdate'], ['var', endDecimalYearVariable]],
      ],
      [
        'all',
        ['!', ['has', 'start_decdate']],
        ['has', 'start_date'],
        ['<', ['get', 'start_date'], ['var', endISODateVariable]],
      ],
      [
        'all',
        ['!', ['has', 'start_decdate']],
        ['!', ['has', 'start_date']]
      ],
    ],
    [
      'any',
      [
        'all',
        ['has', 'end_decdate'],
        ['>=', ['get', 'end_decdate'], ['var', startDecimalYearVariable]],
      ],
      [
        'all',
        ['!', ['has', 'end_decdate']],
        ['has', 'end_date'],
        ['>=', ['get', 'end_date'], ['var', startISODateVariable]],
      ],
      [
        'all',
        ['!', ['has', 'end_decdate']],
        ['!', ['has', 'end_date']]
      ],
    ],
  ];
  if (filter) {
    allExpression.push(filter);
  }

  return [
    'let',
    startDecimalYearVariable, dateRange.startDecimalYear,
    startISODateVariable, dateRange.startISODate,
    endDecimalYearVariable, dateRange.endDecimalYear,
    endISODateVariable, dateRange.endISODate,
    allExpression,
  ];
}

/**
 * Returns a Boolean indicating whether the given filter is definitely based on [the deprecated legacy filter syntax](https://maplibre.org/maplibre-style-spec/deprecations/#other-filter) and thus incompatible with an expression.
 *
 * @param filter A filter that is either based on the legacy syntax or an expression.
 * @returns True if the filter is definitely based on the legacy syntax; false if it might be an expression.
 */
function isLegacyFilter(filter) {
  if (!Array.isArray(filter) || filter.length < 2) {
    return false;
  }

  let args = filter.slice(1);
  switch (filter[0]) {
    case '!has':
    case '!in':
    case 'none':
      // These are filters but not expression operators.
      return true;

    case 'has':
      // These are unlikely feature properties but are built-in legacy keys.
      return args[0] === '$id' || args[0] === '$type';

    case 'in':
      return (// The legacy syntax includes all the possible matches inline.
              args.length > 2 ||
              // These are unlikely feature properties but are built-in legacy keys.
              args[0] === '$id' || args[0] === '$type' ||
              // The `in` expression only allows searching within a string or array.
              typeof args[1] === 'number' || typeof args[1] === 'boolean' ||
              // It would be pointless to search for a string literal inside another string literal.
              (typeof args[0] === 'string' && typeof args[1] === 'string'));

    case '==':
    case '!=':
    case '>':
    case '>=':
    case '<':
    case '<=':
      // An expression would require the string literal to be compared to another string literal, but it would be pointless to do so.
      return typeof args[0] === 'string' && !Array.isArray(args[1]);

    case 'all':
    case 'any':
      // If any of the arguments is definitely a legacy filter, the whole thing is too. 
      return args.some(isLegacyFilter);

    default:
      return false;
  }
}

/**
 * Mutates a `let` expression to have a new value for the variable by the given
 * name.
 *
 * @param letExpression A `let` expression.
 * @param name The name of the variable to mutate.
 * @param newValue The variable’s new value.
 */
function updateVariable(letExpression, name, newValue) {
  if (letExpression[0] !== 'let') {
    return;
  }

  let variableIndex = letExpression.indexOf(name);
  if (variableIndex !== -1 && variableIndex % 2 === 1) {
    letExpression[variableIndex + 1] = newValue;
  } else {
    letExpression.splice(-1, 0, name, newValue);
  }
}

if (typeof window !== 'undefined' && 'maplibregl' in window) {
  maplibregl.Map.prototype.filterByDate = function (date) {
    filterByDate(this, date);
  };
} else if (typeof module !== 'undefined') {
  module.exports = {
    filterByDate,
    dateRangeFromDate,
    decimalYearFromDate,
    dateRangeFromISODate,
    constrainFilterByDateRange,
    constrainLegacyFilterByDateRange,
    constrainExpressionFilterByDateRange,
    isLegacyFilter,
    updateVariable,
  };
}
