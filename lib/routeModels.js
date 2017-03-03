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

exports.companyNameRegex = /^[A-Za-z0-9_.' -]+$/;
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
  country: Joi.string().optional().allow(''),
  state: Joi.string().optional().allow(''),
  city: Joi.string().optional().allow(''),
  address1: Joi.string().optional().allow(''),
  address2: Joi.string().optional().allow(''),
  zipcode: Joi.string().optional().allow(''),
  phone_number: Joi.string().optional().allow(''),
  hosted_page: Joi.string().optional().allow(''),
  token: Joi.string().optional().allow(''),
});


exports.listOfDashboardsModel = Joi.array().items({
  id: Joi.string().required().description('Dashboard ID'),
  title: Joi.string().required().description('Dashboard title'),
  created_at: Joi.date().description('Dashboard creation date/time'),
  updated_at: Joi.date().description('Dashboard last update date/time')
}).meta({
  className: 'List of Dashboards'
});

exports.dashboardModel = Joi.object({
  id: Joi.string().required().description('Dashboard ID'),
  user_id: Joi.objectId().required().description('User ID'),
  title: Joi.string().required().description('Dashboard title'),
  structure: Joi.string().description('Name dashboard structure'),
  options: Joi.object().description('Options dashboard'),
  rows: Joi.array().description('Rows in dashboard'),
  created_at: Joi.date().description('Dashboard creation date/time'),
  updated_at: Joi.date().description('Dashboard last update date/time')
}).meta({
  className: 'Dashboard info'
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
  comment: Joi.string().allow(null).allow('').max(300).optional().description('Free-text comment about the user'),
  access_control_list: Joi.object({
    readOnly: Joi.boolean().description('Read-only flag'),
    test: Joi.boolean().description('Access flag to TEST portal section'),
    configure: Joi.boolean().description('Access flag to CONFIGURE portal section'),
    reports: Joi.boolean().description('Access flag to REPORTS portal section'),
    dashBoard: Joi.boolean().description('Access flag to DASHBOARD portal section')
  }).meta({
    className: 'User Permission Flag'
  }),
  self_registered: Joi.boolean().description('Is user registered by himself')
}).meta({
  className: 'User profile details'
});


exports.listOfFirstMileLocationsModel = Joi.array().items({
  locationName: Joi.string().required().description('The name of the first mile location'),
  id: Joi.string().required().description('Location ID'),
}).meta({
  className: 'List of CDN first mile locations'
});

exports.listOfLastMileLocationsModel = Joi.array().items({
  id: Joi.string().required().description('Location ID'),
  site_code_name: Joi.string().required().description('The code name of last mile location'),
  city: Joi.string().required().description('City name'),
  state: Joi.string().required().allow('').description('State name'),
  country: Joi.string().required().description('Country name'),
  billing_zone: Joi.string().required().description('CDN billing zone name'),
}).meta({
  className: 'List of CDN last mile locations'
});

