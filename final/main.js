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

const tooltip = d3.select("body").append("div").attr("class", "viz-tooltip").style("opacity", 0);

function showTip(html, event) {
  tooltip.html(html)
    .style("left", `${event.clientX + 16}px`)
    .style("top",  `${event.clientY - 10}px`)
    .transition().duration(80).style("opacity", 1);
}
function hideTip() { tooltip.transition().duration(120).style("opacity", 0); }

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

let lineMetric = "threePApg";
let highlightRange = null;
let showProjection = false;
let isSnapping = false; // true when scrolly is driving — skip transition so marker stays in sync

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

  const defs = svg.append("defs");
  const grad = defs.append("linearGradient").attr("id", "lineGrad").attr("x1","0%").attr("x2","100%");
  grad.append("stop").attr("offset","0%").attr("stop-color","#888780");
  grad.append("stop").attr("offset","100%").attr("stop-color","#00D4FF");

  const gradArea = defs.append("linearGradient").attr("id","areaGrad").attr("x1","0%").attr("x2","100%");
  gradArea.append("stop").attr("offset","0%").attr("stop-color","#888780").attr("stop-opacity","0.2");
  gradArea.append("stop").attr("offset","100%").attr("stop-color","#00D4FF").attr("stop-opacity","0.15");

  const x = d3.scaleLinear().domain([2003, 2030]).range([0, iw]);
  const y = d3.scaleLinear().range([ih, 0]);

  const xAxisG = g.append("g").attr("class","axis").attr("transform",`translate(0,${ih})`);
  const yAxisG = g.append("g").attr("class","axis");

  const gridG = g.append("g").attr("class","grid");

  g.append("text").attr("class","axis-title")
    .attr("x", iw/2).attr("y", ih + 36).attr("text-anchor","middle").text("Season");
  const yTitle = g.append("text").attr("class","axis-title")
    .attr("transform","rotate(-90)").attr("x",-ih/2).attr("y",-40).attr("text-anchor","middle");

  const highlightRect = g.append("rect").attr("class","era-highlight")
    .attr("y",0).attr("height",ih).attr("opacity",0)
    .attr("fill","rgba(232,112,42,0.06)").attr("rx",4);

  const projBandPath = g.append("path").attr("class","proj-band");
  const projLinePath = g.append("path").attr("class","proj-line");
  const projLabel    = g.append("text").attr("class","proj-label");

  const areaPath = g.append("path").attr("class","trend-area").attr("fill","url(#areaGrad)");
  const linePath = g.append("path").attr("class","trend-line").attr("stroke","url(#lineGrad)");
  const dotsG    = g.append("g");

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

    const dur = isSnapping ? 0 : 600;
    xAxisG.transition().duration(dur).call(
      d3.axisBottom(x).tickFormat(d3.format("d")).ticks(8)
    );
    yAxisG.transition().duration(dur).call(d3.axisLeft(y).ticks(6));
    yTitle.text(meta.label);

    gridG.selectAll("line").data(y.ticks(6)).join("line")
      .attr("class","grid").attr("x1",0).attr("x2",iw)
      .attr("y1",d=>y(d)).attr("y2",d=>y(d))
      .attr("stroke","rgba(255,255,255,0.04)");

    const lineGen = d3.line().x(d=>x(d.season)).y(d=>y(d[m])).curve(d3.curveMonotoneX);
    const areaGen = d3.area().x(d=>x(d.season)).y0(ih).y1(d=>y(d[m])).curve(d3.curveMonotoneX);

    linePath.datum(SEASONS).transition().duration(dur).attr("d", lineGen);
    areaPath.datum(SEASONS).transition().duration(dur).attr("d", areaGen);

    dotsG.selectAll("circle").data(SEASONS).join("circle")
      .attr("class","trend-dot")
      .attr("r", 4)
      .attr("fill", d => d3.interpolateRgb("#555553","#00D4FF")((d.season-2003)/18))
      .attr("cx", d => x(d.season))
      .on("mouseenter", (ev,d) => showTip(`<strong>${d.season}</strong><br>${meta.label}: <strong>${meta.fmt(d[m])}</strong>`, ev))
      .on("mousemove",  (ev,d) => showTip(`<strong>${d.season}</strong><br>${meta.label}: <strong>${meta.fmt(d[m])}</strong>`, ev))
      .on("mouseleave", hideTip)
      .transition().duration(dur).attr("cy", d => y(d[m]));

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

    if (highlightRange) {
      const [s1, s2] = highlightRange;
      const rx = x(Math.max(2003, s1));
      const rw = x(Math.min(2021, s2)) - rx;
      highlightRect.transition().duration(400)
        .attr("x",rx).attr("width",Math.max(0,rw)).attr("opacity",1);
    } else {
      highlightRect.transition().duration(300).attr("opacity",0);
    }

    if (showProjection && m === "threePApg") {
      const reg = linReg(SEASONS, "season", "threePApg");
      const projYears = d3.range(2021, 2031);
      const pts = projYears.map(yr => projPoint(reg, yr));

      const bandGen = d3.area().x(d=>x(d.x)).y0(d=>y(d.lower)).y1(d=>y(d.upper)).curve(d3.curveMonotoneX);
      const projLineGen = d3.line().x(d=>x(d.x)).y(d=>y(d.y)).curve(d3.curveMonotoneX);

      projBandPath.datum(pts).transition().duration(dur).attr("d", bandGen);
      projLinePath.datum(pts).transition().duration(dur).attr("d", projLineGen);

      const last = pts[pts.length-1];
      projLabel.transition().duration(600)
        .attr("x", x(last.x)+4).attr("y", y(last.y))
        .text(`~${last.y.toFixed(0)} by 2030`);
    } else {
      projBandPath.attr("d","");
      projLinePath.attr("d","");
      projLabel.text("");
    }

  }

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
    const readout = document.getElementById("season-readout"); if (readout) readout.textContent = season;
    const ann = document.getElementById("line-annotation"); if (ann) ann.innerHTML =
      `In <strong>${d.season}</strong>, teams averaged <strong>${METRICS.threePApg.fmt(d.threePApg)}</strong> threes per game — that was <strong>${METRICS.threePAR.fmt(d.threePAR)}</strong> of all field goal attempts.`;
  }

  window._redrawLine = draw;
  window._updateSeasonMarker = updateSeasonMarker;
  draw();

  d3.selectAll(".metric-toggle button").on("click", function() {
    d3.selectAll(".metric-toggle button").classed("active", false);
    d3.select(this).classed("active", true);
    lineMetric = this.dataset.metric;
    draw();
    const slider = document.getElementById("season-slider");
    if (slider) updateSeasonMarker(+slider.value);
  });

  const slider = document.getElementById("season-slider");
  if (slider) {
    slider.addEventListener("input", () => {
      const season = +slider.value;
      updateSeasonMarker(season);

      const era = season <= 2010 ? 0 : season <= 2014 ? 1 : season <= 2017 ? 2 : 3;
      const cfg = ERA_CONFIG[era];
      if (cfg) {
        document.getElementById("era-badge").textContent = cfg.badge;
        document.getElementById("era-title").textContent = cfg.title;
        document.getElementById("era-desc").textContent  = cfg.desc;
        highlightRange = cfg.seasonRange;
        showProjection = false;
        if (cfg.metric !== lineMetric) {
          lineMetric = cfg.metric;
          document.querySelectorAll(".metric-toggle button").forEach(btn => {
            btn.classList.toggle("active", btn.dataset.metric === lineMetric);
          });
          draw();
        }
        document.querySelectorAll(".scroll-panel").forEach(p => {
          p.classList.toggle("active", +p.dataset.era === era);
        });
      }
    });
    updateSeasonMarker(2003);
  }
}

