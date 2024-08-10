addEventListener('load', function () {
  window.map = new maplibregl.Map({
    container: 'map',
    hash: 'map',
    style: 'https://openhistoricalmap.github.io/map-styles/main/main.json',
    attributionControl: {
      customAttribution: '<a href="https://www.openhistoricalmap.org/">OpenHistoricalMap</a>',
    },
  });

  map.addControl(new maplibregl.NavigationControl(), 'top-left');
  map.addControl(new maplibregl.FullscreenControl(), 'top-left');

  map.once('styledata', function (event) {
    let params = new URLSearchParams(location.hash.substring(1));
    let date = params.get('date') || new Date();
    map.filterByDate(date);
  });

  addEventListener('hashchange', function (event) {
    let oldParams = new URLSearchParams(new URL(event.oldURL).hash.substring(1));
    let newParams = new URLSearchParams(new URL(event.newURL).hash.substring(1));
    let oldDate = oldParams.get('date') || new Date();
    let newDate = newParams.get('date') || new Date();
    if (oldDate !== newDate) {
      map.filterByDate(newDate);
    }
  });
});
