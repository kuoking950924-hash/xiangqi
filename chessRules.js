// 中國象棋規則引擎
// 棋盤座標：col 0-8（橫9路），row 0-9（縱10路）
// row 0 為黑方底線，row 9 為紅方底線
// 河界在 row 4/5 之間；紅方九宮：row 7-9, col 3-5；黑方九宮：row 0-2, col 3-5

export const RED = 'red';
export const BLACK = 'black';

// 棋子代碼：帥/將(king) 仕/士(advisor) 相/象(elephant) 馬(horse) 車(chariot) 炮(cannon) 兵/卒(soldier)
const PIECE_NAMES = {
  red: { king: '帥', advisor: '仕', elephant: '相', horse: '馬', chariot: '車', cannon: '炮', soldier: '兵' },
  black: { king: '將', advisor: '士', elephant: '象', horse: '馬', chariot: '車', cannon: '炮', soldier: '卒' },
};

export function pieceName(piece) {
  return PIECE_NAMES[piece.color][piece.type];
}

export function createInitialBoard() {
  // board[row][col] = { type, color } | null
  const board = Array.from({ length: 10 }, () => Array(9).fill(null));

  const backRow = ['chariot', 'horse', 'elephant', 'advisor', 'king', 'advisor', 'elephant', 'horse', 'chariot'];

  // 黑方 (row 0 底線, row 3 兵)
  backRow.forEach((type, col) => { board[0][col] = { type, color: BLACK }; });
  board[2][1] = { type: 'cannon', color: BLACK };
  board[2][7] = { type: 'cannon', color: BLACK };
  [0, 2, 4, 6, 8].forEach((col) => { board[3][col] = { type: 'soldier', color: BLACK }; });

  // 紅方 (row 9 底線, row 6 兵)
  backRow.forEach((type, col) => { board[9][col] = { type, color: RED }; });
  board[7][1] = { type: 'cannon', color: RED };
  board[7][7] = { type: 'cannon', color: RED };
  [0, 2, 4, 6, 8].forEach((col) => { board[6][col] = { type: 'soldier', color: RED }; });

  return board;
}

function inBounds(row, col) {
  return row >= 0 && row < 10 && col >= 0 && col < 9;
}

function inPalace(row, col, color) {
  if (col < 3 || col > 5) return false;
  return color === RED ? (row >= 7 && row <= 9) : (row >= 0 && row <= 2);
}

function crossedRiver(row, color) {
  return color === RED ? row <= 4 : row >= 5;
}

function countBetween(board, r1, c1, r2, c2) {
  // 僅適用同行或同列，回傳中間非空格數量
  let count = 0;
  if (r1 === r2) {
    const [lo, hi] = c1 < c2 ? [c1, c2] : [c2, c1];
    for (let c = lo + 1; c < hi; c++) if (board[r1][c]) count++;
  } else if (c1 === c2) {
    const [lo, hi] = r1 < r2 ? [r1, r2] : [r2, r1];
    for (let r = lo + 1; r < hi; r++) if (board[r][c1]) count++;
  }
  return count;
}

