// Konfiguracja Firebase
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyD44JW-x135PT51t2Uzc_JotiEVtuO3Rig",
  authDomain: "tysiac-881c3.firebaseapp.com",
  projectId: "tysiac-881c3",
  storageBucket: "tysiac-881c3.firebasestorage.app",
  messagingSenderId: "855690860515",
  appId: "1:855690860515:web:6b4b95a5de2d4f9997b2d6",
  measurementId: "G-H5RSQYCFFN"
};

try {
    if (!firebase.apps.length) {
        firebase.initializeApp(FIREBASE_CONFIG);
    }
    var db = firebase.firestore();
    console.log("Firebase i Firestore zainicjowane pomyślnie.");
} catch (e) {
    console.error("Błąd inicjalizacji Firebase!", e);
    var db = null;
}

// Stałe
const FIREBASE_COLLECTION_WINS = 'tysiac_win_stats';
const savedGameStateRef = db ? db.collection('saved_game_state').doc('current') : null;
const GAME_STATE_KEY = 'tysiacGameState_v2'; 

// Referencje DOM
const setupScreen = document.getElementById('setup-screen');
const gameScreen = document.getElementById('game-screen');
const statsScreen = document.getElementById('stats-screen');
const loadGameScreen = document.getElementById('load-game-screen');
const winnerModal = document.getElementById('winner-modal');
const confirmModal = document.getElementById('confirm-modal');
const confirmMessage = document.getElementById('confirm-message');
const confirmYesBtn = document.getElementById('confirm-yes-btn');
const confirmNoBtn = document.getElementById('confirm-no-btn');
const playerCountSelect = document.getElementById('player-count');
const playerNamesContainer = document.getElementById('player-names-container');
const startGameBtn = document.getElementById('start-game-btn');
const showStatsBtn = document.getElementById('show-stats-btn');
const scoreboard = document.getElementById('scoreboard');
const scoreInputs = document.getElementById('score-inputs');
const addRoundBtn = document.getElementById('add-round-btn');
const backToMenuBtn = document.getElementById('back-to-menu-btn');
const rotateFirstPlayerBtn = document.getElementById('rotate-first-player-btn');
const firstPlayerBar = document.getElementById('first-player-bar');
const addRoundHeading = document.getElementById('add-round-heading');
const gameToStatsBtn = document.getElementById('game-to-stats-btn');
const roundHistoryContainer = document.getElementById('round-history-container');
const statsSummary = document.getElementById('stats-summary');
const backFromStatsBtn = document.getElementById('back-from-stats-btn');
const modalBackToMenuBtn = document.getElementById('modal-back-to-menu-btn');
const statusMessageContainer = document.getElementById('status-message-container');
const showLoadGameBtn = document.getElementById('show-load-game-btn');
const loadGameMessage = document.getElementById('load-game-message');
const loadGameBtn = document.getElementById('load-game-btn');
const deleteGameBtn = document.getElementById('delete-game-btn');
const backFromLoadBtn = document.getElementById('back-from-load-btn');
const saveGameBtn = document.getElementById('save-game-btn');
const saveAndEndBtn = document.getElementById('save-and-end-btn');
const correctLastRoundBtn = document.getElementById('correct-last-round-btn');

// Wykres w grze
const chartContainer = document.getElementById('chart-container');
const gameChartCanvas = document.getElementById('game-chart-canvas');
const chartToggleBtn = document.getElementById('chart-toggle-btn');
const chartContent = document.getElementById('chart-content');
const chartToggleIcon = document.getElementById('chart-toggle-icon');

// Referencje dla wykresu końcowego
const showFinalChartBtn = document.getElementById('show-final-chart-btn');
const finalChartContainer = document.getElementById('final-chart-container');
const finalChartCanvas = document.getElementById('final-chart-canvas');

// Stan Aplikacji
let gameState = { players: [], history: [], isActive: false, firstPlayerIndex: 0, initialFirstPlayerIndex: 0, loadedFromFirebase: false };
let gameWinnerData = null;
const defaultPlayerNames = ['Kulik', 'Miś', 'Gracz 3', 'Gracz 4'];
const LEADER_CLASS = 'is-leader';
let gameChart = null; 
let finalChart = null;
let gameChartVisible = false;

