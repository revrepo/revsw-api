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
var domainRegex = /(?=^.{4,253}$)(^((?!-)(?!\_)[a-zA-Z0-9-\_]{0,62}[a-zA-Z0-9]\.)+[a-zA-Z]{2,63}$)/;
exports.domainRegex = domainRegex;
exports.ipAddressRegex = /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$/;
exports.uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
exports.dateRegex = /20\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])/; // 20YY-MM-DD

exports.companyNameRegex = /^[.@&]?[a-zA-Z0-9 ]+[ !.@&()]?[ a-zA-Z0-9!()]+/;
exports.httpHeaderName = /^([a-zA-Z0-9 -~]{0,128})$/;
exports.httpHeaderValue = /^([a-zA-Z0-9 -~]{0,128})$/;
exports.countryCode = /^([A-Z][A-Z])?$/;
exports.subnetMask = /^(([0-9]{1,2})|([0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}))?$/;

exports.statusModel = Joi.object({
  statusCode: Joi.number().optional().description('Operation status code (should be equal to HTTP response code)'),
  error: Joi.string().description('Optional description of statusCode'),
  message: Joi.string().required().description('Status message'),
  object_id: Joi.objectId().description('Optional object ID for newly created objects like users, accounts, domains, etc.'),
  request_id: Joi.string().trim().length(36).description('Optional request ID of submitted object purge requests.')
}).meta({
  className: 'Status'
});

exports.contactInfoModel = Joi.object({
  companyName: Joi.string().required().description('Company name'),
  email: Joi.string().required().description('User email'),
  firstname: Joi.string().required().description('First name'),
  lastname: Joi.string().required().description('Last name'),
  country: Joi.string(),
  state: Joi.string(),
  city: Joi.string(),
  address1: Joi.string(),
  address2: Joi.string(),
  zipcode: Joi.string(),
  phone_number: Joi.string(),
  hosted_page: Joi.string().required(),
});