function initScrolly() {
  const panels = document.querySelectorAll(".scroll-panel");
  if (!panels.length) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const era = parseInt(entry.target.dataset.era);
      const cfg = ERA_CONFIG[era];
      if (!cfg) return;

      document.getElementById("era-badge").textContent = cfg.badge;
      document.getElementById("era-title").textContent = cfg.title;
      document.getElementById("era-desc").textContent  = cfg.desc;

      panels.forEach(p => p.classList.remove("active"));
      entry.target.classList.add("active");

      highlightRange  = cfg.seasonRange;
      showProjection  = era === 4;

      if (cfg.metric !== lineMetric) {
        lineMetric = cfg.metric;
        document.querySelectorAll(".metric-toggle button").forEach(btn => {
          btn.classList.toggle("active", btn.dataset.metric === lineMetric);
        });
      }

      const slider = document.getElementById("season-slider");
      let snapSeason = 2003;
      if (slider && cfg.seasonRange) {
        snapSeason = Math.min(cfg.seasonRange[0], 2021);
        slider.value = snapSeason;
      }

      isSnapping = true;
      if (window._redrawLine) window._redrawLine();
      isSnapping = false;

      if (window._updateSeasonMarker) window._updateSeasonMarker(snapSeason);
    });
  }, { threshold: 0.4 });

  panels.forEach(p => observer.observe(p));
}

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

    scatterData = [
      {season:2003,fg3pct:0.187,winpct:0.41},{season:2003,fg3pct:0.211,winpct:0.55},
      {season:2010,fg3pct:0.223,winpct:0.46},{season:2015,fg3pct:0.318,winpct:0.70},
      {season:2018,fg3pct:0.368,winpct:0.67},{season:2021,fg3pct:0.411,winpct:0.66},
    ];
  }

  const W = container.getBoundingClientRect().width || window.innerWidth * 0.85 || 860;
  const H = 420;
  const sm = { top:20, right:20, bottom:44, left:52 };
  const iw = W - sm.left - sm.right;
  const ih = H - sm.top - sm.bottom;

  const svg = d3.select("#scatter-chart").append("svg")
    .attr("viewBox",`0 0 ${W} ${H}`).attr("class","responsive-svg");
  const g = svg.append("g").attr("transform",`translate(${sm.left},${sm.top})`);

  const sx = d3.scaleLinear().domain(d3.extent(scatterData, d=>d.fg3pct)).nice().range([0,iw]);
  const sy = d3.scaleLinear().domain([0.2, 0.8]).nice().range([ih,0]);
  const sc = d3.scaleSequential().domain([2003,2021]).interpolator(d3.interpolateRgb("#555553","#00D4FF"));

  g.append("g").attr("class","axis").attr("transform",`translate(0,${ih})`).call(d3.axisBottom(sx).tickFormat(d3.format(".0%")).ticks(6));
  g.append("g").attr("class","axis").call(d3.axisLeft(sy).tickFormat(d3.format(".0%")).ticks(6));

  g.append("text").attr("class","axis-title").attr("x",iw/2).attr("y",ih+36).attr("text-anchor","middle").text("3-Point Attempt Rate");
  g.append("text").attr("class","axis-title").attr("transform","rotate(-90)").attr("x",-ih/2).attr("y",-40).attr("text-anchor","middle").text("Win %");

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

}

