/*
 * grunt-ah-cfg-migrate
 * https://github.com/slattery/grunt-ah-cfg-migrate
 *
 * Copyright (c) 2014 slattery
 * Licensed under the MIT license.
 */
'use strict';

var grunt = require('grunt'),
  fs = require('fs'),
  path = require('path'),
  resolve = require('path').resolve,
  mkdirp = require('mkdirp'),
  esprima = require('esprima'),
  escodegen = require('escodegen'),
  falafel = require('falafel'),
  chalk = require('chalk');



module.exports = function (grunt) {

  grunt.registerMultiTask('migrateconfigs',
    'add/edit AH project config files',
    function () {

      var c = grunt.config.get();
      var files = this.filesSrc;
      grunt.log.writeln('Processing ' + files.length + ' files.');


      files.forEach(function (file) {
        var srcfile = resolve(file);
        var stats = fs.statSync(srcfile);
        if (stats.size > 0) {
          var tok, str, input, output, processed;
          var env_tokens = new Array();
          var envdstdir = path.normalize(process.cwd() + c.migrateconfigs.configs.dstprefix);
          var envdst = path.normalize(envdstdir + file);
          var srctext = fs.readFileSync(srcfile, "utf8");
          var dsttext = fs.readFileSync(envdst, "utf8");

          //get input in order to get env variable
          input = falafel(srctext, function (node) {
            if (
              node.type === 'MemberExpression' && node.object.name == 'exports'
            ) {
              tok = node.property.name;
              str = node.parent.source();
              env_tokens.push({
                "token": tok,
                "payload": str
              });
              //NOTE: payload gets parent, not doc so requires
              // and comment must be in function calls in parent.
            }
          });

          // if we have something to update, keep going				
          for (var i = 0, limit = env_tokens.length;
            (i < limit); i++) {
            var token = env_tokens[i].token;
            var payload = env_tokens[i].payload;

            // does the destination file exist? if so parse, if not, write and return
            if (grunt.file.exists(envdst)) {
              output = falafel(dsttext, function (node) {
                if (
                  node.type === 'MemberExpression' && node.object.name == 'exports' && node.property.name == token
                ) {
                  //NOTE, not taking in top-of-file requires or comments								
                  node.parent.update(payload);
                  processed = true;
                  grunt.log.writeln('File ' + chalk.green(file) + ' exists, key ' + token + ' found and updated');
                }
              });

              if (!processed) {

                grunt.log.writeln('File ' + chalk.blue(file) + ' is there, no match for ' + token + ' key, appending.');

                var dstast = esprima.parse(dsttext);
                var payast = esprima.parse(payload);
                dstast.body.push(payast);
                output = escodegen.generate(dstast);
              } // was this updated or do we append?

            } else {
              grunt.log.writeln('File ' + chalk.blue(file) + ' is not there, copying src file to destination');

              mkdirp(envdstdir);
              output = payload;
            } // is this is a fresh file or edit?

            grunt.file.write(envdst, output);
            grunt.log.writeln('File ' + chalk.green(file) + ' merged with parent project');

          } // if env token found
        } // if srcfile is non-zero
      });
    });
};