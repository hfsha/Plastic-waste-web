let rawData = [];
let filteredData = [];

// Dark Mode Toggle
document.addEventListener('DOMContentLoaded', function() {
    const darkModeToggle = document.getElementById('darkModeToggle');
    
    // Check for saved dark mode preference
    const darkMode = localStorage.getItem('darkMode');
    if (darkMode === 'enabled') {
        document.body.classList.add('dark-mode');
    }
    
    // Toggle dark mode
    darkModeToggle.addEventListener('click', function() {
        document.body.classList.toggle('dark-mode');
        
        // Save preference
        if (document.body.classList.contains('dark-mode')) {
            localStorage.setItem('darkMode', 'enabled');
        } else {
            localStorage.setItem('darkMode', 'disabled');
        }
    });
});

// Fetch data from backend API
async function fetchData() {
  const res = await fetch('/api/data');
  const data = await res.json();
  rawData = data;
  filteredData = data;
}

// Populate Main Sources filter dropdown dynamically
function populateSourceFilter() {
  const sourceFilter = document.getElementById('sourceFilter');
  sourceFilter.querySelectorAll('option:not([value="All"])').forEach(opt => opt.remove());
  const sources = [...new Set(rawData.map(d => d.Main_Sources))].sort();
  for (const source of sources) {
    const option = document.createElement('option');
    option.value = source;
    option.textContent = source.replace(/_/g, ' ');
    sourceFilter.appendChild(option);
  }
}

// Update labels for sliders
function updateRecyclingRateLabel() {
  const val = document.getElementById('recyclingRateFilter').value;
  document.getElementById('recyclingRateValue').textContent = val + '%';
}

function updateTotalWasteLabel() {
  const val = document.getElementById('totalWasteFilter').value;
  document.getElementById('totalWasteValue').textContent = val;
}

// Filter data based on UI selections
function filterData() {
  const risk = document.getElementById('riskFilter').value;
  const source = document.getElementById('sourceFilter').value;
  const recyclingRateMax = parseInt(document.getElementById('recyclingRateFilter').value, 10);
  const totalWasteMax = parseInt(document.getElementById('totalWasteFilter').value, 10);

  filteredData = rawData.filter(d => {
    const riskMatch = (risk === 'All') || (d.Coastal_Waste_Risk === risk);
    const sourceMatch = (source === 'All') || (d.Main_Sources === source);
    const recyclingMatch = d.Recycling_Rate <= recyclingRateMax;
    const totalWasteMatch = d.Total_Plastic_Waste_MT <= totalWasteMax;
    return riskMatch && sourceMatch && recyclingMatch && totalWasteMatch;
  });
}

// Animate numeric count-up for summary cards
function animateCount(id, endValue) {
  const el = document.getElementById(id);
  let start = 0;
  const duration = 800;
  const stepTime = 15;
  const increment = endValue / (duration / stepTime);

  function step() {
    start += increment;
    if (start >= endValue) {
      el.textContent = endValue.toFixed(id === 'avgRecyclingRate' ? 1 : 2);
    } else {
      el.textContent = start.toFixed(id === 'avgRecyclingRate' ? 1 : 2);
      requestAnimationFrame(step);
    }
  }
  step();
}

// Update summary cards with filtered data
function updateSummaryCards(data) {
  if (data.length === 0) {
    document.getElementById('totalWasteSum').textContent = '-';
    document.getElementById('avgRecyclingRate').textContent = '-';
    document.getElementById('avgPerCapitaWaste').textContent = '-';
    return;
  }

  const totalWasteSum = data.reduce((sum, d) => sum + d.Total_Plastic_Waste_MT, 0);
  const avgRecyclingRate = data.reduce((sum, d) => sum + d.Recycling_Rate, 0) / data.length;
  const avgPerCapitaWaste = data.reduce((sum, d) => sum + d.Per_Capita_Waste_KG, 0) / data.length;

  animateCount('totalWasteSum', totalWasteSum);
  animateCount('avgRecyclingRate', avgRecyclingRate);
  animateCount('avgPerCapitaWaste', avgPerCapitaWaste);
}