// Funkcje zapisu/odczytu (localStorage, firebase)
function saveGameStateToLocalStorage() { if (gameState.isActive && gameState.players.length > 0) { localStorage.setItem(GAME_STATE_KEY, JSON.stringify(gameState)); } }
function tryToLoadGameFromLocalStorage() { const savedStateJSON = localStorage.getItem(GAME_STATE_KEY); if (savedStateJSON) { try { const savedState = JSON.parse(savedStateJSON); if (savedState.isActive && savedState.players.length > 0) { gameState = savedState; renderGameScreen(); setupScreen.classList.add('hidden'); gameScreen.classList.remove('hidden'); showTemporaryMessage('Wczytano ostatnią niezakończoną grę.', false); updateGameChart(); return true; } } catch (error) { console.error('Błąd parsowania stanu gry z localStorage:', error); localStorage.removeItem(GAME_STATE_KEY); } } return false; }
async function handleShowLoadScreen() { setupScreen.classList.add('hidden'); loadGameScreen.classList.remove('hidden'); loadGameMessage.textContent = 'Sprawdzanie...'; loadGameBtn.classList.add('hidden'); deleteGameBtn.classList.add('hidden'); if (!db) { loadGameMessage.textContent = 'Błąd: Brak połączenia z bazą danych.'; return; } try { const doc = await savedGameStateRef.get(); if (doc.exists) { loadGameMessage.textContent = 'Znaleziono zapisaną grę. Chcesz ją kontynuować?'; loadGameBtn.classList.remove('hidden'); deleteGameBtn.classList.remove('hidden'); } else { loadGameMessage.textContent = 'Brak zapisanej gry w chmurze.'; } } catch (error) { console.error("Błąd sprawdzania zapisu gry:", error); loadGameMessage.textContent = 'Błąd połączenia z bazą danych: ' + error.message; } }
async function saveCurrentGameState() { if (!gameState.isActive || gameState.history.length === 0 || !savedGameStateRef) return; try { await savedGameStateRef.set(gameState); gameState.loadedFromFirebase = true; showTemporaryMessage('Stan gry został zapisany w chmurze!', false); } catch (error) { console.error("Błąd zapisu stanu gry:", error); showTemporaryMessage('Błąd podczas zapisu stanu gry!', true); } }
async function loadGameStateFromFirebase() { if (!savedGameStateRef) return; try { const doc = await savedGameStateRef.get(); if (doc.exists) { gameState = doc.data(); gameState.isActive = true; gameState.loadedFromFirebase = true; renderGameScreen(); loadGameScreen.classList.add('hidden'); setupScreen.classList.add('hidden'); gameScreen.classList.remove('hidden'); saveGameStateToLocalStorage(); updateGameChart(); } else { showCustomAlert('Nie znaleziono zapisu gry.'); } } catch (error) { console.error("Błąd wczytywania stanu gry:", error); showCustomAlert('Wystąpił błąd podczas wczytywania gry.'); } }
async function deleteSavedGameState() { if (!db || !savedGameStateRef) return; try { await savedGameStateRef.delete(); console.log('Zapisany stan gry został usunięty.'); } catch (error) { console.error('Błąd usuwania zapisanego stanu gry:', error); } }
async function handleDeleteSavedGame() { showCustomConfirm('Czy na pewno chcesz usunąć zapisaną grę z chmury? Tej operacji nie można cofnąć.', async () => { try { await deleteSavedGameState(); showTemporaryMessage('Zapisana gra została usunięta z chmury.', false); loadGameMessage.textContent = 'Brak zapisanej gry w chmurze.'; loadGameBtn.classList.add('hidden'); deleteGameBtn.classList.add('hidden'); } catch (error) { console.error("Błąd usuwania zapisu gry:", error); showTemporaryMessage('Błąd podczas usuwania zapisu gry!', true); } }); }

// --- Funkcje gry ---

