import React, { useState, useEffect, useRef } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
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
  const [suggestion, setSuggestion] = useState<string>('');
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const stockfishRef = useRef<Worker | null>(null);
  const [playerIsWhite, setPlayerIsWhite] = useState<boolean>(true);

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
    }
  }, [selectedOpening]);


  useEffect(() => {
    const playerTurn = playerIsWhite ? 'w' : 'b';
    if (game.turn() !== playerTurn && !game.isGameOver()) {
      makeAIMove(game);
    } else if (game.turn() === playerTurn && !game.isGameOver()) {
      getSuggestion(game);
    }
  }, [game, fen, playerIsWhite]);

  const makeAIMove = (currentGame: Chess) => {
    setIsThinking(true);
    const depth = 15; // Adjust for difficulty
    stockfishRef.current?.postMessage(`position fen ${currentGame.fen()}`);
    stockfishRef.current?.postMessage(`go depth ${depth}`);

    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (typeof message === 'string' && message.startsWith('bestmove')) {
        const move = message.split(' ')[1];
        const newGame = new Chess(currentGame.fen());
        newGame.move(move);
        setGame(newGame);
        setFen(newGame.fen());
        setIsThinking(false);
        stockfishRef.current?.removeEventListener('message', handleMessage);
      }
    };

    stockfishRef.current?.addEventListener('message', handleMessage);
  };

  const handleColorSwitch = () => {
    setPlayerIsWhite(!playerIsWhite);
    if (playerIsWhite && game.turn() === 'b') {
      makeAIMove(game);
    } else if (!playerIsWhite && game.turn() === 'w') {
      makeAIMove(game);
    }
  };


  const getSuggestion = (currentGame: Chess) => {
    setIsThinking(true);
    const depth = 10; // Adjust for suggestion quality
    stockfishRef.current?.postMessage(`position fen ${currentGame.fen()}`);
    stockfishRef.current?.postMessage(`go depth ${depth}`);

    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (typeof message === 'string' && message.startsWith('bestmove')) {
        const move = message.split(' ')[1];
        setSuggestion(`Suggested move: ${move}`);
        setIsThinking(false);
        stockfishRef.current?.removeEventListener('message', handleMessage);
      }
    };

    stockfishRef.current?.addEventListener('message', handleMessage);
  };

  const onDrop = (sourceSquare: string, targetSquare: string): boolean => {
    const playerTurn = playerIsWhite ? 'w' : 'b';
    if (game.turn() !== playerTurn) return false;

    try {
      const move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q', // always promote to queen for simplicity
      });

      if (move === null) return false; // illegal move
      setFen(game.fen());
      return true;
    } catch (e) {
      return false;
    }
  };



  const resetGame = () => {
    const newGame = new Chess();
    setGame(newGame);
    setFen(newGame.fen());
    setSuggestion('');
    setSelectedOpening('');
    if (!playerIsWhite) {
      makeAIMove(newGame);
    }
  };


  return (
    <div className="flex flex-col items-center p-4 w-1/2">
      <h1 className="text-2xl font-bold mb-4">Chess Dojo</h1>
      <div className="flex items-center mb-4">
        <span className="mr-2">Play as:</span>
        <Switch
          checked={playerIsWhite}
          onCheckedChange={handleColorSwitch}
          className="mr-2 "
        />
        <span>{playerIsWhite ? 'White' : 'Black'}</span>
      </div>
      <Select
       value={selectedOpening}
       onValueChange={(value) => setSelectedOpening(value as Opening)}
       className="mb-4"
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select an option" />
        </SelectTrigger>
        <SelectContent className="bg-white p-4 mb-4">

        {(Object.keys(openings) as Opening[]).map((opening) => (
          <SelectItem key={opening} value={opening}>
            {opening}
          </SelectItem>
        ))}
        </SelectContent>
      </Select>
      {openingDescription && (
        <p className="mb-4 text-sm italic mt-4">{openingDescription}</p>
      )}
      <Chessboard position={fen} onPieceDrop={onDrop} />
      <p className="mt-4">{isThinking ? "Thinking..." : suggestion}</p>
      <Button onClick={resetGame} className="mt-4">
        Reset Game
      </Button>
    </div>
  );
};

export default ChessDojo;