function buildChampions() {
  const container = document.getElementById("champ-chart");
  if (!container) return;

  const W = container.getBoundingClientRect().width || window.innerWidth * 0.85 || 860;
  const H = 420;
  const cm = { top:20, right:30, bottom:80, left:60 };
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

  const gsw2015 = CHAMPIONS.find(d=>d.label==="2015 GSW");
  if (gsw2015) {
    g.append("line")
      .attr("x1",0).attr("x2",iw)
      .attr("y1",cy(gsw2015.threePApg)).attr("y2",cy(gsw2015.threePApg))
      .attr("stroke","rgba(232,112,42,0.3)").attr("stroke-dasharray","4 4").attr("stroke-width",1.5);
    g.append("text").attr("class","callout-text")
      .attr("x",4).attr("y",cy(gsw2015.threePApg)-5)
      .attr("text-anchor","start").text("2015 Warriors benchmark");
  }

  g.selectAll("rect").data(CHAMPIONS).join("rect")
    .attr("class","champ-bar")
    .attr("x", d=>cx(d.label)).attr("width", cx.bandwidth())
    .attr("y", ih).attr("height",0)
    .attr("fill", d => d.label.includes("GSW") ? "#00D4FF" : "#888780")
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

  const lineGen = d3.line().x(d=>x(d.season)).y(d=>y(d.threePApg)).curve(d3.curveMonotoneX);
  g.append("path").datum(SEASONS).attr("fill","none").attr("stroke","#888780").attr("stroke-width",2).attr("d",lineGen);

  const userLine = g.append("line").attr("class","season-marker")
    .attr("x1",0).attr("x2",iw).attr("y1",y(28)).attr("y2",y(28));

  const intersectDot = g.append("circle").attr("class","season-dot").attr("r",6);

  g.selectAll("circle.tm-dot").data(SEASONS).join("circle")
    .attr("class","tm-dot")
    .attr("cx",d=>x(d.season)).attr("cy",d=>y(d.threePApg)).attr("r",3)
    .attr("fill","#888780").attr("opacity",0.7);

  function update(val) {
    document.getElementById("tm-val").textContent = val.toFixed(1);
    userLine.transition().duration(30).attr("y1",y(val)).attr("y2",y(val));

    let closest = SEASONS[0], minDiff = Infinity;
    SEASONS.forEach(d => {
      const diff = Math.abs(d.threePApg - val);
      if (diff < minDiff) { minDiff = diff; closest = d; }
    });

    intersectDot.transition().duration(30)
      .attr("cx",x(closest.season)).attr("cy",y(closest.threePApg));

    const sorted = [...SEASONS].sort((a,b)=>a.threePApg-b.threePApg);
    const rank2003 = sorted.findIndex(d=>d.threePApg>=val);

    const verdict = document.getElementById("tm-verdict");
    if (val <= 20) {
      verdict.innerHTML = `<strong>${val.toFixed(1)} threes per game</strong> matched the league around <strong>${closest.season}</strong>. By today's standards that would put you dead last — not even close to average.`;
    } else if (val <= 27) {
      verdict.innerHTML = `<strong>${val.toFixed(1)} threes per game</strong> was league average around <strong>${closest.season}</strong>. Normal at the time, but a team shooting that today would be one of the most conservative in the league.`;
    } else if (val <= 33) {
      verdict.innerHTML = `<strong>${val.toFixed(1)} threes per game</strong> was considered high-volume around <strong>${closest.season}</strong>. Today that same number puts you somewhere in the middle of the pack.`;
    } else if (val <= 38) {
      verdict.innerHTML = `<strong>${val.toFixed(1)} threes per game</strong> matches what teams were doing around <strong>${closest.season}</strong>. This is what a typical modern NBA team looks like.`;
    } else {
      verdict.innerHTML = `<strong>${val.toFixed(1)} threes per game</strong> is above the 2021 league average of 35.2 — only the most three-heavy teams in recent history have reached this level.`;
    }
  }

  const slider = document.getElementById("tm-slider");
  if (slider) {
    slider.addEventListener("input", () => update(+slider.value));
    update(28);
  }
}