function addRoundScore() {
    const filledInputsCount = scoreInputs.querySelectorAll('.input-filled').length;
    if (filledInputsCount < gameState.players.length) { showTemporaryMessage('Wypełnij punkty dla wszystkich graczy (wpisz 0, jeśli gracz nic nie zdobył).', true); const firstEmptyInput = [...scoreInputs.querySelectorAll('input')].find(input => !input.classList.contains('input-filled')); firstEmptyInput?.focus(); return; }
    const roundScores = {};
    let roundingOccurred = false;
    for (let i = 0; i < gameState.players.length; i++) {
        const player = gameState.players[i];
        const input = document.getElementById(`score-input-${i}`);
        let scoreValue = parseInt(input.value, 10);
        if (Math.abs(scoreValue) > 360) { showTemporaryMessage(`Błąd: Maksymalna liczba punktów w rundzie to 360. Gracz "${player.name}" ma wpisane ${scoreValue}.`, true); input.focus(); return; }
        if (scoreValue !== 0) {
            if (player.score >= 800 && scoreValue > 0 && scoreValue < 100) { showTemporaryMessage('Gracz z wynikiem 800+ musi ugrać minimum 100 punktów (dla punktów dodatnich).', true); input.focus(); return; }
            if (scoreValue > 0) { let roundedScore = Math.round(scoreValue / 10) * 10; if (roundedScore !== scoreValue) roundingOccurred = true; scoreValue = roundedScore; input.value = scoreValue; }
        }
        roundScores[player.name] = scoreValue;
    }
    gameState.players.forEach(p => p.score += roundScores[p.name]);
    gameState.history.unshift(roundScores);
    if (gameState.players.length === 2) { gameState.firstPlayerIndex = gameState.history.length % 2 !== 0 ? (gameState.initialFirstPlayerIndex + 1) % 2 : gameState.initialFirstPlayerIndex; } else { gameState.firstPlayerIndex = (gameState.firstPlayerIndex + 1) % gameState.players.length; }
    updateScoreValues(); updateFirstPlayerMarker(); renderRoundHistory(); updateGameChart(); checkWinner(); saveGameStateToLocalStorage();
    if(gameState.isActive) {
        gameState.players.forEach((_, i) => { const input = document.getElementById(`score-input-${i}`); input.value = ''; input.classList.remove('input-filled'); });
        if (roundingOccurred) showTemporaryMessage('Wynik dodatni został zaokrąglony do najbliższej 10-tki.', false);
        renderRoundInfo(); document.getElementById('score-input-0')?.focus();
        if (gameState.history.length > 0) { saveGameBtn.disabled = false; saveGameBtn.classList.remove('btn-disabled'); }
    }
}

function showWinnerModal(winner) {
    gameState.isActive = false; gameWinnerData = winner; localStorage.removeItem(GAME_STATE_KEY);
    document.getElementById('winner-message').textContent = `Wygrywa ${winner.name}! Gratulacje!`;
    document.getElementById('final-scores').innerHTML = '<h4>Końcowe wyniki:</h4>' + 
        [...gameState.players].sort((a,b) => b.score - a.score).map(p => 
            `<div class="flex justify-between"><span>${p.name}:</span><span class="font-semibold">${p.score} pkt</span></div>`
        ).join('');
    
    finalChartContainer.classList.add('hidden');
    showFinalChartBtn.classList.remove('hidden');
    if (finalChart) { finalChart.destroy(); finalChart = null; }

    winnerModal.classList.remove('hidden'); winnerModal.classList.add('flex');
}

async function saveAndEndGame() { if (!gameWinnerData) return; saveAndEndBtn.disabled = true; saveAndEndBtn.textContent = 'Zapisywanie...'; await saveStats(gameWinnerData); if (gameState.loadedFromFirebase) { await deleteSavedGameState(); } resetGame(); saveAndEndBtn.disabled = false; saveAndEndBtn.textContent = 'Zapisz wynik i zakończ'; }
function resetGame() { clearGameState(true); gameScreen.classList.add('hidden'); statsScreen.classList.add('hidden'); winnerModal.classList.add('hidden'); winnerModal.classList.remove('flex'); loadGameScreen.classList.add('hidden'); setupScreen.classList.remove('hidden'); generatePlayerNameInputs(); }
function clearGameState(fullClear = true) {
    gameState = { players: [], history: [], isActive: false, firstPlayerIndex: 0, initialFirstPlayerIndex: 0, loadedFromFirebase: false };
    gameWinnerData = null;
    if (fullClear) { localStorage.removeItem(GAME_STATE_KEY); }
    saveGameBtn.disabled = true; saveGameBtn.classList.add('btn-disabled');
    if (gameChart) { gameChart.destroy(); gameChart = null; }
    chartContainer.classList.add('hidden');
    chartContent?.classList.add('hidden');
    gameChartVisible = false;
    if (chartToggleBtn) chartToggleBtn.setAttribute('aria-expanded', 'false');
    if (chartToggleIcon) chartToggleIcon.textContent = '▼';
}

