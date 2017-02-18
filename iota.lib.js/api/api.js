var apiCommands = require('./apiCommands')
var errors = require('../errors/inputErrors');
var Curl = require("../crypto/curl");
var Converter = require("../crypto/converter");
var Signing = require("../crypto/signing");
var Bundle = require("../crypto/bundle");

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

    var command = apiCommands.addNeighbors();

    return this.sendCommand(command, callback)
}

/**
*   @method removeNeighbors
*   @param {Array} uris List of URI's
*   @returns {function} callback
*   @returns {object} success
**/
api.prototype.removeNeighbors = function(uris, callback) {

    var command = apiCommands.removeNeighbors();

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

    // Get branch and trunk
    self.getTransactionsToApprove(depth, function(error, toApprove) {

        if (error) {
            return callback(error)
        }

        // attach to tangle - do pow
        self.attachToTangle(toApprove.trunkTransaction, toApprove.branchTransaction, minWeightMagnitude, trytes, function(error, attached) {

            if (error) {
                return callback(error)
            }

            // If the user is connected to the sandbox, we have to monitor the POW queue
            // to check if the POW job was completed
            if (self.sandbox) {

                var job = self.sandbox + '/jobs/' + attached.id;

                // Do the Sandbox send function
                self._makeRequest.sandboxSend(job, function(e, attachedTrytes) {

                    if (e) {

                        return callback(e);
                    } else {

                        self.broadcastAndStore(attachedTrytes, function(error, success) {

                            if (!error) {

                                var finalTxs = [];

                                attachedTrytes.forEach(function(trytes) {
                                    finalTxs.push(Utils.transactionObject(trytes));
                                })


                                return callback(null, finalTxs);
                            }
                        })
                    }
                });
            } else {

                // Broadcast and store tx
                self.broadcastAndStore(attached, function(error, success) {

                    if (!error) {

                        var finalTxs = [];

                        attached.forEach(function(trytes) {
                            finalTxs.push(Utils.transactionObject(trytes));
                        })

                        return callback(null, finalTxs);
                    }
                })
            }
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
api.prototype.sendTransfer = function(seed, depth, minWeightMagnitude, transfers, options, callback) {

    var self = this;

    // Validity check for number of arguments
    if (arguments.length < 5) {
        return callback(new Error("Invalid number of arguments"));
    }

    // Validity check for number of arguments
    if (arguments.length < 5) {
        throw new Error("Invalid number of arguments");
        return
    }

    // If no options provided, switch arguments
    if (arguments.length === 5 && Object.prototype.toString.call(options) === "[object Function]") {
        callback = options;
        options = {};
    }

    self.prepareTransfers(seed, transfers, options, function(error, trytes) {

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
api.prototype.prepareTransfers = function(seed, transfers, options, callback) {

    var self = this;

    // If no options provided, switch arguments
    if (arguments.length === 3 && Object.prototype.toString.call(options) === "[object Function]") {
        callback = options;
        options = {};
    }

    // validate the seed
    if (!inputValidator.isTrytes(seed)) {

        return callback(errors.invalidSeed());
    }

    // If message or tag is not supplied, provide it
    // Also remove the checksum of the address if it's there
    transfers.forEach(function(thisTransfer) {
        thisTransfer.message = thisTransfer.message ? thisTransfer.message : '';
        thisTransfer.tag = thisTransfer.tag ? thisTransfer.tag : '';
        thisTransfer.address = Utils.noChecksum(thisTransfer.address);
    })

    // Input validation of transfers object
    if (!inputValidator.isTransfersArray(transfers)) {
        return callback(errors.invalidTransfers());
    }

    // If inputs provided, validate the format
    if (options.inputs && !inputValidator.isInputs(options.inputs)) {
        return callback(errors.invalidInputs());
    }

    var remainderAddress = options.address || null;
    var chosenInputs = options.inputs || [];
    var security = options.security || 2;

    // Create a new bundle
    var bundle = new Bundle();

    var totalValue = 0;
    var signatureFragments = [];
    var tag;

    //
    //  Iterate over all transfers, get totalValue
    //  and prepare the signatureFragments, message and tag
    //
    for (var i = 0; i < transfers.length; i++) {

        var signatureMessageLength = 1;

        // If message longer than 2187 trytes, increase signatureMessageLength (add 2nd transaction)
        if (transfers[i].message.length > 2187) {

            // Get total length, message / maxLength (2187 trytes)
            signatureMessageLength += Math.floor(transfers[i].message.length / 2187);

            var msgCopy = transfers[i].message;

            // While there is still a message, copy it
            while (msgCopy) {

                var fragment = msgCopy.slice(0, 2187);
                msgCopy = msgCopy.slice(2187, msgCopy.length);

                // Pad remainder of fragment
                for (var j = 0; fragment.length < 2187; j++) {
                    fragment += '9';
                }

                signatureFragments.push(fragment);
            }
        } else {
            // Else, get single fragment with 2187 of 9's trytes
            var fragment = '';

            if (transfers[i].message) {
                fragment = transfers[i].message.slice(0, 2187)
            }

            for (var j = 0; fragment.length < 2187; j++) {
                fragment += '9';
            }

            signatureFragments.push(fragment);
        }

        // get current timestamp in seconds
        var timestamp = Math.floor(Date.now() / 1000);

        // If no tag defined, get 27 tryte tag.
        tag = transfers[i].tag ? transfers[i].tag : '999999999999999999999999999';

        // Pad for required 27 tryte length
        for (var j = 0; tag.length < 27; j++) {
            tag += '9';
        }

        // Add first entries to the bundle
        // Slice the address in case the user provided a checksummed one
        bundle.addEntry(signatureMessageLength, transfers[i].address.slice(0, 81), transfers[i].value, tag, timestamp)
        // Sum up total value
        totalValue += parseInt(transfers[i].value);
    }

    // Get inputs if we are sending tokens
    if (totalValue) {

        //  Case 1: user provided inputs
        //
        //  Validate the inputs by calling getBalances
        if (options.inputs) {

            // Get list if addresses of the provided inputs
            var inputsAddresses = [];
            options.inputs.forEach(function(inputEl) {
                inputsAddresses.push(inputEl.address);
            })

            self.getBalances(inputsAddresses, 100, function(error, balances) {

                var confirmedInputs = [];
                var totalBalance = 0;
                for (var i = 0; i < balances.balances.length; i++) {
                    var thisBalance = parseInt(balances.balances[i]);

                    // If input has balance, add it to confirmedInputs
                    if (thisBalance > 0) {
                        totalBalance += thisBalance;

                        var inputEl = options.inputs[i];
                        inputEl.balance = thisBalance;

                        confirmedInputs.push(inputEl);

                        // if we've already reached the intended input value, break out of loop
                        if (totalBalance >= totalValue) {
                            break;
                        }
                    }
                }

                // Return not enough balance error
                if (totalValue > totalBalance) {
                    return callback(new Error("Not enough balance"));
                }

                addRemainder(confirmedInputs);
            });

        }

        //  Case 2: Get inputs deterministically
        //
        //  If no inputs provided, derive the addresses from the seed and
        //  confirm that the inputs exceed the threshold
        else {

            self.getInputs(seed, { 'threshold': totalValue, 'security': security }, function(error, inputs) {

                // If inputs with enough balance
                if (!error) {

                    addRemainder(inputs.inputs);
                } else {

                    return callback(error);
                }
            })
        }
    } else {

        // If no input required, don't sign and simply finalize the bundle
        bundle.finalize();
        bundle.addTrytes(signatureFragments);

        var bundleTrytes = []
        bundle.bundle.forEach(function(tx) {
            bundleTrytes.push(Utils.transactionTrytes(tx))
        })

        return callback(null, bundleTrytes.reverse());
    }



    function addRemainder(inputs) {

        var totalTransferValue = totalValue;
        for (var i = 0; i < inputs.length; i++) {

            var thisBalance = inputs[i].balance;
            var toSubtract = 0 - thisBalance;
            var timestamp = Math.floor(Date.now() / 1000);

            // Add input as bundle entry
            bundle.addEntry(inputs[i].security, inputs[i].address, toSubtract, tag, timestamp);

            // If there is a remainder value
            // Add extra output to send remaining funds to
            if (thisBalance >= totalTransferValue) {

                var remainder = thisBalance - totalTransferValue;

                // If user has provided remainder address
                // Use it to send remaining funds to
                if (remainder > 0 && remainderAddress) {

                    // Remainder bundle entry
                    bundle.addEntry(1, remainderAddress, remainder, tag, timestamp);

                    // Final function for signing inputs
                    signInputsAndReturn(inputs);
                }
                else if (remainder > 0) {

                    // Generate a new Address by calling getNewAddress
                    self.getNewAddress(seed, {'security': security}, function(error, address) {

                        var timestamp = Math.floor(Date.now() / 1000);

                        // Remainder bundle entry
                        bundle.addEntry(1, address, remainder, tag, timestamp);

                        // Final function for signing inputs
                        signInputsAndReturn(inputs);
                    })
                } else {

                    // If there is no remainder, do not add transaction to bundle
                    // simply sign and return
                    signInputsAndReturn(inputs);
                }

            // If multiple inputs provided, subtract the totalTransferValue by
            // the inputs balance
            } else {

                totalTransferValue -= thisBalance;
            }
        }
    }

    function signInputsAndReturn(inputs) {

        bundle.finalize();
        bundle.addTrytes(signatureFragments);

        //  SIGNING OF INPUTS
        //
        //  Here we do the actual signing of the inputs
        //  Iterate over all bundle transactions, find the inputs
        //  Get the corresponding private key and calculate the signatureFragment
        for (var i = 0; i < bundle.bundle.length; i++) {

            if (bundle.bundle[i].value < 0) {

                var thisAddress = bundle.bundle[i].address;

                // Get the corresponding keyIndex and security of the address
                var keyIndex;
                var keySecurity;
                for (var k = 0; k < inputs.length; k++) {

                    if (inputs[k].address === thisAddress) {

                        keyIndex = inputs[k].keyIndex;
                        keySecurity = inputs[k].security ? inputs[k].security : security;
                        break;
                    }
                }

                var bundleHash = bundle.bundle[i].bundle;

                // Get corresponding private key of address
                var key = Signing.key(Converter.trits(seed), keyIndex, keySecurity);

                //  Get the normalized bundle hash
                var normalizedBundleHash = bundle.normalizedBundle(bundleHash);
                var normalizedBundleFragments = [];

                // Split hash into 3 fragments
                for (var l = 0; l < 3; l++) {
                    normalizedBundleFragments[l] = normalizedBundleHash.slice(l * 27, (l + 1) * 27);
                }

                //  First 6561 trits for the firstFragment
                var firstFragment = key.slice(0, 6561);

                //  First bundle fragment uses the first 27 trytes
                var firstBundleFragment = normalizedBundleFragments[0];

                //  Calculate the new signatureFragment with the first bundle fragment
                var firstSignedFragment = Signing.signatureFragment(firstBundleFragment, firstFragment);

                //  Convert signature to trytes and assign the new signatureFragment
                bundle.bundle[i].signatureMessageFragment = Converter.trytes(firstSignedFragment);

                // if user chooses higher than 27-tryte security
                // for each security level, add an additional signature
                for (var j = 1; j < keySecurity; j++) {

                    //  Because the signature is > 2187 trytes, we need to
                    //  find the subsequent transaction to add the remainder of the signature
                    //  Same address as well as value = 0 (as we already spent the input)
                    if (bundle.bundle[i + j].address === thisAddress && bundle.bundle[i + j].value === 0) {

                        // Use the next 6561 trits
                        var nextFragment = key.slice(6561 * j,  (j + 1) * 6561);

                        var nextBundleFragment = normalizedBundleFragments[j];

                        //  Calculate the new signature
                        var nextSignedFragment = Signing.signatureFragment(nextBundleFragment, nextFragment);

                        //  Convert signature to trytes and assign it again to this bundle entry
                        bundle.bundle[i + j].signatureMessageFragment = Converter.trytes(nextSignedFragment);
                    }
                }
            }
        }

        var bundleTrytes = []

        // Convert all bundle entries into trytes
        bundle.bundle.forEach(function(tx) {
            bundleTrytes.push(Utils.transactionTrytes(tx))
        })

        return callback(null, bundleTrytes.reverse());
    }
}

module.exports = api;
