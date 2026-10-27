import React, { useEffect, useState, useCallback } from 'react';
import { ArrowLeft, RotateCcw, Trophy, Gamepad2 } from 'lucide-react';
import { BuiltInGameId } from '../shared/types';

interface MySpaceTVGamesProps {
  gameId: BuiltInGameId;
  accentColor: string;
  onExitGame: () => void;
}

export const MySpaceTVGames: React.FC<MySpaceTVGamesProps> = ({
  gameId,
  accentColor,
  onExitGame,
}) => {
  return (
    <div className="bg-[#0b1324]/95 border border-white/15 rounded-3xl p-6 shadow-2xl">
      {gameId === 'gomoku_tv' && (
        <GomokuTVGame accentColor={accentColor} onExit={onExitGame} />
      )}
      {gameId === 'game_2048_tv' && (
        <Game2048TV accentColor={accentColor} onExit={onExitGame} />
      )}
      {gameId === 'memory_match_tv' && (
        <MemoryMatchTV accentColor={accentColor} onExit={onExitGame} />
      )}
    </div>
  );
};

/* ============================================================================
 * GAME 1: CỜ CARO TV (GOMOKU 9x9 TỐI ƯU MÀN HÌNH TV & ĐIỀU KHIỂN REMOTE)
 * ============================================================================ */
const BOARD_SIZE = 9;

