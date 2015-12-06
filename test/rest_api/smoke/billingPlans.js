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

// # Smoke check: accounts

// ## Sample spec/test suite.

// This file is an example of how we should write specs/tests for our REST API.
// You will __fine this kind of documentation only in this file__. Usually a
// test file should not be too verbose. Instead, you should make it to:

// * Be simple, verbose code makes it difficult to understand. In case there
// is some code that could be moved to a common place, do so.
// * Show relevant data to the validation. Don't make your test to do magic
// actions. For example, if you are going to validate that username should not
// be only numbers, then reflect that in the body of the test by creating a
// variable to store that data.
// * Do not depend on other tests/results. Instead, take advantage of
// `before()`, `after()`, `beforeEach()` and `afterEach()` function to set the
// pre-requisites for your test.
// * Be atomic. Do not make your test to be a "super-test" that will
// validate everything you can. If you thing it  is giong to make the execution
// time of all test to be extended, do not worry, it is always better.

// Following are some required lines that you will need to add in every test.

// We need to load some configuration values for our spec/test to execute. This
// config module has some defined shared properties like username, passwords
// host information and others
var config = require('config');

// ### Requiring common components to use in our spec/test.

// `API` object, is the main component which should be imported en every
// spec/test that you would create. It is the entry point to all resources
// that we could consume from the REVSW REST API.
var API = require('./../common/api');
// `DataProvider` is another important component which its main goal is to
// provide valid test data for our specs/tests.
var DataProvider = require('./../common/providers/data');

// Defining our __siute__ for our set of tests that belongs to the same
// category. Please, note that here wer are talking about categories or type
// of tests.
//
// If you are not familiar with this, it is highly recommended to
// review this resource: [API Testing
// Dojo](http://www.soapui.org/testing-dojo/welcome-to-the-dojo/overview.html)
xdescribe('Smoke check', function () {

  // Changing default mocha's timeout (Default is 2 seconds). Note that the
  // new value is retrieved from config file. It is recommended to have this
  // setting in each suite since t might vary from suite to suite.
  this.timeout(config.api.request.maxTimeout);

  // Generating new `account` data in order to use later in our tests.
  var sample = DataProvider.generateBillingPlan();
  // Retrieving information about specific user that later we will use for
  // our API requests.
  var adminUser = config.api.users.admin;

  // ### Test suite

  // This block is run every time a suite starts the execution of their tests.
  // It does not require any string as first param, just a `callback`. Also
  // note that this `callback` receives a `done` parameter which is used later
  // in the callback body to indicate that execution of this block is ready
  // and we are good to proceed with the execution of our tests.
  before(function (done) {
    // I the following lines we start using `API` object in order to consume
    // REVSW REST API services

    // Setting a user for all upcoming API requests
    API.session.setCurrentUser(adminUser);

    API.resources.billingPlans
      .createOneAsPrerequisite(sample)
      .then(function (response) {
        sample.id = response.body.object_id;
        done();
      });
  });

  // This block is run after a suite run all their tests. Same idea applies
  // here in regards to the `done` parameter.
  after(function (done) {
    // ### Using our `API` object

    // Again, we set the user for the following API calls. This is to make sure
    // that we are using the right user account (in case any other test run
    // changed it to a different value)
    API.session.setCurrentUser(adminUser);

    API.resources.billingPlans.deleteAllPrerequisites(done);

  });

  describe('BillingPlan resource', function () {

    // Use this block to run some statements before an spec/test starts its
    // execution. This is not the same as before method call.
    beforeEach(function (done) {
      done();
    });

    // Use this block to run some statements after an spec/test ends its
    // execution. This is not the same as after method call.
    afterEach(function (done) {
      done();
    });

    it('should return a response when getting all billing plans.',
      function (done) {
        // Setting user for all upcoming REST API calls
        //API.session.setCurrentUser(adminUser);
        // Using `API` to get `accounts resource`
        API.resources.billingPlans
          // Getting all accounts
          .getAll()
          // Validate response is a success one
          .expect(200)
          // And finish either if there was a failure or if there was a success
          // response, `done` callback will be invoked.
          .end(done);
      });

    // ### Spec/test to get specific account
    it('should return a response when getting specific account.',
      function (done) {
        // Setting user
        API.session.setCurrentUser(adminUser);
        API.resources.billingPlans
          // Getting one specific account giving its ID
          .getOne(sample.id)
          // Validate it has a success response
          .expect(200)
          // And done, test complete
          .end(done);
      });

    it('should return a response when creating specific billing plan.',
      function (done) {
        var newBillingPlan = DataProvider.generateBillingPlan();
        API.session.setCurrentUser(adminUser);
        API.resources.billingPlans
          //Creating new account by using data generated
          .createOne(newBillingPlan)
          // Validate it has a success reponse
          .expect(200)
          // Calling `then()` function instead of `done()`. This is a feature of
          // `supertest-as-promised` package. It receives as param the sucess
          // response.
          .then(function (response) {
            // Since we got a success response, we need to clean account created
            API.resources.accounts
              .deleteOne(response.body.object_id)
              .end(done);
          })
          .finally(done);
      });
  });
});
