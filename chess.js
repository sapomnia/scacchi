// Scacchi - due giocatori locali
// Notazione pezzi: lettera minuscola = nero, maiuscola = bianco (P N B R Q K)

const PIECES = {
  'K': '\u2654', 'Q': '\u2655', 'R': '\u2656', 'B': '\u2657', 'N': '\u2658', 'P': '\u2659',
  'k': '\u265A', 'q': '\u265B', 'r': '\u265C', 'b': '\u265D', 'n': '\u265E', 'p': '\u265F'
};

const FILES = ['a','b','c','d','e','f','g','h'];

function initialBoard() {
  return [
    ['r','n','b','q','k','b','n','r'],
    ['p','p','p','p','p','p','p','p'],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['P','P','P','P','P','P','P','P'],
    ['R','N','B','Q','K','B','N','R']
  ];
}

const state = {
  board: initialBoard(),
  turn: 'w',
  selected: null,
  legalForSelected: [],
  history: [],
  castling: { K: true, Q: true, k: true, q: true },
  enPassant: null, // [r,c] della casa "di passaggio"
  halfmove: 0,
  fullmove: 1,
  flipped: false,
  lastMove: null,
  gameOver: false,
  captured: { w: [], b: [] },
  mode: 'pvp',        // 'pvp' | 'pvc'
  aiColor: 'b',       // colore giocato dal computer
  difficulty: 3,      // profondità di ricerca
  aiThinking: false
};

const boardEl = document.getElementById('board');
const turnEl = document.getElementById('turn');
const messageEl = document.getElementById('message');
const historyEl = document.getElementById('history');
const capWhiteEl = document.getElementById('capWhite');
const capBlackEl = document.getElementById('capBlack');
const promotionEl = document.getElementById('promotion');

// ---- Helpers ----
const isWhite = p => p && p === p.toUpperCase();
const isBlack = p => p && p === p.toLowerCase();
const colorOf = p => p ? (isWhite(p) ? 'w' : 'b') : null;
const inside = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
const cloneBoard = b => b.map(row => row.slice());
const squareName = (r, c) => FILES[c] + (8 - r);

// ---- Generazione mosse ----
function generatePseudoMoves(board, color, castling, enPassant) {
  const moves = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p || colorOf(p) !== color) continue;
      const type = p.toLowerCase();
      if (type === 'p') pawnMoves(board, r, c, color, enPassant, moves);
      else if (type === 'n') stepMoves(board, r, c, color, [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]], moves);
      else if (type === 'b') slideMoves(board, r, c, color, [[-1,-1],[-1,1],[1,-1],[1,1]], moves);
      else if (type === 'r') slideMoves(board, r, c, color, [[-1,0],[1,0],[0,-1],[0,1]], moves);
      else if (type === 'q') slideMoves(board, r, c, color, [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]], moves);
      else if (type === 'k') {
        stepMoves(board, r, c, color, [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]], moves);
        castleMoves(board, r, c, color, castling, moves);
      }
    }
  }
  return moves;
}

function pawnMoves(board, r, c, color, enPassant, moves) {
  const dir = color === 'w' ? -1 : 1;
  const startRow = color === 'w' ? 6 : 1;
  const promoteRow = color === 'w' ? 0 : 7;
  // avanti di 1
  if (inside(r+dir, c) && !board[r+dir][c]) {
    addPawnMove(r, c, r+dir, c, promoteRow, moves);
    if (r === startRow && !board[r+2*dir][c]) {
      moves.push({ from:[r,c], to:[r+2*dir,c], double: true });
    }
  }
  // catture diagonali
  for (const dc of [-1, 1]) {
    const nr = r + dir, nc = c + dc;
    if (!inside(nr, nc)) continue;
    const target = board[nr][nc];
    if (target && colorOf(target) !== color) {
      addPawnMove(r, c, nr, nc, promoteRow, moves);
    }
    // en passant
    if (enPassant && enPassant[0] === nr && enPassant[1] === nc) {
      moves.push({ from:[r,c], to:[nr,nc], enPassant: true });
    }
  }
}

