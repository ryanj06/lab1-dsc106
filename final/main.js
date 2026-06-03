// The Death of the Midrange — main.js
// D3 v7 · linear regression in vanilla JS · scrollytelling

// =====================================================================
// DATA
// =====================================================================
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
  threePAR:  { label: "3PA share of all shots", unit: "%",  fmt: v => `${v.toFixed(1)}%` },
  threePApg: { label: "Three-point attempts per game", unit: "", fmt: v => v.toFixed(1) },
  ptsPerFGA: { label: "Points per field-goal attempt", unit: "", fmt: v => v.toFixed(3) },
};

const ERA_CONFIG = [
  { badge: "Era 1", title: "The Midrange Reigned",       desc: "Teams shot ~15 threes per game. Kobe, Duncan, Dirk ruled the elbow.", seasonRange: [2003, 2010], metric: "threePApg" },
  { badge: "Era 2", title: "Analytics Enter the Chat",    desc: "Moneyball exposed the midrange as the worst shot in basketball.",       seasonRange: [2011, 2014], metric: "threePApg" },
  { badge: "Era 3", title: "Curry Changes Everything",    desc: "The 2015 Warriors fired 31 threes a game. Everyone scrambled to copy.", seasonRange: [2015, 2017], metric: "threePApg" },
  { badge: "Era 4", title: "The New Normal",              desc: "40% of all shots were threes by 2021. The midrange was extinct.",        seasonRange: [2018, 2021], metric: "threePAR" },
  { badge: "Era 5", title: "Where Does It End?",          desc: "The dashed line projects the trend to 2030. The band shows uncertainty.", seasonRange: [2022, 2030], metric: "threePApg" },
];

// =====================================================================
// HELPERS
// =====================================================================
const tooltip = d3.select("body").append("div").attr("class", "viz-tooltip").style("opacity", 0);

function showTip(html, event) {
  tooltip.html(html)
    .style("left", `${event.clientX + 16}px`)
    .style("top",  `${event.clientY - 10}px`)
    .transition().duration(80).style("opacity", 1);
}
function hideTip() { tooltip.transition().duration(120).style("opacity", 0); }

// Linear regression: returns { slope, intercept, se } for confidence band
function linReg(data, xKey, yKey) {
  const n   = data.length;
  const mx  = d3.mean(data, d => d[xKey]);
  const my  = d3.mean(data, d => d[yKey]);
  const ssxx = d3.sum(data, d => (d[xKey] - mx) ** 2);
  const ssxy  = d3.sum(data, d => (d[xKey] - mx) * (d[yKey] - my));
  const slope = ssxy / ssxx;
  const intercept = my - slope * mx;
  const yhat = data.map(d => slope * d[xKey] + intercept);
  const sse  = d3.sum(data, (d, i) => (d[yKey] - yhat[i]) ** 2);
  const se   = Math.sqrt(sse / (n - 2));
  return { slope, intercept, se, mx, ssxx, n };
}

function projPoint(reg, x, t = 1.96) {
  const y    = reg.slope * x + reg.intercept;
  const seHat = reg.se * Math.sqrt(1 / reg.n + (x - reg.mx) ** 2 / reg.ssxx);
  return { x, y: Math.max(0, y), lower: Math.max(0, y - t * seHat), upper: y + t * seHat };
}

// =====================================================================
// VIZ 1 — SCROLLY LINE CHART
// =====================================================================
let lineMetric = "threePApg";
let highlightRange = null;
let showProjection = false;

const M = { top: 20, right: 30, bottom: 42, left: 52 };

