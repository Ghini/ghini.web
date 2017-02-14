var path = require("path");

module.exports = function(grunt) {
  // Project configuration.
  grunt.initConfig({
    qunit: {
      files: ['test/test.html'],
      options: {
        inject: [
          path.resolve("test/coverage-bridge.js"),
          require.resolve("grunt-contrib-qunit/phantomjs/bridge")
        ],
        '--web-security': 'no'
      }
    },
    instrument: {
      files: 'public/js/*.js',
      options: {
        lazy: false,
        basePath: 'coverage/instrumented/'
      }
    },
    copy: {
      // Moves files around during coverage runs
      "save-origs": {
        src: "public/js/cuchubo.js",
        dest: "public/js/cuchubo.tmp.js"
      },
      "instrumented-to-origs": {
        src: "coverage/instrumented/public/js/cuchubo.js",
        dest: "public/js/cuchubo.js"
      },
      "restore-origs": {
        src: "public/js/cuchubo.tmp.js",
        dest: "public/js/cuchubo.js"
      }
    },
    makeReport: {
      src: 'coverage/reports/**/*.json',
      options: {
        type: 'lcov',
        dir: 'coverage/reports',
        print: 'detail'
      }
    },
    coveralls: {
      options: { // Options relevant to all targets 
        force: false
      },
      qunit: { // 
        src: 'coverage/reports/lcov.info',
        options: { // Any options for just this target 
        }
      }
    }
  });

  grunt.event.on("qunit.coverage", function(coverage) {
    var reportPath = "coverage/reports/ghini/coverage.json";

    // Create the coverage file
    grunt.file.write(reportPath, JSON.stringify(coverage));
  });
    
  // Load plugins
  grunt.loadNpmTasks('grunt-contrib-qunit');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-istanbul');
  grunt.loadNpmTasks('grunt-coveralls');

  // Task to run tests
  grunt.registerTask('test', 'qunit');
  grunt.registerTask('coverage', [
    'test',  // run first plain: if anything is wrong we stop here
    'instrument',
    'copy:save-origs',
    'copy:instrumented-to-origs',
    'test',
    'copy:restore-origs',
    'makeReport',
    'coveralls']);
};
