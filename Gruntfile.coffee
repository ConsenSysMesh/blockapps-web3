module.exports = (grunt) ->
  grunt.initConfig
    pkg: grunt.file.readJSON('package.json')
    clean: 
      build: ["build/"]
    coffee:
      build:
        options: 
          join: true
        files:
          "build/<%= pkg.name %>.js": ['src/**/*.coffee']
    concat: 
      build: 
        src: [
          "src/pushtx.js" 
          "build/<%= pkg.name %>.js"
        ]
        dest: "build/<%= pkg.name %>.js"
    uglify:
      options: banner: '/*! <%= pkg.name %> <%= grunt.template.today("dd-mm-yyyy") %> */\n'
      build: 
        files: 
          'build/<%= pkg.name %>.min.js': [
            "build/<%= pkg.name %>.js"
          ]
    watch: 
      build: 
        files: ["./src/**/*", "./Gruntfile.coffee"] 
        tasks: ["default"] 
        options: 
          interrupt: true
          spawn: false
          atBegin: true

  grunt.loadNpmTasks 'grunt-contrib-clean'
  grunt.loadNpmTasks 'grunt-contrib-coffee'
  grunt.loadNpmTasks 'grunt-contrib-uglify'
  grunt.loadNpmTasks 'grunt-contrib-concat'
  grunt.loadNpmTasks 'grunt-contrib-watch'
  grunt.registerTask 'default', [
    'clean'
    'coffee'
    'concat'
  ]
  grunt.registerTask 'dist', [
    'default'
    'uglify'
  ]
  return