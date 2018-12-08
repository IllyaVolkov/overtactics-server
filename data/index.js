const fs = require('fs');
const path = require('path');
const heroesFolder = './data/heroes/';
const skillsFolder = './data/skills/';
const defaultGameState = './data/DEFAULT_GAME_STATE.json/';

function saveHeroes(collection) {
    fs.readdir(heroesFolder, (err, files) => {
        files.map(file => path.resolve(heroesFolder, file))
            .map(file => JSON.parse(fs.readFileSync(file)))
            .map(file => file)
            .forEach(obj => {
                cached = collection.findOne({'id': obj.id});
                if (cached) {
                    Object.assign(cached, obj);
                    collection.update(cached);
                } else {
                    collection.insert(obj);
                }
            });
    });
}

function saveSkills(collection) {
    fs.readdir(skillsFolder, (err, files) => {
        files.map(file => path.resolve(skillsFolder, file))
            .map(file => JSON.parse(fs.readFileSync(file)))
            .map(file => file)
            .forEach(obj => {
                cached = collection.findOne({'id': obj.id});
                if (cached) {
                    Object.assign(cached, obj);
                    collection.update(cached);
                } else {
                    collection.insert(obj);
                }
            });
    });
}

function saveGameStates(collection) {
    var obj = JSON.parse(fs.readFileSync(defaultGameState));

    cached = collection.findOne({'id': obj.id});
    if (cached) {
        Object.assign(cached, obj);
        collection.update(cached);
    } else {
        collection.insert(obj);
    }
}

module.exports = {
    saveHeroes,
    saveSkills,
    saveGameStates,
};