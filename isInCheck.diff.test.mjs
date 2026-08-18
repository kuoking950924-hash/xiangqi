// 差異測試：驗證「快速版 isInCheck」與「暴力法」在大量隨機盤面下結果完全一致。
// 為了效能而重寫核心判斷是高風險改動——只有通過這種對照驗證才能確定沒有改壞規則。

import {
  createInitialBoard,
  isInCheck,
  pseudoMoves,
  allLegalMoves,
  makeMove,
  RED,
  BLACK,
} from './chessRules.js';

// 暴力法參考實作：產生對方所有棋子的所有走法，看有沒有能吃到將的
function isInCheckBruteForce(board, color) {
  let kingPos = null;
  for (let r = 0; r < 10 && !kingPos; r++) {
    for (let c = 0; c < 9; c++) {
      const p = board[r][c];
      if (p && p.type === 'king' && p.color === color) { kingPos = [r, c]; break; }
    }
  }
  if (!kingPos) return false;
  const oppColor = color === RED ? BLACK : RED;
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const p = board[r][c];
      if (p && p.color === oppColor) {
        const moves = pseudoMoves(board, r, c);
        if (moves.some(([mr, mc]) => mr === kingPos[0] && mc === kingPos[1])) return true;
      }
    }
  }
  return false;
}

let checked = 0;
let mismatches = 0;
let checkPositions = 0;

function compare(board, label) {
  for (const color of [RED, BLACK]) {
    const fast = isInCheck(board, color);
    const brute = isInCheckBruteForce(board, color);
    checked++;
    if (fast) checkPositions++;
    if (fast !== brute) {
      mismatches++;
      if (mismatches <= 5) {
        console.error(`✗ 不一致 [${label}] color=${color}: fast=${fast}, brute=${brute}`);
        console.error(board.map((row) => row.map((p) => (p ? `${p.color[0]}${p.type[0]}` : '..')).join(' ')).join('\n'));
      }
    }
  }
}

// 隨機對局 200 盤，每盤最多 60 步，沿路比對每一個盤面
const GAMES = 200;
const MAX_PLIES = 60;

for (let g = 0; g < GAMES; g++) {
  let board = createInitialBoard();
  let turn = RED;
  for (let ply = 0; ply < MAX_PLIES; ply++) {
    compare(board, `game${g}-ply${ply}`);
    const moves = allLegalMoves(board, turn);
    if (moves.length === 0) break;
    const move = moves[Math.floor(Math.random() * moves.length)];
    board = makeMove(board, move.from, move.to);
    turn = turn === RED ? BLACK : RED;
  }
}

console.log(`比對盤面數：${checked}（其中被將軍的局面 ${checkPositions} 個）`);
console.log(`不一致數：${mismatches}`);
if (mismatches > 0) {
  console.error('\n快速版 isInCheck 與暴力法結果不同，規則已被改壞。');
  process.exit(1);
}
console.log('✓ 快速版 isInCheck 與暴力法結果完全一致');
