
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
        listDiv.addEventListener('click', async (e) => {
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
            if (e.target.dataset.action === 'edit-posts') {
                alert('Редактор постов будет реализован позже.');
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