function addPawnMove(fr, fc, tr, tc, promoteRow, moves) {
  if (tr === promoteRow) {
    for (const promo of ['q','r','b','n']) {
      moves.push({ from:[fr,fc], to:[tr,tc], promotion: promo });
    }
  } else {
    moves.push({ from:[fr,fc], to:[tr,tc] });
  }
}

function stepMoves(board, r, c, color, deltas, moves) {
  for (const [dr, dc] of deltas) {
    const nr = r + dr, nc = c + dc;
    if (!inside(nr, nc)) continue;
    const t = board[nr][nc];
    if (!t || colorOf(t) !== color) moves.push({ from:[r,c], to:[nr,nc] });
  }
}

function slideMoves(board, r, c, color, deltas, moves) {
  for (const [dr, dc] of deltas) {
    let nr = r + dr, nc = c + dc;
    while (inside(nr, nc)) {
      const t = board[nr][nc];
      if (!t) {
        moves.push({ from:[r,c], to:[nr,nc] });
      } else {
        if (colorOf(t) !== color) moves.push({ from:[r,c], to:[nr,nc] });
        break;
      }
      nr += dr; nc += dc;
    }
  }
}

function castleMoves(board, r, c, color, castling, moves) {
  const row = color === 'w' ? 7 : 0;
  if (r !== row || c !== 4) return;
  if (isSquareAttacked(board, row, 4, color === 'w' ? 'b' : 'w')) return;
  const kKey = color === 'w' ? 'K' : 'k';
  const qKey = color === 'w' ? 'Q' : 'q';
  // lato re
  if (castling[kKey] && !board[row][5] && !board[row][6]) {
    const expectedRook = color === 'w' ? 'R' : 'r';
    if (board[row][7] === expectedRook) {
      if (!isSquareAttacked(board, row, 5, color === 'w' ? 'b' : 'w') &&
          !isSquareAttacked(board, row, 6, color === 'w' ? 'b' : 'w')) {
        moves.push({ from:[r,c], to:[row,6], castle: 'k' });
      }
    }
  }
  // lato donna
  if (castling[qKey] && !board[row][1] && !board[row][2] && !board[row][3]) {
    const expectedRook = color === 'w' ? 'R' : 'r';
    if (board[row][0] === expectedRook) {
      if (!isSquareAttacked(board, row, 3, color === 'w' ? 'b' : 'w') &&
          !isSquareAttacked(board, row, 2, color === 'w' ? 'b' : 'w')) {
        moves.push({ from:[r,c], to:[row,2], castle: 'q' });
      }
    }
  }
}

function isSquareAttacked(board, r, c, byColor) {
  // pedoni
  const dir = byColor === 'w' ? -1 : 1;
  for (const dc of [-1, 1]) {
    const nr = r - dir, nc = c + dc; // attaccanti vengono da r-dir
    if (inside(nr, nc)) {
      const p = board[nr][nc];
      if (p && colorOf(p) === byColor && p.toLowerCase() === 'p') return true;
    }
  }
  // cavalli
  for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
    const nr = r + dr, nc = c + dc;
    if (inside(nr, nc)) {
      const p = board[nr][nc];
      if (p && colorOf(p) === byColor && p.toLowerCase() === 'n') return true;
    }
  }
  // re (adiacente)
  for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
    const nr = r + dr, nc = c + dc;
    if (inside(nr, nc)) {
      const p = board[nr][nc];
      if (p && colorOf(p) === byColor && p.toLowerCase() === 'k') return true;
    }
  }
  // diagonali: alfiere/donna
  for (const [dr, dc] of [[-1,-1],[-1,1],[1,-1],[1,1]]) {
    let nr = r + dr, nc = c + dc;
    while (inside(nr, nc)) {
      const p = board[nr][nc];
      if (p) {
        if (colorOf(p) === byColor && (p.toLowerCase() === 'b' || p.toLowerCase() === 'q')) return true;
        break;
      }
      nr += dr; nc += dc;
    }
  }
  // righe/colonne: torre/donna
  for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
    let nr = r + dr, nc = c + dc;
    while (inside(nr, nc)) {
      const p = board[nr][nc];
      if (p) {
        if (colorOf(p) === byColor && (p.toLowerCase() === 'r' || p.toLowerCase() === 'q')) return true;
        break;
      }
      nr += dr; nc += dc;
    }
  }
  return false;
}

