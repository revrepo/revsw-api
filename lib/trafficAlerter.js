/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2018] Rev Software, Inc.
 * All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Rev Software, Inc. and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Rev Software, Inc.
 * and its suppliers and may be covered by U.S. and Foreign Patents,
 * patents in process, and are protected by trade secret or copyright law.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Rev Software, Inc.
 */

'use strict';

/**
 * ES6!
 */

const config = require('config');
const Promise = require('bluebird');
const moment = require('moment');
const logger = require('revsw-logger')(config.log_config);
const TrafficAlerterAPI = 'https://' + config.traffic_alerter.host + ':' + config.traffic_alerter.port;
const request = require('request');

const TrafficAlerter = {
    createAlertRule: function (alertConfig) {
        return new Promise(function (resolve, reject) {
            request.post({
                url: TrafficAlerterAPI + '/v1/rules',
                body: alertConfig,
                json: true
            }, function (error, response) {
                if (error) {
                    return reject(error);
                }

                return resolve(response);
            });
        });
    },

    getAlertRuleStatus: function (id) {
        return new Promise(function (resolve, reject) {
            request(TrafficAlerterAPI + '/v1/rules/' + id + '/status',
                function (error, response) {
                    if (error) {
                        return reject(error);
                    }

                    return resolve(response);
                });
        });
    },

    deleteRuleFile: function (id) {
        return new Promise(function (resolve, reject) {
            const options = {
                url: TrafficAlerterAPI + '/v1/rules/' + id,
                method: 'DELETE'
            };

            request(options, function (err, res) {
                if (err) {
                    return reject('Error destroy Traffic Alert Configuration Rule');
                }

                return resolve(res);
            });
        });
    },

    updateRuleFile: function (id, rule) {
        return new Promise(function (resolve, reject) {
            const options = {
                url: TrafficAlerterAPI + '/v1/rules/' + id,
                method: 'PUT',
                body: rule,
                json: true
            };

            request(options, function (err, res) {
                if (err) {
                    return reject('Error full update Traffic Alert Configuration Rule');
                }

                return resolve(res);
            });
        });
    }
};

module.exports = TrafficAlerter;
