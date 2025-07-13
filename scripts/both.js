
// Общие функции для country.html и index.html

let dataUrl;
if (window.location.protocol === 'file:') {
    console.log('local');
    dataUrl = 'http://192.168.100.18:8083/';
} else if (window.location.hostname.endsWith('netlify.app')) {
    console.log('github');
    dataUrl = 'https://raw.githubusercontent.com/Minecraft-Warnament-s-Server/database/refs/heads/main/';
} else {
    console.log('white ip');
    dataUrl = 'http://95.153.92.154:8083/';
}

let siteUrl;
if (window.location.protocol === 'file:') {
    console.log('local');
    siteUrl = 'file:///C:/Users/eenot/Documents/GitHub/WarnaMine/site';
} else if (window.location.hostname.endsWith('netlify.app')) {
    console.log('netlify');
    siteUrl = 'https://warnamine.netlify.app';
} else {
    console.log('white ip');
    siteUrl = 'http://95.153.92.154:8084';
}

function getCountriesData(dataUrl) {
    return fetch(`${dataUrl}countries.json`).then(r => r.json());
}
function getUsersData(dataUrl) {
    return fetch(`${dataUrl}users.json`).then(r => r.json());
}


let countriesData = {};
let usersData = {};

function startApp() {
    const countryKey = typeof getCountryFromUrl === 'function' ? getCountryFromUrl() : null;
    if (typeof renderCountry === 'function') renderCountry(countryKey);
    if (typeof renderPosts === 'function') renderPosts(countryKey);
}

getCountriesData(dataUrl)
    .then(countries => {
        countriesData = countries;
        return getUsersData(dataUrl);
    })
    .then(users => {
        usersData = users;
        startApp();
    })
    .catch(() => {
        document.querySelector('.main-content').innerHTML = '<p>Failed to load country data.</p>';
    });

function renderCountryBlock(countryKey, country, dataUrl, siteUrl, countriesData, usersData) {
    // Members
    let membersHtml = '';
    for (const [member, title] of Object.entries(country.members || {})) {
        let userLink = "#";
        let memberKey = member.trim().toLowerCase();
        if (usersData && usersData[memberKey] && usersData[memberKey].discord) {
            userLink = "https://discord.com/users/" + usersData[memberKey].discord;
        }
        console.log(memberKey);
        console.log(userLink);
        if (title) {
            membersHtml += `<div class="inline"><p><strong><u>${title}</u></strong>   <a class="player" href="${userLink}" target="_blank">@${member}</a></p></div>`;
        } else {
            membersHtml += `<div class="inline"><p><a class="player" href="${userLink}" target="_blank">@${member}</a></p></div>`;
        }
    }
    // Diplomacy
    let diplomacyHtml = '';
    for (const [state, relation] of Object.entries(country.diplomacy || {})) {
        let stateName = countriesData && countriesData[state] && countriesData[state].name ? countriesData[state].name : state;
        diplomacyHtml += `<div class="inline"><p><strong><u>${relation}</u></strong>   <a class="state" href="${siteUrl}/country.html?country=${state}">#${stateName}</a></p></div>`;
    }
    // Flag
    let flagHtml = `<img class="flag" src="${dataUrl}countries/${countryKey}/flag.${country.flagext ? country.flagext : 'svg'}" alt="Flag of ${country.name}">`;
    // Country block
    return `
      <div class="country">
        <h1><a href="${siteUrl}/country.html?country=${countryKey}">${country.name}</a></h1>
        <div class="cells">
          <div class="cell">
            <div class="members">${membersHtml}</div>
          </div>
          <div class="cell">
            <p style="overflow-wrap: break-word">${country.description || ''}</p>
          </div>
          <div class="cell">${diplomacyHtml}</div>
          <div class="cell" style="width: 200px">${flagHtml}</div>
        </div>
      </div>
    `;
}

function renderPostsGrid(posts) {
    if (!Array.isArray(posts) || posts.length === 0) {
        return '<p>No posts found.</p>';
    }
    // Сортировка: сверху самые новые (по дате, если есть)
    const sorted = [...posts].sort((a, b) => {
        // Если нет даты, считаем пост "старым"
        if (!a.date && !b.date) return 0;
        if (!a.date) return 1;
        if (!b.date) return -1;
        // YYYY-MM-DD или ISO
        return new Date(b.date) - new Date(a.date);
    });
    return sorted.map(post => {
        let imageHtml = '';
        if (post.image) {
            imageHtml = `<img src="${post.image}" alt="post image" style="max-width:100%;max-height:220px;border-radius:8px;margin:8px 0;">`;
        }
        let bodyHtml = `<div class="post-body">${post.body ? post.body : ''}</div>`;
        let imagePos = post.imagePos === 'bottom' ? 'bottom' : 'top';
        return `<div class="post-tile">
            <div class="post-title">${post.title ? post.title : ''}</div>
            <div class="post-date">${post.date ? post.date : ''}</div>
            ${imagePos === 'top' ? imageHtml : ''}
            ${bodyHtml}
            ${imagePos === 'bottom' ? imageHtml : ''}
        </div>`;
    }).join('');
}