function findKing(board, color) {
  const target = color === 'w' ? 'K' : 'k';
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) if (board[r][c] === target) return [r, c];
  return null;
}

function isInCheck(board, color) {
  const k = findKing(board, color);
  if (!k) return false;
  return isSquareAttacked(board, k[0], k[1], color === 'w' ? 'b' : 'w');
}

// Simula la mossa e verifica che il re non finisca sotto scacco
function legalMoves(color) {
  const pseudo = generatePseudoMoves(state.board, color, state.castling, state.enPassant);
  return pseudo.filter(m => {
    const snapshot = simulateMove(state.board, m, state.castling);
    return !isInCheck(snapshot.board, color);
  });
}

function simulateMove(board, move, castling) {
  const b = cloneBoard(board);
  const [fr, fc] = move.from;
  const [tr, tc] = move.to;
  const piece = b[fr][fc];
  b[tr][tc] = piece;
  b[fr][fc] = '';
  if (move.enPassant) {
    const dir = isWhite(piece) ? 1 : -1;
    b[tr + dir][tc] = '';
  }
  if (move.castle === 'k') {
    b[tr][5] = b[tr][7];
    b[tr][7] = '';
  } else if (move.castle === 'q') {
    b[tr][3] = b[tr][0];
    b[tr][0] = '';
  }
  if (move.promotion) {
    b[tr][tc] = isWhite(piece) ? move.promotion.toUpperCase() : move.promotion;
  }
  return { board: b };
}

// ---- Esecuzione mossa ----
async function makeMove(move) {
  const [fr, fc] = move.from;
  const [tr, tc] = move.to;
  const piece = state.board[fr][fc];
  const captured = move.enPassant
    ? state.board[tr + (isWhite(piece) ? 1 : -1)][tc]
    : state.board[tr][tc];

  // promozione: chiedi quale pezzo se non già specificato
  if (piece.toLowerCase() === 'p' && (tr === 0 || tr === 7) && !move.promotion) {
    move.promotion = await askPromotion();
  }

  // salva stato per undo
  const snap = {
    board: cloneBoard(state.board),
    turn: state.turn,
    castling: { ...state.castling },
    enPassant: state.enPassant ? [...state.enPassant] : null,
    halfmove: state.halfmove,
    fullmove: state.fullmove,
    lastMove: state.lastMove,
    captured: { w: [...state.captured.w], b: [...state.captured.b] },
    historyLen: state.history.length
  };

  // esegui
  state.board[tr][tc] = piece;
  state.board[fr][fc] = '';
  if (move.enPassant) {
    const dir = isWhite(piece) ? 1 : -1;
    state.board[tr + dir][tc] = '';
  }
  if (move.castle === 'k') {
    state.board[tr][5] = state.board[tr][7];
    state.board[tr][7] = '';
  } else if (move.castle === 'q') {
    state.board[tr][3] = state.board[tr][0];
    state.board[tr][0] = '';
  }
  if (move.promotion) {
    state.board[tr][tc] = isWhite(piece) ? move.promotion.toUpperCase() : move.promotion;
  }

  // aggiorna diritti arrocco
  if (piece === 'K') { state.castling.K = false; state.castling.Q = false; }
  if (piece === 'k') { state.castling.k = false; state.castling.q = false; }
  if (piece === 'R' && fr === 7 && fc === 0) state.castling.Q = false;
  if (piece === 'R' && fr === 7 && fc === 7) state.castling.K = false;
  if (piece === 'r' && fr === 0 && fc === 0) state.castling.q = false;
  if (piece === 'r' && fr === 0 && fc === 7) state.castling.k = false;
  if (captured === 'R' && tr === 7 && tc === 0) state.castling.Q = false;
  if (captured === 'R' && tr === 7 && tc === 7) state.castling.K = false;
  if (captured === 'r' && tr === 0 && tc === 0) state.castling.q = false;
  if (captured === 'r' && tr === 0 && tc === 7) state.castling.k = false;

  // en passant target
  if (move.double) {
    state.enPassant = [(fr + tr) / 2, tc];
  } else {
    state.enPassant = null;
  }

  // catturati
  if (captured) {
    const byColor = state.turn;
    state.captured[byColor].push(captured);
  }

  // halfmove / fullmove
  if (piece.toLowerCase() === 'p' || captured) state.halfmove = 0;
  else state.halfmove++;
  if (state.turn === 'b') state.fullmove++;

  // notazione algebrica semplificata
  const san = toSAN(snap.board, move, piece, captured);
  state.history.push({ san, turn: state.turn, snap });

  state.lastMove = { from: [fr, fc], to: [tr, tc] };
  state.turn = state.turn === 'w' ? 'b' : 'w';
  state.selected = null;
  state.legalForSelected = [];

  checkGameEnd();
  render();
  maybeTriggerAI();
}

