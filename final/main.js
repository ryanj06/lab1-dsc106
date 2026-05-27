// The Death of the Midrange — interactive prototype (D3 v7)
// Data: season-level league aggregates derived from the NBA Games Dataset
// (Nathan Lauga, Kaggle, games_details.csv). Numbers are league averages per
// season; champion bar values come directly from our static analysis.

// ---- Season-level league averages, 2003–2021 ----
// threePApg  = three-point attempts per game (league avg)
// threePAR   = 3PA as a share of all field-goal attempts (%)
// ptsPerFGA  = points scored per field-goal attempt (efficiency)
// Computed from games_details.csv joined to games.csv (SEASON) via
// final/build_data.py. 2022 omitted (partial season in the source data).
const SEASONS = [
  { season: 2003, threePApg: 14.9, threePAR: 18.7, ptsPerFGA: 1.169 },
  { season: 2004, threePApg: 15.7, threePAR: 19.7, ptsPerFGA: 1.212 },
  { season: 2005, threePApg: 15.9, threePAR: 20.2, ptsPerFGA: 1.231 },
  { season: 2006, threePApg: 16.9, threePAR: 21.3, ptsPerFGA: 1.240 },
  { season: 2007, threePApg: 17.9, threePAR: 22.1, ptsPerFGA: 1.226 },
  { season: 2008, threePApg: 18.1, threePAR: 22.5, ptsPerFGA: 1.235 },
  { season: 2009, threePApg: 18.1, threePAR: 22.3, ptsPerFGA: 1.234 },
  { season: 2010, threePApg: 18.0, threePAR: 22.3, ptsPerFGA: 1.226 },
  { season: 2011, threePApg: 18.3, threePAR: 22.6, ptsPerFGA: 1.182 },
  { season: 2012, threePApg: 20.0, threePAR: 24.4, ptsPerFGA: 1.196 },
  { season: 2013, threePApg: 21.5, threePAR: 26.1, ptsPerFGA: 1.217 },
  { season: 2014, threePApg: 22.6, threePAR: 27.1, ptsPerFGA: 1.199 },
  { season: 2015, threePApg: 24.2, threePAR: 28.7, ptsPerFGA: 1.212 },
  { season: 2016, threePApg: 27.0, threePAR: 31.7, ptsPerFGA: 1.236 },
  { season: 2017, threePApg: 29.1, threePAR: 33.9, ptsPerFGA: 1.235 },
  { season: 2018, threePApg: 32.0, threePAR: 36.0, ptsPerFGA: 1.246 },
  { season: 2019, threePApg: 34.4, threePAR: 38.9, ptsPerFGA: 1.260 },
  { season: 2020, threePApg: 35.1, threePAR: 39.3, ptsPerFGA: 1.265 },
  { season: 2021, threePApg: 35.2, threePAR: 40.1, ptsPerFGA: 1.254 },
];

// ---- Recent champions: 3PA per game (from our static analysis) ----
const CHAMPIONS = [
  { label: "2012 MIA", threePApg: 21.8 },
  { label: "2013 MIA", threePApg: 22.5 },
  { label: "2014 SAS", threePApg: 22.9 },
  { label: "2015 GSW", threePApg: 31.3 },
  { label: "2016 CLE", threePApg: 33.5 },
  { label: "2017 GSW", threePApg: 29.5 },
  { label: "2018 GSW", threePApg: 33.9 },
  { label: "2019 TOR", threePApg: 37.5 },
  { label: "2020 LAL", threePApg: 31.5 },
  { label: "2021 MIL", threePApg: 37.6 },
];

const METRICS = {
  threePAR: { label: "3PA share of all shots", unit: "%", fmt: (v) => `${v.toFixed(1)}%` },
  threePApg: { label: "Three-point attempts per game", unit: "", fmt: (v) => v.toFixed(1) },
  ptsPerFGA: { label: "Points per field-goal attempt", unit: "", fmt: (v) => v.toFixed(2) },
};

