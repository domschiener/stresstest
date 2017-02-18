var crypto = require('crypto')

module.exports = function(iota, ipTable, numNeighbors) {

    // credit: http://stackoverflow.com/a/33627342
    var min = 0;
    var max = ipTable.length;
    var maxDec = 281474976710656

    var neighbors = [];

    console.log("CONNECTING TO PEERS");

    for (var i = 0; i < numNeighbors; i++) {

        var randbytes = parseInt(crypto.randomBytes(6).toString('hex'), 16);
        var result = Math.floor( randbytes / maxDec * ( max - min + 1 ) + min );

        if(result>max){
            result = max;
        }

        neighbors.push('udp://' + ipTable[result] + ':14265');
    }

    return true;

    iota.api.addNeighbors(neighbors, function(e,s) {

        if (e) console.log("ERROR connectToPeers: ", e);
    });
}