// Bar chart: Total Plastic Waste by Country
function countryBarChart(data) {
  const countries = data.map(d => d.Country);
  const totalWaste = data.map(d => d.Total_Plastic_Waste_MT);
  const colors = data.map(d => riskColor(d.Coastal_Waste_Risk));
  // const risks = data.map(d => d.Coastal_Waste_Risk); // Get the risk levels

  // Create text for hover
  const hoverText = data.map(d => 
    `<b>${d.Country}</b><br>Total Waste: ${d.Total_Plastic_Waste_MT.toFixed(2)} MT<br>Risk: ${d.Coastal_Waste_Risk}`
  );

  const trace = {
    x: countries,
    y: totalWaste,
    type: 'bar',
    marker: { color: colors },
    // customdata: risks, // Add risk levels to customdata - Removed
    // hovertemplate: // Removed
    //   '<b>%{x}</b><br>Total Waste: %{y} MT<br>Risk: %{customdata[0]}<extra></extra>', 
    text: hoverText, // Use pre-formatted text for hover
    hoverinfo: 'text', // Tell Plotly to use the text property for hover
  };

  const layout = {
    title: 'Total Plastic Waste by Country',
    xaxis: { title: 'Country', tickangle: -45, automargin: true },
    yaxis: { title: 'Total Plastic Waste (Million Tonnes)' },
    margin: { t: 40, r: 20, b: 100, l: 60, autoexpand: true },
    height: 400,
  };

  Plotly.newPlot('chart-country-bar', [trace], layout, { responsive: true });
}

// Bubble chart: Per Capita Waste vs Recycling Rate
function bubbleChart(data) {
  const x = data.map(d => d.Recycling_Rate);
  const y = data.map(d => d.Per_Capita_Waste_KG);
  const size = data.map(d => Math.sqrt(d.Total_Plastic_Waste_MT) * 7);
  const color = data.map(d => riskColor(d.Coastal_Waste_Risk));
  const text = data.map(d => `${d.Country}<br>Risk: ${d.Coastal_Waste_Risk}`);

  const trace = {
    x,
    y,
    text,
    mode: 'markers',
    marker: {
      size,
      color,
      sizemode: 'area',
      sizeref: 2.5 * Math.max(...size) / (100 ** 2),
      sizemin: 4,
      line: { width: 1, color: '#333' },
    },
    type: 'scatter',
  };

  const layout = {
    title: '',
    xaxis: { title: 'Recycling Rate (%)', range: [0, 105], automargin: true },
    yaxis: { title: 'Per Capita Waste (KG)', automargin: true },
    height: 375,          // increased height from 400 to 500
    width: 430,           // optionally add width for wider chart
    margin: { t: 50, r: 30, b: 80, l: 70, autoexpand: true },  // adjusted margins for bigger size
  };

  Plotly.newPlot('chart-bubble', [trace], layout, { responsive: true });
}

// Violin plot: Recycling Rate distribution by Risk
function violinPlot(data) {
  const risks = ['High', 'Medium', 'Low'];
  const traces = risks.map(risk => ({
    type: 'violin',
    y: data.filter(d => d.Coastal_Waste_Risk === risk).map(d => d.Recycling_Rate),
    name: risk,
    line: { color: riskColor(risk) },
    box: { visible: true },
    meanline: { visible: true },
    points: 'all',
    jitter: 0.3,
    scalemode: 'count',
  }));

  const layout = {
    title: '',
    yaxis: { title: 'Recycling Rate (%)', zeroline: false, automargin: true },
    height: 375,          // increased height from 400 to 500
    width: 430,           // optionally add width for wider chart
    margin: { t: 50, r: 30, b: 80, l: 70, autoexpand: true },  // adjusted margins
  };

  Plotly.newPlot('chart-violin', traces, layout, { responsive: true });
}


