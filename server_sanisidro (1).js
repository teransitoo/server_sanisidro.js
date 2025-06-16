/* Servidor Realista de Haxball - San Isidro */

// Configuración del host
var room = HBInit({
  roomName: "San Isidro ⚽ Colegio",
  maxPlayers: 16,
  public: true,
  noPlayer: true
});

room.setDefaultStadium("Real Soccer");
room.setScoreLimit(0);
room.setTimeLimit(5);
room.setTeamsLock(true);

const adminPassword = "!admin123";
const injuredPlayers = {};
const lastTackles = {};
const cooldowns = {};
const powers = {};
const goals = [];
let addedTime = Math.floor(Math.random() * 91); // tiempo agregado entre 0 y 90 segundos
let matchEnded = false;

room.onPlayerJoin = function(player) {
  room.sendAnnouncement(`👋 Bienvenido ${player.name} al server de San Isidro!`, player.id, 0x00FF00, "bold", 2);
  room.sendAnnouncement("📌 Comandos: !admin123 para ser admin | !rules para ver reglas", player.id, 0xFFFFFF, "small-bold", 1);
};

room.onPlayerChat = function(player, message) {
  if (message === "!admin123") room.setPlayerAdmin(player.id, true);
  if (message === "!rules") room.sendAnnouncement("✅ Reglas: Barridas, Powershoot, Faltas realistas, Tarjetas, Lesiones, Saques, Tiempo agregado.", player.id, 0xFFFF00, "small-bold", 1);
};

// Lógica de barrida, powershoot, faltas, tarjetas, lesiones y goles irá aquí...

room.onTeamGoal = function(team) {
  const scorer = room.getPlayerList().find(p => p.id == room.getBallTouch().id);
  const time = `${Math.floor(room.getScores().time/60)}:${room.getScores().time%60}`;
  const assist = "Asistencia: no detectada"; // lógica de asistencia luego
  const goalMsg = `⚽ ¡Gol de ${scorer ? scorer.name : "desconocido"}! (${time}) ${assist}`;
  room.sendAnnouncement(goalMsg, null, 0xFFD700, "bold", 2);
  goals.push({ player: scorer?.name, time: room.getScores().time });
};

function endMatch() {
  if (!matchEnded) {
    matchEnded = true;
    room.sendAnnouncement("⏱️ ¡Última jugada!", null, 0xFF0000, "bold", 2);
    setTimeout(() => {
      room.stopGame();
      room.sendAnnouncement("🏁 Partido finalizado. ¡Gracias por jugar!", null, 0x00FF00, "bold", 2);
    }, 10000);
  }
}

// Control del tiempo agregado
setInterval(() => {
  const scores = room.getScores();
  if (scores && !matchEnded && scores.time >= 5 * 60 + addedTime) {
    endMatch();
  }
}, 1000);


// ======================= BARRIDAS Y LESIONES =======================
function isPlayerInjured(playerId) {
  return injuredPlayers[playerId] && injuredPlayers[playerId] > Date.now();
}

function applyTackle(player) {
  if (cooldowns[player.id] && cooldowns[player.id] > Date.now()) {
    room.sendAnnouncement("❌ ¡Todavía estás recuperándote de una barrida!", player.id, 0xFF0000, "bold", 2);
    return;
  }

  lastTackles[player.id] = Date.now();
  cooldowns[player.id] = Date.now() + 30000; // cooldown 30 seg
  room.sendAnnouncement(`🛡️ ${player.name} hizo una barrida`, null, 0xFFA500, "italic", 1);
}

room.onPlayerBallKick = function(player) {
  const now = Date.now();
  const last = lastTackles[player.id];
  if (last && now - last < 1000) return; // evitar spam

  const pos = room.getPlayerDiscProperties(player.id);
  const ball = room.getDiscProperties(0);
  const dist = Math.hypot(pos.x - ball.x, pos.y - ball.y);

  if (dist < 20 && !isPlayerInjured(player.id)) {
    applyTackle(player);
  }
};

room.onPlayerCollision = function(p1, p2, disc1, disc2) {
  const now = Date.now();
  const tackleTime = lastTackles[p1.id] || lastTackles[p2.id];
  if (!tackleTime || now - tackleTime > 1500) return;

  const impactForce = Math.random(); // simulación de fuerza
  if (impactForce > 0.7) {
    const injured = Math.random() > 0.5 ? p1 : p2;
    const injuryTime = 30000 + Math.random() * 30000;
    injuredPlayers[injured.id] = Date.now() + injuryTime;
    room.sendAnnouncement(`🚑 ${injured.name} está lesionado por ${Math.round(injuryTime / 1000)}s`, null, 0xFF69B4, "bold", 2);

    if (impactForce > 0.9) {
      room.sendAnnouncement("🔴 ¡Falta grave! Tarjeta roja", null, 0xFF0000, "bold", 2);
    } else {
      room.sendAnnouncement("🟨 Falta leve. Tarjeta amarilla", null, 0xFFFF00, "bold", 2);
    }
  }
};

// ======================= POWERSHOOT =======================
room.onGameTick = function() {
  const ball = room.getDiscProperties(0);
  if (!ball) return;

  powers.holder = room.getBallTouch();
  if (powers.holder) {
    powers.holdTime = (powers.holdTime || 0) + 1;
    if (powers.holdTime > 300) {
      ball.color = 0xFF4500;
    }
  } else {
    powers.holdTime = 0;
  }
};

room.onPlayerChat = function(player, message) {
  if (message === "!cancelar") {
    powers.holdTime = 0;
    room.sendAnnouncement("💨 Powershoot cancelado", player.id, 0xAAAAAA, "italic", 1);
  }
};

// ======================= SAQUES =======================
let lastOutEvent = 0;
function handleOutOfBounds(team) {
  const now = Date.now();
  if (now - lastOutEvent < 5000) return;
  lastOutEvent = now;

  const type = ["corner", "saque de arco", "lateral"][Math.floor(Math.random() * 3)];
  room.sendAnnouncement(`🚩 ${type} para el equipo ${team == 1 ? "Rojo" : "Azul"}`, null, 0x00BFFF, "bold", 2);
}

// Simulado: en producción debería detectarse con posiciones del balón

// ======================= FINAL =======================
room.onGameStart = function() {
  matchEnded = false;
  addedTime = Math.floor(Math.random() * 91);
  goals.length = 0;
};