function undoMove() {
  if (!state.history.length || state.aiThinking) return;
  // in modalità vs computer, annulla la mossa dell'AI + la tua, così torna il tuo turno
  const steps = (state.mode === 'pvc' && state.history.length >= 2) ? 2 : 1;
  for (let i = 0; i < steps; i++) {
    if (!state.history.length) break;
    const last = state.history.pop();
    const s = last.snap;
    state.board = s.board;
    state.turn = s.turn;
    state.castling = s.castling;
    state.enPassant = s.enPassant;
    state.halfmove = s.halfmove;
    state.fullmove = s.fullmove;
    state.lastMove = s.lastMove;
    state.captured = s.captured;
  }
  state.gameOver = false;
  state.selected = null;
  state.legalForSelected = [];
  messageEl.textContent = '';
  render();
}

function toSAN(board, move, piece, captured) {
  if (move.castle === 'k') return 'O-O';
  if (move.castle === 'q') return 'O-O-O';
  const type = piece.toUpperCase();
  let s = '';
  if (type !== 'P') s += type;
  if (captured || move.enPassant) {
    if (type === 'P') s += FILES[move.from[1]];
    s += 'x';
  }
  s += squareName(move.to[0], move.to[1]);
  if (move.promotion) s += '=' + move.promotion.toUpperCase();
  return s;
}

function checkGameEnd() {
  const moves = legalMoves(state.turn);
  if (moves.length === 0) {
    if (isInCheck(state.board, state.turn)) {
      const winner = state.turn === 'w' ? 'Nero' : 'Bianco';
      messageEl.textContent = `Scacco matto! Vince il ${winner}.`;
    } else {
      messageEl.textContent = 'Stallo. Patta.';
    }
    state.gameOver = true;
  } else if (state.halfmove >= 100) {
    messageEl.textContent = 'Patta per regola delle 50 mosse.';
    state.gameOver = true;
  } else {
    messageEl.textContent = isInCheck(state.board, state.turn) ? 'Scacco!' : '';
  }
}

// ---- Promozione (modal) ----
function askPromotion() {
  return new Promise(resolve => {
    promotionEl.classList.remove('hidden');
    const buttons = promotionEl.querySelectorAll('button');
    const handler = (e) => {
      const piece = e.target.dataset.piece;
      promotionEl.classList.add('hidden');
      buttons.forEach(b => b.removeEventListener('click', handler));
      resolve(piece);
    };
    buttons.forEach(b => b.addEventListener('click', handler));
  });
}

