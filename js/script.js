const statusEl = document.getElementById('status');
const climaEl = document.querySelector('.cardClima');
const resultadosEl = document.getElementById('resultados-cidade');
const inputCidade = document.getElementById('input-cidade');
const btnBuscar = document.querySelector('.butBuscar');
const horarioEl = document.querySelector('.cardHorario');
const inputAnotacao = document.querySelector('#inputAnotacao');
const butAnotacao = document.querySelector('#butAnotacao');
const colunaPendentesEl = document.querySelector('.colunaPendentes'); 
const colunaConcluidasEl = document.querySelector('.colunaConcluidas');
const miniLocal = document.querySelector('.miniLocal')
const miniTemp = document.querySelector('.miniTemp')
const miniDesc = document.querySelector('.miniDesc')

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
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,weather_code,relative_humidity_2m,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&forecast_days=5&timezone=auto`;
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

    miniLocal.innerHTML = ` ${nomeLocal} `;
    miniTemp.innerHTML = `${c.temperature_2m}°C`;
    miniDesc.innerHTML = `${desc}`;
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
        iniciarRelogio(dados.timezone);
        renderMapa(lat, lon, nomeLocal);
        renderPrevisao(dados.daily); // ADICIONA ESSA LINHA
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


let horarioInterval = null;

function renderEstruturaHorario() {
    horarioEl.innerHTML = `
        <div class="contentHorario">
            <p id="titHorario">
                <i class="iconeRelogio bi bi-clock"></i>Horário Atual
            </p>
            <div class="especHorario">
                <p id="horario">--:--:--</p>
                <p id="descHorario">Carregando...</p>
            </div>
            <div class="horarioExtra">
                <i class="iconeReload bi bi-arrow-repeat"></i>
                <span id="ultimaAtualizacao">Última atualização: --:--:--</span>
            </div>
        </div>
    `;
}

function iniciarRelogio(timezone) {
    if (horarioInterval) clearInterval(horarioInterval);

    renderEstruturaHorario();

    function atualizarRelogio() {
        const agora = new Date();

        const hora = new Intl.DateTimeFormat('pt-BR', {
            timeZone: timezone,
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: false
        }).format(agora);

        const dataFormatada = new Intl.DateTimeFormat('pt-BR', {
            timeZone: timezone,
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
        }).format(agora);

        document.getElementById('horario').textContent = hora;
        document.getElementById('descHorario').textContent = capitalizarPrimeira(dataFormatada);
        document.getElementById('ultimaAtualizacao').textContent = `Última atualização: ${hora}`;
    }

    atualizarRelogio();
    horarioInterval = setInterval(atualizarRelogio, 1000);
}

function capitalizarPrimeira(texto) {
    return texto.charAt(0).toUpperCase() + texto.slice(1);
}

const localizacaoEl = document.querySelector('.cardLocalizacao');

let mapaInstancia = null;
let marcadorInstancia = null;

function renderEstruturaLocalizacao() {
    localizacaoEl.innerHTML = `
        <p id="titLocalizacao"><i class="iconeLocal bi bi-geo-alt-fill"></i> Sua localização</p>
        <div class="mapaContainer">
            <div id="mapaMini"></div>
            <span id="labelLocalizacao" class="labelMapa"></span>
        </div>
        <a id="btnVerMapa" class="butVerMapa" href="#" target="_blank" rel="noopener">
            <i class="mapaIcone bi bi-map"></i> Ver no mapa
        </a>
    `;
}

function renderMapa(lat, lon, nomeLocal) {
    if (!mapaInstancia) {
        renderEstruturaLocalizacao();

        mapaInstancia = L.map('mapaMini', {
            zoomControl: false,
            attributionControl: false,
            dragging: false,
            scrollWheelZoom: false
        }).setView([lat, lon], 14);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19
        }).addTo(mapaInstancia);

        const icone = L.icon({
            iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41]
        });

        marcadorInstancia = L.marker([lat, lon], { icon: icone }).addTo(mapaInstancia);
    } else {
        mapaInstancia.setView([lat, lon], 14);
        marcadorInstancia.setLatLng([lat, lon]);
    }

    document.getElementById('labelLocalizacao').textContent = nomeLocal;
    document.getElementById('btnVerMapa').href =
        `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}#map=15/${lat}/${lon}`;
}


/* ===== ANOTAÇÕES — ADICIONAR, ARRASTAR E DELETAR ===== */

