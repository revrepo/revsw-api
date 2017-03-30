/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2016] Rev Software, Inc.
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
var Joi = require('joi');
var config  = require('config');

// @see https://github.com/brainflake/node-hubspot
// @see http://developers.hubspot.com/docs/methods/contacts/create_contact
var Client = require('hubspot');
var client = new Client();

/*
 * You can use either a key OR a token
 */
if (config.key) {
  client.useKey(config.key);
} else if (config.token) {
  client.useToken(config.token);
}

client.campaigns.get(function(err, res) {
  if (err) { throw err; }
  console.log(res);
});