async function buildPredictor() {
  const container = document.getElementById("predictor-chart");
  if (!container) return;

  let data = [];
  try { data = await d3.json("final/scatter_data.json"); } catch(e) { return; }

  const reg = linReg(data, "fg3pct", "winpct");
  const r2 = (() => {
    const ybar = d3.mean(data, d => d.winpct);
    const ssTot = d3.sum(data, d => (d.winpct - ybar) ** 2);
    const ssRes = d3.sum(data, d => (d.winpct - (reg.slope * d.fg3pct + reg.intercept)) ** 2);
    return 1 - ssRes / ssTot;
  })();

  const W = Math.min(860, container.clientWidth || 860);
  const H = 280;
  const pm = { top: 15, right: 20, bottom: 44, left: 52 };
  const iw = W - pm.left - pm.right;
  const ih = H - pm.top - pm.bottom;

  const svg = d3.select("#predictor-chart").append("svg")
    .attr("viewBox", `0 0 ${W} ${H}`).attr("class", "responsive-svg");
  const g = svg.append("g").attr("transform", `translate(${pm.left},${pm.top})`);

  const px = d3.scaleLinear().domain([0.28, 0.42]).range([0, iw]);
  const py = d3.scaleLinear().domain([0.15, 0.80]).range([ih, 0]);

  g.append("g").attr("class", "grid").selectAll("line")
    .data(py.ticks(5)).join("line")
    .attr("x1", 0).attr("x2", iw)
    .attr("y1", d => py(d)).attr("y2", d => py(d))
    .attr("stroke", "rgba(255,255,255,0.04)");

  g.append("g").attr("class", "axis").attr("transform", `translate(0,${ih})`)
    .call(d3.axisBottom(px).tickFormat(d3.format(".0%")).ticks(7));
  g.append("g").attr("class", "axis")
    .call(d3.axisLeft(py).tickFormat(d3.format(".0%")).ticks(6));
  g.append("text").attr("class", "axis-title").attr("x", iw / 2).attr("y", ih + 36)
    .attr("text-anchor", "middle").text("3-Point Shooting %");
  g.append("text").attr("class", "axis-title").attr("transform", "rotate(-90)")
    .attr("x", -ih / 2).attr("y", -40).attr("text-anchor", "middle").text("Win %");

  const bandXs = d3.range(0.28, 0.421, 0.002);
  const bandPts = bandXs.map(xv => projPoint(reg, xv));
  const bandArea = d3.area()
    .x(d => px(d.x)).y0(d => py(Math.max(0.15, d.lower))).y1(d => py(Math.min(0.80, d.upper)));
  g.append("path").datum(bandPts).attr("class", "pred-band").attr("d", bandArea);

  const rl = [{ x: 0.28 }, { x: 0.42 }].map(d => ({ x: d.x, y: reg.slope * d.x + reg.intercept }));
  g.append("line").attr("class", "regression-line")
    .attr("x1", px(rl[0].x)).attr("y1", py(rl[0].y))
    .attr("x2", px(rl[1].x)).attr("y2", py(rl[1].y));

  g.append("text").attr("class", "callout-text")
    .attr("x", iw - 4).attr("y", 12).attr("text-anchor", "end")
    .text(`R² = ${r2.toFixed(3)}`);

  g.selectAll("circle.pd").data(data).join("circle").attr("class", "pd")
    .attr("cx", d => px(Math.max(0.28, Math.min(0.42, d.fg3pct))))
    .attr("cy", d => py(Math.max(0.15, Math.min(0.80, d.winpct))))
    .attr("r", 2.5)
    .attr("fill", d => d3.interpolateRgb("#888780", "#00D4FF")((d.season - 2003) / 18))
    .attr("opacity", 0.3)
    .on("mouseenter", (ev, d) => showTip(`<strong>${d.team} ${d.season}</strong><br>3PT%: ${(d.fg3pct * 100).toFixed(1)}%<br>Win%: ${(d.winpct * 100).toFixed(1)}%`, ev))
    .on("mousemove",  (ev, d) => showTip(`<strong>${d.team} ${d.season}</strong><br>3PT%: ${(d.fg3pct * 100).toFixed(1)}%<br>Win%: ${(d.winpct * 100).toFixed(1)}%`, ev))
    .on("mouseleave", hideTip);

  const markerLine = g.append("line").attr("class", "pred-marker-line")
    .attr("y1", 0).attr("y2", ih);
  const markerDot = g.append("circle").attr("class", "pred-marker-dot").attr("r", 7);

  function updatePredictor(fg3Raw) {
    const fg3 = fg3Raw / 100; // convert % input to decimal
    const pt = projPoint(reg, fg3);
    const winPct = Math.max(0.15, Math.min(0.80, pt.y));
    const lo = Math.max(0, pt.lower), hi = Math.min(1, pt.upper);
    const wins = Math.round(winPct * 82);

    document.getElementById("pred-win-pct").textContent = (winPct * 100).toFixed(1) + "%";
    document.getElementById("pred-ci").textContent =
      `95% CI: ${(lo * 100).toFixed(1)}% – ${(hi * 100).toFixed(1)}%`;

    let ctxVerdict;
    if (winPct >= 0.60) {
      ctxVerdict = `Projected at <strong>${wins} wins</strong> — a legitimate playoff contender. Teams shooting this efficiently from three are usually in the mix come April.`;
    } else if (winPct >= 0.50) {
      ctxVerdict = `Projected at <strong>${wins} wins</strong> — right on the playoff bubble. Needs more than 3PT% to push into contention.`;
    } else if (winPct >= 0.40) {
      ctxVerdict = `Projected at <strong>${wins} wins</strong> — a lottery team. Teams at this shooting rate are usually watching the playoffs from home.`;
    } else {
      ctxVerdict = `Projected at <strong>${wins} wins</strong> — deep in rebuilding territory. That shooting rate would rank near the bottom of the modern NBA.`;
    }
    ctxVerdict += ` The confidence interval shows how much variation exists beyond shooting percentage alone.`;
    document.getElementById("pred-context").innerHTML = ctxVerdict;

    const clampedX = Math.max(0.28, Math.min(0.42, fg3));
    markerLine.attr("x1", px(clampedX)).attr("x2", px(clampedX));
    markerDot.attr("cx", px(clampedX)).attr("cy", py(winPct));
  }

  const slider = document.getElementById("pred-fg3");
  const valEl  = document.getElementById("pred-fg3-val");
  if (slider) {
    slider.addEventListener("input", () => {
      const v = +slider.value;
      valEl.textContent = v.toFixed(1) + "%";
      updatePredictor(v);
    });
    updatePredictor(+slider.value);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  buildLineChart();
  buildThenNow();
  await buildScatter();
  buildChampions();
  buildTimeMachine();
  await buildPredictor();
  initScrolly();
});