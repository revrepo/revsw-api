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

const redis = require('redis');
const client = redis.createClient();
const throttlingConfig = require('./../config/throttling.json');
const Promise = require('bluebird');
const moment = require('moment');
const heavyRequests = throttlingConfig.default_values.heavy_requests;

client.on('error', function (err) {
    throw new Error('Redis Error: ' + err);
});

const APIThrottling = {
    checkAccount: function (request, acc_id) {
        return new Promise(function (resolve, reject) {
            if (!acc_id) {
                return resolve(true);
            }

            let RPS = throttlingConfig.default_values.requests_per_second;

            heavyRequests.forEach(function (req) {
                if (request.route.path.includes(req.endpoint)) {
                    if (req.methods === '*' || req.methods === '' || !req.methods) {
                        RPS = throttlingConfig.default_values.heavy_requests_per_second;
                    } else if (req.methods.includes(request.route.method.toUpperCase())) {
                        RPS = throttlingConfig.default_values.heavy_requests_per_second;
                    }
                }
            });

            client.get(acc_id, function (err, reply) {
                if (err) {
                    return reject('Redis Error: ' + err);
                }

                if (!reply) {
                    client.set(acc_id, Date.now());

                    return resolve(true);
                } else {
                    let requests = JSON.parse('[' + reply + ']');
                    requests = requests.sort((a, b) => b - a);
                    requests = requests.filter(function (num) {
                        return (moment(Date.now()) - moment(num)) <= 1000;
                    });
                    requests.push(Date.now());
                    client.set(acc_id, requests.toString());
                    if (requests.length >= RPS) {
                        return reject('API Requests limit reached, please try again later.');
                    } else {
                        return resolve(true);
                    }
                }
            });
        });
    }
};

module.exports = APIThrottling;