// ---- Rendering ----
function render() {
  boardEl.innerHTML = '';
  const rows = state.flipped ? [7,6,5,4,3,2,1,0] : [0,1,2,3,4,5,6,7];
  const cols = state.flipped ? [7,6,5,4,3,2,1,0] : [0,1,2,3,4,5,6,7];

  const kingPos = isInCheck(state.board, state.turn) ? findKing(state.board, state.turn) : null;

  for (const r of rows) {
    for (const c of cols) {
      const sq = document.createElement('div');
      sq.className = 'square ' + ((r + c) % 2 === 0 ? 'light' : 'dark');
      sq.dataset.r = r;
      sq.dataset.c = c;

      if (state.lastMove) {
        if ((state.lastMove.from[0] === r && state.lastMove.from[1] === c) ||
            (state.lastMove.to[0] === r && state.lastMove.to[1] === c)) {
          sq.classList.add('lastmove');
        }
      }
      if (state.selected && state.selected[0] === r && state.selected[1] === c) {
        sq.classList.add('selected');
      }
      if (kingPos && kingPos[0] === r && kingPos[1] === c) {
        sq.classList.add('check');
      }
      for (const m of state.legalForSelected) {
        if (m.to[0] === r && m.to[1] === c) {
          sq.classList.add('legal');
          if (state.board[r][c] || m.enPassant) sq.classList.add('capture');
          break;
        }
      }

      // coordinate (solo sul bordo)
      const displayRow = state.flipped ? rows.indexOf(r) : r;
      const displayCol = state.flipped ? cols.indexOf(c) : c;
      if (displayCol === 0) {
        const lbl = document.createElement('span');
        lbl.className = 'coord rank';
        lbl.textContent = 8 - r;
        sq.appendChild(lbl);
      }
      if (displayRow === 7) {
        const lbl = document.createElement('span');
        lbl.className = 'coord file';
        lbl.textContent = FILES[c];
        sq.appendChild(lbl);
      }

      const piece = state.board[r][c];
      if (piece) {
        const span = document.createElement('span');
        span.className = 'piece';
        span.textContent = PIECES[piece];
        sq.appendChild(span);
      }

      sq.addEventListener('click', () => onSquareClick(r, c));
      boardEl.appendChild(sq);
    }
  }

  turnEl.textContent = state.gameOver
    ? 'Partita finita'
    : (state.turn === 'w' ? 'Tocca al Bianco' : 'Tocca al Nero');

  historyEl.innerHTML = '';
  for (let i = 0; i < state.history.length; i += 2) {
    const li = document.createElement('li');
    const white = state.history[i]?.san || '';
    const black = state.history[i+1]?.san || '';
    li.textContent = `${white} ${black}`;
    historyEl.appendChild(li);
  }

  capWhiteEl.textContent = state.captured.w.map(p => PIECES[p]).join(' ');
  capBlackEl.textContent = state.captured.b.map(p => PIECES[p]).join(' ');
}

function onSquareClick(r, c) {
  if (state.gameOver || state.aiThinking) return;
  if (state.mode === 'pvc' && state.turn === state.aiColor) return;
  const piece = state.board[r][c];

  // se ho già selezionato e clicco una casa legale -> muovo
  if (state.selected) {
    const move = state.legalForSelected.find(m => m.to[0] === r && m.to[1] === c);
    if (move) {
      makeMove(move);
      return;
    }
    // se clicco un altro pezzo mio, cambio selezione
    if (piece && colorOf(piece) === state.turn) {
      selectSquare(r, c);
      return;
    }
    // altrimenti deseleziono
    state.selected = null;
    state.legalForSelected = [];
    render();
    return;
  }

  // prima selezione
  if (piece && colorOf(piece) === state.turn) {
    selectSquare(r, c);
  }
}

function selectSquare(r, c) {
  state.selected = [r, c];
  const all = legalMoves(state.turn);
  state.legalForSelected = all.filter(m => m.from[0] === r && m.from[1] === c);
  render();
}

// ---- Pulsanti ----
function resetGame() {
  Object.assign(state, {
    board: initialBoard(),
    turn: 'w',
    selected: null,
    legalForSelected: [],
    history: [],
    castling: { K: true, Q: true, k: true, q: true },
    enPassant: null,
    halfmove: 0,
    fullmove: 1,
    lastMove: null,
    gameOver: false,
    captured: { w: [], b: [] },
    aiThinking: false
  });
  messageEl.textContent = '';
  render();
  maybeTriggerAI();
}

document.getElementById('reset').addEventListener('click', resetGame);
document.getElementById('undo').addEventListener('click', undoMove);
document.getElementById('flip').addEventListener('click', () => {
  state.flipped = !state.flipped;
  render();
});

// ---- Controlli modalità / AI ----
const modeSelect = document.getElementById('mode');
const aiColorSelect = document.getElementById('aiColor');
const difficultySelect = document.getElementById('difficulty');
const aiOptions = document.querySelectorAll('.ai-option');

function updateAIControls() {
  const show = state.mode === 'pvc';
  aiOptions.forEach(el => el.classList.toggle('hidden', !show));
}

modeSelect.addEventListener('change', () => {
  state.mode = modeSelect.value;
  updateAIControls();
  resetGame();
});
aiColorSelect.addEventListener('change', () => {
  state.aiColor = aiColorSelect.value;
  resetGame();
});
difficultySelect.addEventListener('change', () => {
  state.difficulty = parseInt(difficultySelect.value, 10);
});

