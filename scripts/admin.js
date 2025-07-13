
// --- Auth logic ---
const authBlock = document.getElementById('auth-block');
const adminPanel = document.getElementById('admin-panel');
const loginBtn = document.getElementById('login-btn');
const tokenInput = document.getElementById('github-token');
const authError = document.getElementById('auth-error');

let githubToken = '';

function isValidGithubToken(token) {
    // GitHub tokens: ghp_, github_pat_, gho_, ghu_, ghs_, ghv_, etc. Accept 20+ chars after prefix
    const t = token.trim();
    return /^gh[pousr]_\w{36,}$/i.test(t) || /^github_pat_\w{30,}$/i.test(t);
}

loginBtn.addEventListener('click', () => {
    const token = tokenInput.value.trim();
    if (!isValidGithubToken(token)) {
        authError.textContent = 'Некорректный формат токена GitHub.';
        authError.style.display = 'block';
        return;
    }
    authError.style.display = 'none';
    githubToken = token;
    showAdminPanel();
});

tokenInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') loginBtn.click();
});

// --- Admin panel logic ---
function showAdminPanel() {
    authBlock.style.display = 'none';
    adminPanel.style.display = 'block';
    adminPanel.innerHTML = `
        <h2>Админ-панель</h2>
        <div id="countries-editor">
            <h3>Редактирование стран (countries.json)</h3>
            <div id="countries-list">Загрузка...</div>
        </div>
        <div id="users-editor">
            <h3>Редактирование пользователей (users.json)</h3>
            <div id="users-list">Загрузка...</div>
        </div>
    `;
    loadCountries();
    loadUsers();
}

// --- GitHub API helpers ---
const repoOwner = 'Minecraft-Warnament-s-Server';
const repoName = 'database';
const apiBase = `https://api.github.com/repos/${repoOwner}/${repoName}/contents/`;

async function githubGetJson(path) {
    const res = await fetch(apiBase + path, {
        headers: { Authorization: `token ${githubToken}` }
    });
    if (!res.ok) throw new Error('Ошибка загрузки ' + path);
    const data = await res.json();
    if (data.encoding === 'base64') {
        // Use TextDecoder to properly decode UTF-8 from base64
        const binary = atob(data.content.replace(/\n/g, ''));
        const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
        const text = new TextDecoder('utf-8').decode(bytes);
        return JSON.parse(text);
    }
    throw new Error('Неизвестный формат файла');
}

