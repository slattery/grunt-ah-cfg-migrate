# grunt-ah-cfg-migrate

> Migrate local config to an AH project

This is a plugin's plugin for [actionhero](https://github.com/evantahler/actionhero).   It takes your plugin's config blocks and merges them with the parent actionhero project's site config blocks, organized by runtime environment tokens.

## Installation and setup

This module requires [Grunt](http://gruntjs.com/).   You could go to github and install this within your actionhero plugin. 

```shell
git clone git@github.com:slattery/grunt-ah-cfg-migrate.git
cd  ./your/actionhero/plugin/srcdir
npm install ../path-to/grunt-ah-cfg-migrate --save
```

Once the module has been installed, it may be enabled inside the Gruntfile of your actionhero plugin or module with this line of JavaScript:

```js
grunt.loadNpmTasks('grunt-ah-cfg-migrate');
```

### The "migrateconfigs" task

In your project's Gruntfile, add a section named `migrateconfigs` to the data object passed into `grunt.initConfig()`.

```js
module.exports = function(grunt) {

	grunt.initConfig({
			migrateconfigs: {
				configs: {
					files: [{
						src: ['config/**/*.js'],
					}],
					dstprefix : '/../../'
				},	
			}
	});

	grunt.loadNpmTasks('grunt-ah-cfg-migrate');
};
```

### Options

#### configs.files.src
Type: `Globbing Pattern`
Default value: `'['config/**/*.js']'`

The above string means look in the "config" directory of the plugin or module you are installing to your actionhero project, and grab all the files that end in ".js".   We assume that this config directory will map to the parent project's "config" directory.  We will use these files to scoop up the config blocks for one or more actionhero runtime environments, add them to corresponding files when those files exist, update the blocks within the target files if those blocks exist, or simply create the new file if there is no corresponding target file.

#### configs.dstprefix
Type: `String`
Default value: `'/../../'`

The destination prefix helps this script find the parent project "config" directory.   We don't use a source prefix variable at the moment, we assume the plugin's config directory is at the root of the plugin directory.

### Usage Examples
Once you have your Gruntfile done, and making sure your plugin's `package.json` has this module as a dependency, you can ask grunt-ah-cfg-migrate to perform your migration anytime by visiting your plugin's directory and using `grunt migrateconfigs`.   I like to ask npm to do this for me after my plugin is installed in the actionhero parent project.   This way you can update your configs in your plugin's source, ask npm to reinstall, and your code and configs happen on npm update, etc.

```js
  "scripts": {
    "postinstall": "grunt migrateconfigs"
  },
```

## Assumptions
Right now we assume a lot of things: that your paths are going to start at `./config`:

```
AH plugin:
===========================
├── README.md
├── actions
├── config
│   ├── api.js
│   ├── faye.js
│   ├── redis.js
│   ├── servers
│   │   └── web.js
│   └── stats.js
├── gruntfile.js
├── initializers
├── node_modules
├── package.json
└── scripts

Parent Project:
===========================
├── README.md
├── actions
├── config
│   ├── api.js
│   ├── errors.js
│   ├── faye.js
│   ├── logger.js
│   ├── redis.js
│   ├── servers
│   │   ├── socket.js
│   │   ├── web.js
│   │   └── websocket.js
│   ├── stats.js
│   ├── tasks.js
├── gruntfile.js
├── package.json
(and so on...)
```

We assume that your parent project and your plugin or module has config blocks that are listed separately.   We assume that your `require()` statements and comments are within each block's anonymous function call.

Like this:
( pretend we're in the plugin's config/faye.js )
```js
exports.singlebox = {
// extend timeout for faye
  faye: function(api){
		var fivehunnert = require('cinco-to-the-second-power');
		return {
    	timeout: fivehunnert
    }
  }
};

exports.clustered = {
  faye: function(api){
  return {
    	timeout: 500
    }
  }
};
```

Not like this:
( keep pretending we're in the plugin's config/faye.js )
```js
// extend timeout for faye
var fivehunnert = require('cinco-to-the-second-power');

exports = {
	singlebox : {
		faye: function(api){
			return {
				timeout: fivehunnert
			}
		}
  },
 	clustered : {
		faye: function(api){
			return {
				timeout: 500
			}
		}
  } 
};
```

## Contributing
we'll fumble though github together.

## Release History
0.1.0  This is the first ever release.  It's beta quality with maybe too much hardcoding going on.

## Background

[actionhero](http://actionherojs.com) is nice.   It is an API first framework that doesn't try to "help" you with frontend templating, etc.   It just wants to help you provide the same API over as many channels as you want: HTTP/AJAX, HTTP/Websockets, REPL via a socket, whatever.   actionhero allows the definition of runtime environments.    by setting `NODE_ENV` you could run your actionhero project in "test" mode, "qa" mode, "production" mode, whatever.     We have different deployment needs for our VMs and dev vs production, so our environments are "singlebox", "cluster" and the like.

In past versions, actionhero would let you drop a file in the "config" directory with the name of a runtime environment.   You drop one file with the name of your runtime env for all the parts (web,redis,faye,etc), set NODE_ENV to the same name, and those config values would take precedence.   With v8.x that changed, and the files load in sort order (alpha, taking on children before moving on within the root).   So your web block for 'exports.singlebox' would not load last since it lived in the 'environments' directory.   'faye.js', 'redis.js' 'servers/web.js', etc. would load and merge afterward so the defaults would clobber the environment settings.  (Renaming 'environments' to 'zenvironments' did work, but that's not sporting.)

So we needed to reach up to the parent project files and add our environment config blocks to the existing files.    The positive fact that configs are .js files and not pure JSON turned into a challenge.   We can't just swap out keys in JSON doing a simple `require()` and an overwrite.   Down the line (not in 0.1.0) we may have to grab require statements from the top of a file, and the blocks, and move them all.   Our solution was to break both sides into [AST](http://esprima.org/doc/index.html#ast) with the help of [esprima](http://esprima.org/), then merge the blocks using [escodegen](https://github.com/Constellation/escodegen), and [node-falafel](https://github.com/substack/node-falafel).
