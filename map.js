// Import Mapbox as an ESM module
import mapboxgl from 'https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';


// Set your Mapbox access token here
mapboxgl.accessToken = 'pk.eyJ1IjoianVsaW1mdWVjbyIsImEiOiJjbWh1MjF5d3IwMWZjMmtvbzFjczR1NWIyIn0.GRN9wpPgAm2W3RJT5zEj8w';

// Initialize the map
const map = new mapboxgl.Map({
  container: 'map', // ID of the div where the map will render
  style: 'mapbox://styles/mapbox/streets-v12', // Map style
  center: [-71.09415, 42.36027], // [longitude, latitude]
  zoom: 12, // Initial zoom level
  minZoom: 5, // Minimum allowed zoom
  maxZoom: 18, // Maximum allowed zoom
});


//7.2 load / import first then paint the town
map.on('load', async () => {

  // --- Boston bike network ---
  map.addSource('boston_route', {
    type: 'geojson',
    data: 'https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson'
  });

  map.addLayer({
    id: 'boston-bike-lanes',
    type: 'line',
    source: 'boston_route',
    paint: {
      'line-color': 'DarkOrchid',
      'line-width': 5,
      'line-opacity': 0.6
    }
  });

  // --- Cambridge bike network ---
  map.addSource('cambridge_route', {
    type: 'geojson',
    data: 'https://raw.githubusercontent.com/cambridgegis/cambridgegis_data/main/Recreation/Bike_Facilities/RECREATION_BikeFacilities.geojson'
  });

  map.addLayer({
    id: 'cambridge-bike-lanes',
    type: 'line',
    source: 'cambridge_route',
    paint: {
      'line-color': 'DarkOrchid',
      'line-width': 5,
      'line-opacity': 0.6
    }
  });

  // 7.3.1 Adding the BlueBikes data ---
  let jsonData;

  try {
    const jsonurl = 'https://dsc-courses.github.io/dsc209r-2025-fa/labs/lab07/data/bluebikes-stations.json';

    // Await JSON fetch
    jsonData = await d3.json(jsonurl);

    console.log('Loaded JSON Data:', jsonData); // Log to verify structure
  } catch (error) {
    console.error('Error loading JSON:', error); // Handle errors
  }

    // Check the BlueBikes stations array is loaded
  let stations = jsonData.data.stations;
  console.log('Stations Array:', stations);

  const svg = d3.select('#map').select('svg');

    // Append circles to the SVG for each station
  const circles = svg
    .selectAll('circle')
    .data(stations)
    .enter()
    .append('circle')
    .attr('r', 5) // Radius of the circle
    .attr('fill', 'DarkBlue') // Circle fill color
    .attr('stroke', 'white') // Circle border color
    .attr('stroke-width', 1) // Circle border thickness
    .attr('opacity', 0.8); // Circle opacity

  // 7.3.3 update the circles for the Map
  function updatePositions() {
    circles
      .attr('cx', (d) => getCoords(d).cx) // Set the x-position using projected coordinates
      .attr('cy', (d) => getCoords(d).cy); // Set the y-position using projected coordinates
  }

  // 7.3.3 getCoords global fxn
function getCoords(station) {
  const point = new mapboxgl.LngLat(+station.lon, +station.lat); // Convert lon/lat to Mapbox LngLat
  const { x, y } = map.project(point); // Project to pixel coordinates
  return { cx: x, cy: y }; // Return as object for use in SVG attributes
}


// Initial position update when map loads
updatePositions();

// Reposition markers on map interactions
map.on('move', updatePositions); // Update during map movement
map.on('zoom', updatePositions); // Update during zooming
map.on('resize', updatePositions); // Update on window resize
map.on('moveend', updatePositions); // Final adjustment after movement ends

});


// Check that Mapbox GL JS is loaded
console.log('Mapbox GL JS Loaded:', mapboxgl);
