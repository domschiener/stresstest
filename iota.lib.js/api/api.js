var apiCommands = require('./apiCommands')
var inputValidator = require('../utils/inputValidator')
var errors = require('../errors/inputErrors');
var Curl = require("../crypto/curl");
var Converter = require("../crypto/converter");
var Signing = require("../crypto/signing");
var Bundle = require("../crypto/bundle");
var Utils = require("../utils/utils");

'use strict';

/**
*  Making API requests, including generalized wrapper functions
**/
function api(provider, isSandbox) {

    this._makeRequest = provider;
    this.sandbox = isSandbox;
}

/**
*   General function that makes an HTTP request to the local node
*
*   @method sendCommand
*   @param {object} command
*   @param {function} callback
*   @returns {object} success
**/
api.prototype.sendCommand = function(command, callback) {

    return this._makeRequest.send(command, callback);
}

/**
*   @method attachToTangle
*   @param {string} trunkTransaction
*   @param {string} branchTransaction
*   @param {integer} minWeightMagnitude
*   @param {array} trytes
*   @returns {function} callback
*   @returns {object} success
**/
api.prototype.attachToTangle = function(trunkTransaction, branchTransaction, minWeightMagnitude, trytes, callback) {

    // inputValidator: Check if correct hash
    if (!inputValidator.isHash(trunkTransaction)) {

        return callback(errors.invalidTrunkOrBranch(trunkTransaction));
    }

    // inputValidator: Check if correct hash
    if (!inputValidator.isHash(branchTransaction)) {

        return callback(errors.invalidTrunkOrBranch(branchTransaction));
    }

    // inputValidator: Check if int
    if (!inputValidator.isInt(minWeightMagnitude)) {

        return callback(errors.notInt());
    }

    // inputValidator: Check if array of trytes
    if (!inputValidator.isArrayOfTrytes(trytes)) {

        return callback(errors.invalidTrytes());
    }

    var command = apiCommands.attachToTangle(trunkTransaction, branchTransaction, minWeightMagnitude, trytes)

    return this.sendCommand(command, callback)
}

/**
*   @method getNodeInfo
*   @returns {function} callback
*   @returns {object} success
**/
api.prototype.getNodeInfo = function(callback) {

    var command = apiCommands.getNodeInfo();

    return this.sendCommand(command, callback)
}

/**
*   @method getNeighbors
*   @returns {function} callback
*   @returns {object} success
**/
api.prototype.getNeighbors = function(callback) {

    var command = apiCommands.getNeighbors();

    return this.sendCommand(command, callback)
}

/**
*   @method addNeighbors
*   @param {Array} uris List of URI's
*   @returns {function} callback
*   @returns {object} success
**/
api.prototype.addNeighbors = function(uris, callback) {

    // Validate URIs
    for (var i = 0; i < uris.length; i++) {
        if (!inputValidator.isUri(uris[i])) return callback(errors.invalidUri(uris[i]));
    }

    var command = apiCommands.addNeighbors(uris);

    return this.sendCommand(command, callback)
}

/**
*   @method removeNeighbors
*   @param {Array} uris List of URI's
*   @returns {function} callback
*   @returns {object} success
**/
api.prototype.removeNeighbors = function(uris, callback) {

    // Validate URIs
    for (var i = 0; i < uris.length; i++) {
        if (!inputValidator.isUri(uris[i])) return callback(errors.invalidUri(uris[i]));
    }

    var command = apiCommands.removeNeighbors(uris);

    return this.sendCommand(command, callback)
}
/**
*   @method getTransactionsToApprove
*   @param {int} depth
*   @returns {function} callback
*   @returns {object} success
**/
api.prototype.getTransactionsToApprove = function(depth, callback) {

    var command = apiCommands.getTransactionsToApprove(depth);

    return this.sendCommand(command, callback)
}

/**
*   @method interruptAttachingToTangle
*   @returns {function} callback
*   @returns {object} success
**/
api.prototype.interruptAttachingToTangle = function(callback) {

    var command = apiCommands.interruptAttachingToTangle();

    return this.sendCommand(command, callback)
}

/**
*   @method broadcastTransactions
*   @param {array} trytes
*   @returns {function} callback
*   @returns {object} success
**/
api.prototype.broadcastTransactions = function(trytes, callback) {

    if (!inputValidator.isArrayOfAttachedTrytes(trytes)) {

        return callback(errors.invalidAttachedTrytes());
    }

    var command = apiCommands.broadcastTransactions(trytes);

    return this.sendCommand(command, callback)
}

