var loki = require('lokijs');
var dataStorage = require('../data/index');

var db = new loki('mock.json', {autosave: true, autosaveInterval: 5000, autoload: true, autoloadCallback: dbLoadCallback});
var heroes, skills, gamestates, players;

function dbLoadCallback() {
    heroes = db.getCollection('heroes') || db.addCollection('heroes', { unique: ['id'] });
    skills = db.getCollection('skills') || db.addCollection('skills', { unique: ['id'] });
    gamestates = db.getCollection('gamestates') || db.addCollection('gamestates', { unique: ['id'] });
    players = db.getCollection('players') || db.addCollection('players', { unique: ['id'] });
    dataStorage.saveHeroes(heroes);
    dataStorage.saveSkills(skills);
    dataStorage.saveGameStates(gamestates);
};

function Player(xPos, yPos, socket, team) {
    this.hero = null;
    this.xPos = xPos;
    this.yPos = yPos;
    this.damage = 0;
    this.points = 0;
    this.turn = false;
    this.socket = socket;
    this.team = team;
}

function prefetchPlayersData() {
    var prefetchedGamestate = Object.assign({}, gamestates.data[0]);
    var playersdata = players.data;
    prefetchedGamestate.teamA = playersdata.filter((p) => prefetchedGamestate.teamA.some(el => el === p.$loki));
    prefetchedGamestate.teamB = playersdata.filter((p) => prefetchedGamestate.teamB.some(el => el === p.$loki));
    return prefetchedGamestate;
}

function gameResult(prefetchedGamestate) {
    var heroesdata = heroes.data;
    var teamAAlive = prefetchedGamestate.teamA.filter(p => p.damage > heroesdata.find(h => h.id === p.hero).hp);
    var teamBAlive = prefetchedGamestate.teamB.filter(p => p.damage > heroesdata.find(h => h.id === p.hero).hp);
    var gameEnded = !teamAAlive.length || !teamBAlive.length;

    return gameEnded ? null : (!!teamAAlive.length ? 'A' : 'B');
}

function setNextActivePlayer(prefetchedGamestate) {
    var previousActivePlayer = prefetchedGamestate.teamA.find(p => p.turn) || prefetchedGamestate.teamB.find(p => p.turn);
    var activePlayer;
    prefetchedGamestate.teamA.forEach((p, index) => {
        if (p.turn) {
            previousActivePlayer = p;

            if (index === prefetchedGamestate.playersInTeam - 1) {
                activePlayer = prefetchedGamestate.teamB[0];
            } else {
                activePlayer = prefetchedGamestate.teamB[index + 1];
            }
        }
    });
    prefetchedGamestate.teamB.forEach((p, index) => {
        if (p.turn) {
            previousActivePlayer = p;

            if (index === prefetchedGamestate.playersInTeam - 1) {
                activePlayer = prefetchedGamestate.teamA[0];
            } else {
                activePlayer = prefetchedGamestate.teamA[index + 1];
            }
        }
    });
    if (previousActivePlayer) {
        previousActivePlayer.turn = false;
        players.update(previousActivePlayer);
    }
    activePlayer.turn = true;
    players.update(activePlayer);
}