butAnotacao.addEventListener('click', adicionarAnotacao);

inputAnotacao.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') adicionarAnotacao();
});

function adicionarAnotacao() {
    const texto = inputAnotacao.value.trim();
    if (!texto) return;

    const id = 'anotacao-' + Date.now();
    const html = criarItemAnotacaoHTML(id, texto, 'pendente');

    colunaPendentesEl.insertAdjacentHTML('beforeend', html);
    ativarItemAnotacao(document.getElementById(id));

    inputAnotacao.value = '';
}

function criarItemAnotacaoHTML(id, texto, tipo) {
    if (tipo === 'pendente') {
        return `
            <div id="${id}" class="atividadePendente" draggable="true">
                <div class="titulosPendente">
                    <label class="checkbox-container">
                        <input type="checkbox" class="checkbox pendenteBox">
                        <span class="checkmark"><i class="iconeCorreto bi bi-check"></i></span>
                    </label>
                    <p>${texto}</p>
                </div>
                <div class="iconesPendente">
                    <i class="iconeMover bi bi-arrows-move"></i>
                    <i class="iconeLixeira bi bi-trash"></i>
                </div>
            </div>
        `;
    }

    return `
        <div id="${id}" class="atividadeConcluida" draggable="true">
            <div class="titulosConcluida">
                <label class="checkbox-container">
                    <input type="checkbox" class="checkbox concluidoBox" checked>
                    <span class="checkmark"><i class="iconeCorreto bi bi-check"></i></span>
                </label>
                <p>${texto}</p>
            </div>
            <div class="iconesConcluido">
                <i class="iconeMover bi bi-arrows-move"></i>
                <i class="iconeLixeira bi bi-trash"></i>
            </div>
        </div>
    `;
}

function ativarItemAnotacao(itemEl) {
    itemEl.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', itemEl.id);
        itemEl.classList.add('arrastando');
    });

    itemEl.addEventListener('dragend', () => {
        itemEl.classList.remove('arrastando');
    });

    const lixeira = itemEl.querySelector('.iconeLixeira');
    lixeira.addEventListener('click', () => {
        itemEl.remove();
    });
}

[colunaPendentesEl, colunaConcluidasEl].forEach((coluna) => {
    coluna.addEventListener('dragover', (e) => {
        e.preventDefault(); // obrigatório pra permitir o drop
        coluna.classList.add('arrastandoSobre');
    });

    coluna.addEventListener('dragleave', () => {
        coluna.classList.remove('arrastandoSobre');
    });

    coluna.addEventListener('drop', (e) => {
        e.preventDefault();
        coluna.classList.remove('arrastandoSobre');

        const id = e.dataTransfer.getData('text/plain');
        const itemEl = document.getElementById(id);
        if (!itemEl) return;

        const texto = itemEl.querySelector('p').textContent;
        const tipo = coluna === colunaPendentesEl ? 'pendente' : 'concluida';

        itemEl.remove();

        const novoHTML = criarItemAnotacaoHTML(id, texto, tipo);
        coluna.insertAdjacentHTML('beforeend', novoHTML);
        ativarItemAnotacao(document.getElementById(id));
    });
});

// ativa os itens que já vêm fixos no HTML
document.querySelectorAll('.atividadePendente, .atividadeConcluida').forEach((item, i) => {
    if (!item.id) item.id = 'anotacao-inicial-' + i;
    item.draggable = true;
    ativarItemAnotacao(item);
});


// API DE NOTÍCIAS

const noticiasEl = document.querySelector('.noticias');

const THENEWSAPI_TOKEN = '4ZICHV6xbR1G6THdhwfK5ytfMRFAbvh705v12Zik'; 

async function carregarNoticia() {
    try {
        const url = `https://api.thenewsapi.com/v1/news/top?api_token=${THENEWSAPI_TOKEN}&locale=br&language=pt&limit=1`;
        const res = await fetch(url);
        const data = await res.json();

        if (!data.data || data.data.length === 0) {
            noticiasEl.innerHTML = `<p class="erroNoticia">Nenhuma notícia disponível no momento.</p>`;
            return;
        }

        renderNoticia(data.data[0]);

    } catch (e) {
        noticiasEl.innerHTML = `<p class="erroNoticia">Erro ao carregar notícias.</p>`;
    }
}