exports.listOfBillingZonesModel = Joi.array().items({
  id: Joi.string().required().description('Location ID'),
  site_code_name: Joi.string().required().description('The code name of CDN billing zones location'),
  city: Joi.string().required().description('City name'),
  state: Joi.string().required().allow('').description('State name'),
  country: Joi.string().required().description('Country name'),
  billing_zone: Joi.string().required().description('CDN billing zone name'),
}).meta({
  className: 'List of CDN billing zones locations'
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
  updated_by: Joi.string().optional().description('Who the domain configuration was last updated'),
  last_published_domain_version: Joi.number().integer().description('The number of latest published domain configuration version'),
  origin_host_header: Joi.string().required().allow('').description('The value of Host HTTP header for requests sent to the customer origin server'),
  origin_server: Joi.string().required().description('Origin web server'),
  cname: Joi.string().required().description('CNAME record which should be used to point the domain to the CDN platform'),
  btt_key: Joi.string().allow('').description('BTT key for the domain'),
  bp_lua: Joi.array().items({
    location: Joi.string().max(150)
      .description('Lua location for BP requested by user'),
    code: Joi.string().max(2000)
      .description('Lua code for the BP lua location requested by user'),
    effective_location: Joi.string().max(150).allow('')
      .description('Actual Lua location for BP approved by revAdmin'),
    effective_code: Joi.string().max(2000).allow('')
      .description('Actual Lua code for the BP lua location approved by revAdmin'),
    enable: Joi.boolean().default(false)
      .description('Include or exclude BP lua code for domain proxy configuration')
  }),
  co_lua: Joi.array().items({
    location: Joi.string().max(150)
      .description('Lua location for CO requested by user'),
    code: Joi.string().max(2000)
      .description('Lua code for the CO lua location requested by user'),
    effective_location: Joi.string().max(150).allow('')
      .description('Actual Lua location for CO approved by revAdmin'),
    effective_code: Joi.string().max(2000).allow('')
      .description('Actual Lua code for the CO lua location approved by revAdmin'),
    enable: Joi.boolean().default(false)
      .description('Include or exclude CO lua code for domain proxy configuration')
  })
}).meta({
  className: 'List of Domains'
});

exports.DNSZoneModel = Joi.object({
  id: Joi.objectId().description('DNS zone ID'),
  zone: Joi.string().description('DNS zone domain'),
  account_id: Joi.objectId().description('The ID of customer account the DNS zone belongs to'),
  records: Joi.array().description('array of DNS zone records'),
  refresh: Joi.number().integer().description('DNS zone refresh parameter'),
  retry: Joi.number().integer().description('DNS zone retry parameter'),
  expiry: Joi.number().integer().description('DNS zone expiry parameter'),
  nx_ttl: Joi.number().integer().description('DNS zone nx ttl parameter'),
  ttl: Joi.number().integer().description('DNS zone ttl parameter'),
  dns_servers: Joi.array().optional().description('List of DNS servers')
}).meta({
  className: 'DNS zone'
});


exports.listOfDNSZonesModel = Joi.array().items({
  account_id: Joi.objectId().required().description('The ID of customer account (company) managing the zone'),
  id: Joi.objectId().required().description('DNS Zone ID'),
  zone: Joi.string().required().description('DNS zone'),
  dns_servers: Joi.array().optional().description('List of DNS servers'),
  updated_at: Joi.date().required().description('DNS zone last update date/time'),
  updated_by: Joi.string().required().allow('').description('Who updated the DNS zone'),
  records_count: Joi.number().integer().optional().description('DNS zone active records count'),
  queries_count: Joi.number().integer().optional().description('DNS zone queries count')
}).meta({
  className: 'List of DNS zones'
});

exports.listOfDNSZoneRecordsModel = Joi.array().items({
  // account_id: Joi.objectId().required().description('The ID of customer account (company) managing the zone'),
  id: Joi.objectId().required().description('DNS Record ID'),
  dns_zone_id: Joi.objectId().required().description('DNS Zone ID'),
  domain: Joi.string().required().description('DNS zone'),
  type: Joi.string().required().description('DNS type'),
  short_answers: Joi.array().required().description('DNS Record answers'),
  tier: Joi.number().optional().allow(null).description('DNS Record tier'),
  link: Joi.string().optional().allow(null).description('Link')
}).meta({
  className: 'List of DNS zone Records'
});