// --- Funkcje do rysowania wykresów ---

function updateGameChart() {
    if (gameState.history.length === 0) {
        chartContainer.classList.add('hidden');
        chartContent?.classList.add('hidden');
        gameChartVisible = false;
        if (chartToggleBtn) chartToggleBtn.setAttribute('aria-expanded', 'false');
        if (chartToggleIcon) chartToggleIcon.textContent = '▼';
        if (gameChart) { gameChart.destroy(); gameChart = null; }
        return;
    }

    chartContainer.classList.remove('hidden');
    if (gameChart) { gameChart.destroy(); }
    const config = createChartConfig(gameChartCanvas);
    gameChart = new Chart(config.ctx, config.options);

    if (gameChartVisible) {
        chartContent.classList.remove('hidden');
        chartToggleBtn.setAttribute('aria-expanded', 'true');
        chartToggleIcon.textContent = '▲';
    } else {
        chartContent.classList.add('hidden');
        chartToggleBtn.setAttribute('aria-expanded', 'false');
        chartToggleIcon.textContent = '▼';
    }
}

function toggleGameChart() {
    if (gameState.history.length === 0) return;
    gameChartVisible = !gameChartVisible;
    chartContent.classList.toggle('hidden', !gameChartVisible);
    chartToggleBtn.setAttribute('aria-expanded', String(gameChartVisible));
    chartToggleIcon.textContent = gameChartVisible ? '▲' : '▼';
    if (gameChartVisible && gameChart) setTimeout(() => gameChart.resize(), 0);
}

function renderFinalChart() {
    finalChartContainer.classList.remove('hidden'); 
    showFinalChartBtn.classList.add('hidden'); 
    
    if (finalChart) { finalChart.destroy(); }
    
    const config = createChartConfig(finalChartCanvas);
    finalChart = new Chart(config.ctx, config.options);
}

function createChartConfig(canvasElement) {
    const labels = ['Start'];
    for (let i = 1; i <= gameState.history.length; i++) { labels.push(`Runda ${i}`); }
    const chartColors = ['#34d399', '#fbbf24', '#f87171', '#38bdf8'];
    const datasets = gameState.players.map((player, playerIndex) => {
        const scoresOverTime = [0]; let cumulativeScore = 0;
        [...gameState.history].reverse().forEach(round => { cumulativeScore += round[player.name] || 0; scoresOverTime.push(cumulativeScore); });
        return { label: player.name, data: scoresOverTime, borderColor: chartColors[playerIndex % chartColors.length], backgroundColor: chartColors[playerIndex % chartColors.length] + '33', fill: false, tension: 0.25 };
    });
    
    return {
        ctx: canvasElement.getContext('2d'),
        options: {
            type: 'line',
            data: { labels: labels, datasets: datasets },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { labels: { color: '#ecfdf5', font: { family: 'Plus Jakarta Sans', weight: '600' } } } },
                scales: {
                    y: {
                        ticks: { 
                            color: '#6ee7b7',
                            stepSize: 200
                        },
                        grid: {
                            color: (context) => {
                                if (context.tick.value === 1000) return 'rgba(52, 211, 153, 0.45)';  // Przezroczysty szmaragd (Wygrana)
                                if (context.tick.value === 800) return 'rgba(251, 146, 60, 0.5)';   // Przezroczysty pomarańcz (Bariera 800)
                                if (context.tick.value === 0) return 'rgba(248, 113, 113, 0.35)';   // Przezroczysta czerwień (Start)
                                return '#1c332c';
                            },
                            lineWidth: (context) => {
                                if (context.tick.value === 1000 || context.tick.value === 800 || context.tick.value === 0) return 2;
                                return 1;
                            },
                            borderDash: (context) => {
                                if (context.tick.value === 800 || context.tick.value === 1000) return [6, 4];
                                return [];
                            }
                        }
                    },
                    x: { ticks: { color: '#6ee7b7' }, grid: { color: '#1c332c' } }
                }
            }
        }
    };
}

