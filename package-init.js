/* jshint ignore:start */

// Meteor environment
if (typeof Package !== 'undefined') {
  /*global async:true*/  // Meteor.js creates a file-scope global for exporting. This comment prevents a potential JSHint warning.
  BlockAppsWeb3Provider = Npm.require("blockapps-web3")

  // Node environment
} else if(typeof global !== 'undefined') {
    BlockAppsWeb3Provider = (typeof global.BlockAppsWeb3Provider !== 'undefined') ? global.BlockAppsWeb3Provider : require('blockapps-web3');
}

/* jshint ignore:end */
