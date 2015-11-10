module.exports = function (grunt) {

  grunt.initConfig({

    pkg: grunt.file.readJSON('package.json'),

    clean: [
      'dist',
      'test/rest_api/coverage',
      'test/rest_api/docs',
      'test/rest_api/results'
    ],

    env: {
      test: {
        NODE_ENV: 'qa',
        NODE_CONFIG_DIR: './test/rest_api/config/'
      }
    },

    mochaTest: {
      test: {
        options: {
          reporter: 'spec',
          // captureFile: 'test/rest_api/results/mocha.txt',
          // quiet: false,
          // clearRequireCache: false
        },
        src: ['test/rest_api/**/*.js']
      },
      smoke: {
        options: { reporter: 'spec' },
        src: ['test/rest_api/smoke/*.js']
      },
      boundary: {
        options: { reporter: 'spec' },
        src: ['test/rest_api/boundary/*.js']
      }
    },

    jshint: {
      test: {
        src: ['Gruntfile.js', 'test/rest_api/**/*.js'],
        options: {
          reporter: require('jshint-html-reporter'),
          reporterOutput: 'test/rest_api/results/jshint.html',
          jshintrc: 'test/.jshintrc'
        }
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
  grunt.loadNpmTasks('grunt-env');
  grunt.loadNpmTasks('grunt-mocha-test');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-docker');

  grunt.registerTask('default', ['clean', 'jshint:test', 'mochaTest']);
  grunt.registerTask('test', ['clean', 'jshint:test', 'env', 'mochaTest']);
  grunt.registerTask('smoke', ['env', 'mochaTest:smoke']);
  grunt.registerTask('doc', ['clean', 'docker']);
};
