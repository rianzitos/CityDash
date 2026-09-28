 const statusEl = document.getElementById('status');
  const climaEl = document.getElementById('clima');
  const resultadosEl = document.getElementById('resultados-cidade');

  function setStatus(msg, tipo) {
    if (!msg) { statusEl.innerHTML = ''; return; }
    const classe = tipo === 'erro' ? 'erro' : 'loading';
    statusEl.innerHTML = `<div class="${classe}">${msg}</div>`;
  }

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

  async function buscarClima(lat, lon) {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m&timezone=auto`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Erro ao buscar dados do clima.');
    return res.json();
  }

  async function buscarCoordenadasPorCidade(nome) {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(nome)}&count=5&language=pt&format=json`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.results || data.results.length === 0) {
      throw new Error('Cidade não encontrada.');
    }
    return data.results;
  }

  function renderClima(dados, nomeLocal) {
    const c = dados.current;
    const desc = WEATHER_CODES[c.weather_code] ?? `Código ${c.weather_code}`;
    const hora = new Date(c.time).toLocaleString('pt-BR', {
      dateStyle: 'short', timeStyle: 'short'
    });

    climaEl.innerHTML = `
      <div class="clima-local">${nomeLocal}</div>
      <div class="clima-temp">${c.temperature_2m}°C</div>
      <div class="clima-local">${desc} · ${hora} (${dados.timezone})</div>
      <div class="clima-grid">
        <div class="clima-item">
          <div class="label">Umidade</div>
          <div class="valor">${c.relative_humidity_2m}%</div>
        </div>
        <div class="clima-item">
          <div class="label">Vento</div>
          <div class="valor">${c.wind_speed_10m} km/h</div>
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

  async function pesquisarCidade() {
    const nome = document.getElementById('input-cidade').value.trim();
    resultadosEl.innerHTML = '';
    if (!nome) return;

    setStatus('Buscando cidade...');
    try {
      const resultados = await buscarCoordenadasPorCidade(nome);
      setStatus('');
      resultadosEl.innerHTML = resultados.map((r, i) => `
        <div class="cidade-opcao" onclick="selecionarCidade(${i})">
          ${r.name}${r.admin1 ? ', ' + r.admin1 : ''} — ${r.country}
        </div>
      `).join('');
      window._resultadosBusca = resultados;
    } catch (e) {
      setStatus(e.message, 'erro');
    }
  }

  function selecionarCidade(i) {
    const r = window._resultadosBusca[i];
    resultadosEl.innerHTML = '';
    document.getElementById('input-cidade').value = `${r.name}, ${r.country}`;
    carregarClimaPorCoordenadas(r.latitude, r.longitude, `${r.name}, ${r.country}`);
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