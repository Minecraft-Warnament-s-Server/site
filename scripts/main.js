
function renderCountries() {
  const mainContent = document.querySelector('.main-content');
  mainContent.innerHTML = '';
  const sortedCountries = Object.entries(countriesData).sort((a, b) => {
    const aMembers = a[1].members ? Object.keys(a[1].members).length : 0;
    const bMembers = b[1].members ? Object.keys(b[1].members).length : 0;
    const aBonus = typeof a[1].hidenBonus === 'number' ? a[1].hidenBonus : 0;
    const bBonus = typeof b[1].hidenBonus === 'number' ? b[1].hidenBonus : 0;
    return (bMembers + bBonus) - (aMembers + aBonus);
  });

  for (const [key, country] of sortedCountries) {
    mainContent.innerHTML += renderCountryBlock(key, country, dataUrl, siteUrl, countriesData, usersData);
  }
}

Promise.all([
  getCountriesData(dataUrl),
  getUsersData(dataUrl)
]).then(([countries, users]) => {
  countriesData = countries;
  usersData = users;
  renderCountries();
}).catch(error => {
  console.error('Ошибка загрузки countries.json или users.json:', error);
});