exports.domainModel = Joi.object({
  companyId: Joi.objectId().required().description('The ID of customer account (company) managing the domain'),
  id: Joi.objectId().required().description('Domain ID'),
  name: Joi.string().required().description('Domain name'),
  comment: Joi.string().allow(null).max(300).optional().description('Free-text comment about the domain'),
  sync_status: Joi.string().required().description('Domain configuration publishing status'),
  cname: Joi.string().required().description('CNAME record which should be used to point the domain to the CDN platform'),
  origin_server: Joi.string().required().description('DNS name or IP address of customer origin server which provides the domain\'s content'),
  tolerance: Joi.string().required().description('APEX metric for RUM reports'),
  created_at: Joi.date().required().description('Domain creation date/time'),
  updated_at: Joi.date().required().description('Domain last update date/time'),
  origin_server_location: Joi.string().required().description('CDN\' first mile location used to access the origin server'),
  origin_host_header: Joi.string().required().description('The value of HTTP "Host" request header used while accessing the customer origin server')
}).meta({
  className: 'Basic domain configuration'
});

exports.listOfAccountsModel = Joi.array().items({
  id: Joi.objectId().required().description('Account ID'),
  companyName: Joi.string().required().description('Company name'),
  vendor_profile: Joi.string().description('Vendor profile name'),
  comment: Joi.string().allow('').description('Free-text comment about the company'),
  createdBy: Joi.string().required().description('User which created the account'),
  billing_plan: Joi.string().optional().description('Active billing plan'),
  subscription_state: Joi.string().optional().description('Subscription state'),
  created_at: Joi.date().required().description('Account creation date/time'),
  updated_at: Joi.date().required().description('Account last update date/time')
}).meta({
  className: 'List of Accounts'
});

exports.accountModel = Joi.object({
  id: Joi.objectId().required().description('Account ID'),
  companyName: Joi.string().required().description('Company name'),
  vendor_profile: Joi.string().description('Vendor profile name'),
  comment: Joi.string().allow('').description('Free-text comment about the company'),
  createdBy: Joi.string().required().description('User which created the account'),
  country: Joi.string(),
  state: Joi.string().optional().allow(''),
  city: Joi.string().optional().allow(''),
  address1: Joi.string().optional().allow(''),
  address2: Joi.string().optional().allow(''),
  zipcode: Joi.string().optional().allow(''),
  phone_number: Joi.string().optional().allow(''),
  first_name: Joi.string().description('First name contact person'),
  last_name: Joi.string().description('Last name contact person'),
  contact_email: Joi.string().description('Email contact person'),
  use_contact_info_as_billing_info:Joi.boolean().description('Use account contact information as billing info.'),
  billing_plan: Joi.string().optional().description('Active billing plan'),
  billing_info: Joi.object().allow(null),
  billing_portal_link: Joi.object().allow(null),
  billing_id:Joi.string().allow(null).optional().description('Billing Id'), // NOTE: billing id - chargify_id
  subscription_id:Joi.string().allow(null).optional(),
  subscription_state:Joi.string().description('Subscription state(status)'),
  created_at: Joi.date().required().description('Account creation date/time'),
  updated_at: Joi.date().required().description('Account last update date/time'),
  self_registered: Joi.boolean().description('Account was registered by user'),
  valid_payment_method_configured: Joi.boolean().optional().description('Subscription valid payment method configured')
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
  id: Joi.objectId().description('API key ID'),
  key: Joi.string().description('Customer\'s API key'),
  key_name: Joi.string().description('Customer\'s API key name'),
  account_id: Joi.objectId().description('The ID of customer account the API key belongs to'),
  managed_account_ids: Joi.array().items(Joi.objectId()).description('Array of account IDs the key should have access to'),
  domains: Joi.array().items(Joi.objectId()).description('Array of domain IDs the key should have access to'),
  created_by: Joi.string().description('User who created the account'),
  allowed_ops: Joi.object({
    read_config: Joi.boolean(),
    modify_config: Joi.boolean(),
    delete_config: Joi.boolean(),
    purge: Joi.boolean(),
    reports: Joi.boolean(),
    admin: Joi.boolean(),
  }).description('Operations allowed with the API key'),
  read_only_status: Joi.boolean().description('Defines if the API key can be used only for read-write or read-only'),
  active: Joi.boolean().description('Active or inactive API key'),
  created_at: Joi.date().description('API key creation date/time'),
  updated_at: Joi.date().description('API key last update date/time')
}).meta({
  className: 'List of API keys'
});

