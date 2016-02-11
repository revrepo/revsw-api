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

'use strict';

var joi = require('joi');
joi.objectId = require('joi-objectid');

exports.signupPayload = {
  firstname: joi.string().description('User first name').required(),
  lastname: joi.string().description('Last name').required(),
  email: joi.string().email().description('Email address').required(),
  company_name: joi.string().description('Company name'),
  phone_number: joi.string().description('Phone number').required(),
  password: joi.string().description('Password').required(),
  address1: joi.string().description('Address 1').required(),
  address2: joi.string().description('Address 2'),
  country: joi.string().description('Country').required(),
  state: joi.string().description('State'),
  city: joi.string().description('City').required(),
  zipcode: joi.string().description('Zip Code').required(),
  collection_method: joi.array().description('Collection method'),
  billing_schedule: joi.string().description('Billing schedule')
};