const GomokuTVGame: React.FC<{ accentColor: string; onExit: () => void }> = ({
  accentColor,
  onExit,
}) => {
  const [board, setBoard] = useState<('X' | 'O' | null)[][]>(() =>
    Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null))
  );
  const [cursor, setCursor] = useState<{ r: number; c: number }>({ r: 4, c: 4 });
  const [winner, setWinner] = useState<'X' | 'O' | 'DRAW' | null>(null);
  const [statusMsg, setStatusMsg] = useState(
    'Dùng phím Mũi tên (↑ ↓ ← →) trên Remote để chọn ô, nhấn OK để đánh X.'
  );

  const checkFiveInARow = (
    b: ('X' | 'O' | null)[][],
    r: number,
    c: number,
    player: 'X' | 'O'
  ) => {
    const dirs = [
      [0, 1],
      [1, 0],
      [1, 1],
      [1, -1],
    ];
    for (const [dr, dc] of dirs) {
      let count = 1;
      for (let step = 1; step < 5; step++) {
        const nr = r + dr * step;
        const nc = c + dc * step;
        if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && b[nr][nc] === player) {
          count++;
        } else break;
      }
      for (let step = 1; step < 5; step++) {
        const nr = r - dr * step;
        const nc = c - dc * step;
        if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && b[nr][nc] === player) {
          count++;
        } else break;
      }
      if (count >= 5) return true;
    }
    return false;
  };

  const computeAiMove = (b: ('X' | 'O' | null)[][]): { r: number; c: number } | null => {
    let bestScore = -1;
    let bestCell: { r: number; c: number } | null = null;

    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        if (b[r][c] !== null) continue;
        // Favor center + adjacent to existing stones
        let score = 10 - (Math.abs(r - 4) + Math.abs(c - 4));
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE) {
              if (b[nr][nc] === 'X') score += 18;
              if (b[nr][nc] === 'O') score += 15;
            }
          }
        }
        // Check if winning move for O or blocking X
        b[r][c] = 'O';
        if (checkFiveInARow(b, r, c, 'O')) score += 10000;
        b[r][c] = 'X';
        if (checkFiveInARow(b, r, c, 'X')) score += 5000;
        b[r][c] = null;

        if (score > bestScore) {
          bestScore = score;
          bestCell = { r, c };
        }
      }
    }
    return bestCell;
  };

  const resetGame = useCallback(() => {
    setBoard(Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null)));
    setCursor({ r: 4, c: 4 });
    setWinner(null);
    setStatusMsg('Ván mới đã sẵn sàng! Dùng phím mũi tên và OK để đánh X.');
  }, []);

  const placeAt = useCallback(
    (r: number, c: number) => {
      if (winner) {
        resetGame();
        return;
      }
      if (board[r][c] !== null) {
        setStatusMsg('Ô này đã có quân cờ. Hãy di chuyển sang ô trống khác.');
        return;
      }

      const next = board.map((row) => [...row]);
      next[r][c] = 'X';

      if (checkFiveInARow(next, r, c, 'X')) {
        setBoard(next);
        setWinner('X');
        setStatusMsg('Chúc mừng! Bạn đã chiến thắng (5 quân X liên tiếp). Nhấn OK để chơi ván mới.');
        return;
      }

      const aiMove = computeAiMove(next);
      if (!aiMove) {
        setBoard(next);
        setWinner('DRAW');
        setStatusMsg('Hòa cờ! Nhấn OK để chơi lại.');
        return;
      }

      next[aiMove.r][aiMove.c] = 'O';
      if (checkFiveInARow(next, aiMove.r, aiMove.c, 'O')) {
        setBoard(next);
        setWinner('O');
        setStatusMsg('TV đã thắng ván này (5 quân O liên tiếp). Nhấn OK để phục thù!');
        return;
      }

      setBoard(next);
      setStatusMsg(`Bạn đánh (${r + 1}, ${c + 1}) • TV đáp trả (${aiMove.r + 1}, ${aiMove.c + 1}). Tới lượt bạn!`);
    },
    [board, resetGame, winner]
  );

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const code = e.keyCode || e.which;
      if (e.key === 'ArrowUp' || code === 38) {
        e.preventDefault();
        e.stopPropagation();
        setCursor((p) => ({ ...p, r: (p.r - 1 + BOARD_SIZE) % BOARD_SIZE }));
      } else if (e.key === 'ArrowDown' || code === 40) {
        e.preventDefault();
        e.stopPropagation();
        setCursor((p) => ({ ...p, r: (p.r + 1) % BOARD_SIZE }));
      } else if (e.key === 'ArrowLeft' || code === 37) {
        e.preventDefault();
        e.stopPropagation();
        setCursor((p) => ({ ...p, c: (p.c - 1 + BOARD_SIZE) % BOARD_SIZE }));
      } else if (e.key === 'ArrowRight' || code === 39) {
        e.preventDefault();
        e.stopPropagation();
        setCursor((p) => ({ ...p, c: (p.c + 1) % BOARD_SIZE }));
      } else if (e.key === 'Enter' || code === 13) {
        e.preventDefault();
        e.stopPropagation();
        placeAt(cursor.r, cursor.c);
      } else if (
        e.key === 'Escape' ||
        e.key === 'Backspace' ||
        code === 10009 ||
        code === 461
      ) {
        e.preventDefault();
        e.stopPropagation();
        onExit();
      }
    };
    window.addEventListener('keydown', handleKey, true);
    return () => window.removeEventListener('keydown', handleKey, true);
  }, [cursor, onExit, placeAt]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div className="flex items-center gap-2.5">
          <Gamepad2 className="w-6 h-6" style={{ color: accentColor }} />
          <div>
            <h3 className="text-xl font-bold text-white">Cờ Caro TV (9×9 • 5 Quân Thắng)</h3>
            <p className="text-xs text-slate-300">{statusMsg}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={resetGame}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/15 text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Ván mới</span>
          </button>
          <button
            type="button"
            onClick={onExit}
            className="px-4 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/40 text-xs font-bold text-rose-200 flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Thoát (Return)</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col items-center">
        <div className="grid grid-cols-9 gap-1.5 bg-slate-900 p-3 rounded-2xl border border-white/15">
          {board.map((row, rIdx) =>
            row.map((cell, cIdx) => {
              const isSelected = cursor.r === rIdx && cursor.c === cIdx;
              return (
                <button
                  key={`${rIdx}-${cIdx}`}
                  type="button"
                  onClick={() => {
                    setCursor({ r: rIdx, c: cIdx });
                    placeAt(rIdx, cIdx);
                  }}
                  className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl font-black text-xl flex items-center justify-center transition cursor-pointer ${
                    isSelected
                      ? 'bg-sky-400/25 border-2 border-sky-300 scale-105'
                      : 'bg-slate-800/90 border border-white/10 hover:bg-slate-700'
                  }`}
                >
                  {cell === 'X' && <span className="text-sky-300">X</span>}
                  {cell === 'O' && <span className="text-amber-400">O</span>}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
 * GAME 2: GIẢI ĐỐ 2048 TV EDITION
 * ============================================================================ */
const Game2048TV: React.FC<{ accentColor: string; onExit: () => void }> = ({
  accentColor,
  onExit,
}) => {
  const createInitialGrid = (): number[][] => {
    const g = [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ];
    g[0][0] = 2;
    g[1][2] = 2;
    return g;
  };

  const [grid, setGrid] = useState<number[][]>(createInitialGrid);
  const [score, setScore] = useState(0);

  const slideRowLeft = (row: number[]): { newRow: number[]; gained: number } => {
    const nonZero = row.filter((v) => v !== 0);
    const merged: number[] = [];
    let gained = 0;
    let i = 0;
    while (i < nonZero.length) {
      if (i + 1 < nonZero.length && nonZero[i] === nonZero[i + 1]) {
        const val = nonZero[i] * 2;
        merged.push(val);
        gained += val;
        i += 2;
      } else {
        merged.push(nonZero[i]);
        i++;
      }
    }
    while (merged.length < 4) merged.push(0);
    return { newRow: merged, gained };
  };

  const moveGrid = useCallback(
    (dir: 'LEFT' | 'RIGHT' | 'UP' | 'DOWN') => {
      let current = grid.map((r) => [...r]);
      let totalGained = 0;

      const transpose = (m: number[][]) => m[0].map((_, c) => m.map((r) => r[c]));
      const reverseRows = (m: number[][]) => m.map((r) => [...r].reverse());

      if (dir === 'UP') current = transpose(current);
      if (dir === 'DOWN') current = reverseRows(transpose(current));
      if (dir === 'RIGHT') current = reverseRows(current);

      const processed = current.map((r) => {
        const { newRow, gained } = slideRowLeft(r);
        totalGained += gained;
        return newRow;
      });

      let restored = processed;
      if (dir === 'RIGHT') restored = reverseRows(processed);
      if (dir === 'UP') restored = transpose(processed);
      if (dir === 'DOWN') restored = transpose(reverseRows(processed));

      const changed = JSON.stringify(restored) !== JSON.stringify(grid);
      if (!changed) return;

      // Spawn a new 2 in an empty slot
      const empty: [number, number][] = [];
      for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
          if (restored[r][c] === 0) empty.push([r, c]);
        }
      }
      if (empty.length > 0) {
        const [er, ec] = empty[Math.floor(Math.random() * empty.length)];
        restored[er][ec] = 2;
      }

      setGrid(restored);
      setScore((s) => s + totalGained);
    },
    [grid]
  );

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const code = e.keyCode || e.which;
      if (e.key === 'ArrowLeft' || code === 37) {
        e.preventDefault();
        e.stopPropagation();
        moveGrid('LEFT');
      } else if (e.key === 'ArrowRight' || code === 39) {
        e.preventDefault();
        e.stopPropagation();
        moveGrid('RIGHT');
      } else if (e.key === 'ArrowUp' || code === 38) {
        e.preventDefault();
        e.stopPropagation();
        moveGrid('UP');
      } else if (e.key === 'ArrowDown' || code === 40) {
        e.preventDefault();
        e.stopPropagation();
        moveGrid('DOWN');
      } else if (
        e.key === 'Escape' ||
        e.key === 'Backspace' ||
        code === 10009 ||
        code === 461
      ) {
        e.preventDefault();
        e.stopPropagation();
        onExit();
      }
    };
    window.addEventListener('keydown', handleKey, true);
    return () => window.removeEventListener('keydown', handleKey, true);
  }, [moveGrid, onExit]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div>
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Trophy className="w-5 h-5" style={{ color: accentColor }} />
            <span>Giải Đố 2048 TV • Điểm số: {score}</span>
          </h3>
          <p className="text-xs text-slate-300">
            Nhấn 4 phím Mũi tên (↑ ↓ ← →) trên Remote Samsung để ghép các ô số giống nhau.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setGrid(createInitialGrid());
              setScore(0);
            }}
            className="px-4 py-2 rounded-xl bg-slate-800 border border-white/15 text-xs font-bold text-white cursor-pointer"
          >
            Chơi lại
          </button>
          <button
            type="button"
            onClick={onExit}
            className="px-4 py-2 rounded-xl bg-rose-500/20 border border-rose-400/40 text-xs font-bold text-rose-200 cursor-pointer"
          >
            Thoát (Return)
          </button>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4">
        <div className="grid grid-cols-4 gap-2.5 bg-slate-900 p-4 rounded-2xl border border-white/15">
          {grid.map((row, rIdx) =>
            row.map((val, cIdx) => (
              <div
                key={`${rIdx}-${cIdx}`}
                className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl font-black text-xl sm:text-2xl flex items-center justify-center tabular-nums border ${
                  val === 0
                    ? 'bg-slate-800/60 border-white/5 text-transparent'
                    : val >= 64
                    ? 'bg-amber-500 text-slate-950 border-amber-300'
                    : 'bg-sky-500/25 text-white border-sky-400/40'
                }`}
              >
                {val || '.'}
              </div>
            ))
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => moveGrid('LEFT')}
            className="px-4 py-2 rounded-xl bg-slate-800 border border-white/15 text-xs font-bold text-white cursor-pointer"
          >
            ← Trái
          </button>
          <button
            type="button"
            onClick={() => moveGrid('UP')}
            className="px-4 py-2 rounded-xl bg-slate-800 border border-white/15 text-xs font-bold text-white cursor-pointer"
          >
            ↑ Lên
          </button>
          <button
            type="button"
            onClick={() => moveGrid('DOWN')}
            className="px-4 py-2 rounded-xl bg-slate-800 border border-white/15 text-xs font-bold text-white cursor-pointer"
          >
            ↓ Xuống
          </button>
          <button
            type="button"
            onClick={() => moveGrid('RIGHT')}
            className="px-4 py-2 rounded-xl bg-slate-800 border border-white/15 text-xs font-bold text-white cursor-pointer"
          >
            → Phải
          </button>
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
 * GAME 3: LẬT HÌNH TRÍ NHỚ TV (MEMORY MATCH 4x3)
 * ============================================================================ */
const SYMBOLS = ['★', '♦', '♣', '♠', '☀', '♫'];

const MemoryMatchTV: React.FC<{ accentColor: string; onExit: () => void }> = ({
  onExit,
}) => {
  const createDeck = () =>
    [...SYMBOLS, ...SYMBOLS]
      .map((s, i) => ({ id: i, symbol: s, flipped: false, matched: false }))
      .sort(() => Math.random() - 0.5);

  const [cards, setCards] = useState(createDeck);
  const [cursor, setCursor] = useState(0);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);

  const flipCard = useCallback(
    (idx: number) => {
      if (selectedIds.length >= 2) return;
      const target = cards[idx];
      if (!target || target.flipped || target.matched) return;

      const updated = cards.map((c, i) => (i === idx ? { ...c, flipped: true } : c));
      const nextSelected = [...selectedIds, idx];
      setCards(updated);
      setSelectedIds(nextSelected);

      if (nextSelected.length === 2) {
        setMoves((m) => m + 1);
        const [firstIdx, secondIdx] = nextSelected;
        if (updated[firstIdx].symbol === updated[secondIdx].symbol) {
          setTimeout(() => {
            setCards((prev) =>
              prev.map((c, i) =>
                i === firstIdx || i === secondIdx ? { ...c, matched: true } : c
              )
            );
            setSelectedIds([]);
          }, 350);
        } else {
          setTimeout(() => {
            setCards((prev) =>
              prev.map((c, i) =>
                i === firstIdx || i === secondIdx ? { ...c, flipped: false } : c
              )
            );
            setSelectedIds([]);
          }, 700);
        }
      }
    },
    [cards, selectedIds]
  );

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const code = e.keyCode || e.which;
      if (e.key === 'ArrowRight' || code === 39) {
        e.preventDefault();
        e.stopPropagation();
        setCursor((c) => (c + 1) % 12);
      } else if (e.key === 'ArrowLeft' || code === 37) {
        e.preventDefault();
        e.stopPropagation();
        setCursor((c) => (c - 1 + 12) % 12);
      } else if (e.key === 'ArrowDown' || code === 40) {
        e.preventDefault();
        e.stopPropagation();
        setCursor((c) => (c + 4) % 12);
      } else if (e.key === 'ArrowUp' || code === 38) {
        e.preventDefault();
        e.stopPropagation();
        setCursor((c) => (c - 4 + 12) % 12);
      } else if (e.key === 'Enter' || code === 13) {
        e.preventDefault();
        e.stopPropagation();
        flipCard(cursor);
      } else if (
        e.key === 'Escape' ||
        e.key === 'Backspace' ||
        code === 10009 ||
        code === 461
      ) {
        e.preventDefault();
        e.stopPropagation();
        onExit();
      }
    };
    window.addEventListener('keydown', handleKey, true);
    return () => window.removeEventListener('keydown', handleKey, true);
  }, [cursor, flipCard, onExit]);

  const allMatched = cards.every((c) => c.matched);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
        <div>
          <h3 className="text-xl font-bold text-white">
            Lật Hình Trí Nhớ TV • Số lượt: {moves} {allMatched ? '• ĐÃ HOÀN THÀNH!' : ''}
          </h3>
          <p className="text-xs text-slate-300">
            Dùng phím Mũi tên để chọn thẻ và nhấn OK để lật tìm cặp hình giống nhau.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setCards(createDeck());
              setMoves(0);
              setSelectedIds([]);
            }}
            className="px-4 py-2 rounded-xl bg-slate-800 border border-white/15 text-xs font-bold text-white cursor-pointer"
          >
            Ván mới
          </button>
          <button
            type="button"
            onClick={onExit}
            className="px-4 py-2 rounded-xl bg-rose-500/20 border border-rose-400/40 text-xs font-bold text-rose-200 cursor-pointer"
          >
            Thoát (Return)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3 max-w-md mx-auto">
        {cards.map((card, idx) => {
          const isFocused = cursor === idx;
          const visible = card.flipped || card.matched;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => {
                setCursor(idx);
                flipCard(idx);
              }}
              className={`h-20 rounded-2xl font-black text-3xl flex items-center justify-center transition cursor-pointer ${
                isFocused
                  ? 'border-2 border-sky-300 bg-sky-500/25 scale-105'
                  : visible
                  ? 'bg-emerald-500/20 border border-emerald-400/40 text-emerald-200'
                  : 'bg-slate-800 border border-white/10 text-slate-400'
              }`}
            >
              {visible ? card.symbol : '?'}
            </button>
          );
        })}
      </div>
    </div>
  );
};
