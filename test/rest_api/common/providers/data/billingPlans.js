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

var faker = require('faker');

// # Billing Plans Data Provider object
//
// Defines some methods to generate valid and common Billing Plan. test data.
// With common we mean it does not have anything special on it.
//
// From there, you can modify and get bogus, invalid or other type of data
// depending on your test needs.
var BillingPlanDataProvider = {

  /**
   * ### BillingPlanDataProvider.generateOne()
   *
   * Generates valid data that represents a Billing Plan which the REST API
   * end points accept.
   *
   * @returns {Object} Billing Plan info with the following schema
   *
   *    {
   *      title: string,
   *      options: {
   *        stripUnknown: boolean
   *      },
   *      structure: string
   *      rows: array
   *    }
   */
  generateOne: function () {
    return {
      title: 'API QA: ' + Date.now(),
      options: {
        stripUnknown: true
      },
      structure: faker.lorem.words()[0],
      rows: []
    };
  },

  /**
   * ### BillingPlanDataProvider.generateOneForUpdate()
   *
   * Updates a given Billing Plan object for editing purpouses
   *
   * @param billingPlan
   * @returns
   *    {
   *      title: string,
   *      options: {
   *        stripUnknown: boolean
   *      },
   *      structure: string
   *      rows: array
   *    }
   */
  generateOneForUpdate: function (billingPlan) {
    billingPlan.title = 'UPDATED ' + billingPlan.title;
    return billingPlan;
  }
};

module.exports = BillingPlanDataProvider;