// Pie chart: Plastic Waste by Main Source
function mainSourcePieChart(data) {
  const sourceMap = {};
  data.forEach(d => {
    const source = d.Main_Sources || 'Unknown';
    if (!sourceMap[source]) sourceMap[source] = 0;
    sourceMap[source] += d.Total_Plastic_Waste_MT;
  });

  const labels = Object.keys(sourceMap);
  const values = labels.map(label => sourceMap[label]);

  const colors = [
    '#3b82f6', '#60a5fa', '#2563eb', '#93c5fd', '#1e40af',
    '#f59e0b', '#d97706', '#b45309', '#f87171', '#ef4444',
    '#22c55e', '#16a34a', '#86efac', '#047857', '#b91c1c'
  ];

  const trace = {
    type: 'pie',
    labels,
    values,
    marker: { colors },
    textinfo: 'percent+label',
    hoverinfo: 'label+value+percent',
    hole: 0.4,
    insidetextorientation: 'radial',
  };

  const layout = {
    title: 'Plastic Waste by Main Source',
    height: 420,
    margin: { t: 50, b: 100, l: 100, r: 100 }, // more side margin for centering and spacing
    font: { size: 12 },
    legend: { 
      orientation: "h", 
      yanchor: "top", 
      y: -0.7,  // legend below pie chart
      xanchor: "center", 
      x: 0.5,
      font: { size: 11 }
    },
  };

  Plotly.newPlot('chart-main-source-pie', [trace], layout, { responsive: true });
}



// Treemap: Waste Distribution by Main Source and Risk
function treemapChart(data) {
  // Helper to normalize risk level
  function normalizeRisk(risk) {
    if (risk === 'Very_High') return 'High';
    return risk;
  }

  const processedData = [];

  data.forEach(d => {
    if (!processedData.find(item => item.id === d.Main_Sources)) {
      processedData.push({
        id: d.Main_Sources,
        parent: '',
        name: d.Main_Sources.replace(/_/g, ' '),
        value: 0,
      });
    }
    const normalizedRisk = normalizeRisk(d.Coastal_Waste_Risk);

    processedData.push({
      id: `${d.Main_Sources}-${d.Country}-${normalizedRisk}`,
      parent: d.Main_Sources,
      name: `${d.Country} (${normalizedRisk})`,
      value: d.Total_Plastic_Waste_MT,
    });
  });

  const trace = {
    type: 'treemap',
    ids: processedData.map(d => d.id),
    labels: processedData.map(d => d.name),
    parents: processedData.map(d => d.parent),
    values: processedData.map(d => d.value > 0 ? d.value : 0),
    pathbar: { visible: false },
    hoverinfo: 'label+value',
    textinfo: 'label+value',
    tiling: { // fixed typo: 'Tiling' -> 'tiling'
      orientation: "v",
    },
    marker: {
      colors: processedData.map(d => {
        if (d.parent === '') return '#a5b4fc';
        // Find original data using normalized risk in id
        const originalData = data.find(item => {
          // Normalize risk here too for matching
          const normalizedRisk = normalizeRisk(item.Coastal_Waste_Risk);
          return `${item.Main_Sources}-${item.Country}-${normalizedRisk}` === d.id;
        });
        if (originalData) {
          const riskLevel = normalizeRisk(originalData.Coastal_Waste_Risk);
          switch (riskLevel) {
            case 'High': return '#dc2626';
            case 'Medium': return '#f97316';
            case 'Low': return '#22c55e';
            default: return '#dc2626';
          }
        }
        return '#64748b';
      }),
    },
    hovertemplate: '<b>%{label}</b><br>Waste: %{value:.2f} MT<extra></extra>',
  };

  const layout = {
    title: 'Waste Distribution by Main Source and Country/Risk',
    height: 450,
    margin: { t: 50, b: 20, l: 10, r: 10 },
  };

  Plotly.newPlot('chart-treemap', [trace], layout, { responsive: true });
}

