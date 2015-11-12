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
          // Optionally capture the reporter output to a file
          captureFile: 'test/rest_api/results/mocha.txt',
          // Optionally suppress output to standard out (defaults to false)
          quiet: false,
          // Optionally clear the require cache before running tests
          // (defaults to false)
          clearRequireCache: false
        },
        src: ['test/rest_api/**/*.js']
      },
      //  stats endpoint tests
      stats_smoke: {
        options: {
          reporter: 'spec'
        },
        src: ['test/rest_api/smoke/stats.js']
      },
      stats_top_smoke: {
        options: {
          reporter: 'spec'
        },
        src: ['test/rest_api/smoke/stats-top.js']
      },
      stats_top_objects_smoke: {
        options: {
          reporter: 'spec'
        },
        src: ['test/rest_api/smoke/stats-top-objects.js']
      },
      stats_lastmile_rtt_smoke: {
        options: {
          reporter: 'spec'
        },
        src: ['test/rest_api/smoke/stats-lastmile-rtt.js']
      },
      stats_top_negative: {
        options: {
          reporter: 'spec'
        },
        src: ['test/rest_api/negative/stats-top.js']
      },
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
  grunt.loadNpmTasks('grunt-mocha-test');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-docker');
  grunt.loadNpmTasks('grunt-env');

  grunt.registerTask('default', ['clean', 'jshint:test', 'mochaTest',
    'docker']);
  grunt.registerTask('test', ['clean', 'jshint:test', 'mochaTest']);
  grunt.registerTask('doc', ['clean', 'docker']);

  grunt.registerTask('stats_smoke', ['env', 'mochaTest:stats_smoke']);
  grunt.registerTask('stats_top_smoke', ['env', 'mochaTest:stats_top_smoke']);
  grunt.registerTask('stats_top_objects_smoke', ['env', 'mochaTest:stats_top_objects_smoke']);
  grunt.registerTask('stats_lastmile_rtt_smoke', ['env', 'mochaTest:stats_lastmile_rtt_smoke']);
  grunt.registerTask('stats_top_negative', ['env', 'mochaTest:stats_top_negative']);

};