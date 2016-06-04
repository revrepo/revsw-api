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
      test: {
        options: {
          reporter: 'spec',
          // Optionally capture the reporter output to a file
          captureFile: 'results/mocha.txt',
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
          // Cleaning up env.
          'setup/apiKeys.js',
          'setup/apps.js',
          'setup/billingPlans.js',
          'setup/dashboards.js',
          'setup/domainConfigs.js',
          'setup/sslCerts.js',
          'setup/accounts.js',
          'setup/users.js'
        ]
      },
    },

    jshint: {
      test: {
        src: ['Gruntfile.js', '**/*.js'],
        options: {
          ignores: ['node_modules/**/*.js'],
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

  grunt.registerTask('default', ['clean', 'jshint:test', 'mochaTest',
    'docker']);
  grunt.registerTask('test', ['clean', 'jshint:test', 'mochaTest']);
  grunt.registerTask('doc', ['clean', 'docker']);
};
