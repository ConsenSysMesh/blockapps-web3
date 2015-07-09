factory = (web3, XMLHttpRequest, blockapps, tx_util) ->

  class BlockAppsWeb3Provider
    class BlockFilter
      contructor: (@provider) ->
        @provider.eth_blockNumber (err, number) =>
          throw err if err?
          @block_number = web3.toDecimal(number)

      getChanges: () ->


    # accounts is a hash where the key is the address and
    # the value is the private key.
    constructor: (options={}) ->
      @coinbase = options.coinbase
      @accounts = options.accounts || {}
      @host = options.host || "http://stablenet.blockapps.net"

      if Object.keys(@accounts).length == 0
        throw new Error("At least one account and private key must be passed to BlockAppsWeb3Provider.")

      # Derive a coinbase if none is set.
      if !@coinbase?
        @coinbase = Object.keys(@accounts)[0]

      @filter_index = 0
      @filters = {}

    send: (payload) ->
      throw new Error("BlockAppsWeb3Provider does not support synchronous methods. Please provide a callback.")

    # sendAsync acts as the director with which we call blockapps functions based
    # on RPC functions, and then wrap up the result to look like a JSON rpc response.
    # This is our hook into web3 -- all the other functions support this one.
    sendAsync: (payload, callback) ->
      # Provider functions are expected to be named exactly like their
      # analogous web3 methods.
      method = payload.method
      if !@[method]?
        callback(new Error("BlockAppsWeb3Provider does not yet support the Web3 method '#{method}'."))
        return

      args = payload.params

      # Push a callback function to wrap up the response into
      # what web3 expects.
      args.push (err, result) ->
        wrapped = {
          id: payload.id
          jsonrpc: payload.jsonrpc
          result: result
        }

        callback err, wrapped

      # Call the function associated with the RPC method.
      @[method].apply(@, args)

    # Make the actual requests to the BlockApps backend.
    requestFromBlockApps: (path, params, callback) ->
      if typeof params == "function"
        callback = params
        params = null

      request = new XMLHttpRequest()

      request.onreadystatechange = ->
        if request.readyState == 4
          result = request.responseText
          error = null
          try
            result = JSON.parse(result)
          catch e
            error = e
          callback error, result
        return

      type = if params? then "POST" else "GET"

      request.open type, "#{@host}#{path}", true
      #request.setRequestHeader 'Content-type', 'application/json'
      request.setRequestHeader "Content-type", "application/x-www-form-urlencoded"

      param_string = ""

      for key, value of params
        if param_string != ""
          param_string += "&"

        param_string += "#{key}=#{encodeURIComponent(value)}"

      try
        request.send param_string
      catch error
        callback error
        # TODO: Make this error a web3 error, a la:
        # callback errors.InvalidConnection(@host)

    # We have to make three requests to get all the data we need
    # for many transaction-related calls.
    requestTransactionData: (tx_hash, callback) ->
      tx_hash = @strip0x(tx_hash)

      @requestFromBlockApps "/query/transaction?hash=#{tx_hash}", (err, tx_result) =>
        if err?
          callback err
          return

        if tx_result.length == 0
          callback null, null
          return

        tx = tx_result[0]

        # Get the block so we can get information about the transaction.
        @requestFromBlockApps "/query/block?number=#{tx.blockNumber}", (err, block_result) =>
          if err?
            callback err
            return

          if block_result.length == 0
            callback null, null
            return

          block = block_result[0]

          # Ensure the contract was actually created.
          @requestFromBlockApps "/transactionResult/#{tx_hash}", (err, txinfo_result) =>
            if err?
              callback err
              return

            if txinfo_result.length == 0
              callback null, null
              return

            txinfo = txinfo_result[0]

            callback(null, tx, block, txinfo)

    strip0x: (string) ->
      return string.replace("0x", "")


    ############## Web3 Methods ##############

    eth_coinbase: (callback) ->
      callback null, @coinbase

    eth_accounts: (callback) ->
      callback null, Object.keys(@accounts)

    eth_blockNumber: (callback) ->
      @requestFromBlockApps "/query/block/last/1", (err, response) ->
        if err?
          callback err
          return

        if response.length == 0
          throw new Error("Couldn't find last block at /query/block/last/1. Please make ensure BlockApps is running properly.")

        block = response[0]

        callback null, web3.fromDecimal(block.blockData.number)
        
    eth_getTransactionCount: (address, block_number="latest", callback) ->
      address = @strip0x(address)

      # TODO: Follow `next` pages, if any. Not implemented because I haven't seen any.
      @requestFromBlockApps "/query/transaction?address=#{address}", (err, result) ->
        if err?
          callback err
          return

        callback null, result.length

    eth_getTransactionByHash: (tx_hash, callback) ->
      @requestTransactionData tx_hash, (err, tx, block, txinfo) ->
        if err?
          callback err
          return

        # Transaction is pending, or incomplete, or never made it.
        if !tx? or !block? or !txinfo?
          callback()
          return

        # Get the transaction index by comparing transactions r, s and v values.
        index = 0
        for transaction, i in block.receiptTransactions
          if transaction.r == tx.r and transaction.s == tx.s and transaction.v == tx.v
            index = i
            break

        returnVal = {
          hash: "0x" + tx.hash
          nonce: web3.fromDecimal(tx.nonce)
          blockHash: "0x" + txinfo.blockHash
          blockNumber: web3.fromDecimal(tx.blockNumber)
          transactionIndex: web3.fromDecimal(index)
          from: "0x" + tx.from
          gasPrice: web3.fromDecimal(tx.gasPrice)
          gas: web3.fromDecimal(block.blockData.gasUsed) # TODO: is this right? 
          value: web3.fromDecimal(tx.value)
          input: "0x" + tx.codeOrData
        }

        if tx.to?
          returnVal.to = tx.to

        callback null, returnVal



    # Only support the latest block_number for now.
    # TODO: Support block numbers with eth_getBalance
    eth_getBalance: (address, block_number="latest", callback) ->
      address = @strip0x(address)

      @requestFromBlockApps "/query/block?address=#{address}", (err, response) ->
        if err?
          callback err
          return

        if response.length == 0
          callback null, 0
          return

        callback null, response[response.length - 1].balance

    eth_getCode: (contract_address, block_number="latest", callback) ->
      contract_address = @strip0x(contract_address)

      @requestFromBlockApps "/query/block?address=#{contract_address}", (err, response) ->
        if err?
          callback err
          return

        if response.length == 0
          callback null, null
          return

        callback null, "0x" + response[response.length - 1].code

    eth_getCompilers: (callback) ->
      callback null, ["solidity"]

    eth_compileSolidity: (src="", callback) ->
      @requestFromBlockApps "/solc", {src: src}, (err, response) ->
        if err?
          callback err
          return

        callback null, {
          code: response.contracts[response.contracts.length - 1].bin
          info: 
            source: src
            language: "Solidity"
            languageVersion: "0"
            compilerVersion: "0"
            abiDefinition: response.abis[response.abis.length - 1].abi
            userDoc: 
              methods: {}
            developerDoc: 
              methods: {}
        }

    eth_sendTransaction: (tx={}, callback) ->
      if !tx.from?
        callback new Error("'from' not found, is required")
        return

      private_key = @accounts[tx.from]

      if !private_key?
        callback new Error("Could not find private key for account: #{tx.from}")
        return

      # Get the address's nonce.
      @requestFromBlockApps "/query/account?address=#{tx.from}", (err, response) =>
        if err?
          callback err
          return

        # Expect response to be an array
        if response.length >= 1
          nonce = response[response.length - 1].nonce
        else
          nonce = 0

        url = "#{@host}/includetransaction"

        # pushTX does its own translation from decimal to hex, as does web3.
        # Which means we have to translate *back* to decimal before sending to pushTX...
        tx.gasLimit = web3.toDecimal(tx.gasLimit)
        tx.gasPrice = web3.toDecimal(tx.gasPrice)

        blockapps.pushTX nonce, tx.gasPrice, tx.gasLimit, tx.to, tx.value, tx.data, private_key, url, (tx_response) ->
          tx_hash = "0x" + tx_response.replace(/.*=/, "")
          callback null, tx_hash


    eth_getTransactionReceipt: (tx_hash, callback) ->
      @requestTransactionData tx_hash, (err, tx, block, txinfo) ->
        if err?
          callback err
          return

        # Transaction is pending, or incomplete, or never made it.
        if !tx? or !block? or !txinfo?
          callback()
          return

        # Get the transaction index by comparing transactions r, s and v values.
        index = 0
        for transaction, i in block.receiptTransactions
          if transaction.r == tx.r and transaction.s == tx.s and transaction.v == tx.v
            index = i
            break

        returnVal = {
          blockNumber: web3.fromDecimal(tx.blockNumber)
          transactionHash: "0x" + tx.hash
          transactionIndex: web3.fromDecimal(index)
          from: "0x" + tx.from
          cumulativeGasUsed: web3.fromDecimal(block.blockData.gasUsed)
          gasUsed: web3.fromDecimal(0) # TODO: Make this right.
          logs: [] # TODO: Is there anywhere to get these?
        }

        if tx.to?
          returnVal.to = "0x" + tx.to

        expected_address = tx_util.generateAddress(tx.from, parseInt(tx.nonce + 1)).toString('hex')

        # If the VM trace doesn't include the expected address, then the
        # transaction hasn't been processed yet.
        if !txinfo.trace.indexOf(expected_address)
          callback null, null
          return

        returnVal.blockHash = "0x" + txinfo.blockHash
        returnVal.contractAddress = "0x" + expected_address

        callback err, returnVal

    eth_newBlockFilter: (callback) ->
      filter = new BlockFilter(@)

      @filter_index += 1
      @filters[@filter_index] = filter
      callback null, web3.fromDecimal(@filter_index)

    eth_uninstallFilter: (filter_id, callback) ->
      filter_id = web3.toDecimal(filter_id)
      filter = @filters[filter_id]

      if !filter?
        callback null, false
        return

      delete @filters[filter_id]
      callback null, true

    web3_clientVersion: (callback) ->
      callback null, "BlockApps Web3 Provider/0.0.1/JavaScript"



  BlockAppsWeb3Provider

# Note, in both cases, api and util are made available by the build system.
# This is a bit gross, and should eventually be better (with better, less common names).
if module? and module.exports?
  module.exports = factory(require("web3"), require("xmlhttprequest"), api, util)
else
  # We expect web3 to already be included.
  window.BlockAppsWeb3Provider = factory(web3, XMLHttpRequest, api, util)