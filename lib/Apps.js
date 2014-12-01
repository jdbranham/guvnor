var Autowire = require('wantsit').Autowire,
  util = require('util'),
  Actions = require('./Actions'),
  Table = require('./Table')

var Apps = function() {
  Actions.call(this)

  this._user = Autowire
  this._processes = Autowire
}
util.inherits(Apps, Actions)

Apps.prototype.deployApplication = function(name, url, options) {
  this._do(options, function(boss) {
    var user = options.user || this._user.name

    boss.deployApplication(name, url, user, console.info, console.error,
      function(error) {
        if(error) throw error

        boss.disconnect()
      })
  }.bind(this))
}

Apps.prototype.listApplications = function(options) {
  this._do(options, function(boss) {
    boss.listApplications(function(error, deployedApplications) {
      if(error) throw error

      var table = new Table('No applications have been deployed')
      table.addHeader(['Name', 'User', 'URL'])

      deployedApplications.forEach(function(app) {
        table.addRow([app.name, app.user, app.url])
      })

      table.print(console.info)

      boss.disconnect()
    })
  }.bind(this))
}

Apps.prototype.removeApplication = function(name, options) {
  this._do(options, function(boss) {
    boss.removeApplication(name, function(error) {
      if(error) throw error

      boss.disconnect()
    })
  }.bind(this))
}

Apps.prototype.runApplication = function(name, ref, options) {
  ref = ref || 'master'

  this._do(options, function(boss) {
    boss.switchApplicationRef(name, ref, console.info, console.error,
      function(error, applicationInfo) {
        if(error) throw error

        options.name = name

        this._processes.start(applicationInfo.path, options)
      }.bind(this))
  }.bind(this))
}

Apps.prototype.listRefs = function(name, options) {
  this._do(options, function(boss) {
    boss.listApplicationRefs(name, function(error, refs) {
      if(error) throw error

      var table = new Table(name + ' has no refs')
      table.addHeader(['Name', 'Commit'])

      refs.forEach(function(ref) {
        table.addRow([ref.name, ref.commit])
      })

      table.print(console.info)

      boss.disconnect()
    })
  }.bind(this))
}

Apps.prototype.updateRefs = function(name, options) {
  this._do(options, function(boss) {
    boss.updateApplicationRefs(name, console.info, console.error, function(error, refs) {
      if(error) throw error

      var table = new Table(name + ' has no refs')
      table.addHeader(['Name', 'Commit'])

      refs.forEach(function(ref) {
        table.addRow([ref.name, ref.commit])
      })

      table.print(console.info)

      boss.disconnect()
    })
  }.bind(this))
}

module.exports = Apps