// ---- Motore AI: minimax + alpha-beta ----
const PIECE_VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

// Piece-square tables (prospettiva del Bianco; per il Nero si specchia: PST[7-r][c])
const PST = {
  p: [
    [ 0, 0, 0, 0, 0, 0, 0, 0],
    [50,50,50,50,50,50,50,50],
    [10,10,20,30,30,20,10,10],
    [ 5, 5,10,25,25,10, 5, 5],
    [ 0, 0, 0,20,20, 0, 0, 0],
    [ 5,-5,-10,0, 0,-10,-5, 5],
    [ 5,10,10,-20,-20,10,10, 5],
    [ 0, 0, 0, 0, 0, 0, 0, 0]
  ],
  n: [
    [-50,-40,-30,-30,-30,-30,-40,-50],
    [-40,-20,  0,  0,  0,  0,-20,-40],
    [-30,  0, 10, 15, 15, 10,  0,-30],
    [-30,  5, 15, 20, 20, 15,  5,-30],
    [-30,  0, 15, 20, 20, 15,  0,-30],
    [-30,  5, 10, 15, 15, 10,  5,-30],
    [-40,-20,  0,  5,  5,  0,-20,-40],
    [-50,-40,-30,-30,-30,-30,-40,-50]
  ],
  b: [
    [-20,-10,-10,-10,-10,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5, 10, 10,  5,  0,-10],
    [-10,  5,  5, 10, 10,  5,  5,-10],
    [-10,  0, 10, 10, 10, 10,  0,-10],
    [-10, 10, 10, 10, 10, 10, 10,-10],
    [-10,  5,  0,  0,  0,  0,  5,-10],
    [-20,-10,-10,-10,-10,-10,-10,-20]
  ],
  r: [
    [ 0, 0, 0, 0, 0, 0, 0, 0],
    [ 5,10,10,10,10,10,10, 5],
    [-5, 0, 0, 0, 0, 0, 0,-5],
    [-5, 0, 0, 0, 0, 0, 0,-5],
    [-5, 0, 0, 0, 0, 0, 0,-5],
    [-5, 0, 0, 0, 0, 0, 0,-5],
    [-5, 0, 0, 0, 0, 0, 0,-5],
    [ 0, 0, 0, 5, 5, 0, 0, 0]
  ],
  q: [
    [-20,-10,-10, -5, -5,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5,  5,  5,  5,  0,-10],
    [ -5,  0,  5,  5,  5,  5,  0, -5],
    [  0,  0,  5,  5,  5,  5,  0, -5],
    [-10,  5,  5,  5,  5,  5,  0,-10],
    [-10,  0,  5,  0,  0,  0,  0,-10],
    [-20,-10,-10, -5, -5,-10,-10,-20]
  ],
  k: [
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-30,-40,-40,-50,-50,-40,-40,-30],
    [-20,-30,-30,-40,-40,-30,-30,-20],
    [-10,-20,-20,-20,-20,-20,-20,-10],
    [ 20, 20,  0,  0,  0,  0, 20, 20],
    [ 20, 30, 10,  0,  0, 10, 30, 20]
  ]
};

function evaluateBoard(board) {
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p) continue;
      const type = p.toLowerCase();
      const val = PIECE_VALUES[type];
      const pst = isWhite(p) ? PST[type][r][c] : PST[type][7-r][c];
      score += isWhite(p) ? (val + pst) : -(val + pst);
    }
  }
  return score;
}

