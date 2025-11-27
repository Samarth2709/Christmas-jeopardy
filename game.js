// ===== Game State =====
let gameState = {
    participants: [],
    scores: {},
    categories: [],
    currentRound: 1,
    usedQuestions: { round1: [], round2: [] },
    currentQuestion: null,
    scoreHistory: []
};

// ===== DOM Elements =====
const setupScreen = document.getElementById('setup-screen');
const gameScreen = document.getElementById('game-screen');
const participantInputs = document.getElementById('participant-inputs');
const scoreboard = document.getElementById('scoreboard');
const gameBoard = document.getElementById('game-board');
const questionModal = document.getElementById('question-modal');
const endGameModal = document.getElementById('end-game-modal');

// ===== Setup Functions =====
function addParticipant() {
    const count = participantInputs.children.length + 1;
    const group = document.createElement('div');
    group.className = 'participant-input-group';
    group.innerHTML = `
        <label>Contestant ${count}:</label>
        <input type="text" class="participant-name" placeholder="Enter name...">
        <button class="remove-btn" onclick="removeParticipant(this)">✕</button>
    `;
    participantInputs.appendChild(group);
    updateParticipantLabels();
}

function removeParticipant(button) {
    if (participantInputs.children.length > 2) {
        button.parentElement.remove();
        updateParticipantLabels();
    }
}

function updateParticipantLabels() {
    const groups = participantInputs.querySelectorAll('.participant-input-group');
    groups.forEach((group, index) => {
        group.querySelector('label').textContent = `Contestant ${index + 1}:`;
    });
}

// ===== Game Initialization =====
async function startGame() {
    // Get participant names
    const inputs = document.querySelectorAll('.participant-name');
    const names = Array.from(inputs)
        .map(input => input.value.trim())
        .filter(name => name !== '');
    
    if (names.length < 2) {
        alert('Please enter at least 2 contestant names!');
        return;
    }
    
    // Initialize participants and scores
    gameState.participants = names;
    names.forEach(name => {
        gameState.scores[name] = 0;
    });
    
    // Load questions
    try {
        const response = await fetch('questions.json');
        if (!response.ok) {
            throw new Error('Could not load questions.json');
        }
        const data = await response.json();
        gameState.categories = data.categories;
        
        if (gameState.categories.length < 8) {
            alert(`Warning: Expected at least 8 categories, found ${gameState.categories.length}`);
        }
    } catch (error) {
        alert('Error loading questions: ' + error.message + '\n\nMake sure questions.json exists in the same folder.');
        return;
    }
    
    // Save initial state
    saveGameState();
    
    // Switch screens
    setupScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    
    // Build the game
    renderScoreboard();
    renderGameBoard();
}

// ===== Rendering Functions =====
function renderScoreboard() {
    scoreboard.innerHTML = '';
    gameState.participants.forEach(name => {
        const card = document.createElement('div');
        card.className = 'score-card';
        card.id = `score-${name.replace(/\s+/g, '-')}`;
        
        const score = gameState.scores[name];
        const scoreClass = score < 0 ? 'score negative' : 'score';
        
        card.innerHTML = `
            <div class="name">${name}</div>
            <div class="${scoreClass}">${formatScore(score)}</div>
        `;
        scoreboard.appendChild(card);
    });
}

function formatScore(score) {
    if (score < 0) {
        return `-$${Math.abs(score).toLocaleString()}`;
    }
    return `$${score.toLocaleString()}`;
}

function renderGameBoard() {
    gameBoard.innerHTML = '';
    
    const roundKey = gameState.currentRound === 1 ? 'round1' : 'round2';
    const pointValues = gameState.currentRound === 1 
        ? [200, 400, 600, 800, 1000] 
        : [400, 800, 1600, 2000];
    
    // Round 1: 8 categories, Round 2: 4 categories
    const numCategories = gameState.currentRound === 1 ? 8 : 4;
    const categoriesToShow = gameState.categories.slice(0, numCategories);
    
    // Update round title
    document.getElementById('round-title').textContent = 
        gameState.currentRound === 1 ? 'Round 1' : '🎄 Double Jeopardy 🎄';
    
    // Update grid columns based on round
    gameBoard.style.gridTemplateColumns = `repeat(${numCategories}, 1fr)`;
    
    // Create category headers
    categoriesToShow.forEach(category => {
        const header = document.createElement('div');
        header.className = 'category-header';
        header.textContent = category.name;
        gameBoard.appendChild(header);
    });
    
    // Create question cells
    pointValues.forEach((points, rowIndex) => {
        categoriesToShow.forEach((category, colIndex) => {
            const cell = document.createElement('div');
            cell.className = 'question-cell';
            cell.dataset.category = colIndex;
            cell.dataset.row = rowIndex;
            cell.dataset.points = points;
            cell.dataset.round = roundKey;
            
            const questionId = `${roundKey}-${colIndex}-${rowIndex}`;
            if (gameState.usedQuestions[roundKey].includes(questionId)) {
                cell.classList.add('used');
                cell.textContent = '';
            } else {
                cell.textContent = `$${points}`;
                cell.onclick = () => openQuestion(colIndex, rowIndex, points, roundKey);
            }
            
            gameBoard.appendChild(cell);
        });
    });
    
    // Show/hide navigation buttons
    updateNavigationButtons();
}

