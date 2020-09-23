let Geyser,
    GeyserAddress = "0xDa318eA78e32D8481bbc1916A3C11339b3d927bE",
    TokenAddress = "0x372e79ac44b5d4f4f60b9a47dc8b3eb32bb5119b"

let userTokenBalance,
    totalStakedFor,
    totalDeposits,
    totalLocked,
    totalUnlocked,
    tokenDecimals,
    tokenApproved = false,
    tokenAllowance;

$(document).ready(function() {
    
    // Menu clicks
    $("#Menu").on("click", function(e) {
        let page = $(e.target).attr("data")
        $(".tab").removeClass("tab-selected")
        $(e.target).addClass("tab-selected")
        openPage(page)
    })
    
    // Deposit / Stake button 
    $("#b_DEPOSIT").on("click", function() {
        let inputValue = $("#v_DEPOSITAMT").val()
        if(valid(inputValue)) {
            deposit()
        } else {
            error("invalidInputValue")
        }
    })
    
    // Withdraw / Unstake button 
    $("#b_WITHDRAW").on("click", function() {
        let inputValue = $("#v_WITHDRAWAMT").val()
        if(valid(inputValue)) {
            withdraw()
        } else {
            error("invalidInputValue")
        }
    })
    
    // Approve button 
    $("#b_APPROVE").on("click", function() {
        approve()
    })
    
})

// Handle menu tabs 
function openPage(tab) {
    $(".page").hide()
    $("#"+tab+"").show()
    $("#"+tab+"").css("display", "flex")
}

// Loads once in connect.js 
async function setup() {
    Geyser = new web3.eth.Contract(abi, GeyserAddress)
    Token = new web3.eth.Contract(token_abi, TokenAddress)
    
    $("#btn-connect").text("Connected!")
    $("#btn-connect").attr("disabled", true)
}

// Load data 
async function load() {
    $(".error").hide()
    try {
        if(!tokenApproved) {
            await Token.methods.allowance(GeyserAddress, accounts[0]).call().then(function(r) {
                if(r !== tokenAllowance) {
                    tokenAllowance = r
                    if( parseFloat(web3.utils.fromWei(r)) > 0 ) {
                        tokenApproved = true
                    } else {
                        $("#b_APPROVE").removeClass("hidden")
                        $("#b_APPROVE").removeClass("disabled")
                    }
                }
            })
        } else {
            if(!$("#b_APPROVE").hasClass("disabled")) {
                $("#b_APPROVE").addClass("disabled")
                $("#b_APPROVE").addClass("hidden")
            }
        }
        
        await Token.methods.decimals().call().then(function(r){
           tokenDecimals = parseInt(r)
        })
        
        // BalanceOf 
        await Token.methods.balanceOf(accounts[0]).call().then(function(r) {
            if(r !== userTokenBalance) {
                userTokenBalance = r
                refresh($("#v_WALLETBALANCE"), userTokenBalance) // Balance field 
                refresh($("#v_DEPOSITAMT"), userTokenBalance) // Input field 
            }
            
            // Remove .disabled class from deposit button when userTokenBalance > 0 
            if(parseFloat(web3.utils.fromWei(userTokenBalance)) > 0) {
                if($("#b_DEPOSIT").hasClass("disabled")) {
                    $("#b_DEPOSIT").removeClass("disabled")
                }
            } else {
                if(!$("#b_DEPOSIT").hasClass("disabled")) {
                    $("#b_DEPOSIT").addClass("disabled")
                }
            }
        })
        
        // totalStakedFor
        await Geyser.methods.totalStakedFor(accounts[0]).call().then(function(r) {
            if(r !== totalStakedFor) {
                totalStakedFor = r
                refresh($("#v_DEPOSITEDAMT"), totalStakedFor) // Balance field 
                refresh($("#v_WITHDRAWAMT"), totalStakedFor) // Input field 
            }
        })
        
        // totalDeposits
        await Geyser.methods.totalStaked().call().then(function(r) {
            if(r !== totalDeposits) {
                totalDeposits = r
                refresh($("#s_TOTALDEPOSITS"), totalDeposits) // Total deposits field
            }
        })

         // totalUnlocked
         await Geyser.methods.totalUnlocked().call().then(function(r) {
            if(r !== totalUnlocked) {
                totalUnlocked = r
                refresh($("#s_UNLOCKEDREWARDS"), totalUnlocked) // Total deposits field
            }
        })

        
         // totalLocked
        await Geyser.methods.totalLocked().call().then(function(r) {
            if(r !== totalLocked) {
                totalLocked = r
                refresh($("#s_LOCKEDREWARDS"), totalLocked) // Total deposits field
            }
        })

        // program duration
        await Geyser.methods.unlockScheduleCount().call().then(function(count) {
            Geyser.methods.unlockSchedules(count-1).call().then(function(info) {
                let endTimestamp=parseInt(info.endAtSec)
                let currentTimestamp=Math.ceil(Date.now()/1000)
                let secsRemaining=endTimestamp-currentTimestamp
                let daysRemaining = parseInt(secsRemaining/(60*60*24));
                refreshNoConvert($("#s_DURATION"), daysRemaining) // Total depos
            })
        })
    }
    
    catch(e) {
        console.error(e)
    }

}

