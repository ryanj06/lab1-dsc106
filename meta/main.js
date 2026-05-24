import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7/+esm';
import scrollama from 'https://cdn.jsdelivr.net/npm/[email protected]/+esm';

async function loadData() {
    const data = await d3.csv('loc.csv', (row) => ({
        ...row,
        line: Number(row.line),
        depth: Number(row.depth),
        length: Number(row.length),
        date: new Date(row.date + 'T00:00' + row.timezone),
        datetime: new Date(row.datetime),
    }));
    return data;
}

function processCommits(data) {
    return d3
        .groups(data, (d) => d.commit)
        .map(([commit, lines]) => {
            let first = lines[0];
            let { author, date, time, timezone, datetime } = first;
            let ret = {
                id: commit,
                url: 'https://github.com/tijilchhabra1729/lab1-dsc106/commit/' + commit,
                author,
                date,
                time,
                timezone,
                datetime,
                hourFrac: datetime.getHours() + datetime.getMinutes() / 60,
                totalLines: lines.length,
            };
            Object.defineProperty(ret, 'lines', {
                value: lines,
                enumerable: false,
                writable: true,
                configurable: true,
            });
            return ret;
        });
}

function renderCommitInfo(data, commits) {
    const dl = d3.select('#stats').append('dl').attr('class', 'stats');

    dl.append('dt').html('Total <abbr title="Lines of code">LOC</abbr>');
    dl.append('dd').text(data.length);

    dl.append('dt').text('Total commits');
    dl.append('dd').text(commits.length);

    dl.append('dt').text('Number of files');
    dl.append('dd').text(d3.group(data, (d) => d.file).size);

    dl.append('dt').text('Avg line length');
    dl.append('dd').text(Math.round(d3.mean(data, (d) => d.length)) + ' chars');

    dl.append('dt').text('Max depth');
    dl.append('dd').text(d3.max(data, (d) => d.depth));

    const busiest = d3
        .rollups(data, (v) => v.length, (d) =>
            d.datetime.toLocaleString('en', { dayPeriod: 'short' })
        )
        .sort((a, b) => d3.descending(a[1], b[1]))[0];
    dl.append('dt').text('Busiest time of day');
    dl.append('dd').text(busiest ? busiest[0] : '—');
}

function renderTooltipContent(commit) {
    document.getElementById('commit-link').href = commit.url;
    document.getElementById('commit-link').textContent = commit.id;
    document.getElementById('commit-date').textContent =
        commit.datetime?.toLocaleString('en', { dateStyle: 'full' });
    document.getElementById('commit-time').textContent =
        commit.datetime?.toLocaleString('en', { timeStyle: 'short' });
    document.getElementById('commit-author').textContent = commit.author;
    document.getElementById('commit-lines').textContent = commit.totalLines;
}

function updateTooltipVisibility(isVisible) {
    document.getElementById('commit-tooltip').hidden = !isVisible;
}

function updateTooltipPosition(event) {
    const tooltip = document.getElementById('commit-tooltip');
    tooltip.style.left = `${event.clientX}px`;
    tooltip.style.top = `${event.clientY}px`;
}

let xScale, yScale, rScale, svg;
let filteredCommits = [];
const fileColors = d3.scaleOrdinal(d3.schemeTableau10);

