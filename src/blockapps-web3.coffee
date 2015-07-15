factory = (web3, XMLHttpRequest, BigNumber, EthTx, Buffer, ethUtil) ->

  class BlockFilter
    constructor: (@provider) ->
      @provider.eth_blockNumber (err, number) =>
        throw err if err?
        @block_number = web3.toDecimal(number)

    getChanges: (callback) ->
      @provider.eth_blockNumber (err, finish_number) =>
        if err?
          callback err
          return

        finish_number = web3.toDecimal(finish_number)

        # if finish_number < @block_number + 1
        #   callback null, []
        #   return

        @getBlockHashesRecursively [], @block_number, finish_number, (err, hashes) =>
          if err?
            callback err
            return

          # We're done finding hashes. Update the block filter with the newest number.
          #if hashes.length > 0
          #  @block_number = finish_number

          callback(null, hashes)

    getBlockHashesRecursively: (hashes, current_number, finish_number, callback) ->
      @getBlockHash current_number, (err, hash) =>
        if err?
          callback err
          return
        
        if hash?
          hashes.push hash

        # We've gone as far as we can now. Stop.
        if current_number >= finish_number or !hash?
          callback(null, hashes)
          return

        @getBlockHashesRecursively hashes, current_number + 1, finish_number, callback

    getBlockHash: (block_number, callback) ->
      # Request the next block so we can get the parent hash.

      ###############################################################################
      ############################### BIG DIRTY HACK! ###############################
      ###############################################################################

      # Explanation: When you query blockapps for a block by block number, it won't
      # give you its own hash. Instead, it gives you the hash of the block that came
      # before it (parentHash). In order to successfully get the hash of the current
      # block number, then, we have to request block with number (block_number + 1).
      # However: stablenet, currently, isn't a blockchain that continues punching out
      # blocks every 12 seconds or so, which means the block with block number of 
      # (block_number + 1) won't exist until someone makes another transaction, which
      # could be never (stablenet creates new blocks as transactions come in). So,
      # in order to get this to work correctly with web3, we're actually going to 
      # request the *current* block (block_number), rather than the next block
      # (block_number + 1). This is going to return the wrong parent hash, but it's
      # the only way we can successfully integrate with most apps that use block
      # filters. Thankfully, the block hashes in block filters don't usually matter.

      # Here's what the code should be once stablenet starts acting like a real network:
      # @provider.requestFromBlockApps "/query/block?number=#{block_number + 1}", (err, block_result) =>

      @provider.requestFromBlockApps "/query/block?number=#{block_number}", (err, block_result) =>
        if err?
          callback err
          return

        # Null callback result. This is an important special case, signaling the BlockFilter
        # that it can't get more changes past this block number.
        if block_result.length == 0
          callback()
          return

        block = block_result[0]

        callback null, "0x" + block.blockData.parentHash


  class BlockAppsWeb3Provider
    # accounts is an object returned from ethereumjs-accounts
    # i.e., accounts = accounts.get(). Key is the address, value is the account info.
    constructor: (options={}) ->
      @coinbase = options.coinbase
      @accounts = options.accounts || []
      @host = options.host || "http://stablenet.blockapps.net"
      @verbose = options.verbose || false
      @gasPrice = options.gasPrice || 1000000000000
      @keyprovider = options.keyprovider || () ->
        throw new Error("No key provider given to BlockApps + Web3. Can't send transaction.")
      @filter_index = 0
      @filters = {}

    send: (payload) ->
      throw new Error("BlockAppsWeb3Provider does not support synchronous methods. Please provide a callback.")

    # sendAsync acts as the director with which we call blockapps functions based
    # on RPC functions, and then wrap up the result to look like a JSON rpc response.
    # This is our hook into web3 -- all the other functions support this one.
    sendAsync: (payload, callback) ->
      if payload instanceof Array
        @processBatchRequest payload, callback
      else
        @processSingleRequest payload, callback

    processSingleRequest: (payload, callback) ->
      # Provider functions are expected to be named exactly like their
      # analogous web3 methods.
      method = payload.method

      if !@[method]?
        throw new Error("BlockAppsWeb3Provider does not yet support the Web3 method '#{method}'.")
        return

      args = []

      for param in payload.params || []
        args.push param

      # Push a callback function to wrap up the response into
      # what web3 expects.
      args.push (err, result) ->
        wrapped = {
          id: payload.id
          jsonrpc: payload.jsonrpc
          result: result
        }

        callback err, wrapped

      fn = @[method]

      if fn.length != args.length
        callback(new Error("Invalid number of parameters passed to #{method}"))
        return

      # Call the function associated with the RPC method.
      fn.apply(@, args)

    # Process batch requests in series.
    processBatchRequest: (batch, callback) ->
      current_index = -1

      results = []

      makeNextRequest = () =>
        current_index += 1
        @processSingleRequest batch[current_index], (err, result) ->
          if err?
            callback err
            return

          results.push result

          if current_index >= batch.length - 1
            callback null, results
            return
          
          makeNextRequest()

      makeNextRequest()

    # Make the actual requests to the BlockApps backend.
    requestFromBlockApps: (path, params, contentType, callback) ->
      if typeof params == "function"
        callback = params
        params = null
        contentType = "application/x-www-form-urlencoded"

      if typeof contentType == "function"
        callback = contentType
        contentType = "application/x-www-form-urlencoded"

      request = new XMLHttpRequest()

      request.onreadystatechange = () =>
        if request.readyState == 4
          result = request.responseText

          error = null
          try
            result = JSON.parse(result)
          catch e
            error = e

          if @verbose
            toPrint = result
            if typeof toPrint != "string"
              toPrint = JSON.stringify(toPrint, null, 2)
            console.log "BLOCKAPPS RESPONSE:\n#{toPrint}\n"

          callback error, result
        return

      method = if params? then "POST" else "GET"

      request.open(method, "#{@host}#{path}", true)
      request.setRequestHeader("Content-type", contentType)

      final_params = null

      if contentType == "application/x-www-form-urlencoded"
        final_params = ""

        for key, value of params
          if final_params != ""
            final_params += "&"

          final_params += "#{key}=#{encodeURIComponent(value)}"

      if contentType == "application/json"
        final_params = JSON.stringify(params)

      if @verbose
        console.log "BLOCKAPPS REQUEST:\n#{method} #{@host}#{path} - #{final_params} - #{contentType}\n"

      try
        if final_params? and final_params != ""
          request.send(final_params)
        else
          request.send()
      catch error
        callback error
        # TODO: Make this error a web3 error, a la:
        # callback errors.InvalidConnection(@host)

    # Right now, "/transactionResult" outputs errors in such a nasty
    # way that we need a function to encapsulate error handling so as
    # to to have duplication.
    requestTransactionResult: (tx_hash, callback) ->
      tx_hash = @strip0x(tx_hash)
      @requestFromBlockApps "/transactionResult/#{tx_hash}", (err, txinfo_result) =>
        # If there's an explicit error, pass it down.
        if err?
          callback err
          return

        # If we have no result, then pass a null result.
        if txinfo_result.length == 0
          callback null, null
          return

        txinfo = txinfo_result[txinfo_result.length - 1]

        # If we have an result message that's not "Success!", error.
        if txinfo.message? and txinfo.message.toLowerCase().indexOf("success") < 0
          callback(new Error(txinfo.message))
          return

        # Finally, send what we've got.
        callback(null, txinfo)


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
          @requestTransactionResult tx_hash, (err, txinfo) =>
            if err? or !txinfo?
              callback err, txinfo
              return

            callback(null, tx, block, txinfo)

    strip0x: (string) ->
      return string if !string?
      return string.replace("0x", "")


    ############## Web3 Methods ##############

    eth_coinbase: (callback) ->
      if !@coinbase?
        callback new Error("No coinbase specified in the BlockApps + Web3 provider!")
      else
        callback null, @coinbase

    eth_accounts: (callback) ->
      callback null, @accounts

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
          returnVal.to = "0x" + tx.to

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

      # Treat the contract address as an account
      @requestFromBlockApps "/query/account?address=#{contract_address}", (err, response) ->
        if err?
          callback err
          return

        if response.length == 0
          callback()
          return

        callback null, "0x" + response[response.length - 1].code

    eth_getCompilers: (callback) ->
      callback null, ["solidity"]

    eth_compileSolidity: (src="", callback) ->
      @requestFromBlockApps "/solc", {src: src}, (err, response) ->
        if err?
          callback err
          return

        returnVal = {}

        for contract, index in response.contracts
          name = contract.name
          returnVal[name] = 
            code: contract.bin
            info: 
              source: src
              language: "Solidity"
              languageVersion: "0"
              compilerVersion: "0"
              abiDefinition: response.abis[index].abi
              userDoc: 
                methods: {}
              developerDoc: 
                methods: {}

        callback null, returnVal

    eth_sendTransaction: (tx={}, callback) ->
      if !tx.from?
        callback new Error("'from' not found, is required")
        return

      # Get the address's nonce.
      @requestFromBlockApps "/query/account?address=#{@strip0x(tx.from)}", (err, response) =>
        if err?
          callback err
          return

        # Expect response to be an array
        if response.length >= 1
          nonce = response[response.length - 1].nonce
        else
          nonce = 0

        # Assemble the raw transaction data.
        rawTx = 
          nonce: web3.fromDecimal(nonce)
          gasPrice: @strip0x(web3.fromDecimal(tx.gasPrice || @gasPrice))
          gasLimit: @strip0x(web3.fromDecimal(tx.gasLimit || 1900000))
          value: @strip0x(web3.fromDecimal(tx.value || 0))
          data: '00'
 
        if tx.to?
          rawTx.to = @strip0x(tx.to)
        
        if tx.data?
          rawTx.data = @strip0x(tx.data)

        rawTx.from = @strip0x(tx.from)

        transaction = new EthTx(rawTx)

        @keyprovider rawTx.from, (err, unencrypted_private_key) =>
          if err?
            callback(err)
            return

          private_key = new Buffer(@strip0x(unencrypted_private_key), 'hex')
          transaction.sign(private_key)
          serializedTx = transaction.serialize().toString('hex')

          @eth_sendRawTransaction serializedTx, callback

    eth_sendRawTransaction: (rawTx, callback) ->
      ttx = new EthTx(new Buffer(rawTx, 'hex'))

      BigNumber.config({ EXPONENTIAL_AT: 20000000 })
      rawString = ttx.value.toString('hex')
      bigValue = new BigNumber(0)

      if rawString != ''
        bigValue = new BigNumber(rawString, 16)

      js = 
        from : ttx.getSenderAddress().toString('hex')
        nonce : ethUtil.bufferToInt(ttx.nonce)
        gasPrice : ethUtil.bufferToInt(ttx.gasPrice)
        gasLimit : ethUtil.bufferToInt(ttx.gasLimit)
        value : bigValue.toString()
        codeOrData : (ttx.data).toString('hex')
        r : (ttx.r).toString('hex')
        s : (ttx.s).toString('hex')
        v : (ttx.v).toString('hex')
        hash : ttx.hash().toString('hex')

      # Contract?
      if ttx.to.length != 0
        js.to = (ttx.to).toString('hex')

      @requestFromBlockApps "/includetransaction", js, "application/json", (err, tx_response) ->
        tx_hash = "0x" + tx_response.replace(/.*=/, "")
        callback null, tx_hash

    eth_call: (tx={}, block_number="latest", callback) ->
      @eth_sendTransaction tx, (err, tx_hash) =>
        if err?
          callback err
          return

        tx_hash = @strip0x(tx_hash)

        attempts = 0
        maxAttempts = 5
        interval = null

        attempt = () =>
          attempts += 1
          # Ensure the contract was actually created.
          @requestTransactionResult tx_hash, (err, txinfo) =>
            if err?
              callback err, txinfo
              return

            if txinfo? and txinfo.response?
              clearInterval(interval)
              callback null, web3.toHex(txinfo.response)

            if attempts >= maxAttempts
              clearInterval(interval)
              callback("Couldn't get call() return value after #{attempts} attempts.")

        interval = setInterval attempt, 1000
        attempt()

    eth_getTransactionReceipt: (tx_hash, callback) ->
      @requestTransactionData tx_hash, (err, tx, block, txinfo) ->
        if err?
          callback err
          return

        # Transaction is pending, or incomplete, or never made it.
        if !tx? or !block? or !txinfo?
          callback(null, null)
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

        expected_address = ethUtil.generateAddress(tx.from, parseInt(tx.nonce + 1)).toString('hex')

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

    eth_getFilterChanges: (filter_id, callback) ->
      filter_id = web3.toDecimal(filter_id)
      filter = @filters[filter_id]

      if !filter?
        callback null, []
        return

      filter.getChanges(callback)

    eth_gasPrice: (callback) ->
      @requestFromBlockApps "/query/transaction/last/1", (err, tx_result) ->
        if err?
          callback err
          return

        if tx_result.length == 0
          callback(new Error("Could not determine current gasPrice!"))
          return

        tx = tx_result[0]

        callback null, web3.fromDecimal(tx.gasPrice)

    web3_clientVersion: (callback) ->
      callback null, "BlockApps Web3 Provider/0.0.1/JavaScript"



  BlockAppsWeb3Provider

# Note, EthTx, Buffer, ethUtil are provided by the ethereumjs-tx module.
# In node, it globals Buffer and ethUtil; in the browser, it also globals EthTx.
if module? and module.exports?
  EthTx = require("ethereumjs-tx")
  module.exports = factory(require("web3"), require("xhr2"), require("bignumber.js"), EthTx, Buffer, ethUtil)
else
  # We expect web3 to already be included.
  window.BlockAppsWeb3Provider = factory(window.web3, window.XMLHttpRequest, window.BigNumber, window.EthTx, window.Buffer, window.ethUtil)