let map;
function initMap(data) {
  console.log("initMap called with data:", data); // Log data

  if (map) {
    map.remove();
    map = null;
  }

  map = L.map('map', {
    zoomControl: true,
    scrollWheelZoom: true,
    doubleClickZoom: true,
    boxZoom: true,
    keyboard: true,
    dragging: true,
    animate: true,
    zoomAnimation: true,
    fadeAnimation: true,
    markerZoomAnimation: true
  }).setView([20, 0], 2);

  // Add zoom controls
  L.control.zoom({
    position: 'bottomright'
  }).addTo(map);

  // Add fullscreen control
  L.control.fullscreen({
    position: 'bottomright'
  }).addTo(map);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 18,
  }).addTo(map);

  const countryCoords = {
    'China': [35.8617, 104.1954],
    'United States': [37.0902, -95.7129],
    'India': [20.5937, 78.9629],
    'Japan': [36.2048, 138.2529],
    'Germany': [51.1657, 10.4515],
    'Brazil': [-14.235, -51.9253],
    'Australia': [-25.2744, 133.7751],
    'Indonesia': [-0.7893, 100.1740],
    'Russia': [61.5240, 105.3188],
    'United Kingdom': [55.3781, -3.4360],
    'France': [46.2276, 2.2137],
    'Mexico': [23.6345, -102.5528],
    'Canada': [56.1304, -106.3468],
    'Italy': [41.8719, 12.5674],
    'Turkey': [38.9637, 35.2433],
    'South Korea': [35.9078, 128.2676],
    'Spain': [40.4637, -3.7492],
    'Vietnam': [14.0583, 108.2772],
    'Thailand': [15.8700, 100.9925],
    'Malaysia': [4.2105, 101.9758],
    'Poland': [51.9194, 19.1451],
    'Egypt': [26.8206, 30.8025],
    'Argentina': [-38.4161, -63.6167],
    'Netherlands': [52.1326, 5.2913],
    'Saudi Arabia': [24.7743, 46.7386],
    'Philippines': [12.8797, 121.7740],
    'Bangladesh': [23.6850, 90.3563],
    'Pakistan': [30.3753, 69.3451],
    'South Africa': [-30.5595, 22.9375],
    'Colombia': [4.5709, -74.2973],
    'Nigeria': [9.0820, 8.6753],
    'Belgium': [50.5039, 4.4699],
    'Sweden': [60.1282, 18.6435],
    'Austria': [47.5162, 14.5501],
    'Ukraine': [48.3794, 31.1656],
    'Greece': [39.0742, 21.8243],
    'Czech Republic': [49.8175, 15.4730],
    'Romania': [45.9432, 24.9668],
    'Portugal': [39.3999, -8.2245],
    'Hungary': [47.1625, 19.5033],
    'Denmark': [56.2639, 9.5018],
    'Finland': [61.9241, 25.7482],
    'Norway': [60.4720, 8.4689],
    'Ireland': [53.1424, -7.6921],
    'Singapore': [1.3521, 103.8198],
    'Chile': [-35.6751, -71.5430],
    'Peru': [-9.1900, -75.0152],
    'Kazakhstan': [48.0196, 66.9237],
    'Morocco': [31.7917, -7.0926],
    'Algeria': [28.0339, 1.6596],
    'Slovakia': [48.6690, 19.6990],
    'Ecuador': [-1.8312, -78.1834],
    'Belarus': [53.7098, 27.9534],
    'Dominican Republic': [18.7357, -70.1627],
    'Bulgaria': [42.7339, 25.4858],
    'Tunisia': [33.8869, 9.5375],
    'Sri Lanka': [7.8731, 80.7718],
    'Azerbaijan': [40.1431, 47.5769],
    'Croatia': [45.1000, 15.2000],
    'Uruguay': [-32.5228, -55.7658],
    'Lithuania': [55.1694, 23.8813],
    'Slovenia': [46.1512, 14.9955],
    'Costa Rica': [9.7489, -83.7534],
    'Panama': [8.5380, -80.7821],
    'Kuwait': [29.3117, 47.4818],
    'Jordan': [30.5852, 36.2384],
    'Lebanon': [33.8547, 35.8623],
    'Oman': [20.5937, 55.7954],
    'Bolivia': [-16.2902, -63.5887],
    'Paraguay': [-23.4425, -58.4438],
    'Latvia': [56.8796, 24.6032],
    'Estonia': [58.5953, 25.0136],
    'Bahrain': [25.9304, 50.6377],
    'Trinidad and Tobago': [10.6918, -61.2225],
    'Cyprus': [35.1264, 33.4299],
    'Montenegro': [42.7087, 19.3744],
    'Luxembourg': [49.8153, 6.1296],
    'Malta': [35.9375, 14.5146],
    'Iceland': [64.9631, -19.0208],
    'Qatar': [25.3548, 51.4419],
    'Cambodia': [12.5657, 104.9910],
    'Myanmar': [20.6796, 95.9562],
    'Laos': [19.8563, 102.4955],
    'Mongolia': [46.8625, 103.8467],
    'Afghanistan': [33.9391, 67.7100],
    'Yemen': [15.5527, 48.5164],
    'Syria': [34.8021, 38.9968],
    'Iraq': [33.3152, 44.3661],
    'Libya': [26.3351, 17.2283],
    'Sudan': [12.8628, 30.2176],
    'Somalia': [10.6870, 49.0379],
    'Ethiopia': [9.1450, 40.4897],
    'Kenya': [-0.0236, 37.9083],
    'Tanzania': [-6.3690, 34.8888],
    'Uganda': [1.3733, 32.2903],
    'Rwanda': [-1.9403, 29.8739],
    'Burundi': [-3.3731, 29.9189],
    'Malawi': [-13.2543, 34.3015],
    'Mozambique': [-18.6657, 35.5296],
    'Zimbabwe': [-19.0154, 29.1549],
    'Zambia': [-13.1339, 27.8493],
    'Angola': [-11.2027, 17.8739],
    'Namibia': [-22.9576, 18.4904],
    'Botswana': [-22.3285, 24.6849],
    'Lesotho': [-29.6099, 28.2336],
    'Eswatini': [-26.5225, 31.4659],
    'Madagascar': [-18.7669, 46.8691],
    'Comoros': [-11.6455, 43.3333],
    'Mauritius': [-20.3484, 57.5522],
    'Seychelles': [-4.6796, 55.4920],
    'Cape Verde': [16.5388, -23.0418],
    'Sao Tome and Principe': [0.1864, 6.6131],
    'Guinea-Bissau': [11.8037, -15.1804],
    'Guinea': [9.9456, -9.6966],
    'Sierra Leone': [8.4606, -11.7799],
    'Liberia': [6.4281, -9.4295],
    'Ivory Coast': [7.5400, -5.5471],
    'Ghana': [7.9465, -1.0232],
    'Togo': [8.6195, 0.8248],
    'Benin': [9.3077, 2.3158],
    'Mali': [17.5707, -3.9962],
    'Burkina Faso': [12.2383, -1.5616],
    'Niger': [17.6078, 8.0817],
    'Chad': [15.4542, 18.7322],
    'Central African Republic': [6.6111, 20.9394],
    'Cameroon': [7.3697, 12.3547],
    'Gabon': [-0.8037, 11.6094],
    'Republic of Congo': [-0.2280, 15.8280],
    'Democratic Republic of Congo': [-4.0383, 21.7587],
    'Eritrea': [15.1794, 39.7823],
    'Djibouti': [11.8251, 42.5903],
    'Senegal': [14.4974, -14.4524],
    'Gambia': [13.4432, -15.3101],
    'Mauritania': [21.0079, -10.9408],
    'Western Sahara': [24.2155, -12.8858],
    'Moldova': [47.4116, 28.3699],
    'Albania': [41.1533, 20.1683],
    'North Macedonia': [41.6086, 21.7453],
    'Bosnia and Herzegovina': [43.9159, 17.6791],
    'Kosovo': [42.6026, 20.9030],
    'Georgia': [42.3154, 43.3569],
    'Armenia': [40.0691, 45.0382],
    'Kyrgyzstan': [41.2044, 74.7661],
    'Tajikistan': [38.8610, 71.2761],
    'Turkmenistan': [38.9697, 59.5563],
    'Uzbekistan': [41.3775, 64.5853],
    'Nepal': [28.3949, 84.1240],
    'Bhutan': [27.5142, 90.4336],
    'Maldives': [3.2028, 73.2207],
    'Brunei': [4.5353, 114.7277],
    'East Timor': [-8.8742, 125.7275],
    'Papua New Guinea': [-6.3149, 143.9555],
    'Solomon Islands': [-9.6457, 160.1562],
    'Vanuatu': [-15.3768, 166.9592],
    'New Caledonia': [-20.9043, 165.6180],
    'Fiji': [-17.7134, 178.0650],
    'Samoa': [-13.7590, -172.1046],
    'Tonga': [-20.0350, -174.8249],
    'Kiribati': [1.8369, 154.9316],
    'Marshall Islands': [7.1053, 171.8483],
    'Micronesia': [7.4256, 150.5508],
    'Palau': [7.5150, 134.5825],
    'Tuvalu': [-7.1095, 177.6493],
    'Nauru': [-0.5228, 166.9315],
  };

  data.forEach(d => {
    console.log(`Processing country: ${d.Country}`); // Log country being processed
    const coords = countryCoords[d.Country];
    if (!coords) {
        console.warn(`Coordinates not found for ${d.Country}`);
        return; // Skip this country if coordinates are missing
    }
    console.log(`Found coordinates for ${d.Country}: ${coords}`); // Log found coordinates

    const color = riskColor(d.Coastal_Waste_Risk);
    const radius = Math.max(5, Math.sqrt(d.Total_Plastic_Waste_MT) * 5);
    console.log(`Color for ${d.Country}: ${color}, Radius: ${radius}`); // Log color and radius

    L.circleMarker(coords, {
      color: color,
      fillColor: color,
      fillOpacity: 0.7,
      radius: radius,
      weight: 1.5,
    })
      .addTo(map)
      .bindPopup(
        `<b>${d.Country}</b><br>Waste: ${d.Total_Plastic_Waste_MT.toFixed(
          2
        )} MT<br>Risk: <span style="color:${color}; font-weight:bold;">${d.Coastal_Waste_Risk}</span>`
      );
  });
}

