module.exports = function (grunt) {

  grunt.initConfig({

    pkg: grunt.file.readJSON('package.json'),

    clean: [
      'dist',
      'test/rest_api/coverage',
      'test/rest_api/docs',
      'test/rest_api/results'
    ],

    mochaTest: {
      test: {
        options: {
          reporter: 'spec',
          // Optionally capture the reporter output to a file
          captureFile: 'test/rest_api/results/mocha.txt',
          // Optionally suppress output to standard out (defaults to false)
          quiet: false,
          // Optionally clear the require cache before running tests
          // (defaults to false)
          clearRequireCache: false
        },
        src: ['test/rest_api/**/*.js']
      }
    },

    jshint: {
      files: ['Gruntfile.js', 'src/**/*.js', 'test/rest_api/**/*.js'],
      options: {
        reporter: require('jshint-html-reporter'),
        reporterOutput: 'test/rest_api/results/jshint.html',
        jshintrc: true
      }
    },

    docker: {
      options: {
        // These options are applied to all tasks
      },
      test: {
        // Specify `src` and `dest` directly on the task object
        src: ['test/rest_api/**/*.js'],
        dest: 'test/rest_api/docs/docker',
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

  grunt.registerTask('default', ['clean', 'jshint', 'mochaTest', 'docker']);
  grunt.registerTask('test', ['clean', 'jshint', 'mochaTest']);
  grunt.registerTask('doc', ['clean', 'docker']);
};
