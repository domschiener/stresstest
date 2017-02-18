var express = require('express')
var request     =   require("request")
var fs = require('fs');
var path = require('path');

var app = express()
var publicPath = path.join(__dirname, 'public');
app.use(express.static(publicPath));

var ipTable = [];
var numNodes = 2;

/**
*
*       /ready
*       endpoint is called by every node once it has been successfully instantiated
*       Once all nodes submitted their IP, we send a ping to all nodes to start spamming
*
**/
app.get('/ready', function (req, res) {

    var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    ipTable.push(ip);
    ipTable.push('localhost')



    if (ipTable.length === numNodes) {

        console.log("here")

        // Store IPTable locally in public dir
        fs.writeFile(publicPath + '/iptable.json', JSON.stringify(ipTable), function (err,data) {

            if (err) {
                return console.log(err);
            }

            // ping all nodes and get them to download the IP list
            for (var i = 0; i < numNodes; i++) {

                // FOR EACH SEND AN HTTP REQUEST
                request('http://' + ipTable[i] + ':3000' + '/connect');
            }
        });
    }

    // Drop the connection with 200 HTTP Status
    res.status(200).end()
})


app.post('/done', function (req, res) {
    // DO SOMETHING


    //POST final_data(sums | avgs | highs | lows)
    //getNeighbors DATA
})


app.post('/error', function(req, res) {


})



app.listen(14266, function () {

    console.log('Example app listening on port 14266!')
})