// ---- shared tooltip ----
const tooltip = d3
  .select("body")
  .append("div")
  .attr("class", "viz-tooltip")
  .style("opacity", 0);

function showTip(html, event) {
  tooltip
    .html(html)
    .style("left", `${event.pageX + 14}px`)
    .style("top", `${event.pageY - 12}px`)
    .transition()
    .duration(80)
    .style("opacity", 1);
}
function hideTip() {
  tooltip.transition().duration(120).style("opacity", 0);
}

// =====================================================================
// VIZ 1 — line chart with metric toggle + season scrubber
// =====================================================================
const lineState = { metric: "threePAR", season: 2003 };

const M = { top: 24, right: 28, bottom: 44, left: 56 };
const W = 760;
const H = 420;
const iw = W - M.left - M.right;
const ih = H - M.top - M.bottom;

const lineSvg = d3
  .select("#line-chart")
  .append("svg")
  .attr("viewBox", `0 0 ${W} ${H}`)
  .attr("class", "responsive-svg");

const g = lineSvg.append("g").attr("transform", `translate(${M.left},${M.top})`);

const x = d3.scaleLinear().domain(d3.extent(SEASONS, (d) => d.season)).range([0, iw]);
const y = d3.scaleLinear().range([ih, 0]);

const xAxisG = g.append("g").attr("class", "axis").attr("transform", `translate(0,${ih})`);
const yAxisG = g.append("g").attr("class", "axis");

g.append("text")
  .attr("class", "axis-title")
  .attr("x", iw / 2)
  .attr("y", ih + 38)
  .attr("text-anchor", "middle")
  .text("Season");

const yTitle = g
  .append("text")
  .attr("class", "axis-title")
  .attr("transform", "rotate(-90)")
  .attr("x", -ih / 2)
  .attr("y", -42)
  .attr("text-anchor", "middle");

const linePath = g.append("path").attr("class", "trend-line");
const areaPath = g.append("path").attr("class", "trend-area");
const dotsG = g.append("g");
const marker = g.append("line").attr("class", "season-marker").attr("y1", 0).attr("y2", ih);
const markerDot = g.append("circle").attr("class", "season-dot").attr("r", 6);

function drawLine() {
  const m = lineState.metric;
  const meta = METRICS[m];

  y.domain([0, d3.max(SEASONS, (d) => d[m]) * 1.1]).nice();

  xAxisG.transition().duration(400).call(d3.axisBottom(x).tickFormat(d3.format("d")).ticks(10));
  yAxisG.transition().duration(400).call(d3.axisLeft(y).ticks(6));
  yTitle.text(meta.label);

  const line = d3.line().x((d) => x(d.season)).y((d) => y(d[m])).curve(d3.curveMonotoneX);
  const area = d3.area().x((d) => x(d.season)).y0(ih).y1((d) => y(d[m])).curve(d3.curveMonotoneX);

  linePath.datum(SEASONS).transition().duration(500).attr("d", line);
  areaPath.datum(SEASONS).transition().duration(500).attr("d", area);

  const dots = dotsG.selectAll("circle").data(SEASONS);
  dots
    .join("circle")
    .attr("r", 4)
    .attr("class", "trend-dot")
    .attr("cx", (d) => x(d.season))
    .on("mouseenter", (event, d) =>
      showTip(`<strong>${d.season}</strong><br>${meta.label}: ${meta.fmt(d[m])}`, event)
    )
    .on("mousemove", (event, d) =>
      showTip(`<strong>${d.season}</strong><br>${meta.label}: ${meta.fmt(d[m])}`, event)
    )
    .on("mouseleave", hideTip)
    .transition()
    .duration(500)
    .attr("cy", (d) => y(d[m]));

  updateMarker();
}

