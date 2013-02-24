
var width = 1800,
    height = 1200,
    svg = d3.select('#graph')
        .append('svg')
        .attr({width: width,
               height: height});

var projection = d3.geo.equirectangular()
        .center([8, 56])
        .scale(1200);

queue()
    .defer(d3.json, 'data/water.json')
    .defer(d3.json, 'data/land.json')
    .defer(d3.json, 'data/cultural.json')
    .await(draw);

function add_to_map(collection, key) {
    return svg.append('g')
        .selectAll('path')
        .data(topojson.object(collection, 
                              collection.objects[key]).geometries)
        .enter()
        .append('path')
        .attr('d', d3.geo.path().projection(projection));
}

function draw (err, water, land, cultural) {
   add_to_map(water, 'ne_50m_ocean')
        .classed('ocean', true);

    add_to_map(land, 'ne_50m_land')
        .classed('land', true);

    add_to_map(water, 'ne_50m_rivers_lake_centerlines')
        .classed('river', true);

    add_to_map(cultural, 'ne_50m_admin_0_boundary_lines_land')
        .classed('boundary', true);

//    add_to_map(cultural, 'ne_10m_urban_areas')
//        .classed('urban', true);

    add_airlines();
};


function add_airlines() {
    queue()
        .defer(d3.text, 'data/airports.dat')
        .defer(d3.text, 'data/routes.dat')
        .await(draw_airlines);
};

function draw_airlines(err, _airports, _routes) {
    var airports = {},
        routes = {};

    d3.csv.parseRows(_airports).forEach(function (airport) {
        var id = airport[0];

        airports[id] = {
            lat: airport[6],
            lon: airport[7]
        };
    });

    d3.csv.parseRows(_routes).forEach(function (route) {
        var from_airport = route[3];

        if (!routes[from_airport]) {
            routes[from_airport] = [];
        }

        routes[from_airport].push({
            to: route[5],
            from: from_airport,
            stops: route[7]
        });
    });

    var route_N = d3.values(routes).map(function (routes) {
        return routes.length;
    }),
        R = d3.scale.linear().domain([d3.min(route_N), d3.max(route_N)]).range([2, 15]);

    var route = d3.svg.diagonal()
            .source(function (route) {
                var from_airport = airports[route.from];
                //console.log('source', projection([from_airport.lon, from_airport.lat]));
                var p = projection([from_airport.lon, from_airport.lat]);
                return {x: p[0], y: p[1]};
            })
            .target(function (route) {
                var to_airport = airports[route.to];
                //console.log(route);
                //console.log('target', projection([to_airport.lon, to_airport.lat]));
                var p = projection([to_airport.lon, to_airport.lat]);
                return {x: p[0], y: p[1]};
            });
          //  .projection(function (d) {
                //console.log(typeof d == Array);
                //return projection(d);
            //});
    
   svg.append('g')
        .selectAll('circle')
        .data(d3.keys(airports))
        .enter()
        .append('circle')
        .attr("transform", function (id) {
            var airport = airports[id];
            return "translate("+projection([airport.lon, airport.lat])+")";
        })
        .attr('r', function (id) { return routes[id] ? R(routes[id].length) : 1; })
        .classed('airport', true);

    svg.append('g')
        .selectAll('g')
        .data(d3.merge(d3.values(routes)).filter(function (d) {
            return Number(d.to) && Number(d.from);
        }))
        .enter()
        .append('path')
        .attr('d', route)
        .classed('route', true);
}
