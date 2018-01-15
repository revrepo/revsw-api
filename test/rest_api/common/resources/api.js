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
var VendorProfilesResource = require('./vendorProfiles');
var ActivityResource = require('./activity');
var APIKeysResource = require('./apiKeys');
var AppsResource = require('./apps');
var AuthenticateResource = require('./authenticate');
var BillingPlansResource = require('./billingPlans');
var CountriesResource = require('./countries');
var Dashboards = require('./dashboards');
var DomainConfigsResource = require('./domainConfigs');
var ForgotResource = require('./forgot');
var HealthCheckResource = require('./healthCheck');
var LocationsResource = require('./locations');
var PurgeResource = require('./purge');
var ResetResource = require('./reset');
var SdkConfigsResource = require('./sdkConfigs');
var SignUpResource = require('./signUp');
var SSLCerts = require('./sslCerts');
var SSLNames = require('./sslNames');
var StagingServers = require('./stagingServers');
var StatsResource = require('./stats');
var StatsSDKResource = require('./stats-sdk');
var TwoFAResource = require('./2fa');
var UsersResource = require('./users');
var UsageReportResource = require('./usage-report');
var LogShippingJobsResource = require('./logShippingJobs');
var DNSZonesResource = require('./dnsZones');
var WAFRulesResource = require('./wafRules');
var SSLConfProfilesResource = require('./sslConfProfiles');
var AzureResource = require('./azure');
var WAFStats = require('./wafStats');
var AuthenticateSSOAzure = require('./authenticateSSOAzure');
var ProxyRes = require('./proxy');

// Set of all resources that the REST API service provides..
var APIResources = {

  accounts: AccountsResource,
  vendorProfiles: VendorProfilesResource,
  activity: ActivityResource,
  apiKeys: APIKeysResource,
  apps: AppsResource,
  authenticate: AuthenticateResource,
  billingPlans: BillingPlansResource,
  countries: CountriesResource,
  dashboards: Dashboards,
  domainConfigs: DomainConfigsResource,
  forgot: ForgotResource,
  healthCheck: HealthCheckResource,
  locations: LocationsResource,
  purge: PurgeResource,
  reset: ResetResource,
  sdkConfigs: SdkConfigsResource,
  signUp: SignUpResource,
  sslCerts: SSLCerts,
  sslNames: SSLNames,
  stagingServers: StagingServers,
  stats: StatsResource,
  stats_sdk: StatsSDKResource,
  twoFA: TwoFAResource,
  users: UsersResource,
  usage_report: UsageReportResource,
  logShippingJobs: LogShippingJobsResource,
  dnsZones: DNSZonesResource,
  wafRules: WAFRulesResource,
  sslConfProfiles: SSLConfProfilesResource,
  azure: AzureResource,
  wafStats: WAFStats,
  authenticateSSOAzure: AuthenticateSSOAzure,
  proxy: ProxyRes
};

module.exports = APIResources;
