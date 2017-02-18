var sqlite3 = require('sqlite3').verbose();
var async = require('async')



function Spammer(statsDb, iota) {

    this.db = statsDb;
    this.iota = iota;
    // initially we only spam 2 txs per bundle
    this.numTxs = 8;
    this.shouldSpam = false;
    this.seed = '999999999999999999999999999999999999999999999999999999999999999999999999999999999'
}



Spammer.prototype.increaseSpam = function(increase) {

    this.numTxs = increase;
    console.log("NEW SPAM INCREASE: ", this.numTxs)
}

Spammer.prototype.startSpam = function() {

    var self = this;
    self.shouldSpam = true;

    console.log("START SPAMMING")

    async.doWhilst(function(callback) {

        // Get random depth in range 1 to 4
        var depth =  Math.floor(Math.random() * (4 - 1 + 1) + 1)
        var minWeightMagnitude = 13;

        self.iota.api.sendTransfer(self.numTxs, depth, minWeightMagnitude, function(e, txData) {

            if (!e) {

                // Insert the data in the local database
                self.db.run("INSERT INTO stats(txs, tips, depth, pow) VALUES($txs, $tips, $depth, $pow)", {
                    $txs    :   txData[0],
                    $tips   :   txData[1],
                    $depth  :   depth,
                    $pow    :   txData[2]
                }, function(e,s) {

                    callback(null);
                })
            } else {
                self.shouldSpam === false;
                callback(null)
            }
        })

    }, function() {

        return self.shouldSpam === true;

    }, function() {

        console.log("STOPPED SPAMMING");
    })
}

module.exports = Spammer;
