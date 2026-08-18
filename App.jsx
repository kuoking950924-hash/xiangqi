import React, { useState, useCallback, useEffect, useRef } from 'react';
import Board from './Board.jsx';
import {
  createInitialBoard,
  legalMoves,
  makeMove,
  isInCheck,
  isCheckmate,
  isStalemate,
  boardKey,
  RED,
  BLACK,
  pieceName,
} from './chessRules.js';
import { getAIMove } from './chessAI.js';
import { MOVE_ANIM_MS } from './constants.js';
import './App.css';

const HUMAN_COLOR = RED;
const AI_COLOR = BLACK;

// 和局判定門檻
const REPETITION_LIMIT = 3;   // 同一局面出現三次即和局
const NO_CAPTURE_LIMIT = 60;  // 連續 60 回合無人吃子即和局

export default function App() {
  const [board, setBoard] = useState(createInitialBoard);
  const [turn, setTurn] = useState(RED); // 紅方先手（象棋規則）
  const [selected, setSelected] = useState(null);
  const [legalTargets, setLegalTargets] = useState([]);
  const [lastMove, setLastMove] = useState(null);
  const [animatingMove, setAnimatingMove] = useState(null);
  const [gameOver, setGameOver] = useState(null); // null | { winner, reason }
  const [log, setLog] = useState(['遊戲開始，紅方先行。']);
  const [aiThinking, setAiThinking] = useState(false);

  const boardRef = useRef(board);
  boardRef.current = board;

  // 和局偵測用的歷史紀錄：局面出現次數、以及距離上次吃子過了幾步
  const positionCountsRef = useRef(new Map());
  const pliesSinceCaptureRef = useRef(0);

  const appendLog = useCallback((msg) => {
    setLog((prev) => [...prev.slice(-40), msg]);
  }, []);

  // 執行一步棋，並負責觸發動畫、更新狀態、判斷勝負——玩家與AI共用同一條路徑，
  // 這樣可以保證「AI走子畫面必須真正更新」，不會出現前版那種棋子憑空消失的bug
  const executeMove = useCallback((from, to, color) => {
    const currentBoard = boardRef.current;
    const captured = currentBoard[to[0]][to[1]];
    const moverName = pieceName(currentBoard[from[0]][from[1]]);

    setAnimatingMove({ from, to, captured });

    // 動畫播放時間與 Board.jsx 內的 duration 對齊
    window.setTimeout(() => {
      const nextBoard = makeMove(currentBoard, from, to);
      setBoard(nextBoard);
      boardRef.current = nextBoard;
      setLastMove({ from, to });
      setAnimatingMove(null);

      const colorLabel = color === RED ? '紅方' : '黑方';
      if (captured) {
        appendLog(`${colorLabel} ${moverName} 吃掉 ${pieceName(captured)}！`);
      } else {
        appendLog(`${colorLabel} ${moverName} 移動。`);
      }

      const opponent = color === RED ? BLACK : RED;

      // 更新和局判定用的計數
      pliesSinceCaptureRef.current = captured ? 0 : pliesSinceCaptureRef.current + 1;
      const key = boardKey(nextBoard, opponent);
      const seen = (positionCountsRef.current.get(key) || 0) + 1;
      positionCountsRef.current.set(key, seen);

      if (isCheckmate(nextBoard, opponent)) {
        setGameOver({ winner: color, reason: 'checkmate' });
        appendLog(`${opponent === RED ? '紅方' : '黑方'} 被將死，${colorLabel} 獲勝！`);
        return;
      }
      if (isStalemate(nextBoard, opponent)) {
        setGameOver({ winner: color, reason: 'stalemate' });
        appendLog(`${opponent === RED ? '紅方' : '黑方'} 無棋可走，${colorLabel} 獲勝！`);
        return;
      }
      if (seen >= REPETITION_LIMIT) {
        setGameOver({ winner: null, reason: 'repetition' });
        appendLog(`同一局面已出現 ${REPETITION_LIMIT} 次，判和。`);
        return;
      }
      if (pliesSinceCaptureRef.current >= NO_CAPTURE_LIMIT * 2) {
        setGameOver({ winner: null, reason: 'no-capture' });
        appendLog(`連續 ${NO_CAPTURE_LIMIT} 回合無人吃子，判和。`);
        return;
      }

      if (isInCheck(nextBoard, opponent)) {
        appendLog(`${opponent === RED ? '紅方' : '黑方'} 被將軍！`);
      }

      setTurn(opponent);
    }, MOVE_ANIM_MS);
  }, [appendLog]);

  // AI 回合：輪到 AI 時自動觸發，確保每回合都真正執行並更新畫面
  useEffect(() => {
    if (gameOver) return undefined;
    if (turn !== AI_COLOR) return undefined;
    if (animatingMove) return undefined; // 等目前動畫播完再讓AI思考

    setAiThinking(true);
    const timer = window.setTimeout(() => {
      const move = getAIMove(boardRef.current, AI_COLOR);
      setAiThinking(false);
      if (!move) {
        // 理論上不會發生（isCheckmate/isStalemate已攔截），保底處理
        setGameOver({ winner: HUMAN_COLOR, reason: 'no-move' });
        return;
      }
      executeMove(move.from, move.to, AI_COLOR);
    }, 550); // 讓AI「思考」有一點停頓感，體驗上比較像在下棋

    return () => window.clearTimeout(timer);
  }, [turn, gameOver, animatingMove, executeMove]);

  const handleCellClick = useCallback((row, col) => {
    if (gameOver || turn !== HUMAN_COLOR || animatingMove) return;

    const currentBoard = boardRef.current;
    const clickedPiece = currentBoard[row][col];

    if (selected) {
      const isTarget = legalTargets.some(([r, c]) => r === row && c === col);
      if (isTarget) {
        executeMove(selected, [row, col], HUMAN_COLOR);
        setSelected(null);
        setLegalTargets([]);
        return;
      }
      if (clickedPiece && clickedPiece.color === HUMAN_COLOR) {
        setSelected([row, col]);
        setLegalTargets(legalMoves(currentBoard, row, col));
        return;
      }
      setSelected(null);
      setLegalTargets([]);
      return;
    }

    if (clickedPiece && clickedPiece.color === HUMAN_COLOR) {
      setSelected([row, col]);
      setLegalTargets(legalMoves(currentBoard, row, col));
    }
  }, [selected, legalTargets, turn, gameOver, animatingMove, executeMove]);

  const handleRestart = () => {
    const fresh = createInitialBoard();
    setBoard(fresh);
    boardRef.current = fresh;
    setTurn(RED);
    setSelected(null);
    setLegalTargets([]);
    setLastMove(null);
    setAnimatingMove(null);
    setGameOver(null);
    setLog(['遊戲開始，紅方先行。']);
    positionCountsRef.current = new Map();
    pliesSinceCaptureRef.current = 0;
  };

  const inCheckColor = gameOver ? null : ([RED, BLACK].find((c) => isInCheck(board, c)) || null);

  return (
    <div className="app-root">
      <header className="app-header">
        <h1>棋局・殺伐</h1>
        <p className="subtitle">2D 等角視角 中國象棋</p>
      </header>

      <div className="game-layout">
        <div className="board-area">
          <Board
            board={board}
            selected={selected}
            legalTargets={legalTargets}
            onCellClick={handleCellClick}
            lastMove={lastMove}
            animatingMove={animatingMove}
            inCheckColor={inCheckColor}
          />
        </div>

        <aside className="side-panel">
          <div className="status-box">
            <div className={`turn-indicator turn-${turn}`}>
              {gameOver
                ? (gameOver.winner === null
                  ? '和局'
                  : (gameOver.winner === HUMAN_COLOR ? '你獲勝了' : '你敗了'))
                : (turn === HUMAN_COLOR ? '輪到你（紅方）' : (aiThinking ? 'AI 思考中…' : '輪到 AI（黑方）'))}
            </div>
            {inCheckColor && !gameOver && (
              <div className="check-warning">
                {inCheckColor === RED ? '紅方' : '黑方'} 被將軍！
              </div>
            )}
            <button type="button" className="restart-btn" onClick={handleRestart}>
              重新開局
            </button>
          </div>

          <div className="log-box">
            <h2>戰報</h2>
            <ul>
              {log.slice().reverse().map((entry, i) => (
                <li key={`${entry}-${log.length - i}`}>{entry}</li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