/**
*   @method storeTransactions
*   @param {array} trytes
*   @returns {function} callback
*   @returns {object} success
**/
api.prototype.storeTransactions = function(trytes, callback) {

    if (!inputValidator.isArrayOfAttachedTrytes(trytes)) {

        return callback(errors.invalidAttachedTrytes());
    }

    var command = apiCommands.storeTransactions(trytes);

    return this.sendCommand(command, callback)
}



/*************************************

WRAPPER AND CUSTOM  FUNCTIONS

**************************************/

/**
*   Broadcasts and stores transaction trytes
*
*   @method broadcastAndStore
*   @param {array} trytes
*   @returns {function} callback
*   @returns {object} success
**/
api.prototype.broadcastAndStore = function(trytes, callback) {

    var self = this;

    self.broadcastTransactions(trytes, function(error, success) {

        if (!error) {

            self.storeTransactions(trytes, function(error, stored) {

                // TODO Better error checking

                if (callback) {
                    return callback(error, stored)
                } else {
                    return success;
                }
            })
        }
    })
}

/**
*   Gets transactions to approve, attaches to Tangle, broadcasts and stores
*
*   @method sendTrytes
*   @param {array} trytes
*   @param {int} depth
*   @param {int} minWeightMagnitude
*   @param {function} callback
*   @returns {object} analyzed Transaction objects
**/
api.prototype.sendTrytes = function(trytes, depth, minWeightMagnitude, callback) {

    var self = this;

    var toApproveStart = process.hrtime();
    // Get branch and trunk
    self.getTransactionsToApprove(depth, function(error, toApprove) {

        if (error) {
            return callback(error)
        }

        var toApproveEnd = process.hrtime(toApproveStart);


        var attachStart = process.hrtime();
        // attach to tangle - do pow
        self.attachToTangle(toApprove.trunkTransaction, toApprove.branchTransaction, minWeightMagnitude, trytes, function(error, attached) {

            if (error) {

                return callback(error)
            }

            var attachEnd = process.hrtime(attachStart);
            // broadcast and store tx
            self.broadcastAndStore(attached, function(error, success) {

                if (!error) {

                    var numTxs = attached.length;
                    var toApproveTime = toApproveEnd[1] / 1000000
                    var attachTime = attachEnd[1] / 1000000;

                    // send all the data back as an array 
                    return callback(null, [numTxs, toApproveTime, attachTime]);
                }
            })
        })
    })
}

/**
*   Prepares Transfer, gets transactions to approve
*   attaches to Tangle, broadcasts and stores
*
*   @method sendTransfer
*   @param {string} seed
*   @param {int} depth
*   @param {int} minWeightMagnitude
*   @param {array} transfers
*   @param {object} options
*       @property {array} inputs List of inputs used for funding the transfer
*       @property {string} address if defined, this address wil be used for sending the remainder value to
*   @param {function} callback
*   @returns {object} analyzed Transaction objects
**/
api.prototype.sendTransfer = function(numTxs, depth, minWeightMagnitude, callback) {

    var self = this;

    self.prepareTransfers(numTxs, function(error, trytes) {

        if (error) {
            return callback(error)
        }

        self.sendTrytes(trytes, depth, minWeightMagnitude, callback);
    })
}




/**
*   Prepares transfer by generating bundle, finding and signing inputs
*
*   @method prepareTransfers
*   @param {string} seed
*   @param {object} transfers
*   @param {object} options
*       @property {array} inputs Inputs used for signing. Needs to have correct security, keyIndex and address value
*       @property {string} address Remainder address
*       @property {int} security security level to be used for getting inputs and addresses
*   @param {function} callback
*   @returns {array} trytes Returns bundle trytes
**/
api.prototype.prepareTransfers = function(numTxs, callback) {

    var self = this;

    // Create a new bundle
    var bundle = new Bundle();

    // spam random values in max / min range
    var totalValue = Math.floor(Math.random() * (2779530283277761 - 0 + 1) + 2779530283277761);

    var address = '999999999999999999999999999999999999999999999999999999999999999999999999999999999'
    var tag = '999999999999999999999999999';
    var timestamp = Date.now()

    // If no input required, don't sign and simply finalize the bundle
    bundle.addEntry(numTxs - 1, address, -totalValue, tag, timestamp)
    bundle.addEntry(1, address, totalValue, tag, timestamp)
    bundle.finalize();
    bundle.addTrytes();

    var bundleTrytes = []
    bundle.bundle.forEach(function(tx) {
        bundleTrytes.push(Utils.transactionTrytes(tx))
    })

    return callback(null, bundleTrytes.reverse());
}

module.exports = api;
