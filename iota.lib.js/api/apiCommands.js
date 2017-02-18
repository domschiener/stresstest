/**
*   @method attachToTangle
*   @param {string} trunkTransaction
*   @param {string} branchTransaction
*   @param {integer} minWeightMagnitude
*   @param {array} trytes
*   @returns {object} command
**/
var attachToTangle = function(trunkTransaction, branchTransaction, minWeightMagnitude, trytes) {

    var command = {
        'command'             : 'attachToTangle',
        'trunkTransaction'    : trunkTransaction,
        'branchTransaction'   : branchTransaction,
        'minWeightMagnitude'  : minWeightMagnitude,
        'trytes'              : trytes
    }

    return command;
}

/**
*   @method getNodeInfo
*   @returns {object} command
**/
var getNodeInfo = function() {

    var command = {
        'command' : 'getNodeInfo'
    }

    return command;
}

/**
*   @method getNeighbors
*   @returns {object} command
**/
var getNeighbors = function() {

    var command = {
        'command' : 'getNeighbors'
    }

    return command;
}

/**
*   @method addNeighbors
*   @param {Array} uris
*   @returns {object} command
**/
var addNeighbors = function(uris) {

    var command = {
        'command' : 'addNeighbors',
        'uris'    : uris
    }

    return command;
}

/**
*   @method removeNeighbors
*   @param {Array} uris
*   @returns {object} command
**/
var removeNeighbors = function(uris) {

    var command = {
        'command' : 'removeNeighbors',
        'uris'    : uris
    }

    return command;
}

/**
*   @method getTransactionsToApprove
*   @param {int} depth
*   @returns {object} command
**/
var getTransactionsToApprove = function(depth) {

    var command = {
        'command'   : 'getTransactionsToApprove',
        'depth'     : depth
    }

    return command;
}

/**
*   @method interruptAttachingToTangle
*   @returns {object} command
**/
var interruptAttachingToTangle = function() {

    var command = {
        'command' : 'interruptAttachingToTangle'
    }

    return command;
}

/**
*   @method broadcastTransactions
*   @param {array} trytes
*   @returns {object} command
**/
var broadcastTransactions = function(trytes) {

    var command = {
        'command' : 'broadcastTransactions',
        'trytes'  : trytes
    }

    return command;
}

/**
*   @method storeTransactions
*   @param {array} trytes
*   @returns {object} command
**/
var storeTransactions = function(trytes) {

    var command = {
        'command' : 'storeTransactions',
        'trytes'  : trytes
    }

    return command;
}


module.exports = {
    attachToTangle              : attachToTangle,
    getNodeInfo                 : getNodeInfo,
    getNeighbors                : getNeighbors,
    addNeighbors                : addNeighbors,
    removeNeighbors             : removeNeighbors,
    getTransactionsToApprove    : getTransactionsToApprove,
    interruptAttachingToTangle  : interruptAttachingToTangle,
    broadcastTransactions       : broadcastTransactions,
    storeTransactions           : storeTransactions
}
