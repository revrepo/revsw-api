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
const TrafficAlerterAPI = config.traffic_alerter.host + ':' + config.traffic_alerter.port;
const request = require('supertest-as-promised');

const TrafficAlerter = {
    createAlertRule: function (alertConfig) {
        return new Promise(function (resolve, reject) {
            request(TrafficAlerterAPI)
                .post('/v1/rules')
                .send(alertConfig)
                .expect(200)
                .then(function (res) {
                    return resolve(res);
                })
                .catch(function (err) {
                    return reject(err);
                });
        });
    }
};

module.exports = TrafficAlerter;