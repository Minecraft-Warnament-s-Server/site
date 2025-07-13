// Скрипт для страницы postsfeed.html: вывод всех постов из всех стран

// Ожидается, что both.js уже подключён и содержит countriesData, renderPostsGrid

document.addEventListener('DOMContentLoaded', function() {
    const mainContent = document.querySelector('.main-content') || document.body;
    // Если данные уже загружены
    if (typeof countriesData === 'object' && Object.keys(countriesData).length > 0) {
        showAllPosts();
    } else {
        // Если данные ещё не загружены, ждём их
        let checkInterval = setInterval(() => {
            if (typeof countriesData === 'object' && Object.keys(countriesData).length > 0) {
                clearInterval(checkInterval);
                showAllPosts();
            }
        }, 200);
    }

    async function showAllPosts() {
        let allPosts = [];
        let debug = '';
        const countryKeys = Object.keys(countriesData);
        debug += 'countriesData keys: ' + countryKeys.join(', ') + '\n';
        // Загружаем posts.json для каждой страны
        let fetchPromises = countryKeys.map(async countryKey => {
            const country = countriesData[countryKey];
            let postsUrl = `${dataUrl}countries/${countryKey}/posts.json`;
            try {
                let resp = await fetch(postsUrl);
                if (!resp.ok) throw new Error('not found');
                let posts = await resp.json();
                if (Array.isArray(posts)) {
                    allPosts.push(...posts.map(post => ({
                        ...post,
                        country: country.name || countryKey,
                        countryKey: countryKey
                    })));
                } else {
                    debug += `\n[${countryKey}] posts.json: not array`;
                }
            } catch (e) {
                debug += `\n[${countryKey}] posts.json: not found`;
            }
        });
        await Promise.all(fetchPromises);
        allPosts.sort((a, b) => {
            if (!a.date && !b.date) return 0;
            if (!a.date) return 1;
            if (!b.date) return -1;
            return new Date(b.date) - new Date(a.date);
        });
        // Все посты выводим одной сеткой, без группировки по странам
        const postsHtml = allPosts.length > 0 ? renderPostsGrid(allPosts) : `<p>No posts found.</p><pre>${debug}</pre>`;
        mainContent.innerHTML = `<div class="postsfeed-grid">${postsHtml}</div>`;
    }
});

// Для стилизации можно добавить .postsfeed-grid, .country-post-block, .country-post-header в style.css
