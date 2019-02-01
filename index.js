const hasher = require("js-sha256");
const url = "http://localhost:3000";
var socket = require("socket.io-client")(url);
let blockchain = require("./blockchain.json");
let mining = false; // Temp flag

process.stdout.write(`
#    # ###### #    #   ##          ####  #        ##   #    # ###### 
#    # #      #   #   #  #        #      #       #  #  #    # #      
###### #####  ####   #    # #####  ####  #      #    # #    # #####  
#    # #      #  #   ######            # #      ###### #    # #      
#    # #      #   #  #    #       #    # #      #    #  #  #  #      
#    # ###### #    # #    #        ####  ###### #    #   ##   ###### 
____________________________________________________________________
Connecting to master...

`);

function mine(block) {
  mining = true;
  let nonce = block.nonce;
  let key =
    block.index +
    block.prevHash +
    nonce +
    (block.transactions.length > 1
      ? block.transactions.map(t => JSON.stringify(t)).join("_")
      : "");

  let hash = hasher.sha256(key);

  while (!hash.startsWith("0000") && mining) {
    process.stdout.write(`⛏  Mining... ${hash}`);
    nonce += 1;
    key =
      block.index +
      block.prevHash +
      nonce +
      (block.transactions.length > 1
        ? block.transactions.map(t => JSON.stringify(t)).join("_")
        : "");
    hash = hasher.sha256(key);
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
  }
  if (mining) {
    mining = false;
    block.nonce = nonce;
    console.log(`✅  Solved ${hash}`);
    return hash;
  } else {
    console.log("Mining Interrupted");
  }
}

function validateBlock(block) {
  if (
    hasher.sha256(
      block.index +
        block.prevHash +
        block.nonce +
        (block.transactions.length > 1
          ? block.transactions.map(t => JSON.stringify(t)).join("_")
          : "")
    ) == block.hash
  ) {
    console.log(`✅  Validated ${block.hash}`);
    addBlock(block);
  } else console.log("REJECT: Hash mismatch");
}

function addBlock(block) {
  blockchain.transactions[block.index] = block;
  console.log("Adding block...");
  require("fs").writeFileSync(
    "./blockchain.json",
    JSON.stringify(blockchain, null, 2)
  );
  console.log(`Block ${block.index} added!`);
}

socket.on("connect", () => {
  console.log("Connected!");
});

socket.on("NEW_BLOCK", block => {
  if (!blockchain.transactions[block.index]) {
    console.log(block);
    console.log(`Recevied new block from master`);

    block.hash = mine(block);

    addBlock(block);

    socket.emit("SOLVED", JSON.stringify(block, null, 2));
  }
});

socket.on("VALIDATE_BLOCK", block => {
  if (!blockchain.transactions[block.index]) {
    // Interrupt
    mining = false;
    console.log("Received solved block!");
    console.log(block);
    console.log("Validating solved block...");
    validateBlock(JSON.parse(block));
  }
});
