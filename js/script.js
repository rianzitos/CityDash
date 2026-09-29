const statusEl = document.getElementById('status');
const climaEl = document.querySelector('.cardClima');
const resultadosEl = document.getElementById('resultados-cidade');
const inputCidade = document.getElementById('input-cidade');
const btnBuscar = document.querySelector('.butBuscar');

btnBuscar.addEventListener('click', pesquisarCidade);

inputCidade.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') pesquisarCidade();
});

document.addEventListener('click', (e) => {
    if (!resultadosEl.contains(e.target) && e.target !== inputCidade && e.target !== btnBuscar) {
        esconderDropdown();
    }
});

// Tabela simplificada de weather_code (WMO) -> descrição em pt-BR
const WEATHER_CODES = {
    0: 'Céu limpo', 1: 'Predominante limpo', 2: 'Parcialmente nublado', 3: 'Nublado',
    45: 'Neblina', 48: 'Neblina com geada',
    51: 'Garoa leve', 53: 'Garoa moderada', 55: 'Garoa forte',
    61: 'Chuva leve', 63: 'Chuva moderada', 65: 'Chuva forte',
    71: 'Neve leve', 73: 'Neve moderada', 75: 'Neve forte',
    80: 'Pancadas leves', 81: 'Pancadas moderadas', 82: 'Pancadas fortes',
    95: 'Tempestade', 96: 'Tempestade com granizo leve', 99: 'Tempestade com granizo forte'
};

async function pesquisarCidade() {
    const nome = inputCidade.value.trim();
    if (!nome) return;

    mostrarDropdown('<div class="carregando">Buscando...</div>');

    try {
        const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(nome)}&count=5&language=pt&format=json`;
        const res = await fetch(url);
        const data = await res.json();

        if (!data.results || data.results.length === 0) {
            mostrarDropdown('<div class="erro">Nenhuma cidade encontrada.</div>');
            return;
        }

        window._resultadosBusca = data.results;

        const html = data.results.map((r, i) => `
            <div class="itemResultado" onclick="selecionarCidade(${i})">
                ${r.name}${r.admin1 ? ', ' + r.admin1 : ''} — ${r.country}
            </div>
        `).join('');

        mostrarDropdown(html);

    } catch (e) {
        mostrarDropdown('<div class="erro">Erro ao buscar. Tente novamente.</div>');
    }
}

function selecionarCidade(i) {
    const r = window._resultadosBusca[i];
    inputCidade.value = `${r.name}, ${r.country}`;
    esconderDropdown();
    carregarClimaPorCoordenadas(r.latitude, r.longitude, `${r.name}, ${r.country}`);
}

function mostrarDropdown(html) {
    resultadosEl.innerHTML = html;
    resultadosEl.classList.add('ativo');
}

function esconderDropdown() {
    resultadosEl.classList.remove('ativo');
}

function setStatus(msg, tipo) {
    if (!msg) { statusEl.innerHTML = ''; return; }
    const classe = tipo === 'erro' ? 'erro' : 'loading';
    statusEl.innerHTML = `<div class="${classe}">${msg}</div>`;
}

async function buscarClima(lat, lon) {
    // ADICIONADO: apparent_temperature (sensação térmica) na lista de variáveis
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,weather_code,relative_humidity_2m,wind_speed_10m&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Erro ao buscar dados do clima.');
    return res.json();
}

function renderClima(dados, nomeLocal) {
    const c = dados.current;
    const desc = WEATHER_CODES[c.weather_code] ?? `Código ${c.weather_code}`;
    const hora = new Date(c.time).toLocaleString('pt-BR', {
        dateStyle: 'short', timeStyle: 'short'
    });

    climaEl.innerHTML = `
       <div class="climaInfo">
                            <img class="imgClima" src="assets/img/clima.svg" alt="Icone de clima com nuvem e sol">

                            <div class="climaEspec">
                                <span id="localInfo">${nomeLocal}<i class="iconeClima bi bi-geo-alt-fill"></i></span>
                                <p id="climaValor">${c.temperature_2m}°C</p>
                                <span id="climaTipo">${desc}</span>
                            </div>
                        </div>

                        <div class="climaExtra">

                            <div class="cardExtra">
                                <span class="extraTit" id="sensTermica">Sensação térmica</span>
                                <span class="extraValor" id="termicaValor">${c.apparent_temperature}°C</span>
                            </div>

                            <div class="cardExtra">
                                <span class="extraTit" id="umidade">Umidade</span>
                                <span class="extraValor" id="umidadeValor">${c.relative_humidity_2m}%</span>
                            </div>

                            <div class="cardExtra">
                                <span class="extraTit" id="sensTermica">Vento</span>
                                <span class="extraValor" id="termicaValor">${c.wind_speed_10m} km/h<i class="bi bi-wind"></i></span>
                            </div>

                        </div>

                    </div>
    `;
}

async function carregarClimaPorCoordenadas(lat, lon, nomeLocal) {
    setStatus('Carregando clima...');
    climaEl.innerHTML = '';
    try {
        const dados = await buscarClima(lat, lon);
        renderClima(dados, nomeLocal);
        setStatus('');
    } catch (e) {
        setStatus(e.message, 'erro');
    }
}

function usarLocalizacaoAtual() {
    resultadosEl.innerHTML = '';
    if (!navigator.geolocation) {
        setStatus('Geolocalização não suportada neste navegador.', 'erro');
        return;
    }
    setStatus('Obtendo localização...');
    navigator.geolocation.getCurrentPosition(
        (position) => {
            const { latitude, longitude } = position.coords;
            carregarClimaPorCoordenadas(latitude, longitude, 'Sua localização atual');
        },
        (error) => {
            setStatus('Não foi possível obter sua localização: ' + error.message, 'erro');
        },
        { enableHighAccuracy: true, timeout: 10000 }
    );
}