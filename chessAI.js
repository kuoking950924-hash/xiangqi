// AI 對手：使用簡化版 minimax + alpha-beta 剪枝，搜尋深度 2-3 層
// 難度設定為「中等」：能判斷吃子價值、避免明顯送死，但不會走出頂尖棋路

import { allLegalMoves, makeMove, isInCheck, RED, BLACK } from './chessRules.js';

const PIECE_VALUE = {
  king: 10000,
  chariot: 900,
  cannon: 450,
  horse: 400,
  elephant: 200,
  advisor: 200,
  soldier: 100,
};

// 位置加成：鼓勵兵過河、馬車炮往中路靠攏，讓AI走法不會太呆板
function positionBonus(piece, row, col) {
  let bonus = 0;
  if (piece.type === 'soldier') {
    const crossed = piece.color === RED ? row <= 4 : row >= 5;
    if (crossed) bonus += 40;
    // 越靠近對方九宮微加分
    const distToCenter = Math.abs(col - 4);
    bonus += (4 - distToCenter) * 2;
  }
  if (piece.type === 'horse' || piece.type === 'cannon') {
    const distToCenter = Math.abs(col - 4);
    bonus += (4 - distToCenter) * 3;
  }
  return bonus;
}

function evaluateBoard(board, aiColor) {
  let score = 0;
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const p = board[r][c];
      if (!p) continue;
      const value = PIECE_VALUE[p.type] + positionBonus(p, r, c);
      score += p.color === aiColor ? value : -value;
    }
  }
  return score;
}

// 走法排序：把「吃到高價值棋子」的走法排前面。
// alpha-beta 剪枝的效率高度依賴搜尋順序——好棋先搜，就能更早剪掉大量分支。
// 這是把 AI 從「卡住畫面 800ms」降到可接受範圍的關鍵優化。
function orderMoves(board, moves) {
  return moves
    .map((move) => {
      const target = board[move.to[0]][move.to[1]];
      return { move, priority: target ? PIECE_VALUE[target.type] : 0 };
    })
    .sort((a, b) => b.priority - a.priority)
    .map((m) => m.move);
}

function minimax(board, depth, alpha, beta, maximizing, aiColor, humanColor) {
  if (depth === 0) {
    return { score: evaluateBoard(board, aiColor) };
  }

  const currentColor = maximizing ? aiColor : humanColor;
  const moves = orderMoves(board, allLegalMoves(board, currentColor));

  if (moves.length === 0) {
    // 無棋可走：被將死或困斃，給極端分數
    const inCheck = isInCheck(board, currentColor);
    const score = maximizing
      ? (inCheck ? -99999 : -50000)
      : (inCheck ? 99999 : 50000);
    return { score };
  }

  let bestMove = null;

  if (maximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      const nextBoard = makeMove(board, move.from, move.to);
      const { score } = minimax(nextBoard, depth - 1, alpha, beta, false, aiColor, humanColor);
      if (score > maxEval) {
        maxEval = score;
        bestMove = move;
      }
      alpha = Math.max(alpha, score);
      if (beta <= alpha) break;
    }
    return { score: maxEval, move: bestMove };
  }
  let minEval = Infinity;
  for (const move of moves) {
    const nextBoard = makeMove(board, move.from, move.to);
    const { score } = minimax(nextBoard, depth - 1, alpha, beta, true, aiColor, humanColor);
    if (score < minEval) {
      minEval = score;
      bestMove = move;
    }
    beta = Math.min(beta, score);
    if (beta <= alpha) break;
  }
  return { score: minEval, move: bestMove };
}

// 加入一點隨機性：在評分相近的最佳走法中隨機挑一個，避免每盤都走一樣、顯得死板
export function getAIMove(board, aiColor) {
  const humanColor = aiColor === RED ? BLACK : RED;
  const moves = allLegalMoves(board, aiColor);
  if (moves.length === 0) return null;

  const DEPTH = 3; // 中等難度：3層搜尋，兼顧棋力與運算速度
  const ordered = orderMoves(board, moves);
  const scored = ordered.map((move) => {
    const nextBoard = makeMove(board, move.from, move.to);
    const { score } = minimax(nextBoard, DEPTH - 1, -Infinity, Infinity, false, aiColor, humanColor);
    return { move, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0].score;
  // 容許誤差範圍內的走法都算「同樣好」，隨機挑一個，避免呆板
  const topMoves = scored.filter((s) => s.score >= best - 30);
  const pick = topMoves[Math.floor(Math.random() * topMoves.length)];
  return pick.move;
}