// Pozostałe funkcje pomocnicze
let messageTimeout; 
function showTemporaryMessage(message, isError = false) { 
    statusMessageContainer.innerHTML = `<div class="p-2.5 rounded-xl ${isError ? 'bg-rose-950/90 text-rose-200 border border-rose-800/60' : 'bg-amber-950/90 text-amber-200 border border-amber-800/60'} text-xs font-semibold">${message}</div>`; 
    clearTimeout(messageTimeout); 
    messageTimeout = setTimeout(() => { statusMessageContainer.innerHTML = ''; }, 5000); 
}

function renderRoundInfo() { 
    if (!gameState.isActive) return; 
    const currentRound = gameState.history.length + 1; 
    
    if (addRoundHeading) {
        addRoundHeading.textContent = `Dodaj punkty za rundę: ${currentRound}`;
    }
    
    const isRound1 = gameState.history.length === 0; 
    if (firstPlayerBar) {
        firstPlayerBar.classList.toggle('hidden', !isRound1);
    } else if (rotateFirstPlayerBtn) {
        rotateFirstPlayerBtn.classList.toggle('hidden', !isRound1);
    }
}

function recalculateScores() { gameState.players.forEach(p => p.score = 0); [...gameState.history].reverse().forEach(round => { gameState.players.forEach(player => { player.score += round[player.name] || 0; }); }); if (gameState.players.length === 2) { gameState.firstPlayerIndex = gameState.history.length % 2 === 0 ? gameState.initialFirstPlayerIndex : (gameState.initialFirstPlayerIndex + 1) % 2; } else { gameState.firstPlayerIndex = (gameState.initialFirstPlayerIndex + gameState.history.length) % gameState.players.length; } updateScoreValues(); updateFirstPlayerMarker(); renderRoundHistory(); renderRoundInfo(); }
function renderRoundHistory() { if (gameState.history.length === 0) { roundHistoryContainer.innerHTML = '<p class="text-emerald-500/60 text-xs text-center p-2">Brak dodanych rund.</p>'; return; } let headerHtml = '<tr><th class="w-1/6">Runda</th>'; gameState.players.forEach(p => headerHtml += `<th class="whitespace-nowrap" title="${p.name}">${p.name.length > 5 ? p.name.substring(0, 5) + '.' : p.name}</th>`); headerHtml += '<th class="w-1/12">Akcje</th></tr>'; let bodyHtml = ''; gameState.history.forEach((round, index) => { const roundNumber = gameState.history.length - index; let rowHtml = `<tr><td>${roundNumber}</td>`; gameState.players.forEach(p => rowHtml += `<td class="${(round[p.name] || 0) < 0 ? 'score-negative' : 'history-score'}">${round[p.name] || 0}</td>`); rowHtml += `<td><button onclick="confirmDeleteRound(${index})" class="text-rose-400 hover:text-rose-300 p-0.5 rounded"><svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mx-auto" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clip-rule="evenodd" /></svg></button></td></tr>`; bodyHtml += rowHtml; }); roundHistoryContainer.innerHTML = `<table><thead>${headerHtml}</thead><tbody>${bodyHtml}</tbody></table>`; }
window.confirmDeleteRound = function(i) { showCustomConfirm('Czy na pewno chcesz usunąć tę rundę?', () => deleteRound(i)); }
function deleteRound(i) { gameState.history.splice(i, 1); recalculateScores(); updateGameChart(); checkWinner(); saveGameStateToLocalStorage(); }
function handleInputKeydown(e) { if (e.key === 'Enter') { e.preventDefault(); const currentIndex = parseInt(e.target.dataset.playerIndex, 10); const nextIndex = currentIndex + 1; if (nextIndex < gameState.players.length) { document.getElementById(`score-input-${nextIndex}`)?.focus(); } else { addRoundBtn.click(); } } }

