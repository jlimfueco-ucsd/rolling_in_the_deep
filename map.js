// Import Mapbox as an ESM module
import mapboxgl from 'https://cdn.jsdelivr.net/npm/mapbox-gl@2.15.0/+esm';
import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';


// Set your Mapbox access token here
mapboxgl.accessToken = 'pk.eyJ1IjoianVsaW1mdWVjbyIsImEiOiJjbWh1MjF5d3IwMWZjMmtvbzFjczR1NWIyIn0.GRN9wpPgAm2W3RJT5zEj8w';

function computeStationTraffic(stations, trips) { 
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

    return stations.map((station) => {
        const id = station.short_name;
        station.arrivals = arrivals.get(id) ?? 0;
        station.departures = departures.get(id) ?? 0;
        station.totalTraffic = station.arrivals + station.departures
        return station;
    });
}

function minutesSinceMidnight(date) {
  return date.getHours() * 60 + date.getMinutes();
}

function filterTripsbyTime(trips, timeFilter) {
  return timeFilter === -1
    ? trips 
    : trips.filter((trip) => {
        const startedMinutes = minutesSinceMidnight(trip.started_at);
        const endedMinutes = minutesSinceMidnight(trip.ended_at);
        return (
          Math.abs(startedMinutes - timeFilter) <= 60 ||
          Math.abs(endedMinutes - timeFilter) <= 60
        );
      });
}

function formatTime(minutes) {
    const date = new Date(0, 0, 0, 0, minutes); // Set hours & minutes
    return date.toLocaleString('en-US', { timeStyle: 'short' }); // Format as HH:MM AM/PM
}



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


  // 7.3.1 + 7.4.1 + 7.5.1 – load data and compute traffic
  let stations;
  let trips;

  // --- Load stations JSON ---
  try {
    const jsonurl =
      'https://dsc-courses.github.io/dsc209r-2025-fa/labs/lab07/data/bluebikes-stations.json';
    const jsonData = await d3.json(jsonurl);
    stations = jsonData.data.stations;
    console.log('Stations Array:', stations);
  } catch (error) {
    console.error('Error loading JSON:', error);
  }

  // --- Load trips CSV ---
  try {
    const csvurl =
      'https://dsc-courses.github.io/dsc209r-2025-fa/labs/lab07/data/bluebikes-traffic-2024-03.csv';
    trips = await d3.csv(csvurl, (trip) => {
      // OPTIONAL now, but handy for 7.5.3:
      trip.started_at = new Date(trip.started_at);
      trip.ended_at = new Date(trip.ended_at);
      return trip;
    });
    console.log('Loaded CSV Data:', trips.length);
  } catch (error) {
    console.error('Error loading CSV:', error);
  }

  // --- Combine: arrivals / departures / totalTraffic ---
  stations = computeStationTraffic(stations, trips);
  console.log('Stations with traffic:', stations);

  // Everything below here can stay as-is, starting with:
  // const svg = d3.select('#map').select('svg');

  // Check the BlueBikes stations array is loaded
  // let stations = jsonData.data.stations; removed for 7.5.3
  // const stations = computeStationTraffic(jsonData.data.stations, trips);

  // console.log('Stations Array:', stations);

  // const svg = d3.select('#map').select('svg');
  // // BIG, OBVIOUS SHAPES for debug
  // svg.append('rect')
  //   .attr('x', 20).attr('y', 20)
  //   .attr('width', 200).attr('height', 120)
  //   .attr('fill', 'rgba(0,200,0,0.5)');

  // svg.append('circle')
  //   .attr('cx', 140).attr('cy', 80).attr('r', 40)
  //   .attr('fill', 'red').attr('stroke', 'white').attr('stroke-width', 3);

  const svg = d3
    .select('#map')
    .append('svg')
    .style('position', 'absolute')
    .style('z-index', 10)
    .style('width', '100%')
    .style('height', '100%')
    .style('pointer-events', 'none');

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
  // let trips;
  // try {
  //   const csvurl = 'https://dsc-courses.github.io/dsc209r-2025-fa/labs/lab07/data/bluebikes-traffic-2024-03.csv';
  //   // Await CSV fetch
  //   trips = await d3.csv(csvurl);
  //   console.log('Loaded CSV Data:', trips); // Log to verify structure
  // } catch (error) {
  //   console.error('Error loading CSV:', error); // Handle errors
  // }

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


  const stationFlow = d3.scaleQuantize().domain([0, 1]).range([0, 0.5, 1]);
    // Append circles to the SVG for each station
  const circles = svg
    .selectAll('circle')
    .data(stations, (d) => d.short_name)
    .enter()
    .append('circle')
    .attr('fill', 'Navy') // Circle fill color
    .attr('stroke', 'white') // Circle border color
    .attr('stroke-width', 1.5) // Circle border thickness
    .attr('r', (d) => radiusScale(d.totalTraffic)) // Radius from 7.4.3
    .attr('opacity', 0.8) // Circle opacity
    .style('--departure-ratio', (d) => {
    if (!d.totalTraffic) return 0.5; // show “Balanced” for no-traffic stations
    return stationFlow(d.departures / d.totalTraffic);})
    
    // mouse functions
    .on('mouseover', function(event, d) {
      d3.select(this)
        .transition()
        .duration(150)
        .attr('fill', 'Crimson')
        .attr('r', radiusScale(d.totalTraffic) * 1.7);
      
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

  // -- 7.5.2 THE TIME SLIDER STUFF//

  const timeSlider = document.getElementById('time-slider');
  const selectedTime = document.getElementById('selected-time');
  const anyTimeLabel = document.getElementById('any-time');

  function formatTime(minutes) {
  const date = new Date(0, 0, 0, 0, minutes); // Set hours & minutes
  return date.toLocaleString('en-US', { timeStyle: 'short' }); // Format as HH:MM AM/PM
  }

  function updateTimeDisplay() {
    // Get numeric slider value
    const timeFilter = Number(timeSlider.value);

    // Case: any time (-1)
    if (timeFilter === -1) {
      selectedTime.textContent = '11:59PM'; // bad practice but this is the way it's in examples 
      anyTimeLabel.style.display = 'none'; // Optional if you're removing separate label
    } 
    else {
      // Show formatted time, e.g., "2:38 PM"
      selectedTime.textContent = formatTime(timeFilter);
      anyTimeLabel.style.display = 'none';
    }

    // Update circles based on the chosen time
    updateScatterPlot(timeFilter);
  }

  timeSlider.addEventListener('input', updateTimeDisplay);
  updateTimeDisplay();

function updateScatterPlot(timeFilter) {
  const filteredTrips = filterTripsbyTime(trips, timeFilter);
  const filteredStations = computeStationTraffic(stations, filteredTrips);

  if (timeFilter === -1) {
    radiusScale.range([0, 25]);
  } else {
    radiusScale.range([3, 50]);
  }

  circles
    .data(filteredStations, (d) => d.short_name)
    .transition()
    .duration(300)
    .attr('r', (d) => radiusScale(d.totalTraffic || 0))
    .style('--departure-ratio', (d) => {
      if (!d.totalTraffic) return 0.5;      // show “Balanced” if no trips
      return stationFlow(d.departures / d.totalTraffic);
    });
}


});