function riskColor(risk) {
  switch (risk) {
    case 'High': return '#d62728'; // Red
    case 'Medium': return '#ff7f0e'; // Orange
    case 'Low': return '#2ca02c'; // Green
    default: return '#7f7f7f'; // Gray
  }
}

async function initDashboard() {
  await fetchData();
  populateSourceFilter();
  updateRecyclingRateLabel();
  updateTotalWasteLabel();
  applyFilters();
  addChartTransitions();

  document.getElementById('riskFilter').addEventListener('change', applyFilters);
  document.getElementById('sourceFilter').addEventListener('change', applyFilters);
  document.getElementById('recyclingRateFilter').addEventListener('input', () => {
    updateRecyclingRateLabel();
    applyFilters();
  });
  document.getElementById('totalWasteFilter').addEventListener('input', () => {
    updateTotalWasteLabel();
    applyFilters();
  });

  // Clear Filters button functionality
  document.getElementById('clearFiltersBtn').addEventListener('click', () => {
    // Reset dropdowns
    document.getElementById('riskFilter').value = 'All';
    document.getElementById('sourceFilter').value = 'All';

    // Reset sliders
    document.getElementById('recyclingRateFilter').value = 100;
    document.getElementById('totalWasteFilter').value = 500;

    // Update slider labels
    updateRecyclingRateLabel();
    updateTotalWasteLabel();

    // Apply filters to update visualizations
    applyFilters();
  });
}

