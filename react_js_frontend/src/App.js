import React, { useState, useEffect, useRef, useCallback } from 'react';
import './App.css';

// Game constants
const GAME_CONFIG = {
  CANVAS_WIDTH: 800,
  CANVAS_HEIGHT: 200,
  GROUND_HEIGHT: 20,
  DINO_WIDTH: 20,
  DINO_HEIGHT: 24,
  DINO_START_X: 50,
  OBSTACLE_WIDTH: 15,
  OBSTACLE_HEIGHT: 30,
  GRAVITY: 0.6,
  JUMP_FORCE: -12,
  GAME_SPEED: 3,
  OBSTACLE_SPAWN_RATE: 0.007,
  COLORS: {
    BACKGROUND: '#f7f7f7',
    GROUND: '#535353',
    DINO: '#535353',
    OBSTACLE: '#535353',
    TEXT: '#535353'
  }
};

// PUBLIC_INTERFACE
function App() {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  
  // Game state
  const [gameState, setGameState] = useState('waiting'); // 'waiting', 'playing', 'gameOver'
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(
    parseInt(localStorage.getItem('dinoHighScore')) || 0
  );

  // Game objects state
  const gameObjects = useRef({
    dino: {
      x: GAME_CONFIG.DINO_START_X,
      y: GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.GROUND_HEIGHT - GAME_CONFIG.DINO_HEIGHT,
      width: GAME_CONFIG.DINO_WIDTH,
      height: GAME_CONFIG.DINO_HEIGHT,
      velocityY: 0,
      isJumping: false,
      groundY: GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.GROUND_HEIGHT - GAME_CONFIG.DINO_HEIGHT
    },
    obstacles: [],
    gameSpeed: GAME_CONFIG.GAME_SPEED,
    frameCount: 0
  });

  // Draw functions
  const drawPixelRect = (ctx, x, y, width, height, color) => {
    ctx.fillStyle = color;
    ctx.fillRect(Math.floor(x), Math.floor(y), width, height);
  };

  const drawDino = (ctx, dino) => {
    const { x, y, width, height } = dino;
    
    // Simple pixel art dino (rectangle with some details)
    drawPixelRect(ctx, x, y, width, height, GAME_CONFIG.COLORS.DINO);
    
    // Eye
    drawPixelRect(ctx, x + 2, y + 2, 2, 2, GAME_CONFIG.COLORS.BACKGROUND);
    
    // Legs (animate based on frame count for running effect)
    const legOffset = gameObjects.current.frameCount % 20 < 10 ? 0 : 2;
    drawPixelRect(ctx, x + 2 + legOffset, y + height, 2, 4, GAME_CONFIG.COLORS.DINO);
    drawPixelRect(ctx, x + width - 4 + legOffset, y + height, 2, 4, GAME_CONFIG.COLORS.DINO);
  };

  const drawObstacle = (ctx, obstacle) => {
    drawPixelRect(ctx, obstacle.x, obstacle.y, obstacle.width, obstacle.height, GAME_CONFIG.COLORS.OBSTACLE);
  };

  const drawGround = (ctx) => {
    const groundY = GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.GROUND_HEIGHT;
    drawPixelRect(ctx, 0, groundY, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.GROUND_HEIGHT, GAME_CONFIG.COLORS.GROUND);
    
    // Ground pattern (dashed line)
    ctx.fillStyle = GAME_CONFIG.COLORS.BACKGROUND;
    for (let x = 0; x < GAME_CONFIG.CANVAS_WIDTH; x += 20) {
      const offset = (gameObjects.current.frameCount * 2) % 40;
      drawPixelRect(ctx, x - offset, groundY, 10, 2, GAME_CONFIG.COLORS.BACKGROUND);
    }
  };

  const drawScore = (ctx) => {
    ctx.fillStyle = GAME_CONFIG.COLORS.TEXT;
    ctx.font = '16px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`HI ${highScore.toString().padStart(5, '0')} ${score.toString().padStart(5, '0')}`, 
      GAME_CONFIG.CANVAS_WIDTH - 10, 30);
  };

  const drawGameOver = (ctx) => {
    ctx.fillStyle = GAME_CONFIG.COLORS.TEXT;
    ctx.font = '20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('G A M E   O V E R', GAME_CONFIG.CANVAS_WIDTH / 2, GAME_CONFIG.CANVAS_HEIGHT / 2 - 20);
    ctx.font = '12px monospace';
    ctx.fillText('Press SPACE or click RESTART to play again', GAME_CONFIG.CANVAS_WIDTH / 2, GAME_CONFIG.CANVAS_HEIGHT / 2 + 10);
  };

  const drawWaiting = (ctx) => {
    ctx.fillStyle = GAME_CONFIG.COLORS.TEXT;
    ctx.font = '16px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Press SPACE to start', GAME_CONFIG.CANVAS_WIDTH / 2, GAME_CONFIG.CANVAS_HEIGHT / 2);
  };

  // Game logic functions
  const updateDino = (dino) => {
    if (dino.isJumping) {
      dino.velocityY += GAME_CONFIG.GRAVITY;
      dino.y += dino.velocityY;
      
      if (dino.y >= dino.groundY) {
        dino.y = dino.groundY;
        dino.velocityY = 0;
        dino.isJumping = false;
      }
    }
  };

  const updateObstacles = (obstacles, gameSpeed) => {
    // Move obstacles
    obstacles.forEach(obstacle => {
      obstacle.x -= gameSpeed;
    });
    
    // Remove off-screen obstacles
    return obstacles.filter(obstacle => obstacle.x + obstacle.width > 0);
  };

  const spawnObstacle = (obstacles) => {
    if (Math.random() < GAME_CONFIG.OBSTACLE_SPAWN_RATE) {
      obstacles.push({
        x: GAME_CONFIG.CANVAS_WIDTH,
        y: GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.GROUND_HEIGHT - GAME_CONFIG.OBSTACLE_HEIGHT,
        width: GAME_CONFIG.OBSTACLE_WIDTH,
        height: GAME_CONFIG.OBSTACLE_HEIGHT
      });
    }
  };

  const checkCollision = (dino, obstacles) => {
    return obstacles.some(obstacle => {
      return dino.x < obstacle.x + obstacle.width &&
             dino.x + dino.width > obstacle.x &&
             dino.y < obstacle.y + obstacle.height &&
             dino.y + dino.height > obstacle.y;
    });
  };

  // Jump function
  const jump = useCallback(() => {
    if (gameState === 'waiting') {
      setGameState('playing');
      return;
    }
    
    if (gameState === 'playing' && !gameObjects.current.dino.isJumping) {
      gameObjects.current.dino.isJumping = true;
      gameObjects.current.dino.velocityY = GAME_CONFIG.JUMP_FORCE;
    }
  }, [gameState]);

  // Restart game function
  const restartGame = useCallback(() => {
    gameObjects.current = {
      dino: {
        x: GAME_CONFIG.DINO_START_X,
        y: GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.GROUND_HEIGHT - GAME_CONFIG.DINO_HEIGHT,
        width: GAME_CONFIG.DINO_WIDTH,
        height: GAME_CONFIG.DINO_HEIGHT,
        velocityY: 0,
        isJumping: false,
        groundY: GAME_CONFIG.CANVAS_HEIGHT - GAME_CONFIG.GROUND_HEIGHT - GAME_CONFIG.DINO_HEIGHT
      },
      obstacles: [],
      gameSpeed: GAME_CONFIG.GAME_SPEED,
      frameCount: 0
    };
    setScore(0);
    setGameState('waiting');
  }, []);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false; // Pixel art style
    
    const gameLoop = () => {
      // Clear canvas
      ctx.fillStyle = GAME_CONFIG.COLORS.BACKGROUND;
      ctx.fillRect(0, 0, GAME_CONFIG.CANVAS_WIDTH, GAME_CONFIG.CANVAS_HEIGHT);
      
      // Draw ground
      drawGround(ctx);
      
      if (gameState === 'waiting') {
        drawDino(ctx, gameObjects.current.dino);
        drawWaiting(ctx);
      } else if (gameState === 'playing') {
        // Update game objects
        updateDino(gameObjects.current.dino);
        gameObjects.current.obstacles = updateObstacles(gameObjects.current.obstacles, gameObjects.current.gameSpeed);
        spawnObstacle(gameObjects.current.obstacles);
        
        // Check collision
        if (checkCollision(gameObjects.current.dino, gameObjects.current.obstacles)) {
          setGameState('gameOver');
          if (score > highScore) {
            setHighScore(score);
            localStorage.setItem('dinoHighScore', score.toString());
          }
        }
        
        // Update score
        setScore(prev => prev + 1);
        
        // Increase game speed gradually
        gameObjects.current.gameSpeed = GAME_CONFIG.GAME_SPEED + (score * 0.0005);
        
        // Draw game objects
        drawDino(ctx, gameObjects.current.dino);
        gameObjects.current.obstacles.forEach(obstacle => drawObstacle(ctx, obstacle));
        
        gameObjects.current.frameCount++;
      } else if (gameState === 'gameOver') {
        // Draw static game over state
        drawDino(ctx, gameObjects.current.dino);
        gameObjects.current.obstacles.forEach(obstacle => drawObstacle(ctx, obstacle));
        drawGameOver(ctx);
      }
      
      // Always draw score
      drawScore(ctx);
      
      animationRef.current = requestAnimationFrame(gameLoop);
    };
    
    gameLoop();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [gameState, score, highScore]);

  // Keyboard event handler
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (gameState === 'gameOver') {
          restartGame();
        } else {
          jump();
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [gameState, jump, restartGame]);

  return (
    <div className="App">
      <div className="game-container">
        <div className="score-display">
          HI {highScore.toString().padStart(5, '0')} | Score: {score.toString().padStart(5, '0')}
        </div>
        
        <canvas
          ref={canvasRef}
          width={GAME_CONFIG.CANVAS_WIDTH}
          height={GAME_CONFIG.CANVAS_HEIGHT}
          className="game-canvas"
          onClick={gameState === 'gameOver' ? restartGame : jump}
        />
        
        <div className="controls">
          {gameState === 'waiting' && (
            <p className="instructions">Press SPACE or click to start</p>
          )}
          {gameState === 'playing' && (
            <p className="instructions">Press SPACE or click to jump</p>
          )}
          {gameState === 'gameOver' && (
            <button className="restart-button" onClick={restartGame}>
              🔄 RESTART GAME
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
