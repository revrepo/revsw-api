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

exports.companyNameRegex = /^[.@&]?[a-zA-Z0-9 ]+[ !.@&()]?[ a-zA-Z0-9!()]+/;

exports.statusModel = Joi.object({
  statusCode: Joi.number().optional().description('Operation status code (should be equal to HTTP response code)'),
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
  companyId: Joi.array().items(Joi.objectId().description('The ID of customer account the user belongs to')),
  domain: Joi.array().items(Joi.string().description('Domain name the customer can manage')).required(),
  firstname: Joi.string().required().description('First name'),
  lastname: Joi.string().required().description('Last name'),
  role: Joi.string().required().description('User role'),
  two_factor_auth_enabled: Joi.boolean().required().description('Status of two factor authentication')
}).meta({
  className: 'List of Users'
});

exports.userModel = Joi.object({
  user_id: Joi.objectId().required().description('User ID'),
  email: Joi.string().email().required().description('Login name (email address)'),
  companyId: Joi.array().items(Joi.objectId().description('The ID of customer account the user belongs to'))
    .description('An array of company IDs managed by the user'),
  domain: Joi.array().items(Joi.string().description('Domain name the customer can manage')).required()
    .description('An array of domain names managed by the user'),
  firstname: Joi.string().required().description('First name'),
  lastname: Joi.string().required().description('Last name'),
  role: Joi.string().required().description('User role'),
  theme: Joi.string().required().description('User portal color schema'),
  created_at: Joi.date().required().description('User account creation date/time'),
  updated_at: Joi.date().required().description('User account last update date/time'),
  two_factor_auth_enabled: Joi.boolean().description('Status of two factor authentication protection'),
  access_control_list: Joi.object({
    readOnly: Joi.boolean().description('Read-only flag'),
    test: Joi.boolean().description('Access flag to TEST portal section'),
    configure: Joi.boolean().description('Access flag to CONFIGURE portal section'),
    reports: Joi.boolean().description('Access flag to REPORTS portal section'),
    dashBoard: Joi.boolean().description('Access flag to DASHBOARD portal section')
  }).meta({className: 'User Permission Flag'}),
  self_registered: Joi.boolean().description('Is user registered by himself')
}).meta({
  className: 'User profile details'
});


exports.listOfFirstMileLocationsModel = Joi.array().items({
  locationName: Joi.string().required().description('The name of Rev first mile location'),
  id: Joi.string().required().description('Location ID'),
}).meta({
  className: 'List of Rev first mile locations'
});

