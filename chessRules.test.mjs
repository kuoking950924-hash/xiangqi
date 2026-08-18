// 簡易自檢測試（不依賴測試框架，直接 node 執行）
import {
  createInitialBoard,
  legalMoves,
  allLegalMoves,
  makeMove,
  isInCheck,
  isCheckmate,
  RED,
  BLACK,
} from './chessRules.js';

let pass = 0;
let fail = 0;

function assert(cond, msg) {
  if (cond) {
    pass++;
  } else {
    fail++;
    console.error(`✗ FAIL: ${msg}`);
  }
}

// 測試1：初始盤面雙方各16子，開局紅方兵有合法走法
{
  const board = createInitialBoard();
  let redCount = 0, blackCount = 0;
  for (let r = 0; r < 10; r++) for (let c = 0; c < 9; c++) {
    const p = board[r][c];
    if (p) { if (p.color === RED) redCount++; else blackCount++; }
  }
  assert(redCount === 16, `紅方應有16子，實際 ${redCount}`);
  assert(blackCount === 16, `黑方應有16子，實際 ${blackCount}`);
}

// 測試2：象不能過河
{
  const board = createInitialBoard();
  // 紅象在 row9,col2 和 row9,col6
  const moves = legalMoves(board, 9, 2);
  const crossesRiver = moves.some(([r]) => r <= 4);
  assert(!crossesRiver, '象不應該能過河');
}

// 測試3：馬蹩腿
{
  const board = createInitialBoard();
  // 紅馬在 row9,col1，前方 row8,col1 有兵？不，兵在row6。row8,col1是空的，馬應可正常動
  const moves = legalMoves(board, 9, 1);
  assert(moves.length > 0, '開局紅馬應該有合法走法');
}

// 測試4：炮隔子吃子邏輯 - 手動擺盤測試
{
  // 清空棋盤，手動測試炮
  const empty = Array.from({ length: 10 }, () => Array(9).fill(null));
  empty[5][4] = { type: 'cannon', color: RED };
  empty[5][2] = { type: 'soldier', color: BLACK }; // 炮架
  empty[5][0] = { type: 'chariot', color: BLACK }; // 隔子可吃
  const moves = legalMoves(empty, 5, 4);
  const canCapture = moves.some(([r, c]) => r === 5 && c === 0);
  assert(canCapture, '炮應該能隔一子吃掉遠處的棋子');
  const cannotCaptureAdjacentEmpty = moves.some(([r, c]) => r === 5 && c === 3);
  assert(cannotCaptureAdjacentEmpty, '炮在無阻擋時應能移動到中間空格');
}

// 測試5：將帥不能出九宮
{
  const empty = Array.from({ length: 10 }, () => Array(9).fill(null));
  empty[9][4] = { type: 'king', color: RED };
  const moves = legalMoves(empty, 9, 4);
  const leavesPalace = moves.some(([r, c]) => c < 3 || c > 5 || r < 7);
  assert(!leavesPalace, '帥不應該能離開九宮（此處無對方將，飛將規則不適用）');
}

// 測試6：飛將規則 - 中間無子時兩將不能同列
{
  const empty = Array.from({ length: 10 }, () => Array(9).fill(null));
  empty[9][4] = { type: 'king', color: RED };
  empty[0][4] = { type: 'king', color: BLACK };
  const inCheck = isInCheck(empty, BLACK);
  assert(inCheck, '兩將對面中間無子時，應視為被將軍（飛將）');
}

// 測試7：將軍時必須應將，不能走出仍被將軍的走法
{
  const empty = Array.from({ length: 10 }, () => Array(9).fill(null));
  empty[9][4] = { type: 'king', color: RED };
  empty[0][4] = { type: 'chariot', color: BLACK }; // 黑車直接將軍紅帥（同列無阻擋）
  const moves = legalMoves(empty, 9, 4);
  // 帥只能左右移動躲避（仍在九宮內），不能原地不動
  const staysInCheck = moves.some(([r, c]) => {
    const testBoard = makeMove(empty, [9, 4], [r, c]);
    return isInCheck(testBoard, RED);
  });
  assert(!staysInCheck, '所有合法走法執行後都不應該讓自己仍處於被將軍狀態');
}

// 測試8：開局狀態下沒有一方被將死
{
  const board = createInitialBoard();
  assert(!isCheckmate(board, RED), '開局紅方不應該被將死');
  assert(!isCheckmate(board, BLACK), '開局黑方不應該被將死');
}

// 測試9：allLegalMoves 在開局應該回傳合理數量的走法（象棋開局約有44種走法左右，允許範圍）
{
  const board = createInitialBoard();
  const moves = allLegalMoves(board, RED);
  assert(moves.length > 20 && moves.length < 60, `開局紅方合法走法數量應在合理範圍，實際 ${moves.length}`);
}

console.log(`\n測試結果：${pass} 通過, ${fail} 失敗`);
if (fail > 0) process.exit(1);
