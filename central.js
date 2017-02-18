var express = require('express')
var IOTA = require('./iota.lib.js/iota');

var app = express()

var iota = new IOTA();

var numBundles = 2;


app.get('/start', function (req, res) {
  // DO SOMETHING
})

app.get('/stop', function (req, res) {
  // DO SOMETHING
})

app.post('/scale', function (req, res) {
  // DO SOMETHING
})

app.listen(3000, function () {
  console.log('Example app listening on port 3000!')
})