// Anomaly Detection Functions
function calculateMean(arr) {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function calculateStdDev(arr, mean) {
  const squareDiffs = arr.map(value => {
    const diff = value - mean;
    return diff * diff;
  });
  return Math.sqrt(calculateMean(squareDiffs));
}

function detectAnomalies(data, metric, threshold) {
  const values = data.map(d => d[metric]);
  const mean = calculateMean(values);
  const stdDev = calculateStdDev(values, mean);
  
  return data.map((d, index) => {
    const value = d[metric];
    const zScore = Math.abs((value - mean) / stdDev);
    return {
      ...d,
      isAnomaly: zScore > threshold,
      zScore: zScore,
      deviation: value - mean
    };
  });
}

function updateAnomalyChart(data, metric, threshold) {
  const anomalies = detectAnomalies(data, metric, threshold);
  const values = data.map(d => d[metric]);
  const mean = calculateMean(values);
  const stdDev = calculateStdDev(values, mean);
  
  const upperBound = mean + (threshold * stdDev);
  const lowerBound = mean - (threshold * stdDev);

  const trace = {
    x: data.map(d => d.Country),
    y: data.map(d => d[metric]),
    type: 'scatter',
    mode: 'markers',
    name: 'Values',
    marker: {
      size: 10,
      color: anomalies.map(a => a.isAnomaly ? '#dc2626' : '#4f46e5'),
      line: {
        width: 2,
        color: '#ffffff'
      }
    }
  };

  const upperBoundTrace = {
    x: data.map(d => d.Country),
    y: Array(data.length).fill(upperBound),
    type: 'scatter',
    mode: 'lines',
    name: 'Upper Bound',
    line: {
      color: '#ef4444',
      dash: 'dash'
    }
  };

  const lowerBoundTrace = {
    x: data.map(d => d.Country),
    y: Array(data.length).fill(lowerBound),
    type: 'scatter',
    mode: 'lines',
    name: 'Lower Bound',
    line: {
      color: '#ef4444',
      dash: 'dash'
    }
  };

  const layout = {
    title: `${metric.replace(/_/g, ' ')} Anomaly Detection`,
    xaxis: {
      title: 'Country',
      tickangle: -45,
      automargin: true
    },
    yaxis: {
      title: metric.replace(/_/g, ' '),
      automargin: true
    },
    margin: { t: 50, r: 30, b: 100, l: 70 },
    height: 400,
    showlegend: true,
    legend: {
      x: 0,
      y: 1.1,
      orientation: 'h'
    }
  };

  Plotly.newPlot('chart-anomaly', [trace, upperBoundTrace, lowerBoundTrace], layout, { responsive: true });
  updateAnomalyList(anomalies, metric);
}

function updateAnomalyList(anomalies, metric) {
  const anomalyItems = document.getElementById('anomalyItems');
  const detectedAnomalies = anomalies.filter(a => a.isAnomaly);
  
  if (detectedAnomalies.length === 0) {
    anomalyItems.innerHTML = '<div class="list-group-item">No anomalies detected</div>';
    return;
  }

  anomalyItems.innerHTML = detectedAnomalies
    .sort((a, b) => b.zScore - a.zScore)
    .map(a => `
      <div class="list-group-item d-flex justify-content-between align-items-center">
        <div>
          <strong>${a.Country}</strong>
          <br>
          <small class="text-muted">
            ${metric.replace(/_/g, ' ')}: ${a[metric].toFixed(2)}
            (${a.deviation > 0 ? '+' : ''}${a.deviation.toFixed(2)} from mean)
          </small>
        </div>
        <span class="badge bg-danger rounded-pill">
          ${a.zScore.toFixed(2)}σ
        </span>
      </div>
    `).join('');
}

// Update applyFilters function to include anomaly detection
function applyFilters() {
  filterData();
  updateSummaryCards(filteredData);
  countryBarChart(filteredData);
  bubbleChart(filteredData);
  violinPlot(filteredData);
  mainSourcePieChart(filteredData);
  treemapChart(filteredData);
  initMap(filteredData);
  
  // Add anomaly detection
  const metric = document.getElementById('anomalyMetric').value;
  const threshold = parseFloat(document.getElementById('anomalyThreshold').value);
  updateAnomalyChart(filteredData, metric, threshold);
}

// Prediction page logic with loading spinner & colored badges
function initPrediction() {
  const form = document.getElementById('predict-form');
  const resultDiv = document.getElementById('result');
  const clearBtn = document.getElementById('clearBtn');
  const predictBtn = document.getElementById('predictBtn');
  const spinner = predictBtn.querySelector('.spinner-border');
  const btnText = predictBtn.querySelector('.btn-text');

  form.addEventListener('submit', async e => {
    e.preventDefault();

    if (!form.checkValidity()) {
        e.stopPropagation();
        form.classList.add('was-validated');
        return;
    }
    form.classList.remove('was-validated');

    predictBtn.disabled = true;
    spinner.classList.remove('d-none');
    btnText.textContent = 'Predicting...';
    resultDiv.classList.remove('visible');
    resultDiv.innerHTML = '';

    const inputData = {
      Total_Plastic_Waste_MT: parseFloat(document.getElementById('Total_Plastic_Waste_MT').value),
      Main_Sources: document.getElementById('Main_Sources').value,
      Recycling_Rate: parseFloat(document.getElementById('Recycling_Rate').value),
      Per_Capita_Waste_KG: parseFloat(document.getElementById('Per_Capita_Waste_KG').value),
    };

    try {
      const response = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inputData),
      });
      const result = await response.json();

      if (result.success) {
        let colorClass = 'badge-low';
        if (result.prediction === 'High') colorClass = 'badge-high';
        else if (result.prediction === 'Medium') colorClass = 'badge-medium';

        const bgColor =
  colorClass === 'badge-high' ? '#dc2626' :
  colorClass === 'badge-medium' ? '#f97316' :
  '#22c55e';

let html = `<h4>Predicted Waste Risk: <span class="badge ${colorClass} bounce-in" style="background-color: ${bgColor}; color: white;">${result.prediction}</span></h4>`;

        resultDiv.innerHTML = html;
        resultDiv.classList.add('visible');
      } else {
        resultDiv.innerHTML = `<div class="alert alert-danger">Error: ${result.error}</div>`;
        resultDiv.classList.add('visible');
      }
    } catch (err) {
      resultDiv.innerHTML = `<div class="alert alert-danger">Request failed: ${err.message}</div>`;
      resultDiv.classList.add('visible');
    } finally {
      predictBtn.disabled = false;
      spinner.classList.add('d-none');
      btnText.textContent = 'Predict Risk';
    }
  });

  clearBtn.addEventListener('click', () => {
    form.reset();
    form.classList.remove('was-validated');
    resultDiv.innerHTML = '';
    resultDiv.classList.remove('visible');
  });
}

document.addEventListener('DOMContentLoaded', () => {
  initDashboard();
  initPrediction();

  const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
  tooltipTriggerList.map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));

  // Anomaly detection event listeners
  document.getElementById('anomalyMetric').addEventListener('change', () => {
    const metric = document.getElementById('anomalyMetric').value;
    const threshold = parseFloat(document.getElementById('anomalyThreshold').value);
    updateAnomalyChart(filteredData, metric, threshold);
  });

  document.getElementById('anomalyThreshold').addEventListener('input', (e) => {
    document.getElementById('thresholdValue').textContent = e.target.value;
    const metric = document.getElementById('anomalyMetric').value;
    const threshold = parseFloat(e.target.value);
    updateAnomalyChart(filteredData, metric, threshold);
  });
});

// Add smooth transitions for all charts
function addChartTransitions() {
  const chartElements = document.querySelectorAll('[id^="chart-"]');
  chartElements.forEach(chart => {
    chart.style.transition = 'all 0.5s ease-in-out';
  });
}