function buildLineChart() {
  const container = document.getElementById("line-chart");
  if (!container) return;

  const W = container.clientWidth || 600;
  const H = Math.max(220, Math.min(320, container.clientHeight || 280));
  const iw = W - M.left - M.right;
  const ih = H - M.top - M.bottom;

  const svg = d3.select("#line-chart").append("svg")
    .attr("viewBox", `0 0 ${W} ${H}`)
    .attr("class", "responsive-svg");

  const g = svg.append("g").attr("transform", `translate(${M.left},${M.top})`);

  // gradient def
  const defs = svg.append("defs");
  const grad = defs.append("linearGradient").attr("id", "lineGrad").attr("x1","0%").attr("x2","100%");
  grad.append("stop").attr("offset","0%").attr("stop-color","#1d6fb8");
  grad.append("stop").attr("offset","100%").attr("stop-color","#e8702a");

  const gradArea = defs.append("linearGradient").attr("id","areaGrad").attr("x1","0%").attr("x2","100%");
  gradArea.append("stop").attr("offset","0%").attr("stop-color","#1d6fb8").attr("stop-opacity","0.2");
  gradArea.append("stop").attr("offset","100%").attr("stop-color","#e8702a").attr("stop-opacity","0.15");

  const x = d3.scaleLinear().domain([2003, 2030]).range([0, iw]);
  const y = d3.scaleLinear().range([ih, 0]);

  const xAxisG = g.append("g").attr("class","axis").attr("transform",`translate(0,${ih})`);
  const yAxisG = g.append("g").attr("class","axis");

  // grid
  const gridG = g.append("g").attr("class","grid");

  // axis labels
  g.append("text").attr("class","axis-title")
    .attr("x", iw/2).attr("y", ih + 36).attr("text-anchor","middle").text("Season");
  const yTitle = g.append("text").attr("class","axis-title")
    .attr("transform","rotate(-90)").attr("x",-ih/2).attr("y",-40).attr("text-anchor","middle");

  // highlight band for era
  const highlightRect = g.append("rect").attr("class","era-highlight")
    .attr("y",0).attr("height",ih).attr("opacity",0)
    .attr("fill","rgba(232,112,42,0.06)").attr("rx",4);

  // projection band + line
  const projBandPath = g.append("path").attr("class","proj-band");
  const projLinePath = g.append("path").attr("class","proj-line");
  const projLabel    = g.append("text").attr("class","proj-label");

  // area + line
  const areaPath = g.append("path").attr("class","trend-area").attr("fill","url(#areaGrad)");
  const linePath = g.append("path").attr("class","trend-line").attr("stroke","url(#lineGrad)");
  const dotsG    = g.append("g");

  // callout annotations
  const callouts = [
    { season: 2015, text: "Warriors dynasty begins" },
    { season: 2012, text: "Analytics era" },
    { season: 2019, text: "Peak 3PA rate" },
  ];
  const calloutG = g.append("g").attr("class","callouts");

  function draw() {
    const m    = lineMetric;
    const meta = METRICS[m];
    const vals = SEASONS.map(d => d[m]);
    const yMax = d3.max(vals) * 1.15;

    y.domain([0, yMax]).nice();

    xAxisG.transition().duration(500).call(
      d3.axisBottom(x).tickFormat(d3.format("d")).ticks(8)
    );
    yAxisG.transition().duration(500).call(d3.axisLeft(y).ticks(6));
    yTitle.text(meta.label);

    gridG.selectAll("line").data(y.ticks(6)).join("line")
      .attr("class","grid").attr("x1",0).attr("x2",iw)
      .attr("y1",d=>y(d)).attr("y2",d=>y(d))
      .attr("stroke","rgba(255,255,255,0.04)");

    const lineGen = d3.line().x(d=>x(d.season)).y(d=>y(d[m])).curve(d3.curveMonotoneX);
    const areaGen = d3.area().x(d=>x(d.season)).y0(ih).y1(d=>y(d[m])).curve(d3.curveMonotoneX);

    linePath.datum(SEASONS).transition().duration(600).attr("d", lineGen);
    areaPath.datum(SEASONS).transition().duration(600).attr("d", areaGen);

    dotsG.selectAll("circle").data(SEASONS).join("circle")
      .attr("class","trend-dot")
      .attr("r", 4)
      .attr("fill", d => d3.interpolateRgb("#1d6fb8","#e8702a")((d.season-2003)/18))
      .attr("cx", d => x(d.season))
      .on("mouseenter", (ev,d) => showTip(`<strong>${d.season}</strong><br>${meta.label}: <strong>${meta.fmt(d[m])}</strong>`, ev))
      .on("mousemove",  (ev,d) => showTip(`<strong>${d.season}</strong><br>${meta.label}: <strong>${meta.fmt(d[m])}</strong>`, ev))
      .on("mouseleave", hideTip)
      .transition().duration(600).attr("cy", d => y(d[m]));

    // callouts (only for threePApg)
    calloutG.selectAll("*").remove();
    if (m === "threePApg") {
      callouts.forEach(c => {
        const d  = SEASONS.find(s => s.season === c.season);
        if (!d) return;
        const cx = x(c.season), cy = y(d[m]);
        calloutG.append("line").attr("class","callout-line")
          .attr("x1",cx).attr("y1",cy-6).attr("x2",cx).attr("y2",cy-22);
        calloutG.append("text").attr("class","callout-text")
          .attr("x",cx).attr("y",cy-26).attr("text-anchor","middle").text(c.text);
      });
    }

    // era highlight
    if (highlightRange) {
      const [s1, s2] = highlightRange;
      const rx = x(Math.max(2003, s1));
      const rw = x(Math.min(2021, s2)) - rx;
      highlightRect.transition().duration(400)
        .attr("x",rx).attr("width",Math.max(0,rw)).attr("opacity",1);
    } else {
      highlightRect.transition().duration(300).attr("opacity",0);
    }

    // projection
    if (showProjection && m === "threePApg") {
      const reg = linReg(SEASONS, "season", "threePApg");
      const projYears = d3.range(2021, 2031);
      const pts = projYears.map(yr => projPoint(reg, yr));

      const bandGen = d3.area().x(d=>x(d.x)).y0(d=>y(d.lower)).y1(d=>y(d.upper)).curve(d3.curveMonotoneX);
      const projLineGen = d3.line().x(d=>x(d.x)).y(d=>y(d.y)).curve(d3.curveMonotoneX);

      projBandPath.datum(pts).transition().duration(600).attr("d", bandGen);
      projLinePath.datum(pts).transition().duration(600).attr("d", projLineGen);

      const last = pts[pts.length-1];
      projLabel.transition().duration(600)
        .attr("x", x(last.x)+4).attr("y", y(last.y))
        .text(`~${last.y.toFixed(0)} by 2030`);
    } else {
      projBandPath.attr("d","");
      projLinePath.attr("d","");
      projLabel.text("");
    }

    // annotation text
    const lastSeason = SEASONS[SEASONS.length-1];
    const firstSeason = SEASONS[0];
    document.getElementById("line-annotation").innerHTML =
      `In <strong>2003</strong>, teams averaged <strong>${METRICS.threePApg.fmt(firstSeason.threePApg)}</strong> threes/game.
       By <strong>2021</strong>, that number was <strong>${METRICS.threePApg.fmt(lastSeason.threePApg)}</strong> —
       a <strong>${((lastSeason.threePApg/firstSeason.threePApg-1)*100).toFixed(0)}%</strong> increase.`;
  }

  // season marker elements
  const seasonMarker = g.append("line").attr("class","season-marker").attr("y1",0).attr("y2",ih);
  const seasonDot    = g.append("circle").attr("class","season-dot").attr("r",6);

  function updateSeasonMarker(season) {
    const m    = lineMetric;
    const meta = METRICS[m];
    const d    = SEASONS.find(s => s.season === season);
    if (!d) return;
    const px = x(season);
    seasonMarker.attr("x1",px).attr("x2",px);
    seasonDot.attr("cx",px).attr("cy",y(d[m]));
    document.getElementById("season-readout").textContent = season;
    document.getElementById("line-annotation").innerHTML =
      `In <strong>${d.season}</strong>, teams averaged <strong>${METRICS.threePApg.fmt(d.threePApg)}</strong> threes per game — that was <strong>${METRICS.threePAR.fmt(d.threePAR)}</strong> of all field goal attempts.`;
  }

  // expose draw so scrolly can call it
  window._redrawLine = draw;
  window._updateSeasonMarker = updateSeasonMarker;
  draw();

  // metric toggle
  d3.selectAll(".metric-toggle button").on("click", function() {
    d3.selectAll(".metric-toggle button").classed("active", false);
    d3.select(this).classed("active", true);
    lineMetric = this.dataset.metric;
    draw();
    const slider = document.getElementById("season-slider");
    if (slider) updateSeasonMarker(+slider.value);
  });

  // season slider
  const slider = document.getElementById("season-slider");
  if (slider) {
    slider.addEventListener("input", () => updateSeasonMarker(+slider.value));
    updateSeasonMarker(2003);
  }
}