function renderScatterPlot(data, commits) {
    const width = 1000;
    const height = 600;
    const margin = { top: 10, right: 10, bottom: 30, left: 20 };
    const usableArea = {
        top: margin.top,
        right: width - margin.right,
        bottom: height - margin.bottom,
        left: margin.left,
        width: width - margin.left - margin.right,
        height: height - margin.top - margin.bottom,
    };

    svg = d3
        .select('#chart')
        .append('svg')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .style('overflow', 'visible');

    xScale = d3
        .scaleTime()
        .domain(d3.extent(commits, (d) => d.datetime))
        .range([usableArea.left, usableArea.right])
        .nice();

    yScale = d3
        .scaleLinear()
        .domain([0, 24])
        .range([usableArea.bottom, usableArea.top]);

    svg
        .append('g')
        .attr('class', 'gridlines')
        .attr('transform', `translate(${usableArea.left}, 0)`)
        .call(d3.axisLeft(yScale).tickFormat('').tickSize(-usableArea.width));

    svg
        .append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0, ${usableArea.bottom})`)
        .call(d3.axisBottom(xScale));

    svg
        .append('g')
        .attr('transform', `translate(${usableArea.left}, 0)`)
        .call(
            d3.axisLeft(yScale).tickFormat((d) =>
                String(d % 24).padStart(2, '0') + ':00'
            )
        );

    const [minLines, maxLines] = d3.extent(commits, (d) => d.totalLines);
    rScale = d3.scaleSqrt().domain([minLines, maxLines]).range([2, 30]);

    svg.append('g').attr('class', 'dots');

    function isCommitSelected(selection, commit) {
        if (!selection) return false;
        const [[x0, y0], [x1, y1]] = selection;
        const x = xScale(commit.datetime);
        const y = yScale(commit.hourFrac);
        return x >= x0 && x <= x1 && y >= y0 && y <= y1;
    }

    function brushed(event) {
        const selection = event.selection;
        d3.selectAll('circle').classed('selected', (d) =>
            isCommitSelected(selection, d)
        );
        renderSelectionCount(selection, filteredCommits, isCommitSelected);
        renderLanguageBreakdown(selection, filteredCommits, isCommitSelected);
    }

    svg.call(d3.brush().on('start brush end', brushed));
    svg.selectAll('.dots, .overlay ~ *').raise();
}

function updateScatterPlot(newFilteredCommits) {
    const sortedCommits = d3.sort(newFilteredCommits, (d) => -d.totalLines);

    svg.select('.dots')
        .selectAll('circle')
        .data(sortedCommits, (d) => d.id)
        .join('circle')
        .attr('cx', (d) => xScale(d.datetime))
        .attr('cy', (d) => yScale(d.hourFrac))
        .attr('r', (d) => rScale(d.totalLines))
        .attr('fill', 'steelblue')
        .style('fill-opacity', 0.7)
        .on('mouseenter', (event, commit) => {
            d3.select(event.currentTarget).style('fill-opacity', 1);
            renderTooltipContent(commit);
            updateTooltipVisibility(true);
            updateTooltipPosition(event);
        })
        .on('mouseleave', (event) => {
            d3.select(event.currentTarget).style('fill-opacity', 0.7);
            updateTooltipVisibility(false);
        });
}

function updateFileDisplay(newFilteredCommits) {
    const lines = newFilteredCommits.flatMap((d) => d.lines);
    const files = d3.groups(lines, (d) => d.file)
        .map(([name, fileLines]) => ({ name, lines: fileLines }))
        .sort((a, b) => b.lines.length - a.lines.length);

    const container = d3.select('#files');
    let dl = container.select('dl');
    if (dl.empty()) {
        dl = container.append('dl');
    }

    const items = dl.selectAll('div')
        .data(files, (d) => d.name)
        .join('div');

    items.selectAll('dt')
        .data((d) => [d.name])
        .join('dt')
        .selectAll('code')
        .data((d) => [d])
        .join('code')
        .text((d) => d);

    items.selectAll('dd')
        .data((d) => [d.lines])
        .join('dd')
        .selectAll('div.loc')
        .data((d) => d)
        .join('div')
        .attr('class', 'loc')
        .style('--color', (d) => fileColors(d.type));
}

function renderSelectionCount(selection, commits, isCommitSelected) {
    const selectedCommits = selection
        ? commits.filter((d) => isCommitSelected(selection, d))
        : [];
    const countElement = document.querySelector('#selection-count');
    countElement.textContent = `${selectedCommits.length || 'No'} commits selected`;
}

function renderLanguageBreakdown(selection, commits, isCommitSelected) {
    const selectedCommits = selection
        ? commits.filter((d) => isCommitSelected(selection, d))
        : [];
    const container = document.getElementById('language-breakdown');

    if (selectedCommits.length === 0) {
        container.innerHTML = '';
        return;
    }

    const lines = selectedCommits.flatMap((d) => d.lines);
    const breakdown = d3.rollup(lines, (v) => v.length, (d) => d.type);

    container.innerHTML = '';
    for (const [language, count] of breakdown) {
        const proportion = count / lines.length;
        const formatted = d3.format('.1~%')(proportion);
        container.innerHTML += `<dt>${language}</dt><dd>${count} lines (${formatted})</dd>`;
    }
}

function setupScrollytelling(commits) {
    const commitsSorted = d3.sort(commits, (d) => d.datetime);

    // Scatter plot story steps
    d3.select('#scatter-story')
        .selectAll('.step')
        .data(commitsSorted)
        .join('div')
        .attr('class', 'step')
        .html((d) => {
            const fileCount = d3.group(d.lines, (l) => l.file).size;
            return `<p>
                On ${d.datetime.toLocaleString('en', { dateStyle: 'long', timeStyle: 'short' })},
                I made <a href="${d.url}" target="_blank">a commit</a>
                that changed ${d.totalLines} line${d.totalLines !== 1 ? 's' : ''}
                across ${fileCount} file${fileCount !== 1 ? 's' : ''}.
            </p>`;
        });

    const scroller1 = scrollama();
    scroller1.setup({
        container: '#scrolly-1',
        step: '#scatter-story .step',
    }).onStepEnter((response) => {
        const commit = response.element.__data__;
        filteredCommits = commits.filter((d) => d.datetime <= commit.datetime);
        updateScatterPlot(filteredCommits);
        updateFileDisplay(filteredCommits);
    });

    // Files story steps (duplicate commit descriptions for second scrolly section)
    d3.select('#files-story')
        .selectAll('.step')
        .data(commitsSorted)
        .join('div')
        .attr('class', 'step')
        .html((d) => {
            const fileCount = d3.group(d.lines, (l) => l.file).size;
            return `<p>
                On ${d.datetime.toLocaleString('en', { dateStyle: 'long', timeStyle: 'short' })},
                I made <a href="${d.url}" target="_blank">a commit</a>
                that changed ${d.totalLines} line${d.totalLines !== 1 ? 's' : ''}
                across ${fileCount} file${fileCount !== 1 ? 's' : ''}.
            </p>`;
        });

    const scroller2 = scrollama();
    scroller2.setup({
        container: '#scrolly-2',
        step: '#files-story .step',
    }).onStepEnter((response) => {
        const commit = response.element.__data__;
        filteredCommits = commits.filter((d) => d.datetime <= commit.datetime);
        updateScatterPlot(filteredCommits);
        updateFileDisplay(filteredCommits);
    });
}

const data = await loadData();
const commits = processCommits(data);
filteredCommits = [...commits];
renderCommitInfo(data, commits);
renderScatterPlot(data, commits);
updateScatterPlot(commits);
updateFileDisplay(commits);
setupScrollytelling(commits);
