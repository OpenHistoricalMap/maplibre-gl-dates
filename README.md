# MapLibre GL Dates

This is a plugin for [MapLibre GL JS](https://github.com/maplibre/maplibre-gl-js/) for filtering the map based on a date. The plugin is designed for use with [OpenHistoricalMap](https://www.openhistoricalmap.org/) data.

## Requirements

This plugin requires [MapLibre GL JS](https://github.com/maplibre/maplibre-gl-js/) v3.0.0 and above.

This plugin is able to manipulate both the deprecated [legacy filter syntax](https://maplibre.org/maplibre-style-spec/deprecations/#other-filter) and the newer [expression syntax](https://maplibre.org/maplibre-style-spec/expressions/) defined in the MapLibre Style Specification.

The stylesheet must be backed by a vector tileset, such as [OpenHistoricalMap’s official vector tileset](https://wiki.openstreetmap.org/wiki/OpenHistoricalMap/Reuse#Vector_tiles_and_stylesheets), that includes the following properties in each tile layer:

Property | Type | Description
----|----|----
`start_decdate` | Number | The date the feature came into existence in decimal year format.
`end_decdate` | Number | The date the feature went out of existence in decimal year format.

Decimal year format is defined as a floating-point number in the proleptic Gregorian calendar, such that each integer represents midnight on New Year’s Day. As there is no Year Zero, the value 1.0 falls on New Year’s Day of 1&nbsp;CE, the value 0.0 falls on 1&nbsp;BCE, the value -1.0 falls on 2&nbsp;BCE, etc. An implementation of decimal year conversion functions is available [for PL/pgSQL ](https://github.com/OpenHistoricalMap/DateFunctions-plpgsql/).

## Installation

To install this plugin in an NPM environment, run the following command:

```bash
npm install @openhistoricalmap/maplibre-gl-dates
```

## Usage

After creating an instance of `maplibregl.Map`, register an event listener for the `styledata` event that filters the map: 

```js
map.once('styledata', function (event) {
  map.filterByDate('2013-04-14');
});
```

If you set the `hash` option to a string when creating the `Map`, you can have this code respond to a `date` parameter in the URL hash:

```js
map.once('styledata', function (event) {
  let params = new URLSearchParams(location.hash.substring(1));
  let date = params.get('date') || new Date();
  map.filterByDate(date);
});
```

And you can add a window event listener for whenever the hash changes, in order to update the filter:

```js
addEventListener('hashchange', function (event) {
  let oldParams = new URLSearchParams(new URL(event.oldURL).hash.substring(1));
  let newParams = new URLSearchParams(new URL(event.newURL).hash.substring(1));
  let oldDate = oldParams.get('date') || new Date();
  let newDate = newParams.get('date') || new Date();
  if (oldDate !== newDate) {
    map.filterByDate(newDate);
  }
});
```

## API

This plugin adds a single method to each instance of `maplibregl.Map`.

### `filterByDate`

Filters the map’s features by a date.

Parameters:

Parameter | Type | Description
----|----|----
`date` | `Date` or date string | The date to filter by.

A date string is defined as a date in `YYYY`, `YYYY-MM`, or `YYYY-MM-DD` format, similar to ISO&nbsp;8601-1 format. Negative years are supported as described in “[Requirements](#requirements)”.

## Feedback

Please submit bug reports and feature requests to [OpenHistoricalMap’s central issue tracker](https://github.com/OpenHistoricalMap/issues/issues/), noting “maplibre-gl-dates” somewhere in the title or description. 
