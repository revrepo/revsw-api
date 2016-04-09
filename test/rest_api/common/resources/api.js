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

// # Main API Resource

// Requiring all resources to apply/attach to main `API` object.
var AccountsResource = require('./accounts');
var ActivityResource = require('./activity');
var AppsResource = require('./apps');
var AuthenticateResource = require('./authenticate');
var BillingPlansResource = require('./billingPlans');
var CountriesResource = require('./countries');
var DomainConfigsResource = require('./domainConfigs');
var ForgotResource = require('./forgot');
var LocationsResource = require('./locations');
var PurgeResource = require('./purge');
var SdkConfigsResource = require('./sdkConfigs');
var StatsResource = require('./stats');
var TwoFAResource = require('./2fa');
var UsersResource = require('./users');

// Set of all resources that the REST API service provides..
module.exports = {

  accounts: AccountsResource,
  activity: ActivityResource,
  apps: AppsResource,
  authenticate: AuthenticateResource,
  billingPlans: BillingPlansResource,
  countries: CountriesResource,
  domainConfigs: DomainConfigsResource,
  forgot: ForgotResource,
  locations: LocationsResource,
  purge: PurgeResource,
  sdkConfigs: SdkConfigsResource,
  stats: StatsResource,
  twoFA: TwoFAResource,
  users: UsersResource
};