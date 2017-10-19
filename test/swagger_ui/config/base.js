var config = require('config');
var Jasmine2HtmlReporter = require('protractor-jasmine2-html-reporter');
var JasmineSpecReporter = require('jasmine-spec-reporter');

module.exports = {
  directConnect: false,
  seleniumAddress: config.get('protractor.seleniumAddress'),
  capabilities: {
    browserName: 'firefox',
    marionette: false
  },
  getPageTimeout: 120000,
  allScriptsTimeout: 360000,
  framework: 'jasmine2',
  jasmineNodeOpts: {
    defaultTimeoutInterval: 720000,
    showColors: true,
    print: function () { } // Disable default reporter
  },
  onPrepare: function () {
    browser.manage().window().setSize(1280, 1024);
    browser.manage().window().setPosition(0, 0);        

    // NOTE: open browser on full screen
    setTimeout(function () {
      browser.driver.executeScript(function () {
        return {
          width: window.screen.availWidth,
          height: window.screen.availHeight
        };
      })
        .then(function (result) {
          browser.driver.manage().window().setSize(result.width, result.height);
        });
    });
    // add jasmine html reporter
    var htmlReporter = new Jasmine2HtmlReporter({
      savePath: './results/tests/',
      takeScreenshots: true,
      takeScreenshotsOnlyOnFailures: true,
      consolidate: true,
      consolidateAll: true
    });
    jasmine.getEnv().addReporter(htmlReporter);

    // add jasmine spec reporter
    var specReporter = new JasmineSpecReporter({
      displayStacktrace: 'summary'
    });
    jasmine.getEnv().addReporter(specReporter);   
  }
};