function updateMarker() {
  const m = lineState.metric;
  const meta = METRICS[m];
  const d = SEASONS.find((s) => s.season === lineState.season);
  const px = x(lineState.season);
  marker.attr("x1", px).attr("x2", px);
  markerDot.attr("cx", px).attr("cy", y(d[m]));
  d3.select("#season-readout").text(lineState.season);
  d3.select("#line-annotation").html(
    `In <strong>${d.season}</strong>, NBA teams averaged <strong>${METRICS.threePApg.fmt(
      d.threePApg
    )}</strong> threes per game (${METRICS.threePAR.fmt(d.threePAR)} of all shots) at ` +
      `<strong>${METRICS.ptsPerFGA.fmt(d.ptsPerFGA)}</strong> points per shot.`
  );
}

// controls
d3.selectAll(".metric-toggle button").on("click", function () {
  d3.selectAll(".metric-toggle button").classed("active", false);
  d3.select(this).classed("active", true);
  lineState.metric = this.dataset.metric;
  drawLine();
});

d3.select("#season-slider").on("input", function () {
  lineState.season = +this.value;
  updateMarker();
});

drawLine();

// =====================================================================
// VIZ 2 — champions bar chart with hover
// =====================================================================
const cM = { top: 20, right: 20, bottom: 64, left: 52 };
const cW = 760;
const cH = 380;
const ciw = cW - cM.left - cM.right;
const cih = cH - cM.top - cM.bottom;

const champSvg = d3
  .select("#champ-chart")
  .append("svg")
  .attr("viewBox", `0 0 ${cW} ${cH}`)
  .attr("class", "responsive-svg");

const cg = champSvg.append("g").attr("transform", `translate(${cM.left},${cM.top})`);

const cx = d3.scaleBand().domain(CHAMPIONS.map((d) => d.label)).range([0, ciw]).padding(0.18);
const cy = d3.scaleLinear().domain([0, d3.max(CHAMPIONS, (d) => d.threePApg) * 1.1]).nice().range([cih, 0]);

cg.append("g")
  .attr("class", "axis")
  .attr("transform", `translate(0,${cih})`)
  .call(d3.axisBottom(cx))
  .selectAll("text")
  .attr("transform", "rotate(-40)")
  .attr("text-anchor", "end")
  .attr("dx", "-0.4em")
  .attr("dy", "0.3em");

cg.append("g").attr("class", "axis").call(d3.axisLeft(cy).ticks(6));

cg.append("text")
  .attr("class", "axis-title")
  .attr("transform", "rotate(-90)")
  .attr("x", -cih / 2)
  .attr("y", -38)
  .attr("text-anchor", "middle")
  .text("3PA per game");

cg.selectAll("rect")
  .data(CHAMPIONS)
  .join("rect")
  .attr("class", "champ-bar")
  .attr("x", (d) => cx(d.label))
  .attr("width", cx.bandwidth())
  .attr("y", cih)
  .attr("height", 0)
  .on("mouseenter", function (event, d) {
    d3.select(this).classed("hover", true);
    showTip(`<strong>${d.label}</strong><br>${d.threePApg} threes / game`, event);
  })
  .on("mousemove", (event, d) => showTip(`<strong>${d.label}</strong><br>${d.threePApg} threes / game`, event))
  .on("mouseleave", function () {
    d3.select(this).classed("hover", false);
    hideTip();
  })
  .transition()
  .duration(700)
  .delay((d, i) => i * 60)
  .attr("y", (d) => cy(d.threePApg))
  .attr("height", (d) => cih - cy(d.threePApg));

cg.selectAll(".bar-label")
  .data(CHAMPIONS)
  .join("text")
  .attr("class", "bar-label")
  .attr("x", (d) => cx(d.label) + cx.bandwidth() / 2)
  .attr("y", (d) => cy(d.threePApg) - 6)
  .attr("text-anchor", "middle")
  .text((d) => d.threePApg);