function updateNavigationButtons() {
    const nextRoundBtn = document.getElementById('next-round-btn');
    const endGameBtn = document.getElementById('end-game-btn');
    
    const roundKey = gameState.currentRound === 1 ? 'round1' : 'round2';
    // Round 1: 8 categories x 5 questions = 40
    // Round 2: 4 categories x 4 questions = 16
    const totalQuestions = gameState.currentRound === 1 ? 40 : 16;
    const usedCount = gameState.usedQuestions[roundKey].length;
    
    if (gameState.currentRound === 1) {
        nextRoundBtn.classList.toggle('hidden', usedCount < totalQuestions);
        endGameBtn.classList.add('hidden');
    } else {
        nextRoundBtn.classList.add('hidden');
        endGameBtn.classList.toggle('hidden', usedCount < totalQuestions);
    }
}

// ===== Question Modal Functions =====
function openQuestion(categoryIndex, rowIndex, points, roundKey) {
    const category = gameState.categories[categoryIndex];
    const questions = category[roundKey];
    const question = questions[rowIndex];
    
    if (!question) {
        alert('Question not found!');
        return;
    }
    
    gameState.currentQuestion = {
        categoryIndex,
        rowIndex,
        points,
        roundKey,
        question: question.question,
        answer: question.answer
    };
    
    // Populate modal
    document.getElementById('modal-category').textContent = category.name;
    document.getElementById('modal-points').textContent = `$${points}`;
    document.getElementById('question-text').textContent = question.question;
    document.getElementById('answer-text').textContent = question.answer;
    
    // Reset modal state
    document.getElementById('answer-text').classList.add('hidden');
    document.getElementById('award-section').classList.add('hidden');
    document.getElementById('reveal-answer-btn').classList.remove('hidden');
    
    // Create award buttons
    const awardButtons = document.getElementById('award-buttons');
    const deductButtons = document.getElementById('deduct-buttons');
    awardButtons.innerHTML = '';
    deductButtons.innerHTML = '';
    
    gameState.participants.forEach(name => {
        // Award button
        const awardBtn = document.createElement('button');
        awardBtn.className = 'award-btn';
        awardBtn.textContent = name;
        awardBtn.onclick = () => awardPoints(name, points);
        awardButtons.appendChild(awardBtn);
        
        // Deduct button
        const deductBtn = document.createElement('button');
        deductBtn.className = 'deduct-btn';
        deductBtn.textContent = name;
        deductBtn.onclick = () => deductPoints(name, points);
        deductButtons.appendChild(deductBtn);
    });
    
    // Show modal
    questionModal.classList.remove('hidden');
}

function revealAnswer() {
    document.getElementById('answer-text').classList.remove('hidden');
    document.getElementById('award-section').classList.remove('hidden');
    document.getElementById('reveal-answer-btn').classList.add('hidden');
}

function awardPoints(participantName, points) {
    gameState.scores[participantName] += points;
    
    // Log score change
    logScoreChange(participantName, points, 'award');
    
    // Mark question as used and close
    markQuestionUsed();
    closeModal();
    
    // Update UI
    renderScoreboard();
    saveGameState();
}

function deductPoints(participantName, points) {
    gameState.scores[participantName] -= points;
    
    // Log score change
    logScoreChange(participantName, -points, 'deduct');
    
    // Update UI (don't close modal - allow multiple deductions)
    renderScoreboard();
    saveGameState();
}

function markQuestionUsed() {
    if (!gameState.currentQuestion) return;
    
    const { categoryIndex, rowIndex, roundKey } = gameState.currentQuestion;
    const questionId = `${roundKey}-${categoryIndex}-${rowIndex}`;
    
    if (!gameState.usedQuestions[roundKey].includes(questionId)) {
        gameState.usedQuestions[roundKey].push(questionId);
    }
    
    // Update the cell visually
    const cell = document.querySelector(
        `.question-cell[data-category="${categoryIndex}"][data-row="${rowIndex}"][data-round="${roundKey}"]`
    );
    if (cell) {
        cell.classList.add('used');
        cell.textContent = '';
        cell.onclick = null;
    }
    
    updateNavigationButtons();
}

function closeModal() {
    // If answer was revealed but no one was awarded, still mark as used
    if (gameState.currentQuestion && 
        !document.getElementById('answer-text').classList.contains('hidden')) {
        markQuestionUsed();
    }
    
    questionModal.classList.add('hidden');
    gameState.currentQuestion = null;
    saveGameState();
}

// ===== Round Navigation =====
function startNextRound() {
    gameState.currentRound = 2;
    renderGameBoard();
    saveGameState();
}