exports.listOfUsersModel = Joi.array().items({
  user_id: Joi.objectId().required().description('User ID'),
  email: Joi.string().email().required().description('Login name (email address)'),
  companyId: Joi.array().items(Joi.objectId().description('The ID of customer account the user belongs to')),
  domain: Joi.array().items(Joi.string().description('Domain name the customer can manage')).required(),
  firstname: Joi.string().required().description('First name'),
  lastname: Joi.string().required().description('Last name'),
  role: Joi.string().required().description('User role'),
  updated_at: Joi.date().required().description('Last update date/time'),
  last_login_at: Joi.date().allow(null).description('User last login date/time'),
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
  last_login_at: Joi.date().allow(null).description('User last login date/time'),
  last_login_from: Joi.string().allow(null).description('The remote IP address the user has been recently logged in'),
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

exports.domainStatusModel = Joi.object({
  staging_status: Joi.string().required().valid('Published', 'InProgress').description('Domain configuration publishing status for the staging environment'),
  global_status: Joi.string().required().valid('Modified', 'Published', 'InProgress').description('Domain configuration publishing status for the global network'),
}).meta({
  className: 'Domain configuration publishing status'
});

exports.listOfDomainsModel = Joi.array().items({
  account_id: Joi.objectId().required().description('The ID of customer account (company) managing the domain'),
  id: Joi.objectId().required().description('Domain ID'),
  domain_name: Joi.string().required().description('Domain name'),
  created_by: Joi.string().required().description('User who created the domain configuration'),
  created_at: Joi.date().required().description('Date/time when the domain configuration was created'),
  updated_at: Joi.date().optional().description('Date/time when the domain configuration was last updated'),
  last_published_domain_version: Joi.number().integer().description('The number of latest published domain configuration version'),
  origin_host_header: Joi.string().required().allow('').description('The value of Host HTTP header for requests sent to the customer origin server'),
  origin_server: Joi.string().required().description('Origin web server'),
  cname: Joi.string().required().description('CNAME record which should be used to point the domain to RevAPM platform')
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
  comment: Joi.string().allow('').description('Comment about company'),
  createdBy: Joi.string().required().description('User which created the account'),
  created_at: Joi.date().required().description('Account creation date/time'),
  updated_at: Joi.date().required().description('Account last update date/time')
}).meta({
  className: 'List of Accounts'
});

exports.accountModel = Joi.object({
  id: Joi.objectId().required().description('Account ID'),
  companyName: Joi.string().required().description('Company name'),
  comment: Joi.string().allow('').description('Comment about company'),
  createdBy: Joi.string().required().description('User which created the account'),
  country: Joi.string(),
  state: Joi.string(),
  city: Joi.string(),
  address1: Joi.string(),
  address2: Joi.string(),
  zipcode: Joi.string(),
  phone_number: Joi.string(),
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

var appSDKConfigModel = Joi.object({
  sdk_release_version: Joi.number().integer(),
  logging_level: Joi.string().valid('debug', 'info', 'warning', 'error', 'critical'),
  configuration_refresh_interval_sec: Joi.number().integer(),
  configuration_stale_timeout_sec: Joi.number().integer(),
  operation_mode: Joi.string().valid('transfer_and_report', 'transfer_only', 'report_only', 'off'),
  allowed_transport_protocols: Joi.array().items(Joi.string().valid('standard', 'quic', 'rmp')),
  initial_transport_protocol: Joi.string().valid('standard', 'quic', 'rmp'),
  stats_reporting_interval_sec: Joi.number().integer(),
  stats_reporting_level: Joi.string(),
  stats_reporting_max_requests_per_report: Joi.number().integer(),
  domains_provisioned_list: Joi.array().items(Joi.string()),
  domains_white_list: Joi.array().items(Joi.string()),
  domains_black_list: Joi.array().items(Joi.string()),
  a_b_testing_origin_offload_ratio: Joi.number().integer(),
  // from SDKConfigAPIService collection:
  configuration_api_url: Joi.string(),
  configuration_request_timeout_sec: Joi.number().integer(),
  // from SDKStatsAPIService collection:
  stats_reporting_url: Joi.string(),
  // from ServerGroup collection:
  transport_monitoring_url: Joi.string(),
  edge_host: Joi.string(),
  edge_connect_timeout_sec: Joi.number().integer(),
  edge_data_receive_timeout_sec: Joi.number().integer(),
  edge_first_byte_timeout_sec: Joi.number().integer(),
  edge_sdk_domain: Joi.string(),
  edge_quic_udp_port: Joi.number().integer(),
  edge_failures_monitoring_interval_sec: Joi.number().integer(),
  edge_failures_failover_threshold_percent: Joi.number().integer(),
  internal_domains_black_list: Joi.array().items(Joi.string())
});

// Used to report a full app configuration as requested and used by RevSDK
exports.SDKConfigModel = Joi.object({
  id: Joi.objectId(),
  app_name: Joi.string(),
  os: Joi.string().valid('iOS', 'Android'),
  configs: Joi.array().items(appSDKConfigModel),
}).meta({
  className: 'SDK config'
});

var msgUniq = 'Unique application ID';
var msgUniqSDK = 'SDK key that is unique to every application';
var msgStatus = 'Operation status code (should be equal to HTTP response code)';
var msgErr = 'Optional description of statusCode';
var msgMessage = 'Status message';
var msgName = 'Name of the mobile application';

exports.AppStatusModel = Joi.object({
  id: Joi.objectId().description(msgUniq),
  statusCode: Joi.number().required().description(msgStatus),
  error: Joi.string().description(msgErr),
  message: Joi.string().required().description(msgMessage)
}).meta({
  className: 'Status'
});

exports.NewAppStatusModel = Joi.object({
  id: Joi.objectId().description(msgUniq),
  statusCode: Joi.number().required().description(msgStatus),
  error: Joi.string().description(msgErr),
  message: Joi.string().required().description(msgMessage),
  sdk_key: Joi.string().required().description('Newly generated SDK key')
}).meta({
  className: 'App Status'
});

exports.ConfigStatusModel = Joi.object({
  id: Joi.objectId().description(msgUniq),
  statusCode: Joi.number().required().description(msgStatus),
  error: Joi.string().description(msgErr),
  message: Joi.string().required().description(msgMessage),
  config_status: Joi.string().description('Status of current app configuration')
}).meta({
  className: 'App Status'
});

var AppConfigModel2 = Joi.object({
  sdk_release_version: Joi.number().integer().min(0).max(10000),
  logging_level: Joi.string().valid('debug', 'info', 'warning', 'error', 'critical'),
  configuration_refresh_interval_sec: Joi.number().integer().min(60).max(604800),
  configuration_stale_timeout_sec: Joi.number().integer().min(60).max(999999999),
  operation_mode: Joi.string().valid('transfer_and_report', 'transfer_only', 'report_only', 'off'),
  allowed_transport_protocols: Joi.array().items(Joi.string().valid('standard', 'quic', 'rmp')),
  initial_transport_protocol: Joi.string().valid('standard', 'quic', 'rmp'),
//  transport_monitoring_url: Joi.string(),
  stats_reporting_interval_sec: Joi.number().integer().min(20).max(3600),
  stats_reporting_level: Joi.string(),
  stats_reporting_max_requests_per_report: Joi.number().integer().min(1).max(1000),
  domains_provisioned_list: Joi.array().items(Joi.string().regex(domainRegex)),
  domains_white_list: Joi.array().items(Joi.string().regex(domainRegex)),
  domains_black_list: Joi.array().items(Joi.string().regex(domainRegex)),
  a_b_testing_origin_offload_ratio: Joi.number().integer().min(0).max(100)
});

exports.AppConfigModel = AppConfigModel2;

// App configuration as used by customer portal UI

exports.AppModel = Joi.object({
  id: Joi.objectId(),
  account_id: Joi.objectId(),
  sdk_key: Joi.string(),
  app_name: Joi.string(),
  app_platform: Joi.string().valid('iOS', 'Android'),
//  config_status: Joi.string().valid('Modified', 'Published', 'InProgress'),
  created_at: Joi.date(),
  created_by: Joi.string().email(),
  updated_at: Joi.date(),
  updated_by: Joi.string().email(),
  deleted: Joi.boolean().default(false),
  deleted_at: Joi.date(),
  deleted_by: Joi.string(),
  configs: Joi.array().items(AppConfigModel2),
//  serial_id: Joi.number().integer(),
//  app_published_version: Joi.number().integer(),
  last_app_published_version: Joi.number().integer(),
//  sdk_configuration_api_service: Joi.objectId(),
//  sdk_stats_reporting_api_service: Joi.objectId(),
//  bp_group_id: Joi.objectId()
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
