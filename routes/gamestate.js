var express = require('express');
var router = express.Router();

var loki = require('lokijs');
var db = new loki('mock.json', {autosave: true, autosaveInterval: 5000, autoload: true, autoloadCallback: dbLoadCallback});
var gamestates;

function dbLoadCallback() {
    gamestates = db.getCollection('gamestates') || db.addCollection('gamestates', { unique: ['id'] });
};

/* GET home page. */
router.post('/', function(req, res, next) {
    res.send(gamestates.data[0]);
});

module.exports = router;