exports.listOfLastMileLocationsModel = Joi.array().items({
  id: Joi.string().required().description('Location ID'),
  site_code_name: Joi.string().required().description('The code name of Rev last mile location'),
  city: Joi.string().required().description('City name'),
  state: Joi.string().required().allow('').description('State name'),
  country: Joi.string().required().description('Country name'),
  billing_zone: Joi.string().required().description('Rev billing zone name'),
}).meta({
  className: 'List of Rev last mile locations'
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
  origin_host_header: Joi.string().required().description('The value of HTTP "Host" request header used while accessing the customer origin server')
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

exports.generateKeyModel = Joi.object({
  ascii: Joi.string().required().description('ASCII version of the key'),
  hex: Joi.string().required().description('Hexadecimal version of the key'),
  base32: Joi.string().required().description('BASE32 version of the key'),
  google_auth_qr: Joi.string().required().description('Google Authenticator URL giving the QR code'),
}).meta({
  className: 'Generate Key'
});

exports.APIKeyStatusModel = Joi.object({
  statusCode: Joi.number().required().description('Operation status code (should be equal to HTTP response code)'),
  error: Joi.string().description('Optional description of statusCode'),
  message: Joi.string().required().description('Status message'),
  key: Joi.string().required().description('Newly registered API key'),
  object_id: Joi.objectId().description('Optional object ID for newly created objects like users, accounts, domains, etc.'),
}).meta({
  className: 'API Key Status'
});

exports.listOfAPIKeysModel = Joi.array().items({
  id              : Joi.objectId().description('API key ID'),
  key             : Joi.string().description('Customer\'s API key'),
  key_name        : Joi.string().description('Customer\'s API key name'),
  account_id      : Joi.objectId().description('The ID of customer account the API key belongs to'),
  domains         : Joi.array().items(Joi.objectId()).description('Array of domain IDs the key should have access to'),
  created_by       : Joi.string().description('User who created the account'),
  allowed_ops     : Joi.object({
    read_config     : Joi.boolean(),
    modify_config   : Joi.boolean(),
    delete_config   : Joi.boolean(),
    purge           : Joi.boolean(),
    reports         : Joi.boolean(),
    admin           : Joi.boolean(),
  }).description('Operations allowed with the API key'),
  read_only_status: Joi.boolean().description('Defines if the API key can be used only for read-write or read-only'),
  active          : Joi.boolean().description('Active or inactive API key'),
  created_at      : Joi.date().description('API key creation date/time'),
  updated_at      : Joi.date().description('API key last update date/time')
}).meta({
  className: 'List of API keys'
});

exports.APIKeyModel = Joi.object({
  id              : Joi.objectId().description('API key ID'),
  key             : Joi.string().description('Customer\'s API key'),
  key_name        : Joi.string().description('Customer\'s API key name'),
  account_id      : Joi.objectId().description('The ID of customer account the API key belongs to'),
  domains         : Joi.array().items(Joi.objectId()).description('Array of domain IDs the key should have access to'),
  created_by      : Joi.string().description('User who created the account'),
  allowed_ops     : Joi.object({
    read_config     : Joi.boolean(),
    modify_config   : Joi.boolean(),
    delete_config   : Joi.boolean(),
    purge           : Joi.boolean(),
    reports         : Joi.boolean(),
    admin           : Joi.boolean(),
  }).description('Operations allowed with the API key'),
  read_only_status: Joi.boolean().description('Defines if the API key can be used only for read-write or read-only'),
  active          : Joi.boolean().description('Active or inactive API key'),
  created_at      : Joi.date().description('API key creation date/time'),
  updated_at      : Joi.date().description('API key last update date/time')
}).meta({
  className: 'API key'
});

var configModel = Joi.object({
  sdk_release_version: Joi.number().integer(),
  logging_level: Joi.string().valid('debug', 'info', 'warning', 'error', 'critical'),
  configuration_refresh_interval_sec: Joi.number().integer(),
  configuration_stale_timeout_sec: Joi.number().integer(),
  operation_mode: Joi.string().valid('transfer_and_report', 'transfer_only', 'report_only', 'off'),
  allowed_transport_protocols: Joi.array().items(Joi.string().valid('standard', 'quic', 'rmp')),
  initial_transport_protocol: Joi.string().valid('standard', 'quic', 'rmp'),
  transport_monitoring_url: Joi.string(),
  stats_reporting_interval_sec: Joi.number().integer(),
  stats_reporting_level: Joi.string(),
  stats_reporting_max_requests_per_report: Joi.number().integer(),
  domains_provisioned_list: Joi.array().items(Joi.string()),
  domains_while_list: Joi.array().items(Joi.string()),
  domains_black_list: Joi.array().items(Joi.string()),
  a_b_testing_origin_offload_ratio: Joi.number().integer(),
  // from SDKConfigAPIService collection:
  configuration_api_url: Joi.string(),
  configuration_refresh_interval_sec: Joi.number().integer(),
  configuration_request_timeout_sec: Joi.number().integer(),
  // from SDKStatsAPIService collection:
  stats_reporting_url: Joi.string(),
  // from ServerGroup collection:
  transport_monitoring_url: Joi.string(),
  edge_host: Joi.string()
});

exports.SDKConfigModel = Joi.object({
  id: Joi.objectId(),
  app_name: Joi.string(),
  os: Joi.string().valid('iOS', 'Android'),
  configs: Joi.array().items(configModel),
}).meta({
  className: 'SDK config'
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