// =====================================================================
// SCROLLYTELLING
// =====================================================================
function initScrolly() {
  const panels = document.querySelectorAll(".scroll-panel");
  if (!panels.length) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const era = parseInt(entry.target.dataset.era);
      const cfg = ERA_CONFIG[era];
      if (!cfg) return;

      // update sticky header
      document.getElementById("era-badge").textContent = cfg.badge;
      document.getElementById("era-title").textContent = cfg.title;
      document.getElementById("era-desc").textContent  = cfg.desc;

      // active panel styling
      panels.forEach(p => p.classList.remove("active"));
      entry.target.classList.add("active");

      // update chart state
      highlightRange  = cfg.seasonRange;
      showProjection  = era === 4;

      // switch metric if needed
      if (cfg.metric !== lineMetric) {
        lineMetric = cfg.metric;
        document.querySelectorAll(".metric-toggle button").forEach(btn => {
          btn.classList.toggle("active", btn.dataset.metric === lineMetric);
        });
      }

      if (window._redrawLine) window._redrawLine();
    });
  }, { threshold: 0.4 });

  panels.forEach(p => observer.observe(p));
}

// =====================================================================
// THEN VS NOW CARDS
// =====================================================================
function buildThenNow() {
  const el = document.getElementById("then-now");
  if (!el) return;

  const items = [
    { label: "3PA per game",    old: "14.9", new: "35.2", change: "+136%", oldSeason: 2003, newSeason: 2021 },
    { label: "3PA share of FGA", old: "18.7%", new: "40.1%", change: "+114%", oldSeason: 2003, newSeason: 2021 },
    { label: "Points per shot", old: "1.17",  new: "1.25",  change: "+6.8%", oldSeason: 2003, newSeason: 2021 },
  ];

  items.forEach(item => {
    const card = document.createElement("div");
    card.className = "tn-card";
    card.innerHTML = `
      <div class="tn-label">${item.label}</div>
      <div class="tn-values">
        <div class="tn-val">
          <span class="tn-year">${item.oldSeason}</span>
          <span class="tn-num old">${item.old}</span>
        </div>
        <div class="tn-arrow">→</div>
        <div class="tn-val">
          <span class="tn-year">${item.newSeason}</span>
          <span class="tn-num new">${item.new}</span>
        </div>
      </div>
      <span class="tn-change">${item.change}</span>
    `;
    el.appendChild(card);
  });
}

