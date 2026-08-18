import { createInitialBoard, RED, BLACK, allLegalMoves } from './chessRules.js';
import { getAIMove } from './chessAI.js';

let pass = 0, fail = 0;
function assert(cond, msg) {
  if (cond) pass++;
  else { fail++; console.error(`✗ FAIL: ${msg}`); }
}

// 測試1：AI 在開局能正常給出一個合法走法
{
  const board = createInitialBoard();
  const move = getAIMove(board, BLACK);
  assert(move !== null, 'AI應該能在開局給出走法');
  const legal = allLegalMoves(board, BLACK);
  const isLegal = legal.some((m) => m.from[0] === move.from[0] && m.from[1] === move.from[1]
    && m.to[0] === move.to[0] && m.to[1] === move.to[1]);
  assert(isLegal, 'AI給出的走法必須是合法走法之一');
}

// 測試2：白吃棋局面下，AI應該選擇吃掉送上門的車（測試吃子價值判斷）
{
  const empty = Array.from({ length: 10 }, () => Array(9).fill(null));
  empty[9][4] = { type: 'king', color: RED };
  empty[0][4] = { type: 'king', color: BLACK };
  empty[5][4] = { type: 'chariot', color: RED }; // 紅車送到黑馬攻擊範圍
  empty[3][3] = { type: 'horse', color: BLACK }; // 黑馬可跳吃 (5,4)？需驗證馬步
  // 改用更直接的情境：黑車可直接吃掉紅車
  empty[5][6] = { type: 'chariot', color: BLACK };
  const move = getAIMove(empty, BLACK);
  const capturesChariot = move.to[0] === 5 && move.to[1] === 4;
  assert(capturesChariot, `AI面對送上門的車應該選擇吃掉，實際走法 from=${move.from} to=${move.to}`);
}

// 測試3：AI不應該選擇會讓自己被立刻反吃且虧損的走法（簡易送死測試）
{
  const empty = Array.from({ length: 10 }, () => Array(9).fill(null));
  empty[9][4] = { type: 'king', color: RED };
  empty[0][4] = { type: 'king', color: BLACK };
  empty[9][0] = { type: 'chariot', color: RED }; // 紅車鎮守
  empty[0][1] = { type: 'chariot', color: BLACK };
  const move = getAIMove(empty, BLACK);
  // 黑車不應該送去被紅車吃掉的位置（例如走到 col 0 同列被紅車吃）
  const movesIntoRedChariotLine = move.to[1] === 0 && move.to[0] !== 0;
  assert(!movesIntoRedChariotLine || move.to[0] === 9, 'AI不應該無謂送子到會被吃掉且無補償的位置');
}

console.log(`\n測試結果：${pass} 通過, ${fail} 失敗`);
if (fail > 0) process.exit(1);
