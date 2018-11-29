const phin = require('phin');
const querystring = require('querystring');
const {clean, isUUID, isGuldID} = require('../Util/util');
const API_HOST = 'https://api.hypixel.net';
const keyRegex = /[a-z0-9]{8}-(?:[a-z0-9]{4}-){3}[a-z0-9]{12}/;
const PM = require('../Methods/Player');
const GM = require('../Methods/Guild');

class Hypixel {

    constructor(keys) {
        switch (typeof keys) {
            case 'string':
                this.keys = [keys].filter(key => keyRegex.test(key));
                break;
            case 'object':
                if(!Array.isArray(keys))
                    throw new Error('Objects are not supported, you must use an array.')
                this.keys = keys.filter(key => keyRegex.test(key));
                break;
            default:
                throw new Error("Keys must be a 'string' or an 'array of keys'.")
        }

        if (this.keys.length === 0) {
            throw new Error('No valid keys were provided.')
        }

        this.currentKey = 0;

        this.getRecentRequests = () => this.recentRequests;
        this.getKeys = () => Object.assign({}, this.keys);

        this.getKeyInfo = (callback) => this.request('key', null, 'record', callback);

        this.getBoosters = (callback) => this.request('boosters', null, 'boosters', callback);

        this.getLeaderboards = (callback) => this.request('leaderboards', null, 'leaderboards', callback);

        this.getOnlinePlayers = (callback) => this.request('playerCount', null, 'playerCount', callback);

        this.getWatchdogStats = (callback) => this.request('watchdogstats', null, null, callback);

        this.getGuildByName = (name, callback) => this._findGuild('name', name, callback);

        this.getGuildByPlayer = (player, callback) => this._findGuild('player', clean(player), callback);

        this.getFriends = (player, callback) => this.request('friends', { player }, 'records', callback);
        
        this.getSession = (player, callback) => this.request('session', { uuid: player }, 'session', callback);
        
        this.getPlayer = (search, callback) => isUUID(search) ? this._getPlayer('uuid', clean(search), callback) : this._getPlayer('name', search, callback);
        
        this._findGuild = (field, value, callback) => this.request('guild', { [field]: value }, 'guild', callback);
        
        this._getPlayer = (field, value, callback) => this.request('player', { [field]: value }, 'player', callback);
        
        this.getGuild = (search, callback) => {
            if(isGuldID(search))
                return this._findGuild('id', search, callback);
            if(isUUID(search))    
                return this._findGuild('player', clean(search), callback);
            
            return this._findGuild('name', search, callback)
                .then(guild => {
                    if(guild) return guild;

                    return this.getPlayer(search)
                        .then(player => this._findGuild('player', clean(player.uuid), callback))
                })

        }
                    
    }

    getKey() {
        if (this.keys.length === 0) return null;
        this.currentKey = this.currentKey + 1 < this.keys.length ? this.currentKey + 1 : 0;
        return this.keys[this.currentKey];
    }


    buildPath(path, query = null) {
        const params = query;
        const key = this.getKey();

        const _query = querystring.stringify(Object.assign({}, params, { key }));

        return `${API_HOST}/${path}?${_query}`;
    }


    sendRequest(path, query, resultField, callback) {
        phin(this.buildPath(path, query), (error, res) => {
            if (!res.body) return callback(new Error('No res.body'), null);
            let body = res.body;
            let data = null;
            if (!error) {
                try {
                    data = JSON.parse(body);
                } catch (ex) {
                    return callback(new Error('Request returned invalid json.'), null);
                }
            }

            if (data && data.success) {
                if (resultField === 'player' && data[resultField])
                    return callback(error, resultField ? Object.assign(data[resultField], PM) : data);
                if (resultField === 'guild' && data[resultField])
                    return callback(error, resultField ? Object.assign(data[resultField], GM) : data);
                return callback(error, resultField ? data[resultField] : data);
            }

            return callback(error, data);
        });
    }


    request(path, query, resultField, callback) {
        if (callback) {
            return this.sendRequest(path, query, resultField, callback);
        }

        return new Promise((resolve, reject) => {
            this.sendRequest(path, query, resultField, (error, data) =>
                error ? reject(error) : resolve(data))
        });
    }

}

module.exports = Hypixel;