// =====================================================================
// HORIZONTAL SCROLL CHAMPIONS
// =====================================================================
function buildHScroll() {
  const track = document.getElementById("hscroll-track");
  if (!track) return;

  const maxVal = d3.max(CHAMPIONS, d => d.threePApg);

  CHAMPIONS.forEach(c => {
    const isGSW = c.label.includes("GSW");
    const pct   = (c.threePApg / maxVal) * 80;

    const card = document.createElement("div");
    card.className = "hscroll-card" + (isGSW ? " gsw" : "");
    card.innerHTML = `
      <span class="hscroll-year">${c.label.split(" ")[0]}</span>
      <span class="hscroll-team">${c.label.split(" ")[1]}</span>
      <div class="hscroll-bar-wrap">
        <div class="hscroll-bar" style="height:${pct}px"></div>
      </div>
      <span class="hscroll-stat">${c.threePApg}</span>
      <span class="hscroll-label">threes per game</span>
    `;
    track.appendChild(card);
  });

  // drag to scroll
  const wrapper = track.parentElement;
  let isDown = false, startX, scrollLeft;
  wrapper.addEventListener("mousedown", e => {
    isDown   = true;
    startX   = e.pageX - wrapper.offsetLeft;
    scrollLeft = wrapper.scrollLeft;
  });
  wrapper.addEventListener("mouseleave", () => isDown = false);
  wrapper.addEventListener("mouseup",    () => isDown = false);
  wrapper.addEventListener("mousemove",  e => {
    if (!isDown) return;
    e.preventDefault();
    const x  = e.pageX - wrapper.offsetLeft;
    const walk = (x - startX) * 1.5;
    wrapper.scrollLeft = scrollLeft - walk;
  });
}


