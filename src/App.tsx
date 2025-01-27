
import React, { useState } from 'react';
import ChessDojo from './components/chessdojo';
import ChessMatch from './components/chessmatch';
import ChessMultiplayer from './components/chessmultiplayer';

export default function App(){
  const [gameMode, setGameMode] = useState<'dojo' | 'match' | 'multiplayer'>('dojo');
  const MemoizedChessDojo = React.memo(ChessDojo);
  const MemoizedChessMatch = React.memo(ChessMatch);
  const MemoizedChessMultiplayer = React.memo(ChessMultiplayer);

  return (
    <div className="flex flex-col justify-center items-center bg-red-100 min-h-screen">
      <div className="flex space-x-4 mb-4">
        <button 
          onClick={() => setGameMode('dojo')}
          className={`px-4 py-2 rounded ${gameMode === 'dojo' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          Chess Dojo
        </button>
        <button 
          onClick={() => setGameMode('match')}
          className={`px-4 py-2 rounded ${gameMode === 'match' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          Chess Match
        </button>
        <button 
          onClick={() => setGameMode('multiplayer')}
          className={`px-4 py-2 rounded ${gameMode === 'multiplayer' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
        >
          Multiplayer
        </button>
      </div>
      {gameMode === 'dojo' && <MemoizedChessDojo />}
      {gameMode === 'match' && <MemoizedChessMatch />}
      {gameMode === 'multiplayer' && <MemoizedChessMultiplayer />}
    </div>
  );
}