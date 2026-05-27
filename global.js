console.log("IT'S ALIVE!");

function $$(selector, context = document) {
    return Array.from(context.querySelectorAll(selector));
}

export async function fetchJSON(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch: ${response.statusText}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching or parsing JSON data:', error);
    }
}

export function renderProjects(projects, containerElement, headingLevel = 'h2') {
    containerElement.innerHTML = '';
    for (const project of projects) {
        const article = document.createElement('article');
        article.innerHTML = `
            <${headingLevel}>${project.title}</${headingLevel}>
            <img src="${project.image}" alt="${project.title}">
            <p>${project.description}</p>
            <p class="project-year">${project.year}</p>
        `;
        containerElement.appendChild(article);
    }
}

export async function fetchGitHubData(username) {
    return fetchJSON(`https://api.github.com/users/${username}`);
}

export const BASE_PATH = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    ? '/lab1-dsc106'
    : '/lab1-dsc106';

const pages = [
    { url: 'index.html', title: 'Home' },
    { url: 'projects/index.html', title: 'Projects' },
    { url: 'contact/index.html', title: 'Contact' },
    { url: 'resume.html', title: 'Resume' },
    { url: 'meta/index.html', title: 'Meta' },
    { url: 'final/index.html', title: 'Final Project' },
    { url: 'https://github.com/tijilchhabra1729', title: 'GitHub' },
];

const nav = document.createElement('nav');
document.body.prepend(nav);

for (const page of pages) {
    const a = document.createElement('a');
    const isExternal = page.url.startsWith('http');
    a.href = isExternal ? page.url : `${BASE_PATH}/${page.url}`;
    a.textContent = page.title;

    if (isExternal) {
        a.target = '_blank';
    }

    if (a.host === location.host && a.pathname === location.pathname) {
        a.classList.add('current');
    }

    nav.append(a);
}

const label = document.createElement('label');
label.className = 'color-scheme';
label.textContent = 'Color Scheme: ';

const select = document.createElement('select');
for (const [value, text] of [['light dark', 'Automatic'], ['light', 'Light'], ['dark', 'Dark']]) {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = text;
    select.append(option);
}
label.append(select);
document.body.append(label);

function setColorScheme(scheme) {
    document.documentElement.style.setProperty('color-scheme', scheme);
    select.value = scheme;
}

select.addEventListener('input', (e) => {
    setColorScheme(e.target.value);
    localStorage.setItem('colorScheme', e.target.value);
});

const savedScheme = localStorage.getItem('colorScheme');
if (savedScheme) {
    setColorScheme(savedScheme);
}

const form = document.querySelector('form');
if (form) {
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const data = new FormData(form);
        const params = [];
        for (const [name, value] of data) {
            params.push(`${encodeURIComponent(name)}=${encodeURIComponent(value)}`);
        }
        location.href = form.action + '?' + params.join('&');
    });
}
