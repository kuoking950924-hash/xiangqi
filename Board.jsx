import React, { useState, useEffect, useRef } from 'react';
import { pieceName } from './chessRules.js';
import { MOVE_ANIM_MS } from './constants.js';

// 等角投影參數：每格的寬高，以及等角變形角度
const CELL = 64;

// 把棋盤座標 (row, col) 轉換成等角螢幕座標 (isoX, isoY)
function toIso(row, col) {
  const x = (col - row) * (CELL * 0.75);
  const y = (col + row) * (CELL * 0.4);
  return { x, y };
}

export default function Board({
  board,
  selected,
  legalTargets,
  onCellClick,
  lastMove,
  animatingMove,
  inCheckColor,
}) {
  const [animProgress, setAnimProgress] = useState(1);
  const rafRef = useRef(null);

  // 走子動畫：無論是玩家或AI走子，都要跑這段動畫，確保「AI走子沒有畫面反應」的舊bug不再發生
  useEffect(() => {
    if (!animatingMove) {
      setAnimProgress(1);
      return undefined;
    }
    setAnimProgress(0);
    const duration = MOVE_ANIM_MS;
    const start = performance.now();

    function step(now) {
      const t = Math.min(1, (now - start) / duration);
      setAnimProgress(t);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      }
    }
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [animatingMove]);

  // 計算棋盤整體尺寸，確保完整顯示、不裁切（修正前版「棋子被裁切在畫面外」的bug）
  const corners = [toIso(0, 0), toIso(0, 8), toIso(9, 0), toIso(9, 8)];
  const minX = Math.min(...corners.map((p) => p.x));
  const maxX = Math.max(...corners.map((p) => p.x));
  const minY = Math.min(...corners.map((p) => p.y));
  const maxY = Math.max(...corners.map((p) => p.y));
  const PADDING = CELL * 1.2;
  const boardWidth = maxX - minX + PADDING * 2;
  const boardHeight = maxY - minY + PADDING * 2;
  const offsetX = -minX + PADDING;
  const offsetY = -minY + PADDING;

  const cells = [];
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const { x, y } = toIso(r, c);
      const isSelected = selected && selected[0] === r && selected[1] === c;
      const isLegalTarget = legalTargets.some(([lr, lc]) => lr === r && lc === c);
      const isLastMoveCell = lastMove && (
        (lastMove.from[0] === r && lastMove.from[1] === c) ||
        (lastMove.to[0] === r && lastMove.to[1] === c)
      );
      cells.push(
        <div
          key={`cell-${r}-${c}`}
          className={`board-cell${isSelected ? ' cell-selected' : ''}${isLegalTarget ? ' cell-legal' : ''}${isLastMoveCell ? ' cell-lastmove' : ''}`}
          style={{
            left: x + offsetX,
            top: y + offsetY,
          }}
          onClick={() => onCellClick(r, c)}
        >
          {isLegalTarget && !board[r][c] && <div className="legal-dot" />}
        </div>,
      );
    }
  }

  // 河界與九宮格線提示（視覺，用簡單方式標示，不用複雜貼圖資源）
  const riverLabel = (() => {
    const { x, y } = toIso(4.5, 4);
    return (
      <div className="river-label" style={{ left: x + offsetX, top: y + offsetY }}>
        楚 河　　漢 界
      </div>
    );
  })();

  const pieces = [];
  for (let r = 0; r < 10; r++) {
    for (let c = 0; c < 9; c++) {
      const piece = board[r][c];
      if (!piece) continue;

      let renderRow = r;
      let renderCol = c;
      let isMoving = false;
      let opacity = 1;

      if (animatingMove) {
        const [fr, fc] = animatingMove.from;
        const [tr, tc] = animatingMove.to;

        if (fr === r && fc === c) {
          // 這是正在移動的那顆棋子。動畫期間 board 還是走子「前」的盤面，
          // 所以移動中的棋子仍然位在 from，要由這裡插值畫到 to。
          // （舊版錯誤地去畫 to 格上的棋子，導致沒吃子時完全沒有動畫、棋子直接瞬移）
          renderRow = fr + (tr - fr) * animProgress;
          renderCol = fc + (tc - fc) * animProgress;
          isMoving = true;
        } else if (tr === r && tc === c) {
          // 這是即將被吃掉的棋子，原地淡出
          opacity = 1 - animProgress;
        }
      }

      const { x, y } = toIso(renderRow, renderCol);
      const isChecked = piece.type === 'king' && inCheckColor === piece.color;

      pieces.push(
        <div
          key={`piece-${r}-${c}`}
          className={`piece piece-${piece.color}${isMoving ? ' piece-moving' : ''}${isChecked ? ' piece-checked' : ''}`}
          style={{ left: x + offsetX, top: y + offsetY, opacity }}
          onClick={() => onCellClick(r, c)}
        >
          <span>{pieceName(piece)}</span>
        </div>,
      );
    }
  }

  return (
    <div className="board-outer">
      <div
        className="board-inner"
        style={{ width: boardWidth, height: boardHeight }}
      >
        <div className="board-surface" style={{ width: boardWidth, height: boardHeight }} />
        {riverLabel}
        {cells}
        {pieces}
      </div>
    </div>
  );
}
