Package.describe({
  name: 'consensys:blockapps-web3',
  summary: 'Web3 provider that adds hooks for an external transaction signer',
  version: "0.0.7",
  documentation: 'README.md',
  git: "https://github.com/ConsenSys/blockapps-web3"
});

Npm.depends({
  "blockapps-web3": "0.1.0",
  "ethereumjs-tx": "0.5.4",
  "web3": "0.12.2",
  "bignumber.js": "2.0.7"
});

Package.on_use(function (api) {
  api.versionsFrom('METEOR@0.9.3');

  api.add_files('package-init.js', ['server']);

  // symbol exports
  api.export('BlockAppsWeb3Provider','server');
});
