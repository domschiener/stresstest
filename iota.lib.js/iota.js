var makeRequest = require('./utils/makeRequest');
var api = require("./api/api");


function IOTA(settings) {

    // IF NO SETTINGS, SET DEFAULT TO localhost:14265
    settings = settings || {};
    this.host = settings.host ? settings.host : "http://localhost";
    this.port = settings.port ? settings.port : 14265;
    this.provider = settings.provider || this.host.replace(/\/$/, '') + ":" + this.port;

    this._makeRequest = new makeRequest(this.provider, this.token);
    this.api = new api(this._makeRequest, this.sandbox);
}

module.exports = IOTA;