async function buildScatter() {
  const container = document.getElementById("scatter-chart");
  if (!container) return;

  let scatterData = [];
  try {
    scatterData = await d3.json("final/scatter_data.json");
  } catch(e) {
    // fallback hardcoded
    scatterData = [
      {season:2003,fg3pct:0.187,winpct:0.41},{season:2003,fg3pct:0.211,winpct:0.55},
      {season:2010,fg3pct:0.223,winpct:0.46},{season:2015,fg3pct:0.318,winpct:0.70},
      {season:2018,fg3pct:0.368,winpct:0.67},{season:2021,fg3pct:0.411,winpct:0.66},
    ];
  }

  const W = container.clientWidth || 860;
  const H = 380;
  const sm = { top:20, right:20, bottom:44, left:52 };
  const iw = W - sm.left - sm.right;
  const ih = H - sm.top - sm.bottom;

  const svg = d3.select("#scatter-chart").append("svg")
    .attr("viewBox",`0 0 ${W} ${H}`).attr("class","responsive-svg");
  const g = svg.append("g").attr("transform",`translate(${sm.left},${sm.top})`);

  const sx = d3.scaleLinear().domain(d3.extent(scatterData, d=>d.fg3pct)).nice().range([0,iw]);
  const sy = d3.scaleLinear().domain([0.2, 0.8]).nice().range([ih,0]);
  const sc = d3.scaleSequential().domain([2003,2021]).interpolator(d3.interpolateRgb("#1d6fb8","#e8702a"));

  g.append("g").attr("class","axis").attr("transform",`translate(0,${ih})`).call(d3.axisBottom(sx).tickFormat(d3.format(".0%")).ticks(6));
  g.append("g").attr("class","axis").call(d3.axisLeft(sy).tickFormat(d3.format(".0%")).ticks(6));

  g.append("text").attr("class","axis-title").attr("x",iw/2).attr("y",ih+36).attr("text-anchor","middle").text("3-Point Attempt Rate");
  g.append("text").attr("class","axis-title").attr("transform","rotate(-90)").attr("x",-ih/2).attr("y",-40).attr("text-anchor","middle").text("Win %");

  // regression line
  const reg = linReg(scatterData, "fg3pct", "winpct");
  const x1 = d3.min(scatterData,d=>d.fg3pct), x2 = d3.max(scatterData,d=>d.fg3pct);
  g.append("line").attr("class","regression-line")
    .attr("x1",sx(x1)).attr("y1",sy(reg.slope*x1+reg.intercept))
    .attr("x2",sx(x2)).attr("y2",sy(reg.slope*x2+reg.intercept));

  g.selectAll("circle").data(scatterData).join("circle")
    .attr("class","scatter-dot")
    .attr("cx", d=>sx(d.fg3pct))
    .attr("cy", d=>sy(Math.min(0.8,Math.max(0.2,d.winpct))))
    .attr("r", 4)
    .attr("fill", d=>sc(d.season))
    .on("mouseenter",(ev,d)=>showTip(`<strong>${d.season}</strong><br>3PA Rate: ${(d.fg3pct*100).toFixed(1)}%<br>Win %: ${(d.winpct*100).toFixed(1)}%`,ev))
    .on("mousemove",(ev,d)=>showTip(`<strong>${d.season}</strong><br>3PA Rate: ${(d.fg3pct*100).toFixed(1)}%<br>Win %: ${(d.winpct*100).toFixed(1)}%`,ev))
    .on("mouseleave",hideTip);

  // color legend
  const lg = svg.append("g").attr("transform",`translate(${sm.left + iw - 120},${sm.top+5})`);
  const lgGrad = svg.select("defs").append("linearGradient").attr("id","scatGrad").attr("x1","0%").attr("x2","100%");
  lgGrad.append("stop").attr("offset","0%").attr("stop-color","#1d6fb8");
  lgGrad.append("stop").attr("offset","100%").attr("stop-color","#e8702a");
  lg.append("rect").attr("width",100).attr("height",6).attr("rx",3).attr("fill","url(#scatGrad)");
  lg.append("text").attr("class","callout-text").attr("y",18).text("2003");
  lg.append("text").attr("class","callout-text").attr("x",100).attr("y",18).attr("text-anchor","end").text("2021");
}