function renderGameScreen() { 
    scoreboard.innerHTML = ''; 
    scoreInputs.innerHTML = ''; 
    gameState.players.forEach((player, i) => { 
        const scoreCard = document.createElement('div'); 
        scoreCard.className = 'card text-center p-2.5'; 
        scoreCard.innerHTML = `<div id="player-name-${i}" class="text-xs font-bold text-emerald-200/80 flex items-center justify-center gap-1"></div><div id="player-score-${i}" class="text-2xl sm:text-3xl font-black mt-0.5 ${player.score >= 800 ? 'score-danger' : 'text-emerald-400'}">${player.score}</div>`; 
        scoreboard.appendChild(scoreCard); 
        
        const inputContainer = document.createElement('div'); 
        const label = document.createElement('label'); 
        label.setAttribute('for', `score-input-${i}`); 
        label.className = 'block mb-1 text-xs font-bold text-emerald-300/80 truncate'; 
        label.textContent = player.name; 
        
        const inputElement = document.createElement('input'); 
        inputElement.type = 'number'; 
        inputElement.id = `score-input-${i}`; 
        inputElement.className = 'input-field text-center font-bold text-base'; 
        inputElement.placeholder = '0'; 
        inputElement.dataset.playerIndex = i; 
        inputElement.addEventListener('keydown', handleInputKeydown); 
        inputElement.addEventListener('input', (e) => { e.target.classList.toggle('input-filled', e.target.value.trim() !== ''); }); 
        
        inputContainer.appendChild(label); 
        inputContainer.appendChild(inputElement); 
        scoreInputs.appendChild(inputContainer); 
    }); 
    updateScoreValues(); 
    updateFirstPlayerMarker(); 
    renderRoundHistory(); 
    renderRoundInfo(); 
    updateGameChart(); 
    document.getElementById('score-input-0')?.focus(); 
}

function updateScoreValues() { if (!gameState.isActive && !gameWinnerData) return; const maxScore = Math.max(...gameState.players.map(p => p.score)); gameState.players.forEach((p, i) => { const scoreEl = document.getElementById(`player-score-${i}`); const cardEl = scoreboard.children[i]; if (scoreEl) { scoreEl.textContent = p.score; scoreEl.classList.toggle('score-danger', p.score >= 800); scoreEl.classList.toggle('text-emerald-400', p.score < 800); } if (cardEl) cardEl.classList.toggle(LEADER_CLASS, p.score === maxScore && maxScore > 0); }); }
function generatePlayerNameInputs() { const count = parseInt(playerCountSelect.value, 10); playerNamesContainer.innerHTML = ''; for (let i = 1; i <= count; i++) { playerNamesContainer.innerHTML += `<div><label for="player${i}" class="block mb-1 text-xs font-semibold text-emerald-200/70">Imię gracza ${i}:</label><input type="text" id="player${i}" class="input-field font-medium" placeholder="Gracz ${i}" value="${defaultPlayerNames[i - 1] || `Gracz ${i}`}"></div>`; } }
function startGame() { const players = []; let hasValidNames = true; for (let i = 1; i <= parseInt(playerCountSelect.value, 10); i++) { const input = document.getElementById(`player${i}`); const name = input.value.trim(); if (name === '') { input.style.borderColor = '#f87171'; hasValidNames = false; } else { input.style.borderColor = ''; players.push({ name: name, score: 0 }); } } if (!hasValidNames) { showCustomAlert('Wszystkie pola z imionami muszą być wypełnione.'); return; } clearGameState(true); gameState = { players, history: [], isActive: true, firstPlayerIndex: 0, initialFirstPlayerIndex: 0, loadedFromFirebase: false }; renderGameScreen(); setupScreen.classList.add('hidden'); statsScreen.classList.add('hidden'); gameScreen.classList.remove('hidden'); saveGameStateToLocalStorage(); }
function checkWinner() { if (!gameState.isActive) return; const winners = gameState.players.filter(p => p.score >= 1000); if (winners.length > 0) { const winner = winners.reduce((prev, curr) => (prev.score > curr.score) ? prev : curr); showWinnerModal(winner); } }
function handleCorrectLastRound() { if (gameState.history.length === 0) return; winnerModal.classList.add('hidden'); winnerModal.classList.remove('flex'); gameState.isActive = true; gameWinnerData = null; gameState.history.shift(); recalculateScores(); updateGameChart(); const inputs = scoreInputs.querySelectorAll('input'); inputs.forEach(input => { input.value = ''; input.classList.remove('input-filled'); }); inputs[0]?.focus(); showTemporaryMessage('Ostatnia runda została cofnięta. Możesz teraz poprawić wynik.', false); saveGameStateToLocalStorage(); }

