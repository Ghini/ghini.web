module.exports = function(grunt) {
    // Project configuration.
    grunt.initConfig({
        qunit: {
            files: ['public/test/test.html'],
            options: {
                '--web-security': 'no',
                coverage: {
                    disposeCollector: true,
                    src: ['public/js/cuchubo.js'],
                    instrumentedFiles: 'temp/',
                    htmlReport: 'report/coverage/',
                    lcovReport: "report/lcov",
                    coberturaReport: 'report/'
                }
            },
        },
        coveralls: {
            // Options relevant to all targets 
            options: {
                // When true, grunt-coveralls will only print a warning rather than 
                // an error, to prevent CI builds from failing unnecessarily (e.g. if 
                // coveralls.io is down). Optional, defaults to false. 
                force: false
            },
    
            ghini_web: {
                // LCOV coverage file (can be string, glob or array) 
                src: 'report/lcov/lcov.info',
                options: {
                    // Any options for just this target 
                }
            },
        },
    });

    // Load plugins
    grunt.loadNpmTasks('grunt-contrib-qunit');
    grunt.loadNpmTasks('grunt-qunit-istanbul');
    
    // Task to run tests
    grunt.registerTask('test', 'qunit');
};
