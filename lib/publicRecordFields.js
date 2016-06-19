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

var utils = require('./utilities');

var publicRecordFields = {

  accounts: [
    'id',
    'createdBy',
    'companyName',
    'comment',
    'billing_plan',
    'subscription_state',
    'created_at',
    'updated_at'
  ],

  account: [
    'id',
    'createdBy',
    'companyName',
    'comment',
    'country',
    'state',
    'city',
    'address1',
    'address2',
    'zipcode',
    'phone_number',
    'first_name',
    'last_name',
    'contact_email',
    'created_at',
    'updated_at',
    'billing_id',
    'billing_plan',
    'billing_info',
    'billing_portal_link',
    'use_contact_info_as_billing_info',
    'subscription_state',
    'subscription_id',
    'self_registered',
    'valid_payment_method_configured'
  ],


  apiKeys: [
    'id',
    'key',
    'key_name',
    'account_id',
    'domains',
    'created_by',
    'allowed_ops',
    'read_only_status',
    'active',
    'created_at',
    'updated_at'
  ],

  apps: [
    'id',
    'app_name',
    'comment',
    'account_id',
    'app_platform',
    'sdk_key',
    'created_at',
    'created_by',
    'updated_at',
    'updated_by',
    'configs'
  ],

  domains: [
    'id',
    'name',
    'cname',
    'companyId',
    'btt_key',
    'sync_status'
  ],

  domain: [
    'id',
    'name',
    'companyId',
    'sync_status',
    'cname',
    'comment',
    'origin_server',
    'btt_key',
    'tolerance',
    'origin_server_location',
    'origin_host_header',
    'created_at',
    'updated_at',
    'updated_by'
  ],

  masterConfiguration: [
    'enable_origin_health_probe',
    'origin_health_probe',
    'rev_component_co',
    'rev_component_bp'
  ],

  masterConfigurationBp: [
    'enable_cache',
    'block_crawlers',
    'cdn_overlay_urls',
    'caching_rules',
    'enable_security',
    'web_app_firewall',
    'origin_health_probe',
    'acl',
    'cache_bypass_locations'
  ],

  /*masterConfigurationCo : [
    'ssl_certificates',
    'certificate_urls',
    'bp_apache_custom_config',
    'bp_apache_fe_custom_config',
    'cache_opt_choice'
  ]*/
  purge: [
    'req_id',
    'req_domain',
    'req_email',
    'request_json'
  ],

  verify: [
    'firstname',
    'lastname',
    'email',
    'address1',
    'address2',
    'country',
    'state',
    'zipcode',
    'phone_number',
    'city',
    'companyName',
    'hosted_page',
    'token'
  ],

  users: [
    'user_id',
    'email',
    'companyId',
    'domain',
    'firstname',
    'lastname',
    'role',
    'two_factor_auth_enabled',
    'updated_at',
    'last_login_at'
  ],

  user: [
    'user_id',
    'email',
    'companyId',
    'domain',
    'firstname',
    'lastname',
    'role',
    'theme',
    'created_at',
    'updated_at',
    'two_factor_auth_enabled',
    'access_control_list',
    'last_login_at',
    'last_login_from',
    'comment'
    //    'self_registered'
  ],

  billingPlans: [
    'id',
    'name',
    'description',
    'chargify_handle',
    'hosted_page',
    'type',
    'monthly_fee',
    'services',
    'prepay_discounts',
    'commitment_discounts',
    'order',
    'created_at',
    'updated_at'
  ],

  billingPlan: [
    'id',
    'name',
    'description',
    'chargify_handle',
    'hosted_page',
    'type',
    'monthly_fee',
    'services',
    'prepay_discounts',
    'commitment_discounts',
    'order',
    'deleted',
    'history',
    'overage_credit_limit',
    'created_at',
    'updated_at'
  ],

  statements: [
    'id',
    'total_in_cents',
    'html_view',
    'opened_at',
    'settled_at',
    'created_at',
    'closed_at',
    'memo',
    'success'
  ],

  statement: [
    'id',
    'basic_html_view',
    'closed_at',
    'created_at',
    'customer_billing_address',
    'customer_billing_address_2',
    'customer_billing_city',
    'customer_billing_country',
    'customer_billing_state',
    'customer_billing_zip',
    'customer_first_name',
    'customer_last_name',
    'customer_organization',
    'ending_balance_in_cents',
    'payments',
    'future_payments',
    'html_view',
    'memo',
    'opened_at',
    'settled_at',
    'starting_balance_in_cents',
    'subscription_id',
    'text_view',
    'updated_at',
    'total_in_cents',
    'transactions',
    'events',
    'payments_total'
  ],

  transactions: [
    'id',
    'transaction_type',
    'amount_in_cents',
    'starting_balance_in_cents',
    'ending_balance_in_cents',
    'created_at',
    'closed_at',
    'memo',
    'success'
  ],

  dashboards: [
    'id',
    'title',
    'created_at',
    'updated_at'
  ],

  dashboard: [
    'id',
    'user_id',
    'title',
    'structure',
    'options',
    'rows',
    'created_at',
    'updated_at'
  ],

  sslCertificates: [
    'id',
    'account_id',
    'cert_type',
    'cert_name',
    'created_by',
    'comment',
    'created_at',
    'updated_at',
    'expires_at',
    'domains'
  ],

  sslCertificate: [
    'id',
    'account_id',
    'cert_type',
    'cert_name',
    'created_by',
    'comment',
    'created_at',
    'updated_at',
    'updated_by',
    'last_published_ssl_config_version',
    'public_ssl_cert',
    'private_ssl_key',
    'private_ssl_key_passphrase',
    'chain_ssl_cert',
    'expires_at',
    'domains'
  ],

  sslConfigurationProfiles: [
    'id',
    'profile_name',
    'ssl_protocols',
    'ssl_ciphers',
    'ssl_prefer_server_ciphers',
    'comment'
  ],

  logShippingJobs: [
    'id',
    'job_name',
    'operational_mode',
    'account_id',
    'created_by',
    'created_at',
    'source_type',
    'source_id',
    'destination_type',
    'destination_host',
    'comment',
    'updated_by',
    'updated_at'
  ],

  logShippingJob: [
    'id',
    'job_name',
    'operational_mode',
    'account_id',
    'created_by',
    'created_at',
    'source_type',
    'source_id',
    'destination_type',
    'destination_host',
    'destination_port',
    'destination_key',
    'destination_username',
    'destination_password',
    'notification_email',
    'comment',
    'updated_by',
    'updated_at'
  ],

  sslNames: [
    'id',
    'ssl_name',
    'account_id',
    'created_by',
    'created_at',
    'deleted',
    'deleted_at',
    'comment',
    'updated_by',
    'updated_at',
    'verification_method',
    'verification_object',
    'verified',
    'deployment_status'
  ],

  sslName: [
    'id',
    'ssl_name',
    'account_id',
    'created_by',
    'created_at',
    'deleted',
    'deleted_at',
    'comment',
    'updated_by',
    'updated_at',
    'verification_method',
    'verification_object',
    'verified',
    'deployment_status'
  ],

};

/**
 *
 * @param data
 * @param allowFields
 * @returns {*}
 */
var handler = function(data, allowFields) {

  var result;

  if (utils.isArray(data)) {

    result = [];

    for (var i in data) {
      var obj = {};
      for (var j in allowFields) {
        if (allowFields[j] in data[i]) {
          obj[allowFields[j]] = data[i][allowFields[j]];
        }
      }
      result.push(obj);
    }

  } else {

    result = {};

    for (var o in allowFields) {
      if (allowFields[o] in data) {
        result[allowFields[o]] = data[allowFields[o]];
      }
    }

  }

  return result;
};

/**
 *
 * @param data
 * @param action
 * @returns {{}}
 */
exports.handle = function(data, action) {
  if (publicRecordFields[action]) {
    return handler(data, publicRecordFields[action]);
  } else {
    return {};
  }
};