async function githubPutJson(path, json, message) {
    // Get SHA first
    const getRes = await fetch(apiBase + path, {
        headers: { Authorization: `token ${githubToken}` }
    });
    if (!getRes.ok) throw new Error('Ошибка получения SHA');
    const getData = await getRes.json();
    const sha = getData.sha;
    // Encode JSON as UTF-8, then base64
    const utf8 = new TextEncoder().encode(JSON.stringify(json, null, 2));
    let binary = '';
    utf8.forEach(b => binary += String.fromCharCode(b));
    const content = btoa(binary);
    const res = await fetch(apiBase + path, {
        method: 'PUT',
        headers: {
            Authorization: `token ${githubToken}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            message: message,
            content: content,
            sha: sha
        })
    });
    if (!res.ok) throw new Error('Ошибка сохранения файла');
    return await res.json();
}

// --- Countries editor ---
async function loadCountries() {
    const listDiv = document.getElementById('countries-list');
    try {
        const countries = await githubGetJson('countries.json');
        listDiv.innerHTML = '';
        // Кнопка добавления страны
        const addBtn = document.createElement('button');
        addBtn.textContent = 'Добавить страну';
        addBtn.className = 'admin-add-btn';
        addBtn.onclick = async () => {
            const newId = prompt('Введите ID новой страны (латиницей, без пробелов):');
            if (!newId || countries[newId]) {
                alert('Некорректный или уже существующий ID!');
                return;
            }
            countries[newId] = {
                name: '',
                description: '',
                flagext: 'svg',
                members: {},
                diplomacy: {},
                hidenBonus: 0
            };
            await githubPutJson('countries.json', countries, `Add country ${newId}`);
            await loadCountries();
        };
        listDiv.appendChild(addBtn);
        Object.entries(countries).forEach(([id, country]) => {
            const countryDiv = document.createElement('div');
            countryDiv.className = 'country-edit-block';
            countryDiv.innerHTML = `
                <b>${country.name}</b> (<code>${id}</code>)<br>
                <label>Название: <input type="text" value="${country.name || ''}" data-field="name"></label><br>
                <label>Описание: <textarea data-field="description">${country.description || ''}</textarea></label><br>
                <label>Формат флага: <input type="text" value="${country.flagext || 'svg'}" data-field="flagext" style="width:60px"></label>
                <button data-action="change-flag" data-id="${id}">Сменить флаг</button>
                <button data-action="edit-posts" data-id="${id}">Редактировать посты</button><br>
                <label>Участники:<br><textarea data-field="members" rows="3" style="width:300px">${country.members ? Object.entries(country.members).map(([k,v])=>v?`${k}:${v}`:k).join('\n') : ''}</textarea></label><br>
                <label>Дипломатия:<br><textarea data-field="diplomacy" rows="2" style="width:300px">${country.diplomacy ? Object.entries(country.diplomacy).map(([k,v])=>`${k}:${v}`).join('\n') : ''}</textarea></label><br>
                <button data-action="save-country" data-id="${id}">Сохранить</button>
                <hr>
            `;
            listDiv.appendChild(countryDiv);
        });
        // Пост-редактор (модальное окно)
        if (!document.getElementById('posts-modal')) {
            const modal = document.createElement('div');
            modal.id = 'posts-modal';
            modal.style.display = 'none';
            modal.style.position = 'fixed';
            modal.style.left = '0';
            modal.style.top = '0';
            modal.style.width = '100vw';
            modal.style.height = '100vh';
            modal.style.background = 'rgba(0,0,0,0.7)';
            modal.style.zIndex = '9999';
            modal.innerHTML = `<div id="posts-modal-content" style="background:#23272e;max-width:600px;margin:60px auto;padding:24px 24px 18px 24px;border-radius:10px;position:relative;color:#fff;"></div>`;
            document.body.appendChild(modal);
        }
        listDiv.addEventListener('click', async (e) => {
            if (e.target.dataset.action === 'edit-posts') {
                const countryId = e.target.dataset.id;
                await openPostsEditor(countryId);
                return;
            }
            if (e.target.dataset.action === 'save-country') {
                const id = e.target.dataset.id;
                const block = e.target.closest('.country-edit-block');
                const fields = block.querySelectorAll('[data-field]');
                const updated = {};
                fields.forEach(f => {
                    if (f.dataset.field === 'members') {
                        updated.members = {};
                        f.value.split('\n').forEach(line => {
                            if (line.trim()) {
                                const [name, title] = line.split(':');
                                updated.members[name.trim()] = title ? title.trim() : '';
                            }
                        });
                    } else if (f.dataset.field === 'diplomacy') {
                        updated.diplomacy = {};
                        f.value.split('\n').forEach(line => {
                            if (line.trim()) {
                                const [state, rel] = line.split(':');
                                updated.diplomacy[state.trim()] = rel ? rel.trim() : '';
                            }
                        });
                    } else {
                        updated[f.dataset.field] = f.value;
                    }
                });
                try {
                    const countries = await githubGetJson('countries.json');
                    countries[id] = { ...countries[id], ...updated };
                    await githubPutJson('countries.json', countries, `Edit country ${id}`);
                    alert('Сохранено!');
                } catch (err) {
                    alert('Ошибка: ' + err.message);
                }
            }
            if (e.target.dataset.action === 'change-flag') {
                alert('Для смены флага загрузите новый файл в /countries/' + e.target.dataset.id + '/flag.расширение через GitHub.');
            }
            // ...existing code...
// --- Posts editor ---
async function openPostsEditor(countryId) {
    const modal = document.getElementById('posts-modal');
    const content = document.getElementById('posts-modal-content');
    modal.style.display = 'block';
    content.innerHTML = '<div>Загрузка постов...</div>';
    // Загрузка posts.json
    let posts = [];
    let sha = null;
    try {
        const res = await fetch(`${apiBase}countries/${countryId}/posts.json`, {
            headers: { Authorization: `token ${githubToken}` }
        });
        if (!res.ok) throw new Error('Нет posts.json или ошибка доступа');
        const data = await res.json();
        if (data.encoding === 'base64') {
            const binary = atob(data.content.replace(/\n/g, ''));
            const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
            const text = new TextDecoder('utf-8').decode(bytes);
            posts = JSON.parse(text);
            sha = data.sha;
        }
    } catch (e) {
        posts = [];
    }
    // Рендер
    content.innerHTML = `
        <h3>Посты страны: ${countryId}</h3>
        <button id="close-posts-modal" style="position:absolute;top:10px;right:18px;font-size:1.5em;background:none;border:none;color:#fff;cursor:pointer;">×</button>
        <form id="posts-form">
            <div id="posts-list" style="max-height:60vh;overflow-y:auto;overflow-x:hidden;padding-right:8px;">
                ${Array.isArray(posts) ? posts.map((post, i) => `
                    <div class="post-edit-block" style="background:#181a20;padding:12px 12px 8px 12px;border-radius:8px;margin-bottom:12px;">
                        <label>Заголовок: <input type="text" name="title_${i}" value="${post.title||''}" style="width:90%"></label><br>
                        <label>Дата: <input type="text" name="date_${i}" value="${post.date||''}" style="width:60%"></label><br>
                        <label>URL изображения: <input type="text" name="image_${i}" value="${post.image||''}" style="width:90%" placeholder="https://..." /></label><br>
                        <label>Положение изображения:
                            <select name="imagePos_${i}">
                                <option value="top" ${post.imagePos==="top"?"selected":""}>Выше текста</option>
                                <option value="bottom" ${post.imagePos==="bottom"?"selected":""}>Ниже текста</option>
                            </select>
                        </label><br>
                        <label>Текст:<br><textarea name="body_${i}" style="width:100%;min-height:60px;">${post.body||''}</textarea></label><br>
                        <button type="button" class="remove-post-btn" data-index="${i}">Удалить</button>
                    </div>
                `).join('') : ''}
            </div>
            <button type="button" id="add-post-btn">Добавить пост</button>
            <button type="submit" style="margin-left:18px;">Сохранить</button>
            <div id="posts-save-status" style="margin-top:10px;"></div>
        </form>
    `;
    // Закрытие
    document.getElementById('close-posts-modal').onclick = () => { modal.style.display = 'none'; };
    // Добавить пост
    document.getElementById('add-post-btn').onclick = (e) => {
        e.preventDefault();
        posts.unshift({ title: '', date: '', body: '', image: '', imagePos: 'top' });
        openPostsEditor(countryId);
    };
    // Удалить пост
    content.querySelectorAll('.remove-post-btn').forEach(btn => {
        btn.onclick = () => {
            const idx = Number(btn.dataset.index);
            posts.splice(idx, 1);
            openPostsEditor(countryId);
        };
    });
    // Сохранить
    document.getElementById('posts-form').onsubmit = async function(e) {
        e.preventDefault();
        const form = e.target;
        const newPosts = [];
        for (let i = 0; i < posts.length; ++i) {
            newPosts.push({
                title: form[`title_${i}`].value,
                date: form[`date_${i}`].value,
                body: form[`body_${i}`].value,
                image: form[`image_${i}`].value,
                imagePos: form[`imagePos_${i}`].value
            });
        }
        // Сохраняем на github
        try {
            // Получить SHA если не был получен
            let newSha = sha;
            if (!newSha) {
                // Попробовать получить sha (если файл только что создан)
                const res = await fetch(`${apiBase}countries/${countryId}/posts.json`, {
                    headers: { Authorization: `token ${githubToken}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    newSha = data.sha;
                }
            }
            // Кодируем
            const utf8 = new TextEncoder().encode(JSON.stringify(newPosts, null, 2));
            let binary = '';
            utf8.forEach(b => binary += String.fromCharCode(b));
            const content = btoa(binary);
            const body = {
                message: `Edit posts for ${countryId}`,
                content,
                sha: newSha || undefined
            };
            const putRes = await fetch(`${apiBase}countries/${countryId}/posts.json`, {
                method: 'PUT',
                headers: {
                    Authorization: `token ${githubToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });
            if (!putRes.ok) throw new Error('Ошибка сохранения');
            document.getElementById('posts-save-status').innerText = 'Сохранено!';
        } catch (err) {
            document.getElementById('posts-save-status').innerText = 'Ошибка: ' + err.message;
        }
    };
}
        });
    } catch (err) {
        listDiv.innerHTML = '<span style="color:red">Ошибка загрузки: ' + err.message + '</span>';
    }
}

// --- Users editor ---
async function loadUsers() {
    const listDiv = document.getElementById('users-list');
    try {
        const users = await githubGetJson('users.json');
        listDiv.innerHTML = '';
        // Кнопка добавления игрока
        const addBtn = document.createElement('button');
        addBtn.textContent = 'Добавить игрока';
        addBtn.className = 'admin-add-btn';
        addBtn.onclick = async () => {
            const newId = prompt('Введите ID нового игрока (латиницей, без пробелов):');
            if (!newId || users[newId]) {
                alert('Некорректный или уже существующий ID!');
                return;
            }
            users[newId] = {
                discord: '',
                name: '',
                shortName: ''
            };
            await githubPutJson('users.json', users, `Add user ${newId}`);
            await loadUsers();
        };
        listDiv.appendChild(addBtn);
        Object.entries(users).forEach(([id, user]) => {
            const userDiv = document.createElement('div');
            userDiv.className = 'user-edit-block';
            userDiv.innerHTML = `
                <b>ID:</b> <input type="text" value="${id}" data-field="id" style="width:120px"> <br>
                <label>Discord: <input type="text" value="${user.discord || ''}" data-field="discord" style="width:180px"></label><br>
                <label>Name: <input type="text" value="${user.name || ''}" data-field="name" style="width:180px"></label><br>
                <label>ShortName: <input type="text" value="${user.shortName || ''}" data-field="shortName" style="width:120px"></label><br>
                <button data-action="save-user" data-id="${id}">Сохранить</button>
                <hr>
            `;
            listDiv.appendChild(userDiv);
        });
        listDiv.addEventListener('click', async (e) => {
            if (e.target.dataset.action === 'save-user') {
                const id = e.target.dataset.id;
                const block = e.target.closest('.user-edit-block');
                const fields = block.querySelectorAll('[data-field]');
                let newId = id;
                const updated = {};
                fields.forEach(f => {
                    if (f.dataset.field === 'id') newId = f.value.trim();
                    else updated[f.dataset.field] = f.value;
                });
                try {
                    const users = await githubGetJson('users.json');
                    if (newId !== id) {
                        users[newId] = { ...users[id], ...updated };
                        delete users[id];
                    } else {
                        users[id] = { ...users[id], ...updated };
                    }
                    await githubPutJson('users.json', users, `Edit user ${id}`);
                    alert('Сохранено!');
                } catch (err) {
                    alert('Ошибка: ' + err.message);
                }
            }
        });
    } catch (err) {
        listDiv.innerHTML = '<span style="color:red">Ошибка загрузки: ' + err.message + '</span>';
    }
}
