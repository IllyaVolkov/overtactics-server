var express = require('express');
var router = express.Router();

var loki = require('lokijs');
var db = new loki('mock.json', {autosave: true, autosaveInterval: 5000, autoload: true, autoloadCallback: dbLoadCallback});
var heroes;

function dbLoadCallback() {
    heroes = db.getCollection('heroes');
};

/* GET home page. */
router.post('/', function(req, res, next) {
    res.send(heroes.data);
});

module.exports = router;
