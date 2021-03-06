var express = require('express');
var router = express.Router();

var loki = require('lokijs');
var db = new loki('mock.json', {autosave: true, autosaveInterval: 5000, autoload: true, autoloadCallback: dbLoadCallback});
var skills, heroes;

function dbLoadCallback() {
    heroes = db.getCollection('heroes') || db.addCollection('heroes', { unique: ['id'] });
    skills = db.getCollection('skills') || db.addCollection('skills', { unique: ['id'] });
};

/* GET home page. */
router.post('/', function(req, res, next) {
    var data = heroes.data;
    var skillsdata = skills.data;

    data.forEach((hero) => {
        hero.skill = skillsdata.find((data) => hero.skill === data.id);
    });
    res.send(data);
});

module.exports = router;