function indexIo(io, socket) {
    var gamestate = gamestates.data[0];
    var hasFreePlaces = gamestate.teamA.length < gamestate.playersInTeam
        || gamestate.teamB.length < gamestate.playersInTeam;

    if (hasFreePlaces) {
        socket.emit('onConnect', {success: true});

        socket.on('selectHero', ({heroId}) => {
            var isTeamA = gamestate.teamA.length < gamestate.playersInTeam;
            var playerXPos = isTeamA ? 0 : gamestate.xNum - 1;
            var playerYPos = gamestate.teamA.length * 2;
            var player = new Player(playerXPos, playerYPos, socket.id, isTeamA ? 'A' : 'B');

            player = players.insert(player);
            if (isTeamA) {
                gamestate.teamA.push(player.$loki);
            } else {
                gamestate.teamB.push(player.$loki);
            }
            gamestates.update(gamestate);
            var hero = heroes.data.find(h => h.id === heroId);
            var skill = skills.data.find(s => s.id === hero.skill);
            player.hero = heroId; // TODO: check for a valid id
            players.update(player);

            hasFreePlaces = gamestate.teamA.length < gamestate.playersInTeam || gamestate.teamB.length < gamestate.playersInTeam;
            var playesIds = [...gamestate.teamA, ...gamestate.teamB];
            var playersInGame = players.data.filter((data) => playesIds.some(el => el === data.$loki));
            var hasHeroes = playersInGame.reduce((accumulator, value) => accumulator && !!value.hero, true);
            var prefetchedGamestate = prefetchPlayersData();

            playersInGame.forEach(p => {
                io.to(p.socket).emit('onSelectHero', {
                    gameState: prefetchedGamestate,
                    player: p
                });
            });

            if (!hasFreePlaces && hasHeroes) {
                gamestate.started = true;
                gamestates.update(gamestate);

                var prefetchedGamestate = prefetchPlayersData();
                var activePlayer = prefetchedGamestate.teamA[0];
                activePlayer.turn = true;
                players.update(activePlayer);

                playersInGame.forEach(p => {
                    io.to(p.socket).emit('onGameStart', {
                        gameState: prefetchedGamestate,
                        player: p
                    });
                });
                socket.on('gameEvent', ({type, data}) => {
                    if (player.turn && player.damage < hero.hp) {
                        var playersInGame = players.data.filter((data) => playesIds.some(el => el === data.$loki));
                        switch (type) {
                            case 'move': {
                                var xCoord = data.x;
                                var yCoord = data.y;
                                var canMove = xCoord >= 0 && xCoord < gamestates.xNum
                                    && yCoord >= 0 && yCoord < gamestates.yNum
                                    && +(player.xPos - xCoord) <= hero['Move Range']
                                    && +(player.yPos - yCoord) <= hero['Move Range']
                                    && playersInGame.reduce((val, p) => val && (p.xPos !== xCoord || p.yPos !== yCoord), true);
                                if (canMove) {
                                    player.xPos = xCoord;
                                    player.yPos = yCoord;
                                }
                                player.points = (player.points + 1) % skill['Points Limit'];
                                players.update(player);
                                break;
                            }
                            case 'shoot': {
                                var xCoord = data.x;
                                var yCoord = data.y;
                                var canShoot = xCoord >= 0 && xCoord < gamestates.xNum
                                    && yCoord >= 0 && yCoord < gamestates.yNum
                                    && +(player.xPos - xCoord) <= hero['Attack Range']
                                    && +(player.yPos - yCoord) <= hero['Attack Range']
                                    && playersInGame.reduce((val, p) => val || (p.xPos === xCoord && p.yPos === yCoord), false);
                                if (canShoot) {
                                    var target = playersInGame.find((p) => p.xPos === xCoord && p.yPos === yCoord);
                                    target.damage += hero['Damage'];
                                    players.update(target);
                                }
                                player.points = (player.points + 1) % skill['Points Limit'];
                                players.update(player);
                                break;
                            }
                            case 'skill': {
                                var xCoord = data.x;
                                var yCoord = data.y;
                                var canSpell = xCoord >= 0 && xCoord < gamestates.xNum
                                    && yCoord >= 0 && yCoord < gamestates.yNum
                                    && player.points >= skill['Points Limit']
                                    && +(player.xPos - xCoord) <= skill['Range']
                                    && +(player.yPos - yCoord) <= skill['Range']
                                    && playersInGame.reduce((val, p) => val || (p.xPos === xCoord && p.yPos === yCoord), false);
                                if (canSpell) {
                                    var target = playersInGame.find((p) => p.xPos === xCoord && p.yPos === yCoord);
                                    target.damage += skill['Damage'];
                                    players.update(target);
                                    player.points = 0;
                                    players.update(player);
                                }
                                players.update(player);
                                break;
                            }
                        }

                        var prefetchedGamestate = prefetchPlayersData();
                        var result = gameResult(prefetchedGamestate);
                        setNextActivePlayer(prefetchedGamestate);

                        socket.emit('onGameEvent', {success: true});
                        playersInGame.forEach(p => {
                            io.to(p.socket).emit('onGameUpdated', {
                                gameState: prefetchedGamestate,
                                player: p
                            });
                        });

                        if (result) {
                            io.sockets.emit('onGameEnded', {winner: result});
                            Object.values(io.of("/").connected.forEach(() => {
                                s.disconnect();
                            }));
                        }
                    } else {
                        socket.emit('onGameEvent', {success: false});
                    }
                });
            }

            socket.on('disconnect', () => {
                gamestate = gamestates.data[0];
                if (!gamestate.started) {
                    if (isTeamA) {
                        gamestate.teamA = gamestate.teamA.filter(p => p !== player.$loki);
                    } else {
                        gamestate.teamB = gamestate.teamB.filter(p => p !== player.$loki);
                    }
                    gamestates.update(gamestate);
                    players.remove(player);
                } else {
                    gamestate.started = false;
                    gamestate.teamA = [];
                    gamestate.teamB = [];
                    gamestates.update(gamestate);
                    players.data.forEach(p => {io.to(p.socket).emit('onGameAborted')});
                    players.clear();
                }
            });
        });
    } else {
        socket.emit('onConnect', {success: false});
        socket.disconnect();
    }
}

module.exports = indexIo;