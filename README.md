# MapLibre GL Dates

This is a plugin for [MapLibre GL&nbsp;JS](https://github.com/maplibre/maplibre-gl-js/) for filtering the map based on a date. The plugin is designed for use with [OpenHistoricalMap](https://www.openhistoricalmap.org/) data.

## Requirements

This plugin requires [MapLibre GL&nbsp;JS](https://github.com/maplibre/maplibre-gl-js/) v3.0.0 and above. It also works in [Mapbox GL&nbsp;JS](https://docs.mapbox.com/mapbox-gl-js/) when installed as a standalone script (without using a package manager).

This plugin is able to manipulate both the deprecated [legacy filter syntax](https://maplibre.org/maplibre-style-spec/deprecations/#other-filter) and the newer [expression syntax](https://maplibre.org/maplibre-style-spec/expressions/) defined in the MapLibre Style Specification.

The stylesheet must be backed by a vector tileset, such as [OpenHistoricalMap’s official vector tileset](https://wiki.openstreetmap.org/wiki/OpenHistoricalMap/Reuse#Vector_tiles_and_stylesheets), that includes the following properties in each tile layer:

Property | Type | Description
----|----|----
`start_date` | String | The date the feature came into existence as a date string.
`start_decdate` | Number | The date the feature came into existence as a decimal year.
`end_date` | String | The date the feature went out of existence as a date string.
`end_decdate` | Number | The date the feature went out of existence as a decimal year.

A date string is a date in `YYYY`, `YYYY-MM`, or `YYYY-MM-DD` format, similar to ISO&nbsp;8601-1 format. A decimal year is a floating-point number such that each integer represents midnight on New Year’s Day. An implementation of decimal year conversion functions is available [for PL/pgSQL](https://github.com/OpenHistoricalMap/DateFunctions-plpgsql/).

All properties are optional, but the plugin will only have an effect if one or more of these properties is present in the tileset. For performance reasons, if a given feature has a `start_decdate` or `end_decdate` property, this plugin prefers it over the `start_date` or `end_date` property.

Regardless of the data type, all dates are interpreted according to the proleptic Gregorian calendar. As there is no Year Zero, the value 1.0 falls on New Year’s Day of 1&nbsp;CE, the value 0.0 falls on 1&nbsp;BCE, the value -1.0 falls on 2&nbsp;BCE, etc.

## Installation

This plugin is available as [an NPM plugin](https://www.npmjs.com/package/@openhistoricalmap/maplibre-gl-dates). To install it, run the following command:

```bash
npm install @openhistoricalmap/maplibre-gl-dates
```

Alternatively, you can include the plugin as a standalone script from a CDN such as [unpkg](https://unpkg.com/@openhistoricalmap/maplibre-gl-dates/index.js). Use this option to filter a style in Mapbox GL&nbsp;JS.

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

A date string is defined as a date in `YYYY`, `YYYY-MM`, or `YYYY-MM-DD` format, similar to ISO&nbsp;8601-1 format. If the date is only given to year precision, every feature overlapping that year is included; likewise, if the date is given to month precision, every feature overlapping that month is included. Negative years are supported as described in “[Requirements](#requirements)”.

## Feedback

Please submit bug reports and feature requests to [OpenHistoricalMap’s central issue tracker](https://github.com/OpenHistoricalMap/issues/issues/), noting “maplibre-gl-dates” somewhere in the title or description. 
