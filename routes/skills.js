var express = require('express');
var router = express.Router();

var loki = require('lokijs');
var db = new loki('mock.json', {autosave: true, autosaveInterval: 5000, autoload: true, autoloadCallback: dbLoadCallback});
var skills;

function dbLoadCallback() {
    skills = db.getCollection('skills');
};

/* GET home page. */
router.post('/', function(req, res, next) {
    res.send(skills.data);
});

module.exports = router;