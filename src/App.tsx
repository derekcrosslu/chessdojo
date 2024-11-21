
import React, { useState } from 'react';
import ChessDojo from './components/chessdojo';
import ChessMatch from './components/chessmatch';
export default function App(){
  const [isChessDojo, setIsChessDojo] = useState(true);
  const MemoizedChessDojo = React.memo(ChessDojo);
const MemoizedChessMatch = React.memo(ChessMatch);
  return (
    <div className="flex justify-center items-center bg-red-100">
      <button onClick={() => setIsChessDojo(!isChessDojo)}>{isChessDojo ? 'Chess Match' : 'Chess Dojo'}</button>
{isChessDojo ? <MemoizedChessDojo /> : <MemoizedChessMatch />}

    </div>
  );
}