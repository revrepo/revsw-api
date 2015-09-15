/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2015] Rev Software, Inc.
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

/*jslint node: true */

'use strict';

var Joi = require('joi');

Joi.objectId = require('joi-objectid');

// var domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-_]{1,61}[a-zA-Z0-9](?:\.[a-zA-Z]{2,})+$/;
exports.domainRegex = /(?=^.{4,253}$)(^((?!-)(?!\_)[a-zA-Z0-9-\_]{0,62}[a-zA-Z0-9]\.)+[a-zA-Z]{2,63}$)/;

exports.statusModel = Joi.object({
  statusCode: Joi.number().required().description('Operation status code (should be equal to HTTP response code)'),
  error: Joi.string().description('Optional description of statusCode'),
  message: Joi.string().required().description('Status message'),
  object_id: Joi.objectId().description('Optional object ID for newly created objects like users, accounts, domains, etc.'),
  request_id: Joi.string().trim().length(36).description('Optional request ID of submitted object purge requests.')
}).meta({
  className: 'Status'
});

exports.purgeResponseModel_v0 = Joi.object({
  status: Joi.number().description('Operation status code (should be equal to HTTP response code)'),
  message: Joi.string().description('Optional message'),
  request_id: Joi.string().description('Optional request ID for asynchronous requsts like domain configuration change or object page'),
}).meta({
  className: 'Purge Submit Response'
});


exports.purgeStatusModel_v0 = Joi.object({
  status: Joi.number().description('Operation status code (should be equal to HTTP response code)'),
  message: Joi.string().description('Optional message'),
  req_id: Joi.string().description('Optional request ID for asynchronous requsts like domain configuration change or object page'),
}).meta({
  className: 'Purge Status Response'
});


exports.listOfUsersModel = Joi.array().items({
  user_id: Joi.objectId().required().description('User ID'),
  email: Joi.string().email().required().description('Login name (email address)'),
  companyId: Joi.array().items( Joi.objectId().required().description('The ID of customer account the user belongs to') ),
  domain: Joi.array().items( Joi.string().description('Domain name the customer can manage') ).required(),
  firstname: Joi.string().required().description('First name'),
  lastname: Joi.string().required().description('Last name'),
  role: Joi.string().required().description('User role'),
}).meta({
  className: 'List of Users'
});

exports.userModel = Joi.object({
  user_id: Joi.objectId().required().description('User ID'),
  email: Joi.string().email().required().description('Login name (email address)'),
  companyId: Joi.array().items( Joi.objectId().required().description('The ID of customer account the user belongs to') )
    .description('An array of company IDs managed by the user'),
  domain: Joi.array().items( Joi.string().description('Domain name the customer can manage') ).required()
    .description('An array of domain names managed by the user'),
  firstname: Joi.string().required().description('First name'),
  lastname: Joi.string().required().description('Last name'),
  role: Joi.string().required().description('User role'),
  theme: Joi.string().required().description('User portal color schema'),
  created_at: Joi.date().required().description('User account creation date/time'),
  updated_at: Joi.date().required().description('User account last update date/time'),
  access_control_list: Joi.object({
    readOnly: Joi.boolean().description('Read-only flag'),
    test: Joi.boolean().description('Access flag to TEST portal section'),
    configure: Joi.boolean().description('Access flag to CONFIGURE portal section'),
    reports: Joi.boolean().description('Access flag to REPORTS portal section'),
    dashBoard: Joi.boolean().description('Access flag to DASHBOARD portal section')
  }).meta({ className: 'User Permission Flag'})
}).meta({
  className: 'User profile details'
});


exports.listOfFirstMileLocationsModel = Joi.array().items({
  locationName: Joi.string().required().description('The name of Rev first mile location'),
  id: Joi.string().required().description('Location ID'),
}).meta({
  className: 'List of Rev first mile locations'
});


exports.listOfDomainsModel = Joi.array().items({
  companyId: Joi.objectId().required().description('The ID of customer account (company) managing the domain'),
  id: Joi.objectId().required().description('Domain ID'),
  name: Joi.string().required().description('Domain name'),
  sync_status: Joi.string().required().description('Domain configuration publishing status'),
  cname: Joi.string().required().description('CNAME record which should be used to point the domain to RevAPM platform'),
}).meta({
  className: 'List of Domains'
});


exports.domainModel = Joi.object({
  companyId: Joi.objectId().required().description('The ID of customer account (company) managing the domain'),
  id: Joi.objectId().required().description('Domain ID'),
  name: Joi.string().required().description('Domain name'),
  sync_status: Joi.string().required().description('Domain configuration publishing status'),
  cname: Joi.string().required().description('CNAME record which should be used to point the domain to RevAPM platform'),
  origin_server: Joi.string().required().description('DNS name or IP address of customer origin server which provides the domain\'s content'),
  tolerance: Joi.string().required().description('APEX metric for RUM reports'),
  created_at: Joi.date().required().description('Domain creation date/time'),
  updated_at: Joi.date().required().description('Domain last update date/time'),
  origin_server_location: Joi.string().required().description('Rev\' first mile location used to access the origin server'),
  origin_host_header: Joi.string().required().description('The valud of HTTP "Host" request header used while accessing the customer origin server')
}).meta({
  className: 'Basic domain configuration'
});


exports.listOfAccountsModel = Joi.array().items({
  id: Joi.objectId().required().description('Account ID'),
  companyName: Joi.string().required().description('Company name'),
  createdBy: Joi.string().required().description('User which created the account'),
  created_at: Joi.date().required().description('Account creation date/time'),
  updated_at: Joi.date().required().description('Account last update date/time')
}).meta({
  className: 'List of Accounts'
});


exports.accountModel = Joi.object({
  id: Joi.objectId().required().description('Account ID'),
  companyName: Joi.string().required().description('Company name'),
  createdBy: Joi.string().required().description('User which created the account'),
  created_at: Joi.date().required().description('Account creation date/time'),
  updated_at: Joi.date().required().description('Account last update date/time')
}).meta({
  className: 'Account Details'
});


exports.standardHTTPErrors = [{
  code: 400,
  message: 'Bad Request'
}, {
  code: 401,
  message: 'Unauthorized'
}, {
  code: 500,
  message: 'Internal Server Error'
}];
