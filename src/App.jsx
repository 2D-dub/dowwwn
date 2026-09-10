import React, { useEffect, useRef, useState } from "react";

const MAP = [
  "################",
  "#..............#",
  "#..##..........#",
  "#..............#",
  "#......####....#",
  "#..............#",
  "#....#.........#",
  "#....#.........#",
  "#..............#",
  "#.........##...#",
  "#..............#",
  "################",
];

const TILE = 48;

export default function DoomShooter() {
  const canvasRef = useRef(null);

  const [health, setHealth] = useState(100);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const game = useRef({
    player: {
      x: 2.5 * TILE,
      y: 2.5 * TILE,
      angle: 0,
      speed: 3,
      cooldown: 0,
    },

    enemies: [
      { x: 10 * TILE, y: 2.5 * TILE, hp: 2, alive: true },
      { x: 5 * TILE, y: 7 * TILE, hp: 2, alive: true },
      { x: 12 * TILE, y: 8 * TILE, hp: 2, alive: true },
    ],

    keys: {},
    bullets: [],
  });

  const isWall = (x, y) => {
    const col = Math.floor(x / TILE);
    const row = Math.floor(y / TILE);

    return (
      row < 0 ||
      row >= MAP.length ||
      col < 0 ||
      col >= MAP[0].length ||
      MAP[row][col] === "#"
    );
  };

  const movePlayer = (dx, dy) => {
    const p = game.current.player;

    const nx = p.x + dx;
    const ny = p.y + dy;

    if (!isWall(nx, p.y)) p.x = nx;
    if (!isWall(p.x, ny)) p.y = ny;
  };

  const shoot = () => {
    const g = game.current;
    const p = g.player;

    if (p.cooldown > 0 || gameOver) return;

    p.cooldown = 250;

    g.bullets.push({
      x: p.x,
      y: p.y,
      angle: p.angle,
      speed: 10,
      life: 60,
    });
  };

  const restart = () => {
    window.location.reload();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    canvas.width = 768;
    canvas.height = 576;

    const keyDown = (e) => {
      game.current.keys[e.key.toLowerCase()] = true;

      if (e.key === " ") {
        shoot();
      }
    };

    const keyUp = (e) => {
      game.current.keys[e.key.toLowerCase()] = false;
    };

    window.addEventListener("keydown", keyDown);
    window.addEventListener("keyup", keyUp);

    let last = performance.now();

    const loop = (time) => {
      const dt = Math.min((time - last) / 16.67, 2);
      last = time;

      update(dt);
      render(ctx);

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("keydown", keyDown);
      window.removeEventListener("keyup", keyUp);
    };
  }, []);

  const update = (dt) => {
    const g = game.current;
    const p = g.player;
    const keys = g.keys;

    if (gameOver) return;

    let forward = 0;
    let strafe = 0;

    if (keys["w"] || keys["arrowup"]) forward += 1;
    if (keys["s"] || keys["arrowdown"]) forward -= 1;
    if (keys["a"]) strafe -= 1;
    if (keys["d"]) strafe += 1;

    const speed = p.speed * dt;

    const dx =
      Math.cos(p.angle) * forward * speed +
      Math.cos(p.angle + Math.PI / 2) * strafe * speed;

    const dy =
      Math.sin(p.angle) * forward * speed +
      Math.sin(p.angle + Math.PI / 2) * strafe * speed;

    movePlayer(dx, dy);

    if (keys["arrowleft"]) p.angle -= 0.05 * dt;
    if (keys["arrowright"]) p.angle += 0.05 * dt;

    if (p.cooldown > 0) {
      p.cooldown -= 16.67 * dt;
    }

    // Actualizar balas
    g.bullets.forEach((b) => {
      b.x += Math.cos(b.angle) * b.speed * dt;
      b.y += Math.sin(b.angle) * b.speed * dt;
      b.life -= dt;

      if (isWall(b.x, b.y)) {
        b.life = 0;
      }

      g.enemies.forEach((enemy) => {
        if (!enemy.alive) return;

        const dist = Math.hypot(b.x - enemy.x, b.y - enemy.y);

        if (dist < 22) {
          enemy.hp--;
          b.life = 0;

          if (enemy.hp <= 0) {
            enemy.alive = false;
            setScore((s) => s + 100);
          }
        }
      });
    });

    g.bullets = g.bullets.filter((b) => b.life > 0);

    // Enemigos persiguen al jugador
    g.enemies.forEach((enemy) => {
      if (!enemy.alive) return;

      const dx = p.x - enemy.x;
      const dy = p.y - enemy.y;

      const dist = Math.hypot(dx, dy);

      if (dist > 45) {
        const speed = 0.6 * dt;

        const nx = enemy.x + (dx / dist) * speed;
        const ny = enemy.y + (dy / dist) * speed;

        if (!isWall(nx, enemy.y)) enemy.x = nx;
        if (!isWall(enemy.x, ny)) enemy.y = ny;
      } else {
        if (Math.random() < 0.015 * dt) {
          setHealth((h) => {
            const newHealth = h - 5;

            if (newHealth <= 0) {
              setGameOver(true);
            }

            return Math.max(0, newHealth);
          });
        }
      }
    });
  };

  const render = (ctx) => {
    const g = game.current;
    const p = g.player;

    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, 768, 576);

    // Cielo
    ctx.fillStyle = "#211a2b";
    ctx.fillRect(0, 0, 768, 288);

    // Piso
    ctx.fillStyle = "#292929";
    ctx.fillRect(0, 288, 768, 288);

    // Raycasting
    const FOV = Math.PI / 3;
    const rays = 240;

    for (let i = 0; i < rays; i++) {
      const rayAngle =
        p.angle - FOV / 2 + (i / rays) * FOV;

      let distance = 0;
      let hit = false;

      while (!hit && distance < 700) {
        distance += 3;

        const rx = p.x + Math.cos(rayAngle) * distance;
        const ry = p.y + Math.sin(rayAngle) * distance;

        if (isWall(rx, ry)) {
          hit = true;
        }
      }

      const corrected =
        distance *
        Math.cos(rayAngle - p.angle);

      const wallHeight =
        (TILE * 420) / Math.max(corrected, 1);

      const wallTop =
        288 - wallHeight / 2;

      const shade =
        Math.max(
          25,
          190 - corrected * 0.35
        );

      ctx.fillStyle =
        `rgb(${shade}, ${shade * 0.75}, ${shade * 0.55})`;

      const width = 768 / rays;

      ctx.fillRect(
        i * width,
        wallTop,
        width + 1,
        wallHeight
      );
    }

    // Enemigos
    const visibleEnemies = g.enemies
      .filter((e) => e.alive)
      .map((enemy) => {
        const dx = enemy.x - p.x;
        const dy = enemy.y - p.y;

        const distance = Math.hypot(dx, dy);

        let angle =
          Math.atan2(dy, dx) - p.angle;

        while (angle > Math.PI) angle -= Math.PI * 2;
        while (angle < -Math.PI) angle += Math.PI * 2;

        return {
          enemy,
          distance,
          angle,
        };
      })
      .filter(
        (e) => Math.abs(e.angle) < FOV / 2
      )
      .sort(
        (a, b) => b.distance - a.distance
      );

    visibleEnemies.forEach(
      ({ enemy, distance, angle }) => {
        const screenX =
          384 +
          (angle / FOV) * 768;

        const size =
          Math.min(
            500,
            (TILE * 420) / distance
          );

        const x = screenX - size / 2;
        const y = 288 - size / 2;

        ctx.fillStyle = "#7b1717";
        ctx.fillRect(x, y, size, size);

        // Ojos
        ctx.fillStyle = "#ffcc00";

        ctx.fillRect(
          x + size * 0.2,
          y + size * 0.25,
          size * 0.15,
          size * 0.12
        );

        ctx.fillRect(
          x + size * 0.65,
          y + size * 0.25,
          size * 0.15,
          size * 0.12
        );
      }
    );

    // Mira
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(374, 288);
    ctx.lineTo(394, 288);
    ctx.moveTo(384, 278);
    ctx.lineTo(384, 298);
    ctx.stroke();

    // Arma
    ctx.fillStyle = "#171717";

    ctx.fillRect(
      325,
      455,
      118,
      121
    );

    ctx.fillStyle = "#555";

    ctx.fillRect(
      365,
      420,
      40,
      100
    );

    // HUD
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 520, 768, 56);

    ctx.fillStyle = "#ff3333";
    ctx.font = "bold 24px Arial";

    ctx.fillText(
      `❤️ ${health}`,
      20,
      555
    );

    ctx.fillStyle = "#ffd000";

    ctx.fillText(
      `SCORE: ${score}`,
      580,
      555
    );

    if (gameOver) {
      ctx.fillStyle = "rgba(0,0,0,0.75)";
      ctx.fillRect(0, 0, 768, 576);

      ctx.textAlign = "center";

      ctx.fillStyle = "#e22";
      ctx.font = "bold 64px Arial";

      ctx.fillText(
        "GAME OVER",
        384,
        260
      );

      ctx.fillStyle = "#fff";
      ctx.font = "24px Arial";

      ctx.fillText(
        "Pulsa REINICIAR para volver a jugar",
        384,
        310
      );

      ctx.textAlign = "left";
    }
  };

  const holdKey = (key) => {
    game.current.keys[key] = true;
  };

  const releaseKey = (key) => {
    game.current.keys[key] = false;
  };

  return (
    <div
      style={{
        background: "#080808",
        minHeight: "100vh",
        color: "white",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Arial",
        padding: 10,
      }}
    >
      <h1 style={{ color: "#d22" }}>
        HELL SHOOTER
      </h1>

      <canvas
        ref={canvasRef}
        style={{
          width: "min(96vw, 768px)",
          height: "auto",
          border: "3px solid #444",
          imageRendering: "pixelated",
          background: "#000",
        }}
      />

      {/* CONTROLES PARA CELULAR */}
<div
  style={{
    position: "relative",
    width: "min(96vw, 768px)",
    height: 180,
    marginTop: 10,
    touchAction: "none",
  }}
>
  {/* JOYSTICK DE MOVIMIENTO */}
  <div
    style={{
      position: "absolute",
      left: 20,
      bottom: 15,
      width: 130,
      height: 130,
      borderRadius: "50%",
      background: "rgba(255,255,255,0.15)",
      border: "3px solid rgba(255,255,255,0.3)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      touchAction: "none",
    }}
    onPointerDown={(e) => {
      e.currentTarget.setPointerCapture(e.pointerId);
      holdKey("w");
    }}
    onPointerUp={() => {
      releaseKey("w");
    }}
    onPointerCancel={() => {
      releaseKey("w");
    }}
  >
    <div
      style={{
        width: 65,
        height: 65,
        borderRadius: "50%",
        background: "#555",
        border: "3px solid #888",
      }}
    />
  </div>

  {/* BOTÓN DISPARAR */}
  <button
    onPointerDown={(e) => {
      e.preventDefault();
      shoot();
    }}
    style={{
      position: "absolute",
      right: 25,
      bottom: 25,
      width: 115,
      height: 115,
      borderRadius: "50%",
      border: "4px solid #ff5555",
      background: "#a00",
      color: "white",
      fontSize: 22,
      fontWeight: "bold",
      boxShadow: "0 0 20px rgba(255,0,0,0.5)",
      touchAction: "none",
    }}
  >
    🔫
    <br />
    FIRE
  </button>
</div>


      {gameOver && (
        <button
          onClick={restart}
          style={{
            marginTop: 15,
            padding: "12px 30px",
            background: "#d22",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            fontSize: 18,
            fontWeight: "bold",
          }}
        >
          REINICIAR
        </button>
      )}

      <p style={{ color: "#aaa" }}>
        PC: WASD para moverte · ← → para girar · ESPACIO para disparar
      </p>
    </div>
  );
}