function updateFirstPlayerMarker() { 
    gameState.players.forEach((p, i) => { 
        const nameEl = document.getElementById(`player-name-${i}`); 
        const cardEl = scoreboard.children[i]; 
        const isStartPlayer = (i === gameState.initialFirstPlayerIndex);

        if (nameEl) { 
            const startStar = isStartPlayer 
                ? '<span class="text-rose-400 font-normal mr-1" title="Rozpoczynający mecz (Runda 1)">★</span>' 
                : '';

            // Sztywny kwadracik 14x14px (w-3.5 h-3.5) bez wpływu na wysokość w pionie
            const musikBadge = (i === gameState.firstPlayerIndex) 
                ? '<span class="bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[7px] w-3.5 h-3.5 rounded-sm font-black uppercase inline-flex items-center justify-center leading-none ml-1 shrink-0" title="Na musiku">M</span>' 
                : ''; 

            nameEl.innerHTML = `<span class="flex items-center justify-center">${startStar}<span>${p.name}</span></span> ${musikBadge}`; 
        } 
        
        if (cardEl) {
            cardEl.classList.toggle('is-musik', i === gameState.firstPlayerIndex); 
        } 
    }); 
}

function rotateFirstPlayer() { if (gameState.history.length > 0) { showTemporaryMessage('Zmiana możliwa tylko w Rundzie 1.', true); return; } if (!gameState.isActive || gameState.players.length < 2) return; gameState.firstPlayerIndex = (gameState.firstPlayerIndex + 1) % gameState.players.length; gameState.initialFirstPlayerIndex = gameState.firstPlayerIndex; updateFirstPlayerMarker(); renderRoundInfo(); saveGameStateToLocalStorage(); }
function handleBackFromStats() { statsScreen.classList.add('hidden'); if(gameState.isActive) gameScreen.classList.remove('hidden'); else setupScreen.classList.remove('hidden'); }
function handleBackToMenu() { if (gameState.isActive) { const message = gameState.loadedFromFirebase ? 'Porzucić obecną grę? Będziesz mógł wrócić do niej później (zapis pozostanie w chmurze).' : 'Porzucić obecną grę? Postęp lokalny zostanie trwale usunięty.'; showCustomConfirm(message, resetGame); } else { resetGame(); } }
let currentYesHandler, currentNoHandler; function showCustomAlert(msg) { showCustomConfirm(msg, () => {}, false); }
function showCustomConfirm(msg, onConfirm, showNo = true) { confirmMessage.textContent = msg; confirmModal.classList.add('flex'); confirmModal.classList.remove('hidden'); confirmNoBtn.classList.toggle('hidden', !showNo); if (!showNo) { confirmYesBtn.textContent = 'OK'; confirmYesBtn.classList.remove('bg-rose-600', 'w-1/2'); confirmYesBtn.classList.add('btn-primary', 'w-full'); } else { confirmYesBtn.textContent = 'Tak'; confirmYesBtn.classList.add('bg-rose-600', 'w-1/2'); confirmYesBtn.classList.remove('btn-primary', 'w-full'); } if (currentYesHandler) confirmYesBtn.removeEventListener('click', currentYesHandler); if (currentNoHandler) confirmNoBtn.removeEventListener('click', currentNoHandler); const cleanUp = () => { confirmModal.classList.add('hidden'); confirmModal.classList.remove('flex'); confirmYesBtn.removeEventListener('click', currentYesHandler); confirmNoBtn.removeEventListener('click', currentNoHandler); confirmYesBtn.textContent = 'Tak'; }; const handleYes = () => { cleanUp(); if (showNo) onConfirm(); }; const handleNo = cleanUp; currentYesHandler = handleYes; currentNoHandler = handleNo; confirmYesBtn.addEventListener('click', currentYesHandler); confirmNoBtn.addEventListener('click', currentNoHandler); }
async function saveStats(winner) { if (!db) return; try { const winnerRef = db.collection(FIREBASE_COLLECTION_WINS).doc(winner.name); await winnerRef.set({ name: winner.name, wins: firebase.firestore.FieldValue.increment(1) }, { merge: true }); showTemporaryMessage(`Zwycięstwo ${winner.name} zapisane w rankingu!`, false); } catch (e) { console.error("Błąd zapisu statystyk do Firebase:", e); showTemporaryMessage("Błąd zapisu statystyk do Firebase!", true); } }
async function getStatsFromFirebase() { if (!db) { return { playerWins: {} }; } const stats = { playerWins: {} }; try { const winsSnapshot = await db.collection(FIREBASE_COLLECTION_WINS).get(); winsSnapshot.forEach(doc => { const data = doc.data(); if (data.wins) { stats.playerWins[doc.id] = parseInt(data.wins, 10) || 0; } }); } catch (e) { console.error("Błąd pobierania statystyk z Firebase:", e); showTemporaryMessage("Błąd pobierania statystyk z Firebase!", true); } return stats; }
async function showStats() { const stats = await getStatsFromFirebase(); const totalGames = Object.values(stats.playerWins).reduce((sum, current) => sum + current, 0); let summaryHtml = `<p class="text-base text-emerald-100">Zagrano łącznie: <span class="font-black text-emerald-400">${totalGames}</span> gier</p>`; const sortedWins = Object.entries(stats.playerWins).sort(([, a], [, b]) => b - a); if (sortedWins.length > 0) { summaryHtml += `<h4 class="mt-4 mb-2 font-bold text-xs uppercase tracking-wider text-emerald-300">Ranking zwycięstw:</h4>`; summaryHtml += `<div class="space-y-1.5 text-sm">`; sortedWins.forEach(([name, wins]) => { const winPercentage = totalGames > 0 ? ((wins / totalGames) * 100).toFixed(2) : '0.00'; summaryHtml += `<div class="flex justify-between items-center border-b border-emerald-900/40 pb-1"><span>${name}:</span> <span class="font-bold"><span class="text-emerald-400">${wins}</span> wygrane (${winPercentage}%)</span></div>`; }); summaryHtml += `</div>`; } else { summaryHtml += `<p class="mt-3 text-sm text-emerald-300/60">Brak zapisanych gier w rankingu.</p>`; } statsSummary.innerHTML = summaryHtml; setupScreen.classList.add('hidden'); gameScreen.classList.add('hidden'); statsScreen.classList.remove('hidden'); }