// 產生某棋子「不考慮自身被將軍」的合法走法（pseudo-legal）
// 匯出供測試使用：用它做暴力法對照，驗證快速版 isInCheck 的正確性
export function pseudoMoves(board, row, col) {
  const piece = board[row][col];
  if (!piece) return [];
  const { type, color } = piece;
  const moves = [];

  const tryAdd = (r, c) => {
    if (!inBounds(r, c)) return false;
    const target = board[r][c];
    if (!target) { moves.push([r, c]); return true; }
    if (target.color !== color) moves.push([r, c]);
    return false; // 遇到任何棋子（friend or foe）就不能再往該方向走（車/炮特殊處理另計）
  };

  switch (type) {
    case 'king': {
      const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      for (const [dr, dc] of dirs) {
        const r = row + dr, c = col + dc;
        if (inPalace(r, c, color)) {
          const target = board[r][c];
          if (!target || target.color !== color) moves.push([r, c]);
        }
      }
      // 飛將：與對方將帥同列且中間無子，可直接「照面」吃將（規則允許的終局判斷，這裡列為合法走法之一）
      const oppKingPos = findKing(board, color === RED ? BLACK : RED);
      if (oppKingPos && oppKingPos[1] === col) {
        if (countBetween(board, row, col, oppKingPos[0], col) === 0) {
          moves.push([oppKingPos[0], col]);
        }
      }
      break;
    }
    case 'advisor': {
      const dirs = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
      for (const [dr, dc] of dirs) {
        const r = row + dr, c = col + dc;
        if (inPalace(r, c, color)) {
          const target = board[r][c];
          if (!target || target.color !== color) moves.push([r, c]);
        }
      }
      break;
    }
    case 'elephant': {
      const dirs = [[-2, -2], [-2, 2], [2, -2], [2, 2]];
      for (const [dr, dc] of dirs) {
        const r = row + dr, c = col + dc;
        const eyeR = row + dr / 2, eyeC = col + dc / 2;
        if (!inBounds(r, c)) continue;
        if (crossedRiver(r, color)) continue; // 象不能過河
        if (board[eyeR][eyeC]) continue; // 塞象眼
        const target = board[r][c];
        if (!target || target.color !== color) moves.push([r, c]);
      }
      break;
    }
    case 'horse': {
      const jumps = [
        { d: [-2, -1], leg: [-1, 0] }, { d: [-2, 1], leg: [-1, 0] },
        { d: [2, -1], leg: [1, 0] }, { d: [2, 1], leg: [1, 0] },
        { d: [-1, -2], leg: [0, -1] }, { d: [1, -2], leg: [0, -1] },
        { d: [-1, 2], leg: [0, 1] }, { d: [1, 2], leg: [0, 1] },
      ];
      for (const { d, leg } of jumps) {
        const r = row + d[0], c = col + d[1];
        const legR = row + leg[0], legC = col + leg[1];
        if (!inBounds(r, c)) continue;
        if (board[legR][legC]) continue; // 蹩馬腿
        const target = board[r][c];
        if (!target || target.color !== color) moves.push([r, c]);
      }
      break;
    }
    case 'chariot': {
      const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      for (const [dr, dc] of dirs) {
        let r = row + dr, c = col + dc;
        while (inBounds(r, c)) {
          if (!tryAdd(r, c)) break;
          r += dr; c += dc;
        }
      }
      break;
    }
    case 'cannon': {
      const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
      for (const [dr, dc] of dirs) {
        let r = row + dr, c = col + dc;
        let jumped = false;
        while (inBounds(r, c)) {
          const target = board[r][c];
          if (!jumped) {
            if (!target) {
              moves.push([r, c]);
            } else {
              jumped = true; // 遇到第一個棋子（炮架）
            }
          } else {
            if (target) {
              if (target.color !== color) moves.push([r, c]);
              break; // 隔子吃後不能再往後
            }
          }
          r += dr; c += dc;
        }
      }
      break;
    }
    case 'soldier': {
      const forward = color === RED ? -1 : 1;
      const r = row + forward;
      if (inBounds(r, col)) {
        const target = board[r][col];
        if (!target || target.color !== color) moves.push([r, col]);
      }
      if (crossedRiver(row, color)) {
        for (const dc of [-1, 1]) {
          const c = col + dc;
          if (inBounds(row, c)) {
            const target = board[row][c];
            if (!target || target.color !== color) moves.push([row, c]);
          }
        }
      }
      break;
    }
    default:
      break;
  }

  return moves;
}

function findKing(board, color) {
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const p = board[r][c];
      if (p && p.type === 'king' && p.color === color) return [r, c];
    }
  }
  return null;
}

function cloneBoard(board) {
  return board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
}

function applyMove(board, from, to) {
  const newBoard = cloneBoard(board);
  newBoard[to[0]][to[1]] = newBoard[from[0]][from[1]];
  newBoard[from[0]][from[1]] = null;
  return newBoard;
}