function endGame() {
    // Sort participants by score
    const sortedParticipants = [...gameState.participants].sort(
        (a, b) => gameState.scores[b] - gameState.scores[a]
    );
    
    // Populate final scores
    const finalScoresDiv = document.getElementById('final-scores');
    finalScoresDiv.innerHTML = '';
    
    sortedParticipants.forEach((name, index) => {
        const row = document.createElement('div');
        row.className = 'final-score-row' + (index === 0 ? ' winner' : '');
        
        const rank = index === 0 ? '🏆' : `#${index + 1}`;
        
        row.innerHTML = `
            <span class="rank">${rank}</span>
            <span class="name">${name}</span>
            <span class="score">${formatScore(gameState.scores[name])}</span>
        `;
        finalScoresDiv.appendChild(row);
    });
    
    // Winner announcement
    const winner = sortedParticipants[0];
    document.getElementById('winner-announcement').textContent = 
        `🎉 ${winner} wins with ${formatScore(gameState.scores[winner])}! 🎉`;
    
    // Show end game modal
    endGameModal.classList.remove('hidden');
    
    // Auto-download scores
    downloadScores();
}

// ===== Score Tracking & CSV =====
function logScoreChange(participant, pointChange, type) {
    const entry = {
        timestamp: new Date().toISOString(),
        participant,
        pointChange,
        type,
        newTotal: gameState.scores[participant],
        round: gameState.currentRound,
        category: gameState.currentQuestion ? 
            gameState.categories[gameState.currentQuestion.categoryIndex].name : 'N/A',
        questionPoints: gameState.currentQuestion ? gameState.currentQuestion.points : 0
    };
    
    gameState.scoreHistory.push(entry);
    saveGameState();
}

function downloadScores() {
    // Create CSV content
    let csvContent = 'Timestamp,Participant,Point Change,Type,New Total,Round,Category,Question Points\n';
    
    gameState.scoreHistory.forEach(entry => {
        csvContent += `${entry.timestamp},${entry.participant},${entry.pointChange},${entry.type},${entry.newTotal},${entry.round},${entry.category},${entry.questionPoints}\n`;
    });
    
    // Add final scores summary
    csvContent += '\n\nFinal Scores Summary\n';
    csvContent += 'Participant,Final Score\n';
    
    const sortedParticipants = [...gameState.participants].sort(
        (a, b) => gameState.scores[b] - gameState.scores[a]
    );
    
    sortedParticipants.forEach(name => {
        csvContent += `${name},${gameState.scores[name]}\n`;
    });
    
    // Create and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    link.setAttribute('href', url);
    link.setAttribute('download', `jeopardy-scores-${timestamp}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ===== Local Storage =====
function saveGameState() {
    try {
        localStorage.setItem('christmasJeopardyState', JSON.stringify(gameState));
    } catch (e) {
        console.warn('Could not save game state to localStorage:', e);
    }
}

function loadGameState() {
    try {
        const saved = localStorage.getItem('christmasJeopardyState');
        if (saved) {
            const parsed = JSON.parse(saved);
            // Only restore if there's an active game
            if (parsed.participants && parsed.participants.length > 0 && parsed.categories.length > 0) {
                if (confirm('Resume previous game?')) {
                    gameState = parsed;
                    setupScreen.classList.add('hidden');
                    gameScreen.classList.remove('hidden');
                    renderScoreboard();
                    renderGameBoard();
                    return true;
                } else {
                    localStorage.removeItem('christmasJeopardyState');
                }
            }
        }
    } catch (e) {
        console.warn('Could not load game state from localStorage:', e);
    }
    return false;
}

// ===== New Game =====
function newGame() {
    // Clear localStorage
    localStorage.removeItem('christmasJeopardyState');
    
    // Reset game state
    gameState = {
        participants: [],
        scores: {},
        categories: [],
        currentRound: 1,
        usedQuestions: { round1: [], round2: [] },
        currentQuestion: null,
        scoreHistory: []
    };
    
    // Hide modals
    endGameModal.classList.add('hidden');
    questionModal.classList.add('hidden');
    
    // Switch screens
    gameScreen.classList.add('hidden');
    setupScreen.classList.remove('hidden');
    
    // Clear and reset participant inputs
    participantInputs.innerHTML = `
        <div class="participant-input-group">
            <label>Contestant 1:</label>
            <input type="text" class="participant-name" placeholder="Enter name...">
            <button class="remove-btn" onclick="removeParticipant(this)">✕</button>
        </div>
        <div class="participant-input-group">
            <label>Contestant 2:</label>
            <input type="text" class="participant-name" placeholder="Enter name...">
            <button class="remove-btn" onclick="removeParticipant(this)">✕</button>
        </div>
    `;
    
    // Clear game board and scoreboard
    gameBoard.innerHTML = '';
    scoreboard.innerHTML = '';
}

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', () => {
    loadGameState();
});