// Applica la mossa su una posizione pura (non tocca lo stato globale)
function applyMovePure(pos, move) {
  const b = cloneBoard(pos.board);
  const castling = { ...pos.castling };
  const [fr, fc] = move.from;
  const [tr, tc] = move.to;
  const piece = b[fr][fc];
  const captured = move.enPassant ? b[tr + (isWhite(piece) ? 1 : -1)][tc] : b[tr][tc];

  b[tr][tc] = piece;
  b[fr][fc] = '';
  if (move.enPassant) {
    const dir = isWhite(piece) ? 1 : -1;
    b[tr + dir][tc] = '';
  }
  if (move.castle === 'k') { b[tr][5] = b[tr][7]; b[tr][7] = ''; }
  else if (move.castle === 'q') { b[tr][3] = b[tr][0]; b[tr][0] = ''; }
  if (move.promotion) b[tr][tc] = isWhite(piece) ? move.promotion.toUpperCase() : move.promotion;

  if (piece === 'K') { castling.K = false; castling.Q = false; }
  if (piece === 'k') { castling.k = false; castling.q = false; }
  if (piece === 'R' && fr === 7 && fc === 0) castling.Q = false;
  if (piece === 'R' && fr === 7 && fc === 7) castling.K = false;
  if (piece === 'r' && fr === 0 && fc === 0) castling.q = false;
  if (piece === 'r' && fr === 0 && fc === 7) castling.k = false;
  if (captured === 'R' && tr === 7 && tc === 0) castling.Q = false;
  if (captured === 'R' && tr === 7 && tc === 7) castling.K = false;
  if (captured === 'r' && tr === 0 && tc === 0) castling.q = false;
  if (captured === 'r' && tr === 0 && tc === 7) castling.k = false;

  return {
    board: b,
    turn: pos.turn === 'w' ? 'b' : 'w',
    castling,
    enPassant: move.double ? [(fr + tr) / 2, tc] : null,
    captured
  };
}

function genLegalMoves(pos) {
  const pseudo = generatePseudoMoves(pos.board, pos.turn, pos.castling, pos.enPassant);
  return pseudo.filter(m => {
    const next = applyMovePure(pos, m);
    return !isInCheck(next.board, pos.turn);
  });
}

// Ordinamento mosse: catture per prime (MVV-LVA semplificato)
function orderMoves(board, moves) {
  return moves.slice().sort((a, b) => scoreMove(board, b) - scoreMove(board, a));
}
function scoreMove(board, m) {
  const target = board[m.to[0]][m.to[1]];
  let s = 0;
  if (target) s += 10 * PIECE_VALUES[target.toLowerCase()] - PIECE_VALUES[board[m.from[0]][m.from[1]].toLowerCase()];
  if (m.promotion) s += PIECE_VALUES[m.promotion];
  return s;
}

function search(pos, depth, alpha, beta, ply) {
  if (depth === 0) return { score: evaluateBoard(pos.board) };
  const moves = genLegalMoves(pos);
  if (moves.length === 0) {
    if (isInCheck(pos.board, pos.turn)) {
      // matto: il lato al tratto perde; valore peggiore se il matto è più vicino
      return { score: pos.turn === 'w' ? -100000 + ply : 100000 - ply };
    }
    return { score: 0 }; // stallo
  }
  const ordered = orderMoves(pos.board, moves);
  let bestMove = ordered[0];

  if (pos.turn === 'w') {
    let best = -Infinity;
    for (const m of ordered) {
      const next = applyMovePure(pos, m);
      const { score } = search(next, depth - 1, alpha, beta, ply + 1);
      if (score > best) { best = score; bestMove = m; }
      if (best > alpha) alpha = best;
      if (beta <= alpha) break;
    }
    return { score: best, move: bestMove };
  } else {
    let best = Infinity;
    for (const m of ordered) {
      const next = applyMovePure(pos, m);
      const { score } = search(next, depth - 1, alpha, beta, ply + 1);
      if (score < best) { best = score; bestMove = m; }
      if (best < beta) beta = best;
      if (beta <= alpha) break;
    }
    return { score: best, move: bestMove };
  }
}

function maybeTriggerAI() {
  if (state.mode !== 'pvc' || state.gameOver) return;
  if (state.turn !== state.aiColor || state.aiThinking) return;

  state.aiThinking = true;
  messageEl.textContent = 'Il computer sta pensando…';

  // setTimeout per permettere al browser di disegnare prima di bloccare il thread
  setTimeout(() => {
    const pos = {
      board: cloneBoard(state.board),
      turn: state.turn,
      castling: { ...state.castling },
      enPassant: state.enPassant ? [...state.enPassant] : null
    };
    const { move } = search(pos, state.difficulty, -Infinity, Infinity, 0);
    state.aiThinking = false;
    if (move) makeMove(move);
  }, 50);
}

updateAIControls();
render();
maybeTriggerAI();
