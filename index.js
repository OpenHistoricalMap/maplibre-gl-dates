/**
 * Filters the map’s features by a date.
 *
 * @param map The MapboxGL map object to filter the style of.
 * @param date The date to filter by.
 */
function filterByDate(map, date) {
  if (typeof date === 'string') {
    date = dateFromISODate(date);
  }
  let decimalYear = decimalYearFromDate(date);
  map.getStyle().layers.map(function (layer) {
    if (!('source-layer' in layer)) return;

    let filter = constrainFilterByDate(map.getFilter(layer.id), decimalYear);
    map.setFilter(layer.id, filter);
  });
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
  return year + (date.getTime() - lastNewYear) / (nextNewYear - lastNewYear);
}

/**
 * Converts the given ISO 8601-1 date to a `Date` object.
 *
 * @param isoDate A date string in ISO 8601-1 format.
 * @returns A date object.
 */
function dateFromISODate(isoDate) {
  // Require a valid YYYY, YYYY-MM, or YYYY-MM-DD date, but allow the year
  // to be a variable number of digits or negative, unlike ISO 8601-1.
  if (!isoDate || !/^-?\d{1,4}(?:-\d\d){0,2}$/.test(isoDate)) return;

  let ymd = isoDate.split('-');
  // A negative year results in an extra element at the beginning.
  if (ymd[0] === '') {
    ymd.shift();
    ymd[0] *= -1;
  }
  let year = +ymd[0];
  let date = dateFromUTC(year, +ymd[1] - 1, +ymd[2]);
  return !isNaN(date) && date;
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
 * Returns a modified version of the given filter that only evaluates to
 * true if the feature coincides with the given decimal year.
 *
 * @param filter The original layer filter.
 * @param decimalYear The decimal year to filter by.
 * @returns A filter similar to the given filter, but with added conditions
 *	that require the feature to coincide with the decimal year.
 */
function constrainFilterByDate(filter, decimalYear) {
  if (filter && filter[0] === 'all' &&
      filter[1] && filter[1][0] === 'any') {
    if (filter[1][2] && filter[1][2][0] === '<=' && filter[1][2][1] === 'start_decdate') {
      filter[1][2][2] = decimalYear;
    }
    if (filter[2][2] && filter[2][2][0] === '>=' && filter[2][2][1] === 'end_decdate') {
      filter[2][2][2] = decimalYear;
    }
    return filter;
  }

  let dateFilter = [
    'all',
    ['any', ['!has', 'start_decdate'], ['<=', 'start_decdate', decimalYear]],
    ['any', ['!has', 'end_decdate'], ['>=', 'end_decdate', decimalYear]],
  ];
  if (filter) {
    dateFilter.push(filter);
  }
  return dateFilter;
}

if (typeof window !== 'undefined' && 'maplibregl' in window) {
  maplibregl.Map.prototype.filterByDate = function (date) {
    filterByDate(this, date);
  };
} else if (typeof module !== 'undefined') {
  module.exports = {
    filterByDate: filterByDate,
    decimalYearFromDate: decimalYearFromDate,
    dateFromISODate: dateFromISODate,
    constrainFilterByDate: constrainFilterByDate,
  };
}
