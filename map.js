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
  // // BIG, OBVIOUS SHAPES for debug
  // svg.append('rect')
  //   .attr('x', 20).attr('y', 20)
  //   .attr('width', 200).attr('height', 120)
  //   .attr('fill', 'rgba(0,200,0,0.5)');

  // svg.append('circle')
  //   .attr('cx', 140).attr('cy', 80).attr('r', 40)
  //   .attr('fill', 'red').attr('stroke', 'white').attr('stroke-width', 3);

  const tooltip = d3
    .select('body')
    .append('div')
    .style('position', 'absolute')
    .style('background', 'rgba(0, 0, 0, 0.7)')
    .style('color', 'white')
    .style('padding', '4px 8px')
    .style('border-radius', '4px')
    .style('font-size', '12px')
    .style('pointer-events', 'none')
    .style('opacity', 0.7)
    .style('z-index', 9999);

  // 7.4.1 parse the traffic data
  let trips;
  try {
    const csvurl = 'https://dsc-courses.github.io/dsc209r-2025-fa/labs/lab07/data/bluebikes-traffic-2024-03.csv';
    // Await CSV fetch
    trips = await d3.csv(csvurl);
    console.log('Loaded CSV Data:', trips); // Log to verify structure
  } catch (error) {
    console.error('Error loading CSV:', error); // Handle errors
  }

const departures = d3.rollup(
  trips,
  (v) => v.length,
  (d) => d.start_station_id,
);

const arrivals = d3.rollup(
  trips,
  (v) => v.length,
  (d) => d.end_station_id,
);

stations = stations.map((station) => {
  let id = station.short_name;
  station.arrivals = arrivals.get(id) ?? 0;
  station.departures = departures.get(id) ?? 0;
  station.totalTraffic = station.arrivals + station.departures
  return station;
});

  // 7.4.3
  const radiusScale = d3
    .scaleSqrt()
    .domain([0, d3.max(stations, (d) => d.totalTraffic)])
    .range([0, 25]);

    // Append circles to the SVG for each station
  const circles = svg
    .selectAll('circle')
    .data(stations)
    .enter()
    .append('circle')
    .attr('fill', 'Crimson') // Circle fill color
    .attr('stroke', 'white') // Circle border color
    .attr('stroke-width', 1) // Circle border thickness
    .attr('r', (d) => radiusScale(d.totalTraffic)) // Radius from 7.4.3
    .attr('opacity', 0.8) // Circle opacity
    
    // mouse functions
    .on('mouseover', function(event, d) {
      d3.select(this)
        .transition()
        .duration(150)
        .attr('fill', 'Crimson')
        .attr('r', radiusScale(d.totalTraffic) * 1.4);
      
      tooltip
        .style('opacity', 0.8)
        .html(
          `<strong>${d.name}</strong><br>
          ${d.totalTraffic} - Total Trips<br>
          ${d.departures} - Departures<br>
           ${d.arrivals} - Arrivals`
        );

      d3.select(this).on('mousemove.tooltip', function(event) {
        tooltip
          .style('left', event.pageX + 10 + 'px')
          .style('top', event.pageY - 28 + 'px');        
      })
    })

    .on('mouseout', function (event, d) {
      d3.select(this)
          .transition()
          .duration(150)
          .attr('r', radiusScale(d.totalTraffic));
      tooltip.style('opacity', 0);
      d3.select(this).on('mousemove.tooltip', null);
    });

  
  // DEBUG THE CIRCLES NOT SHOWING UP
  // Check that Mapbox GL JS is loaded
  // console.log('Mapbox GL JS Loaded:', mapboxgl);
  // const svgEl = d3.select('#map').select('svg').node();
  // console.log('SVG size:', svgEl.clientWidth, svgEl.clientHeight);
  // console.log('Circle count:', d3.select('#map svg').selectAll('circle').size());
  

    
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




// 7.5.2
const timeSlider = document.getElementById('#time-slider');
const selectedTime = document.getElementById('#selected-time');
const anyTimeLabel = document.getElementById('#any-time');

