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
          'suites/**/account*.js', // Accounts specs
          'suites/**/*omainConfig*.js', // DomainConfigs specs
          'suites/**/stat*.js', // Stats specs
          // Cleaning up env.
          'setup/domainConfigs.js',
          'setup/accounts.js'
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