// Approve token for trading 
async function approve() {
    try {
        await Token.methods.approve(GeyserAddress, web3.utils.toWei("1000000000")).send({
            from: accounts[0]
        })
        .on("transactionHash", function(hash) {
            info("pendingApprove")
        })
        .on("receipt", function(receipt) {
            info("approveComplete")
            setTimeout(function(){ load() }, 1000);
        })
    }
    catch(e) {
        console.error(e)
    }
}

// Deposit / Stake 
async function deposit() {
    
    try {
        let inputValueInWei = web3.utils.toWei($("#v_DEPOSITAMT").val())
        await Geyser.methods.stake(inputValueInWei).send({
            from: accounts[0]
        })
        .on("transactionHash", function(hash) {
            info("pendingDeposit")
        })
        .on("receipt", function(receipt) {
            info("depositComplete")
            setTimeout(function(){ load() }, 1000);
        })
    }
    
    catch(e) {
        console.error(e)
    }
    
}

// Withdraw / Unstake
async function withdraw() {
    
    try {
        let inputValueInWei = web3.utils.toWei($("#v_WITHDRAWAMT").val())
        await Geyser.methods.unstake(inputValueInWei).send({
            from: accounts[0]
        })
        .on("transactionHash", function(hash) {
            info("pendingWithdraw")
        })
        .on("receipt", function(receipt) {
            info("withdrawComplete")
            setTimeout(function(){ load() }, 1000);
        })
    }
    
    catch(e) {
        console.error(e)
    }
    
}

// Show error 
function error(e) {
    $(".error").show()
    switch(e) {
        case "invalidInputValue":
            $(".e_MESSAGE").text("Input value is invalid")
        break;
    }
}

// Show info 
function info(i) {
    $(".error").show()
    switch(i) {
        case "pendingDeposit":
            $(".e_MESSAGE").text("Pending deposit...")
            break;
        case "depositComplete":
            $(".e_MESSAGE").text("Deposit completed!")
            break;
        case "pendingWithdraw":
            $(".e_MESSAGE").text("Pending withdraw...")
            break;
        case "withdrawComplete":
            $(".e_MESSAGE").text("Withdraw complete!")
            break;
        case "pendingApprove":
            $(".e_MESSAGE").text("Pending approve...")
            break;
        case "approveComplete":
            $(".e_MESSAGE").text("Approve complete!")
            break;
    }
}

// Update UI with new values 

function refreshNoConvert(element, newval) {
    $(element).fadeOut();
    $(element).text(newval);
    $(element).fadeIn();
}
function refresh(element, newval) {
    $(element).fadeOut();
    let value=parseInt(newval)/parseFloat(10**tokenDecimals);
    $(element).text(decimal(value));
    $(element).fadeIn();
}

// Truncates decimal places without rounding
function decimal(number) {
    // Truncate to 4 decimal places 
    return number.toString().match(/^-?\d+(?:\.\d{0,4})?/)[0];
}

// Simple input validation
function valid(input) {
    return input !== "" && parseFloat(input) > 0
}
