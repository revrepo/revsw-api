module.exports = function (grunt) {

  grunt.initConfig({

    pkg: grunt.file.readJSON('package.json'),

    clean: [
      'dist',
      'coverage',
      'docs',
      'results'
    ],

    env: {
      test: {
        NODE_ENV: 'qa',
        NODE_CONFIG_DIR: './config/'
      }
    },

    mochaTest: {
      clean: {
        options: {
          reporter: 'spec',
          // Optionally capture the reporter output to a file
          captureFile: 'results/mocha-clean-env.txt',
          // Optionally suppress output to standard out (defaults to false)
          quiet: false,
          // Optionally clear the require cache before running tests
          // (defaults to false)
          clearRequireCache: false
        },
        src: [ // NOTE: Execution order is really IMPORTANT
          'scripts/clean/dashboards.js',
          'scripts/clean/apiKeys.js',
          'scripts/clean/apps.js',
          'scripts/clean/billingPlans.js',
          'scripts/clean/domainConfigs.js',
          'scripts/clean/sslNames.js',
          'scripts/clean/sslCerts.js',
          'scripts/clean/dnsZones.js',
          'scripts/clean/logShippingJobs.js',
          'scripts/clean/wafRules.js',
          'scripts/clean/accounts.js',
          'scripts/clean/users.js',
          'scripts/clean/chargify.js',
        ]
      },
      setup: {
        options: {
          reporter: 'spec',
          // Optionally capture the reporter output to a file
          captureFile: 'results/mocha-setup-env.txt',
          // Optionally suppress output to standard out (defaults to false)
          quiet: false,
          // Optionally clear the require cache before running tests
          // (defaults to false)
          clearRequireCache: false
        },
        src: [ // NOTE: Execution order is note relevant.
          'scripts/setup/*.js'
        ]
      },
      smoke: {
        options: {
          reporter: 'spec',
          // Optionally capture the reporter output to a file
          captureFile: 'results/mocha-smoke-test.txt',
          // Optionally suppress output to standard out (defaults to false)
          quiet: false,
          // Optionally clear the require cache before running tests
          // (defaults to false)
          clearRequireCache: false
        },
        src: [
          'suites/smoke/*.js'
        ]
      },
      regression: {
        options: {
          reporter: 'spec',
          // Optionally capture the reporter output to a file
          captureFile: 'results/mocha-full-regression-test.txt',
          // Optionally suppress output to standard out (defaults to false)
          quiet: false,
          // Optionally clear the require cache before running tests
          // (defaults to false)
          clearRequireCache: false
        },
        src: [
          'suites/**/2fa*.js',
          'suites/**/account*.js',
          'suites/**/activity*.js',
          'suites/**/apiKey*.js',
          'suites/**/app*.js',
          'suites/**/authenticate*.js',
          'suites/**/billingPlan*.js',
          'suites/**/billingStatement*.js',
          'suites/**/countr*.js',
          'suites/**/dashboard*.js',
          'suites/**/*omainConfig*.js',
          'suites/**/forgot*.js',
          'suites/**/location*.js',
          'suites/**/purge*.js',
          'suites/**/signUp*.js',
          'suites/**/sslCert*.js',
          'suites/**/stat*.js',
          'suites/**/stats-sdk*.js',
          'suites/**/user*.js',
          'suites/**/zenDeskArticle*.js',
          'suites/**/wafRules*.js'
        ]
      }
    },

    jshint: {
      test: {
        src: ['Gruntfile.js', '**/*.js'],
        options: {
          ignores: [
            'node_modules/**/*.js',
            'common/providers/schema/routes/config/*.js',
            'common/providers/schema/routes/models.js'
          ],
          reporter: require('jshint-html-reporter'),
          reporterOutput: 'results/jshint.html',
          jshintrc: '../.jshintrc'
        }
      }
    },

    docker: {
      options: {
        // These options are applied to all tasks
      },
      test: {
        // Specify `src` and `dest` directly on the task object
        src: [
          'common/**/*.js',
          'config/**/*.js',
          'setup/**/*.js',
          'suites/**/*.js'
        ],
        dest: 'docs/docker',
        options: {
          // ...
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-mocha-test');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-docker');
  grunt.loadNpmTasks('grunt-env');

  grunt.registerTask('default', [
    'clean',
    'jshint:test',
    'mochaTest:clean',
    'mochaTest:setup',
    'mochaTest:regression',
    'docker'
  ]);
  grunt.registerTask('test', [
    'clean',
    'jshint:test',
    'mochaTest:clean',
    'mochaTest:setup',
    'mochaTest:regression'
  ]);
  grunt.registerTask('smokeTest', [
    'clean',
    'jshint:test',
    'mochaTest:clean',
    'mochaTest:setup',
    'mochaTest:smoke'
  ]);
  grunt.registerTask('doc', ['clean', 'docker']);
};
