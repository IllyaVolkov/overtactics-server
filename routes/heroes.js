var express = require('express');
var router = express.Router();

var loki = require('lokijs');
var db = new loki('mock.json', {autosave: true, autosaveInterval: 5000, autoload: true, autoloadCallback: dbLoadCallback});
var skills, heroes;

function dbLoadCallback() {
    heroes = db.getCollection('heroes');
    skills = db.getCollection('skills');
};

/* GET home page. */
router.post('/', function(req, res, next) {
    var data = heroes.data;
    data.forEach((hero) => {
        hero.skill = skills.findOne({'id': hero.skill});
    });
    res.send(data);
});

module.exports = router;