// =====================================================================
// VIZ 3 — CHAMPIONS BAR CHART
// =====================================================================
function buildChampions() {
  const container = document.getElementById("champ-chart");
  if (!container) return;

  const W = container.clientWidth || 860;
  const H = 360;
  const cm = { top:20, right:20, bottom:64, left:52 };
  const iw = W - cm.left - cm.right;
  const ih = H - cm.top - cm.bottom;

  const svg = d3.select("#champ-chart").append("svg")
    .attr("viewBox",`0 0 ${W} ${H}`).attr("class","responsive-svg");
  const g = svg.append("g").attr("transform",`translate(${cm.left},${cm.top})`);

  const cx = d3.scaleBand().domain(CHAMPIONS.map(d=>d.label)).range([0,iw]).padding(0.2);
  const cy = d3.scaleLinear().domain([0, d3.max(CHAMPIONS,d=>d.threePApg)*1.12]).nice().range([ih,0]);

  g.append("g").attr("class","axis").attr("transform",`translate(0,${ih})`)
    .call(d3.axisBottom(cx))
    .selectAll("text")
    .attr("transform","rotate(-35)")
    .attr("text-anchor","end")
    .attr("dx","-0.4em").attr("dy","0.3em");

  g.append("g").attr("class","axis").call(d3.axisLeft(cy).ticks(6));

  g.append("text").attr("class","axis-title").attr("transform","rotate(-90)")
    .attr("x",-ih/2).attr("y",-40).attr("text-anchor","middle").text("3PA per game");

  // warriors reference line
  const gsw2015 = CHAMPIONS.find(d=>d.label==="2015 GSW");
  if (gsw2015) {
    g.append("line")
      .attr("x1",0).attr("x2",iw)
      .attr("y1",cy(gsw2015.threePApg)).attr("y2",cy(gsw2015.threePApg))
      .attr("stroke","rgba(232,112,42,0.3)").attr("stroke-dasharray","4 4").attr("stroke-width",1.5);
    g.append("text").attr("class","callout-text")
      .attr("x",iw-4).attr("y",cy(gsw2015.threePApg)-5)
      .attr("text-anchor","end").text("2015 Warriors baseline");
  }

  g.selectAll("rect").data(CHAMPIONS).join("rect")
    .attr("class","champ-bar")
    .attr("x", d=>cx(d.label)).attr("width", cx.bandwidth())
    .attr("y", ih).attr("height",0)
    .attr("fill", d => d.label.includes("GSW") ? "#e8702a" : "#1d6fb8")
    .on("mouseenter", function(ev,d) {
      d3.select(this).classed("hover",true);
      showTip(`<strong>${d.label}</strong><br>${d.threePApg} threes/game`,ev);
    })
    .on("mousemove",(ev,d)=>showTip(`<strong>${d.label}</strong><br>${d.threePApg} threes/game`,ev))
    .on("mouseleave", function() { d3.select(this).classed("hover",false); hideTip(); })
    .transition().duration(700).delay((_,i)=>i*60)
    .attr("y", d=>cy(d.threePApg)).attr("height", d=>ih-cy(d.threePApg));

  g.selectAll(".bar-label").data(CHAMPIONS).join("text")
    .attr("class","bar-label")
    .attr("x", d=>cx(d.label)+cx.bandwidth()/2)
    .attr("y", d=>cy(d.threePApg)-5)
    .attr("text-anchor","middle")
    .text(d=>d.threePApg);
}