// 判斷 color 方的將/帥是否正被攻擊（將軍中）
//
// 效能說明：舊版做法是「產生對方所有棋子的所有走法，再看有沒有走法能吃到將」，
// 每次呼叫都要掃全盤 90 格並展開十幾顆棋子的走法。而 minimax 每個節點都要對
// 每一個候選走法呼叫一次，成本被放大好幾萬倍，會讓瀏覽器卡住。
//
// 新版改成「站在將帥的位置往外看」：只沿著八個方向與馬、兵可能攻擊的固定格子檢查，
// 需要檢查的格子數是常數等級，不隨盤面棋子數量成長。
export function isInCheck(board, color) {
  const kingPos = findKing(board, color);
  if (!kingPos) return false;
  const [kr, kc] = kingPos;
  const oppColor = color === RED ? BLACK : RED;

  // 1. 直線方向：車、炮、對方將（飛將）
  const straightDirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (const [dr, dc] of straightDirs) {
    let r = kr + dr;
    let c = kc + dc;
    let screenCount = 0; // 中間隔了幾顆子

    while (inBounds(r, c)) {
      const p = board[r][c];
      if (p) {
        if (p.color === oppColor) {
          if (screenCount === 0) {
            // 中間無阻擋：車可直接吃；對方將在同列且無阻擋即為飛將
            if (p.type === 'chariot') return true;
            if (p.type === 'king' && dc === 0) return true;
            // 兵/卒貼身攻擊：需判斷它的行進方向是否朝向我方將
            if (p.type === 'soldier' && Math.abs(r - kr) + Math.abs(c - kc) === 1) {
              const forward = p.color === RED ? -1 : 1;
              if (r + forward === kr && c === kc) return true; // 正面推進
              if (crossedRiver(r, p.color) && r === kr) return true; // 過河後可橫吃
            }
          } else if (screenCount === 1 && p.type === 'cannon') {
            // 隔一子：炮可打
            return true;
          }
        }
        screenCount++;
        if (screenCount > 1) break; // 隔兩子以上，這個方向不可能再有威脅
      }
      r += dr;
      c += dc;
    }
  }

  // 2. 馬的攻擊：從將帥位置反推八個馬位，並檢查對應的馬腿有沒有被蹩住
  const horseAttacks = [
    { at: [-2, -1], leg: [-1, 0] }, { at: [-2, 1], leg: [-1, 0] },
    { at: [2, -1], leg: [1, 0] }, { at: [2, 1], leg: [1, 0] },
    { at: [-1, -2], leg: [0, -1] }, { at: [1, -2], leg: [0, -1] },
    { at: [-1, 2], leg: [0, 1] }, { at: [1, 2], leg: [0, 1] },
  ];
  for (const { at } of horseAttacks) {
    const hr = kr + at[0];
    const hc = kc + at[1];
    if (!inBounds(hr, hc)) continue;
    const p = board[hr][hc];
    if (!p || p.color !== oppColor || p.type !== 'horse') continue;
    // 從「馬的位置」算它的馬腿，而不是從將的位置算
    const legR = hr + (at[0] === -2 ? 1 : at[0] === 2 ? -1 : 0);
    const legC = hc + (at[1] === -2 ? 1 : at[1] === 2 ? -1 : 0);
    if (!board[legR][legC]) return true; // 馬腿沒被蹩住，構成將軍
  }

  return false;
}

// 取得某棋子「真正合法」的走法（走完後自己不能被將軍）
export function legalMoves(board, row, col) {
  const piece = board[row][col];
  if (!piece) return [];
  const candidates = pseudoMoves(board, row, col);
  return candidates.filter(([r, c]) => {
    const nextBoard = applyMove(board, [row, col], [r, c]);
    return !isInCheck(nextBoard, piece.color);
  });
}

// 取得某方所有合法走法，格式：[{ from:[r,c], to:[r,c] }]
export function allLegalMoves(board, color) {
  const result = [];
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const p = board[r][c];
      if (p && p.color === color) {
        const moves = legalMoves(board, r, c);
        moves.forEach(([mr, mc]) => result.push({ from: [r, c], to: [mr, mc] }));
      }
    }
  }
  return result;
}

export function makeMove(board, from, to) {
  return applyMove(board, from, to);
}

export function isCheckmate(board, color) {
  if (!isInCheck(board, color)) return false;
  return allLegalMoves(board, color).length === 0;
}

export function isStalemate(board, color) {
  if (isInCheck(board, color)) return false;
  return allLegalMoves(board, color).length === 0;
}

export function kingCaptured(board, color) {
  return findKing(board, color) === null;
}

// 把盤面序列化成字串，用來偵測重複局面
export function boardKey(board, turn) {
  let key = turn === RED ? 'r|' : 'b|';
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const p = board[r][c];
      key += p ? `${p.color[0]}${p.type[0]}` : '..';
    }
  }
  return key;
}
