module.exports = function (grunt) {

  grunt.initConfig({

    pkg: grunt.file.readJSON('package.json'),

    clean: ['dist', 'test/rest_api/results', 'test/rest_api/coverage'],

    //concat: {
    //  options: {
    //    separator: ';'
    //  },
    //  dist: {
    //    src: ['src/**/*.js'],
    //    dest: 'dist/<%= pkg.name %>.js'
    //  }
    //},

    //uglify: {
    //  options: {
    //    banner: '/*! <%= pkg.name %> ' +
    //    '<%= grunt.template.today("dd-mm-yyyy") %> */\n'
    //  },
    //  dist: {
    //    files: {
    //      'dist/<%= pkg.name %>.min.js': ['<%= concat.dist.dest %>']
    //    }
    //  }
    //},

    //env: {
    //  coverage: {
    //    APP_DIR_FOR_CODE_COVERAGE: '../test/rest_api/coverage/instrument/src/'
    //  }
    //},

    instrument: {
      files: ['src/*.js'],
      options: {
        lazy: true,
        basePath: 'test/rest_api/coverage/instrument/'
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
      }
    },

    storeCoverage: {
      options: {
        dir: 'test/rest_api/coverage/reports'
      }
    },

    makeReport: {
      src: 'test/rest_api/results/coverage/reports/**/*.json',
      options: {
        type: 'lcov',
        dir: 'test/rest_api/results/coverage/reports',
        print: 'detail'
      }
    },

    jshint: {
      files: ['Gruntfile.js', 'src/**/*.js', 'test/rest_api/**/*.js'],
      options: {
        // options here to override JSHint defaults
        //reporter: require('jshint-stylish'),
        reporter: require('jshint-html-reporter'),
        reporterOutput: 'test/rest_api/results/index.html',
        jshintrc: true/*,
         curly: true,
         eqeqeq: true,
         undef: true,
         globals: {
         jQuery: true,
         module: true,
         require: true,
         window: true,
         console: true,
         document: true
         }*/
      }
    }//,

    //watch: {
    //  files: ['<%= jshint.files %>'],
    //  tasks: ['jshint']
    //},

    //docco: {
    //  debug: {
    //    src: ['test/rest_api/**/*.js'],
    //    options: {
    //      output: 'docs/'
    //    }
    //  }
    //},

    //groc: {
    //  javascript: [
    //    'test/rest_api/**/*.js', 'README.md'
    //  ],
    //  options: {
    //    'out': 'doc/'
    //  }
    //}
  });

  grunt.loadNpmTasks('grunt-contrib-clean');
  //grunt.loadNpmTasks('grunt-contrib-concat');
  //grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-istanbul');
  grunt.loadNpmTasks('grunt-mocha-test');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  //grunt.loadNpmTasks('grunt-contrib-watch');
  //grunt.loadNpmTasks('grunt-docco');
  //grunt.loadNpmTasks('grunt-groc');


  grunt.registerTask('test', ['clean', 'jshint', 'mochaTest']);
  grunt.registerTask('coverage', ['clean', /*'env:coverage',*/ 'instrument',
    'mochaTest', 'storeCoverage', 'makeReport']);
  grunt.registerTask('default', ['clean', 'jshint',
    'mochaTest'/*, 'concat', 'uglify'*/]);
};
