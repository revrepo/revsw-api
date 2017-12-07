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

var AppsDataProvider = require('./apps');
var DashboardsDataProvider = require('./dashboards');
var DNSZonesDataProvider = require('./dnsZones');
var DNSZoneStatisticsDataProvider = require('./dnsZoneStatistics');
var UsersDataProvider = require('./users');
var WAFRulesDataProvider = require('./wafRules');
var AzureDataProvider = require('./azure');

var APIDataProviders = {
  apps: AppsDataProvider,
  dashboards: DashboardsDataProvider,
  dnsZones: DNSZonesDataProvider,
  dnsZoneStatistics: DNSZoneStatisticsDataProvider,
  users: UsersDataProvider,
  wafRules: WAFRulesDataProvider,
  azure: AzureDataProvider
};

module.exports = APIDataProviders;
