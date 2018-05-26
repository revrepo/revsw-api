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
const config = require('config');
const client = redis.createClient({
    host: config.redis.host || '127.0.0.1',
    port: config.redis.port || 6379
});
let throttlingConfig;
switch (process.env.NODE_ENV) {
    case 'production':
        throttlingConfig = require('./../config/throttling_production.json');
        break;
    case 'qa':
        throttlingConfig = require('./../config/throttling_qa.json');
        break;
    default:
        throttlingConfig = require('./../config/throttling.json');
        break;

}
const Promise = require('bluebird');
const moment = require('moment');
const requestsConfig = throttlingConfig.requests_config;
const logger = require('revsw-logger')(config.log_config);
let requestThrottling = true;

client.on('error', function (err) {
    logger.info('Redis is not available, API Request Throttling is disabled.');
    requestThrottling = false;
    return;
});

const APIThrottling = {
    checkAccount: function (request, acc_id) {
        return new Promise(function (resolve, reject) {
            if (!requestThrottling) {
                return resolve(true);
            } else {
                if (!acc_id) {
                    return resolve(true);
                }

                let RPS = throttlingConfig.requests_per_second;

                let accountRequests = requestsConfig.filter((req) => req.account_id === acc_id);

                if (accountRequests && accountRequests.length > 0) {
                    accountRequests.forEach((req) => {
                        const { account_id, endpoint, methods, requests_per_second } = req;
                        if (request.route.path.includes(endpoint)) {
                            if (methods === '*' || methods === '' || !methods) {
                                RPS = requests_per_second;
                            } else if (methods.includes(request.route.method.toUpperCase())) {
                                RPS = requests_per_second;
                            }
                        }
                    });
                } else {
                    requestsConfig.forEach((req) => {
                        const { account_id, endpoint, methods, requests_per_second } = req;
                        if (request.route.path.includes(endpoint)) {
                            if (methods === '*' || methods === '' || !methods) {
                                RPS = requests_per_second;
                            } else if (methods.includes(request.route.method.toUpperCase())) {
                                RPS = requests_per_second;
                            }
                        }
                    });
                }

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
            }
        });
    }
};

module.exports = APIThrottling;