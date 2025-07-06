
// Подключаем общие функции
// <script src="scripts/common.js"></script> должен быть ДО этого файла в html
//const dataUrl = getDataUrl();
//const siteUrl = getSiteUrl();

function getCountryFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('country');
}

function renderCountry(countryKey) {
    const mainContent = document.querySelector('.main-content');
    mainContent.innerHTML = '';
    const country = countriesData[countryKey];
    if (!country) {
        mainContent.innerHTML = '<p>Country not found.</p>';
        return;
    }
    mainContent.innerHTML = renderCountryBlock(countryKey, country, dataUrl, siteUrl, countriesData, usersData);
}

function renderPosts(countryKey) {
    const postsGrid = document.querySelector('.posts-grid');
    postsGrid.innerHTML = '<p>Loading posts...</p>';
    fetch(`${dataUrl}countries/${countryKey}/posts.json`)
        .then(response => response.json())
        .then(posts => {
            postsGrid.innerHTML = renderPostsGrid(posts);
        })
        .catch(() => {
            postsGrid.innerHTML = '<p>Failed to load posts.</p>';
        });
}

// CSS for posts tiles (add to style.css):
// .posts-grid { display: flex; flex-wrap: wrap; gap: 16px; }
// .post-tile { background: #232323; border-radius: 8px; padding: 12px; width: 300px; box-sizing: border-box; color: #fff; }
// .post-title { font-weight: bold; margin-bottom: 8px; }
// .post-date { font-size: 12px; color: #aaa; margin-top: 8px; }
// .post-body { white-space: pre-line; }