exports.APIKeyModel = Joi.object({
  id: Joi.objectId().description('API key ID'),
  key: Joi.string().description('Customer\'s API key'),
  key_name: Joi.string().description('Customer\'s API key name'),
  account_id: Joi.objectId().description('The ID of customer account the API key belongs to'),
  managed_account_ids: Joi.array().items(Joi.objectId()).description('Array of account IDs the key should have access to'),
  domains: Joi.array().items(Joi.objectId()).description('Array of domain IDs the key should have access to'),
  created_by: Joi.string().description('User who created the account'),
  allowed_ops: Joi.object({
    read_config: Joi.boolean(),
    modify_config: Joi.boolean(),
    delete_config: Joi.boolean(),
    purge: Joi.boolean(),
    reports: Joi.boolean(),
    admin: Joi.boolean(),
  }).description('Operations allowed with the API key'),
  read_only_status: Joi.boolean().description('Defines if the API key can be used only for read-write or read-only'),
  active: Joi.boolean().description('Active or inactive API key'),
  created_at: Joi.date().description('API key creation date/time'),
  updated_at: Joi.date().description('API key last update date/time')
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
  os: Joi.string().valid('iOS', 'Android', 'Windows_Mobile'),
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
  app_platform: Joi.string().valid('iOS', 'Android', 'Windows_Mobile'),
  //  config_status: Joi.string().valid('Modified', 'Published', 'InProgress'),
  comment: Joi.string().allow(null).trim().allow('').max(300).optional().description('Free-text comment about the appilcation'),
  created_at: Joi.date(),
  created_by: Joi.string(),
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

exports.listOfStagingServersModel = Joi.array().items({
  server_ip: Joi.string().required().description('Server IP'),
  server_name: Joi.string().required().description('Server Name')
}).meta({
  className: 'List of staging servers'
});

exports.listOfVendorProfileNamesModel = Joi.array().items(Joi.string()).meta({
    className: 'List of Vendor Profile Names'
});

exports.vendorProfileConfig = Joi.object({
  vendor: Joi.string().description('Vendor code name'),
  vendorUrl: Joi.string().description('Customer Portal URL'),
  companyWebsiteURL: Joi.string().description('Company/product website URL'),
  contactSalesLink: Joi.string().description('"Contact Sales" link'),
  support_email: Joi.string().required().description('Support email'),
  companyNameShort: Joi.string().required().description('Company name, short form'),
  companyNameFull: Joi.string().required().description('Company name, long form'),
  contactUsLink: Joi.string().required().description('Company "Contact Us" link'),
  knowledgeBaseLink: Joi.string().required().description('Knoweldge Base link'),
  apiUrl: Joi.string().required().description('Customer API URL'),
  contactPhone: Joi.string().required().description('Company contact phone number'),
  networkStatusUrl: Joi.string().required().description('Network status page url'),
  sdk: Joi.object().description('SDK download link'),
  terms_of_service_link: Joi.string().required().description('ToS Link'),
  acceptable_use_policy_link: Joi.string().required().description('Acceptable Use Policy LInk'),
  privacy_policy_link: Joi.string().required().description('Privacy Policy Link'),
  zendesk_support_site: Joi.string().required().description('Zendesk Support Site (used in Zendesk Help widget)'),
  copyright: Joi.string().required().description('Copyright text'),
  googleAnalyticsAccount: Joi.string().required().description('Google Analytics account id'),
  apiGoogleAnalyticsAccount: Joi.string().required().description('API Google Analytics account id'),
  swaggerUIPageTitle: Joi.string().required().description('Swagger UI page title'),
  swaggerUICDNCustomerAPIUrl: Joi.string().required().description('Swagger UI CDN Customer APi Url'),
  enable_simplified_signup_process: Joi.boolean().required().description('Enable Simplified Signup Procces for new users')
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
