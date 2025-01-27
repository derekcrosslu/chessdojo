import React, { useState, useEffect, useRef } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { Button } from './ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';


type Opening = 'Italian Game' | 'French Defense' | 'Scandinavian Defense' | 
               'King\'s Indian Attack' | 'London System' | 'Caro-Kann Defense' | 
               'Ruy Lopez' | 'Sicilian Defense' | 'Queen\'s Gambit';

const openings: Record<Opening, { fen: string, description: string }> = {
  'Italian Game': {
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
    description: 'A solid opening that develops pieces quickly and controls the center.'
  },
  'French Defense': {
    fen: 'rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
    description: 'A solid defense that can lead to closed positions, good for strategic play.'
  },
  'Scandinavian Defense': {
    fen: 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
    description: 'An aggressive defense that immediately challenges White\'s center control.'
  },
  'King\'s Indian Attack': {
    fen: 'rnbqkbnr/pppppppp/8/8/8/5NP1/PPPPPP1P/RNBQKB1R b KQkq - 0 2',
    description: 'A flexible opening system that can be used against various Black setups.'
  },
  'London System': {
    fen: 'rnbqkbnr/pppppppp/8/8/3P4/2N5/PPP1PPPP/R1BQKBNR b KQkq - 1 2',
    description: 'A solid, easy-to-learn opening that develops pieces to good squares.'
  },
  'Caro-Kann Defense': {
    fen: 'rnbqkbnr/pp1ppppp/2p5/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
    description: 'A solid defense that leads to a strong pawn structure for Black.'
  },
  'Ruy Lopez': {
    fen: 'r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
    description: 'One of the oldest and most classic openings, focusing on controlling the center.'
  },
  'Sicilian Defense': {
    fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
    description: 'An aggressive defense that leads to sharp, complex positions.'
  },
  'Queen\'s Gambit': {
    fen: 'rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq - 0 2',
    description: 'A classic opening that fights for control of the center with pawns.'
  }
};

