var async = require('async')
var connectToProcess = require('./connect-to-process')
var logger = require('winston')
var operations = require('../../')
var PROCESS_STATUS = require('../../../common/process-status')

function unique (array) {
  var output = {}

  array.forEach(function (item) {
    output[item] = true
  })

  return Object.keys(output)
}

module.exports = function findProcessStatus (user, proc, callback) {
  if (proc.status !== PROCESS_STATUS.RUNNING) {
    return callback(null, proc)
  }

  connectToProcess(user, proc, function (error, remote, disconnect) {
    if (error) {
      logger.warn(' Error connecting to process ' + proc.name)
      logger.warn(error)

      if (error.code === 'ENOENT') {
        // could not find socket
        error = null
        proc.status = 'unknown'
      } else if (error.code === 'ECONNREFUSED') {
        // socket is closed
        error = null
        proc.status = 'stopped'
      }

      return callback(error, proc)
    }

    remote.reportStatus(function (error, results) {
      disconnect()

      var status = 'running'

      if (error) {
        if (typeof error === 'string' || error instanceof String) {
          error = new Error(error.trim())
        }

        logger.warn('Error reporting status for process ' + proc.name)
        logger.warn(error)

        status = 'error'
      }

      results = results || {}

      var uids = unique([results.master.uid].concat(results.workers.map(function (worker) {
        return worker.uid
      })))

      var gids = unique([results.master.gid].concat(results.workers.map(function (worker) {
        return worker.gid
      })))

      async.parallel({
        users: function (next) {
          var tasks = {}

          uids.forEach(function (uid) {
            tasks[uid] = operations.findUserDetails.bind(null, user, uid)
          })

          async.parallel(tasks, next)
        },
        groups: function (next) {
          var tasks = {}

          gids.forEach(function (gid) {
            tasks[gid] = operations.findGroupDetails.bind(null, user, gid)
          })

          async.parallel(tasks, next)
        }
      }, function (error, info) {
        if (!error) {
          results.master.user = info.users[results.master.uid].name
          results.master.group = info.groups[results.master.gid].name

          results.workers.forEach(function (worker) {
            worker.user = info.users[worker.uid].name
            worker.group = info.groups[worker.gid].name
          })

          proc.status = status
          proc.master = results.master
          proc.workers = results.workers
        }

        callback(error, proc)
      })
    })
  })
}