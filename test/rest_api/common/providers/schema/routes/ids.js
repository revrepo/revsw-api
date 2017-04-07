/*************************************************************************
 *
 * REV SOFTWARE CONFIDENTIAL
 *
 * [2013] - [2017] Rev Software, Inc.
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

var IDS = {
  API_KEYS: {
    BASE_PATH: 'apiKeys',
    GET: {
      ALL: 'GET::API_KEYS::ALL',
      ONE: 'GET::API_KEYS::{ID}',
      MYSELF: 'GET::API_KEYS::MYSELF'
    },
    POST: {
      NEW: 'POST::API_KEYS::NEW',
      ACTIVATE: 'POST::API_KEYS::ACTIVATE',
      DEACTIVATE: 'POST::API_KEYS::DEACTIVATE'
    },
    PUT: {
      ONE: 'PUT::API_KEYS::{ID}'
    },
    DELETE: {
      ONE: 'DELETE::API_KEYS::{ID}'
    }
  },
  DASHBOARDS: {
    BASE_PATH: 'dashboards',
    GET: {
      ALL: 'GET::DASHBOARDS::ALL',
      ONE: 'GET::DASHBOARDS::{ID}'
    },
    POST: {
      NEW: 'POST::DASHBOARDS::NEW'
    },
    PUT: {
      ONE: 'PUT::DASHBOARDS::{ID}'
    },
    DELETE: {
      ONE: 'DELETE::DASHBOARDS::{ID}'
    }
  },
  DNS_ZONES: {
    BASE_PATH: 'dns_zones',

  },
  HEALTH_CHECK: {
    BASE_PATH: 'healthcheck',
    GET: {
      ALL: 'GET::HEALTH_CHECK::ALL'
    }
  }
};

module.exports = IDS;