const ChessDojo: React.FC = () => {
  const [game, setGame] = useState<Chess>(new Chess());
  const [fen, setFen] = useState<string>('');
  const [selectedOpening, setSelectedOpening] = useState<Opening | ''>('');
  const [openingDescription, setOpeningDescription] = useState<string>('');
  const [suggestion, setSuggestion] = useState<{ text: string, move: string } | null>(null);
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const stockfishRef = useRef<Worker | null>(null);
  const [currentTurn, setCurrentTurn] = useState<'w' | 'b'>('w');
  const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>('white');
  const [moveHistory, setMoveHistory] = useState<Chess[]>([new Chess()]);
  const [moveQuality, setMoveQuality] = useState<'blunder' | 'bad' | 'good' | 'excellent' | null>(null);
  const [previousEval, setPreviousEval] = useState<number | null>(null);

  useEffect(() => {
    stockfishRef.current = new Worker('/stockfish.js');
    stockfishRef.current.postMessage('uci');
    stockfishRef.current.postMessage('isready');

    return () => {
      if (stockfishRef.current) {
        stockfishRef.current.terminate();
      }
    };
  }, []);

  useEffect(() => {
    if (selectedOpening) {
      const newGame = new Chess();
      newGame.load(openings[selectedOpening].fen);
      setGame(newGame);
      setFen(newGame.fen());
      setOpeningDescription(openings[selectedOpening].description);
      setCurrentTurn(newGame.turn());
    }
  }, [selectedOpening]);

  useEffect(() => {
    if (!game.isGameOver()) {
      getSuggestion(game);
    }
  }, [game, fen]);

  const getMoveQuality = (currentEval: number, previousEval: number | null): 'blunder' | 'bad' | 'good' | 'excellent' => {
    if (!previousEval) return 'good';
    const evalDiff = currentEval - previousEval;
    
    if (evalDiff < -2) return 'blunder';
    if (evalDiff < -1) return 'bad';
    if (evalDiff > 1) return 'excellent';
    return 'good';
  };

  const getSuggestion = (currentGame: Chess) => {
    setIsThinking(true);
    const depth = 10;
    stockfishRef.current?.postMessage(`position fen ${currentGame.fen()}`);
    stockfishRef.current?.postMessage(`go depth ${depth}`);

    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (typeof message === 'string') {
        if (message.startsWith('info') && message.includes('score cp')) {
          const evalMatch = message.match(/score cp (-?\d+)/);
          if (evalMatch) {
            const currentEval = parseInt(evalMatch[1]) / 100;
            const quality = getMoveQuality(currentEval, previousEval);
            setMoveQuality(quality);
            setPreviousEval(currentEval);
          }
        } else if (message.startsWith('bestmove')) {
          const move = message.split(' ')[1];
          setSuggestion({
            text: `Suggested move for ${currentGame.turn() === 'w' ? 'White' : 'Black'}: ${move}`,
            move: move
          });
          setIsThinking(false);
          stockfishRef.current?.removeEventListener('message', handleMessage);
        }
      }
    };

    stockfishRef.current?.addEventListener('message', handleMessage);
  };

  const onDrop = (sourceSquare: string, targetSquare: string): boolean => {
    try {
      const move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q', // always promote to queen for simplicity
      });

      if (move === null) return false; // illegal move
      setFen(game.fen());
      setCurrentTurn(game.turn());
      setMoveHistory(prev => [...prev, new Chess(game.fen())]);
      return true;
    } catch (e) {
      return false;
    }
  };

  const resetGame = () => {
    const newGame = new Chess();
    setGame(newGame);
    setFen(newGame.fen());
    setSuggestion(null);
    setSelectedOpening('');
    setCurrentTurn('w');
    setMoveHistory([new Chess()]);
    setMoveQuality(null);
    setPreviousEval(null);
  };

  const undoMove = () => {
    if (moveHistory.length > 1) {
      const previousPosition = moveHistory[moveHistory.length - 2];
      setGame(previousPosition);
      setFen(previousPosition.fen());
      setCurrentTurn(previousPosition.turn());
      setMoveHistory(prev => prev.slice(0, -1));
    }
  };

  const switchColors = () => {
    setBoardOrientation(prev => prev === 'white' ? 'black' : 'white');
  };

  const makeSuggestedMove = () => {
    if (suggestion && suggestion.move) {
      const move = game.move(suggestion.move);
      if (move) {
        setFen(game.fen());
        setCurrentTurn(game.turn());
        setMoveHistory(prev => [...prev, new Chess(game.fen())]);
        setSuggestion(null); // Clear the suggestion after making the move
      }
    }
  };

  return (
    <div className='flex flex-col items-center p-4 w-1/2 mb-4'>
      <h1 className='text-2xl font-bold mb-4'>Chess Match</h1>
      <p className='mb-4'>
        Current Turn: {currentTurn === 'w' ? 'White' : 'Black'}
      </p>
      <Select
        value={selectedOpening}
        onValueChange={(value) => setSelectedOpening(value as Opening)}

      >
        <SelectTrigger className='w-[180px]'>
          <SelectValue placeholder='Select an opening' />
        </SelectTrigger>
        <SelectContent className='bg-white p-4 mb-4'>
          {(Object.keys(openings) as Opening[]).map((opening) => (
            <SelectItem
              key={opening}
              value={opening}
            >
              {opening}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {openingDescription && (
        <p className='mb-4 text-sm italic mt-4'>{openingDescription}</p>
      )}
      <Chessboard
        position={fen}
        onPieceDrop={onDrop}
        boardOrientation={boardOrientation}
      />
      <p className='mt-4'>{isThinking ? 'Thinking...' : suggestion?.text}</p>
      <div className='flex space-x-4 mt-4'>
        <Button onClick={resetGame}>Reset Game</Button>
        <Button onClick={switchColors}>Switch Colors</Button>
        <Button
          onClick={makeSuggestedMove}
          disabled={!suggestion}
        >
          Make Suggested Move
        </Button>
        <Button 
          onClick={undoMove} 
          disabled={moveHistory.length <= 1}
        >
          Undo Move
        </Button>
      </div>
      <div className='flex items-center space-x-4 mb-4'>
        <p>Move Quality:</p>
        <div
          className={`w-6 h-6 rounded ${moveQuality === 'blunder' ? 'bg-red-500' :
            moveQuality === 'bad' ? 'bg-yellow-500' :
            moveQuality === 'good' ? 'bg-green-500' :
            moveQuality === 'excellent' ? 'bg-blue-500' :
            'bg-gray-200'}`}
        />
      </div>
    </div>
  );
};

export default ChessDojo;