// =====================================================================
// VIZ 4 — TIME MACHINE
// =====================================================================
function buildTimeMachine() {
  const container = document.getElementById("tm-chart");
  if (!container) return;

  const W = Math.min(860, container.clientWidth || 860);
  const H = 220;
  const tm = { top:15, right:20, bottom:36, left:50 };
  const iw = W - tm.left - tm.right;
  const ih = H - tm.top - tm.bottom;

  const svg = d3.select("#tm-chart").append("svg")
    .attr("viewBox",`0 0 ${W} ${H}`).attr("class","responsive-svg");
  const g = svg.append("g").attr("transform",`translate(${tm.left},${tm.top})`);

  const x = d3.scaleLinear().domain([2003,2021]).range([0,iw]);
  const y = d3.scaleLinear().domain([0, 42]).range([ih,0]);

  g.append("g").attr("class","axis").attr("transform",`translate(0,${ih})`).call(d3.axisBottom(x).tickFormat(d3.format("d")).ticks(8));
  g.append("g").attr("class","axis").call(d3.axisLeft(y).ticks(5));
  g.append("text").attr("class","axis-title").attr("x",iw/2).attr("y",ih+32).attr("text-anchor","middle").text("Season");
  g.append("text").attr("class","axis-title").attr("transform","rotate(-90)").attr("x",-ih/2).attr("y",-38).attr("text-anchor","middle").text("3PA/game");

  // trend line
  const lineGen = d3.line().x(d=>x(d.season)).y(d=>y(d.threePApg)).curve(d3.curveMonotoneX);
  g.append("path").datum(SEASONS).attr("fill","none").attr("stroke","#1d6fb8").attr("stroke-width",2).attr("d",lineGen);

  // user line
  const userLine = g.append("line").attr("class","season-marker")
    .attr("x1",0).attr("x2",iw).attr("y1",y(28)).attr("y2",y(28));

  // intersection dot
  const intersectDot = g.append("circle").attr("class","season-dot").attr("r",6);

  // dots on line
  g.selectAll("circle.tm-dot").data(SEASONS).join("circle")
    .attr("class","tm-dot")
    .attr("cx",d=>x(d.season)).attr("cy",d=>y(d.threePApg)).attr("r",3)
    .attr("fill","#1d6fb8").attr("opacity",0.7);

  function update(val) {
    document.getElementById("tm-val").textContent = val.toFixed(1);
    userLine.transition().duration(100).attr("y1",y(val)).attr("y2",y(val));

    // find closest season
    let closest = SEASONS[0], minDiff = Infinity;
    SEASONS.forEach(d => {
      const diff = Math.abs(d.threePApg - val);
      if (diff < minDiff) { minDiff = diff; closest = d; }
    });

    intersectDot.transition().duration(100)
      .attr("cx",x(closest.season)).attr("cy",y(closest.threePApg));

    // rank in 2021
    const sorted = [...SEASONS].sort((a,b)=>a.threePApg-b.threePApg);
    const rank2003 = sorted.findIndex(d=>d.threePApg>=val);

    // verdict
    const verdict = document.getElementById("tm-verdict");
    if (val <= 20) {
      verdict.innerHTML = `${val.toFixed(1)} threes a game was pretty normal around <strong>${closest.season}</strong>. By today's standards that number would put you near the bottom of the league.`;
    } else if (val <= 27) {
      verdict.innerHTML = `<strong>${val.toFixed(1)} threes per game</strong> was the league average around <strong>${closest.season}</strong>. Totally normal then. A team shooting that today would be one of the most conservative in the league.`;
    } else if (val <= 33) {
      verdict.innerHTML = `<strong>${val.toFixed(1)} threes per game</strong> was considered a lot around <strong>${closest.season}</strong>. Teams at this number now are somewhere in the middle of the pack.`;
    } else if (val <= 38) {
      verdict.innerHTML = `<strong>${val.toFixed(1)} threes per game</strong> is right around the <strong>${closest.season}</strong> league average. This is what a normal modern NBA team looks like.`;
    } else {
      verdict.innerHTML = `<strong>${val.toFixed(1)} threes per game</strong> is above the 2021 league average of 35.2. Only the most three-happy teams in recent years have gotten up here.`;
    }
  }

  const slider = document.getElementById("tm-slider");
  if (slider) {
    slider.addEventListener("input", () => update(+slider.value));
    update(28);
  }
}

// =====================================================================
// INIT
// =====================================================================
document.addEventListener("DOMContentLoaded", async () => {
  buildLineChart();
  buildThenNow();
  await buildScatter();
  buildChampions();
  buildTimeMachine();
  initScrolly();
});
