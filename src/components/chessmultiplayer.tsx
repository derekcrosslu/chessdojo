import React, { useState, useEffect, useRef } from 'react';
import { Chessboard } from 'react-chessboard';
import { Chess } from 'chess.js';
import { io, Socket } from 'socket.io-client';
import { Button } from './ui/button';

interface GameState {
  game: Chess;
  roomId: string | null;
  playerColor: 'white' | 'black' | null;
  isSpectator: boolean;
  opponent: string | null;
}

const ChessMultiplayer: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({    
    game: new Chess(),
    roomId: null,
    playerColor: null,
    isSpectator: false,
    opponent: null
  });
  const [fen, setFen] = useState<string>('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>('white');
  const [boardDimensions, setBoardDimensions] = useState({ width: 600, height: 600 });
  const socketRef = useRef<Socket | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [boardStatus, setBoardStatus] = useState<string>('Initializing board...');
  const [roomIdInput, setRoomIdInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const updateDimensions = () => {
      const width = Math.min(window.innerWidth * 0.8, 600);
      setBoardDimensions({ width, height: width });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);

    const socket = io('http://localhost:3001');
    socketRef.current = socket;

    const initialGame = new Chess();
    setFen(initialGame.fen());
    setIsLoading(false);

    const handlers = {
      roomCreated: (roomId: string) => {
        const newGame = new Chess();
        setGameState(prev => ({ ...prev, roomId, game: newGame }));
        setFen(newGame.fen());
        setStatusMessage('Room created successfully!');
        setBoardStatus('Board created and ready');
      },

      playerJoined: ({ color, playerId, fen, orientation }: { color: 'white' | 'black', playerId: string, fen?: string, orientation: 'white' | 'black' }) => {
        try {
          const newGame = new Chess();
          if (fen) {
            newGame.load(fen);
            setBoardStatus('Board loaded with current game state');
          }

          const updates = {
            game: newGame,
            playerColor: playerId === socket.id ? color : undefined,
            opponent: playerId !== socket.id ? playerId : undefined
          };

          setGameState(prev => ({
            ...prev,
            ...updates,
            playerColor: updates.playerColor ?? prev.playerColor,
            opponent: updates.opponent ?? prev.opponent
          }));

          if (playerId === socket.id) {
            setBoardOrientation(color);
            setStatusMessage(`Successfully joined the room as ${color}!`);
          } else {
            setStatusMessage('Opponent has joined the game!');
          }

          setFen(newGame.fen());
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          setBoardStatus(`Error loading board: ${errorMessage}`);
          console.error('Board loading error:', error);
        }
      },

      moveMade: ({ from, to, fen }: { from: string, to: string, fen: string }) => {
        try {
          const newGame = new Chess(fen);
          setGameState(prev => ({ ...prev, game: newGame }));
          setFen(fen);
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          setStatusMessage(`Error updating move: ${errorMessage}`);
          console.error('Error updating move:', error);
        }
      },

      playerLeft: (playerId: string) => {
        setGameState(prev => {
          if (prev.opponent === playerId) {
            return { ...prev, opponent: null };
          }
          return prev;
        });
        setStatusMessage('Opponent has left the game');
      },

      error: (message: string) => {
        setStatusMessage(`Error: ${message}`);
        setGameState(prev => ({ ...prev, roomId: null }));
      },

      joinedAsSpectator: ({ fen }: { fen: string }) => {
        try {
          const newGame = new Chess(fen);
          setGameState(prev => ({ 
            ...prev, 
            isSpectator: true,
            game: newGame 
          }));
          setFen(fen);
          setStatusMessage('Joined as a spectator');
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error('Error joining as spectator:', error);
          setStatusMessage(`Error joining as spectator: ${errorMessage}`);
        }
      }
    };

    // Register handlers
    Object.entries(handlers).forEach(([event, handler]) => {
      socket.on(event, handler);
    });

    return () => {
      // Clean up handlers
      Object.entries(handlers).forEach(([event, handler]) => {
        socket.off(event, handler);
      });
      window.removeEventListener('resize', updateDimensions);
      socket.disconnect();
    };
  }, []); // Empty dependency array to run only once on mount

  const createRoom = () => {
    socketRef.current?.emit('createRoom');
  };

  const joinRoom = (roomId: string) => {
    socketRef.current?.emit('joinRoom', roomId);
  };

  const onDrop = (sourceSquare: string, targetSquare: string): boolean => {
    if (!gameState.roomId || !gameState.playerColor || gameState.isSpectator) {
      setStatusMessage('You cannot make moves at this time');
      return false;
    }

    try {
      const move = gameState.game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q'
      });

      if (move === null) {
        setStatusMessage('Invalid move');
        return false;
      }

      socketRef.current?.emit('move', {
        from: sourceSquare,
        to: targetSquare,
        roomId: gameState.roomId
      });

      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setStatusMessage(`Invalid move: ${errorMessage}`);
      console.error('Move error:', error);
      return false;
    }
  };

  return (
    <div className='flex flex-col items-center p-4 w-full md:w-1/2 mb-4'>
      <h1 className='text-2xl font-bold mb-4'>Chess Multiplayer</h1>
      {statusMessage && (
        <div className={`mb-4 p-2 rounded ${statusMessage.includes('Error') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {statusMessage}
        </div>
      )}
      {boardStatus && (
        <div className='mb-4 p-2 rounded bg-blue-100 text-blue-700'>
          {boardStatus}
        </div>
      )}
      
      {!gameState.roomId ? (
        <div className='flex flex-col space-y-4'>
          <Button onClick={createRoom}>Create New Game</Button>
          <div className='flex space-x-2'>
            <input
              type='text'
              value={roomIdInput}
              placeholder='Room ID'
              className='px-2 py-1 border rounded'
              onChange={(e) => setRoomIdInput(e.target.value.trim())}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && roomIdInput) {
                  joinRoom(roomIdInput);
                  setRoomIdInput('');
                }
              }}
            />
            <Button 
              onClick={() => {
                if (roomIdInput) {
                  joinRoom(roomIdInput);
                  setRoomIdInput('');
                } else {
                  setStatusMessage('Please enter a valid room ID');
                }
              }}
            >
              Join Game
            </Button>
          </div>
        </div>
      ) : (
        <div className='flex flex-col items-center'>
          <p className='mb-4'>Room ID: {gameState.roomId}</p>
          <p className='mb-4'>
            {gameState.isSpectator
              ? 'Spectating'
              : gameState.playerColor
              ? `Playing as ${gameState.playerColor}`
              : 'Waiting for opponent'}
          </p>
          <div className='relative' style={{ width: boardDimensions.width, height: boardDimensions.height }}>
            {gameState.opponent && (
              <div className='absolute top-0 left-0 p-2 bg-gray-200 rounded'>
                Opponent: {gameState.opponent}
              </div>
            )}

            {!isLoading && fen ? (
              <div style={{ width: boardDimensions.width, height: boardDimensions.height }}>
                <Chessboard
                  position={fen}
                  onPieceDrop={onDrop}
                  boardOrientation={boardOrientation}
                  boardWidth={boardDimensions.width}
                  customBoardStyle={{
                    borderRadius: '4px',
                    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
                    border: '2px solid #ddd'
                  }}
                  areArrowsAllowed={true}
                  showBoardNotation={true}
                />
              </div>
            ) : (
              <div 
                className='bg-gray-200 rounded-lg flex items-center justify-center w-full h-full'
                style={{
                  minWidth: '300px',
                  minHeight: '300px'
                }}
              >
                <p className='text-gray-600 text-center p-4'>
                  {isLoading ? 'Initializing chess board...' : 'Loading game state...'}
                  <br />
                  Please wait while we set up your game
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ChessMultiplayer;