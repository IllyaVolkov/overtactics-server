var express = require('express');
var router = express.Router();

var loki = require('lokijs');
var db = new loki('mock.json', {autosave: true, autosaveInterval: 5000, autoload: true});

/* GET home page. */
router.post('/', function(req, res, next) {
    heroes = db.getCollection('heroes');
    res.send(heroes.data);
});

module.exports = router;
