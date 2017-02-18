var express         =   require('express')
var sqlite3         =   require('sqlite3').verbose();
var path            =   require('path');
var IOTA            =   require('../iota.lib.js/iota');
var request         =   require("request")
var async           =   require('async');
var Spammer         =   require('./helpers/spammer');
var connectToPeers  =   require('./helpers/connectToPeers');

console.log(Spammer);
var app = express()

// Instantiate IOTA to localhost:14265
var iota = new IOTA({
    'provider': 'http://85.93.93.110:14265'
});

// Create statsDb in spammer folder
var statsDb = new sqlite3.Database(path.join(__dirname, 'stats.db'));

var controller = 'http://localhost:14266'
var ipTable;

// Initiate a new spammer
var spammer = new Spammer(statsDb, iota)

app.get('/connect', function (req, res) {

    // DO SOMETHING
    console.log("START")

    // First get the full list of neighbors
    request.get({ url: controller + '/iptable.json', json: true }, function (error, response, ipTable) {

        if (!error) {

            // Drop the connection to the controller
            res.status(200).end()

            ipTable = ipTable;

            // Connect to 4 neighbors
            connectToPeers(iota, ipTable, 4);

        } else {

            // Send error message and drop connection
            res.send(error).status(400).end()
        }
    })
})

app.get('/spam', function (req, res) {

    // DO SOMETHING
    spammer.startSpam();

    res.status(200).end()
})

app.post('/scale', function (req, res) {
    // DO SOMETHING

    var increase = res.body

    spammer.increaseSpam(increase)

    res.status(200).end();
})

app.get('/heartbeat', function(req, res) {

    res.send(spammer.shouldSpam).end();
})


app.listen(3000, function () {

    console.log('Example app listening on port 3000!')

    /**
    *
    *   statsDb has 1 table (stats) with the following fields:
    *
    *       @id         {INTEGER}   autoincremening unique id of the row
    *       @txs        {INTEGER}   number of txs spammed
    *       @tips       {INTEGER}   time it took for getTransactionsToApprove to finish
    *       @depth      {INTEGER}   depth used for getTransactionsToApprove
    *       @pow        {INTEGER}   time it took for attachToTangle to finish
    *       @timestamp  {INTEGER}   timestamp
    *
    **/
    statsDb.run('CREATE TABLE IF NOT EXISTS stats (id INTEGER PRIMARY KEY, txs INTEGER, tips INTEGER, depth INTEGER, pow INTEGER)')

    // Send ready ping to controller
    request(controller + '/ready');
})