function renderNoticia(artigo) {
    const dataPub = new Date(artigo.published_at);
    const hoje = new Date();
    const mesmoDia = dataPub.toDateString() === hoje.toDateString();

    const dataFormatada = mesmoDia
        ? `Hoje, ${dataPub.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
        : dataPub.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

    const imagem = artigo.image_url || 'assets/img/placeholder-noticia.jpg';

    noticiasEl.innerHTML = `
        <div class="noticiaHeader">
            <p id="titNoticias"><i class="iconeNoticias bi bi-newspaper"></i> Notícias do dia</p>
            <a class="verMais" href="${artigo.url}" target="_blank" rel="noopener">Ver mais</a>
        </div>

        <img class="imgNoticia" src="${imagem}" alt="Imagem da notícia" onerror="this.src='assets/img/placeholder-noticia.jpg'">

        <span class="tagCategoria">Tecnologia</span>

        <h3 class="tituloNoticia">${artigo.title}</h3>
        <p class="descNoticia">${artigo.description ?? artigo.snippet ?? ''}</p>

        <div class="rodapeNoticia">
            <span><i class="bi bi-clock"></i> ${dataFormatada}</span>
            <a href="${artigo.url}" target="_blank" rel="noopener"><i class="bi bi-arrow-right"></i></a>
        </div>
    `;
}

carregarNoticia();

//  PREVISÃO DO TEMPO

const previsaoEl = document.querySelector('.previsao');

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function iconePrevisao(codigo) {
    if ([0, 1].includes(codigo)) return { icone: 'bi-sun-fill', cor: 'icone-sol' };
    if (codigo === 2) return { icone: 'bi-cloud-sun-fill', cor: 'icone-parcial' };
    if (codigo === 3) return { icone: 'bi-cloud-fill', cor: 'icone-nublado' };
    if ([45, 48].includes(codigo)) return { icone: 'bi-cloud-haze2-fill', cor: 'icone-nublado' };
    if ([51, 53, 55].includes(codigo)) return { icone: 'bi-cloud-drizzle-fill', cor: 'icone-chuva' };
    if ([61, 63, 65, 80, 81, 82].includes(codigo)) return { icone: 'bi-cloud-rain-fill', cor: 'icone-chuva' };
    if ([71, 73, 75].includes(codigo)) return { icone: 'bi-cloud-snow-fill', cor: 'icone-neve' };
    if ([95, 96, 99].includes(codigo)) return { icone: 'bi-cloud-lightning-rain-fill', cor: 'icone-tempestade' };
    return { icone: 'bi-cloud-fill', cor: 'icone-nublado' };
}

function renderPrevisao(diario) {
    const dias = diario.time.map((dataStr, i) => {
        const label = i === 0
            ? 'Hoje'
            : DIAS_SEMANA[new Date(dataStr + 'T00:00:00Z').getUTCDay()];

        const { icone, cor } = iconePrevisao(diario.weather_code[i]);
        const max = Math.round(diario.temperature_2m_max[i]);
        const min = Math.round(diario.temperature_2m_min[i]);

        return `
            <div class="diaPrevisao">
                <span class="labelDia">${label}</span>
                <i class="bi ${icone} ${cor} iconePrevisaoClima"></i>
                <span class="tempMax">${max}°</span>
                <span class="tempMin">${min}°</span>
            </div>
        `;
    }).join('');

    previsaoEl.innerHTML = `
        <p id="titPrevisao"><i class="iconePrevisaoTit bi bi-calendar3"></i> Previsão do tempo</p>
        <div class="listaPrevisao">
            ${dias}
        </div>
    `;
}

//  API DE FRASES MOTIVACIONAIS

const frase = document.querySelector('.frase');

fetch('https://api.api-ninjas.com/v2/quoteoftheday', {
    headers: {
        'X-Api-Key': 'XFeKkmohnKAYsZ42udhzik9f7f2LcNrS4rAbdtXl'
    }
})
.then(response => {
    if (!response.ok) {
        throw new Error(`Erro: ${response.status}`);
    }

    return response.json();
})
.then(data => {
    console.log(data);

    frase.innerHTML = `⭐${data[0].quote}⭐` ;
})
.catch(error => {
    console.error('Erro na requisição:', error);
});

// ESSA PARTE DE BAIXO AQUI É PARA O MAPA N QUEBRAR EM CELULARES

let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        if (mapaInstancia) mapaInstancia.invalidateSize();
    }, 250);
});