// --- Event Listeners ---
showLoadGameBtn.addEventListener('click', handleShowLoadScreen);
backFromLoadBtn.addEventListener('click', () => { loadGameScreen.classList.add('hidden'); setupScreen.classList.remove('hidden'); });
loadGameBtn.addEventListener('click', loadGameStateFromFirebase);
deleteGameBtn.addEventListener('click', handleDeleteSavedGame);
saveGameBtn.addEventListener('click', saveCurrentGameState);
showStatsBtn.addEventListener('click', showStats);
gameToStatsBtn.addEventListener('click', showStats);
backFromStatsBtn.addEventListener('click', handleBackFromStats);
playerCountSelect.addEventListener('change', generatePlayerNameInputs);
startGameBtn.addEventListener('click', startGame);
addRoundBtn.addEventListener('click', addRoundScore);
rotateFirstPlayerBtn.addEventListener('click', rotateFirstPlayer);
backToMenuBtn.addEventListener('click', handleBackToMenu);
saveAndEndBtn.addEventListener('click', saveAndEndGame);
modalBackToMenuBtn.addEventListener('click', resetGame);
correctLastRoundBtn.addEventListener('click', handleCorrectLastRound);
showFinalChartBtn.addEventListener('click', renderFinalChart);
chartToggleBtn?.addEventListener('click', toggleGameChart);

// --- Inicjalizacja ---
function initializeApp() {
    if (!tryToLoadGameFromLocalStorage()) {
        generatePlayerNameInputs();
        updateGameChart(); 
    }
}
initializeApp();