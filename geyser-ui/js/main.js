let Geyser,
    GeyserAddress = "0xDa318eA78e32D8481bbc1916A3C11339b3d927bE",
    TokenAddress = "0x372e79ac44b5d4f4f60b9a47dc8b3eb32bb5119b"

let userTokenBalance,
    totalStakedFor,
    totalDeposits,
    callerRewards,
    lockedBalance,
    unlockedBalance,
    totalBalance


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
}

// Load data 
async function load() {
    try {
        // Update accounting
        await Geyser.methods.updateAccounting().call().then(function(r) {
            const {
                n_lockedBalance, 
                n_unlockedBalance, 
                n_callerStakingShareSeconds, 
                n_globalStakingShareSeconds, 
                n_callerRewards, 
                n_blockTimestamp
            } = r

            if (n_callerRewards !== callerRewards) {
                callerRewards = n_callerRewards
                refresh($("#v_REWARDS"), callerRewards)
            }

            let totalChanged = false;

            if (n_lockedBalance !== lockedBalance) {
                totalChanged = true
                lockedBalance = n_lockedBalance
                refresh($("#v_LOCKEDREWARDS"), lockedBalance)
            }
            if (n_unlockedBalance !== unlockedBalance) {
                totalChanged = true
                unlockedBalance = n_unlockedBalance
                refresh($("#v_UNLOCKEDREWARDS"), unlockedBalance)
            }

            if (totalChanged) {
                totalBalance = lockedBalance + unlockedBalance
                refresh($("#v_TOTALREWARDS"), totalBalance)
            }
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

                if (parseFloat(totalStakedFor) > 0) {
                    if ($("#b_WITHDRAW").hasClass("disabled")) {
                        $("#b_WITHDRAW").removeClass("disabled")
                    }
                } else {
                    if(!$("#b_WITHDRAW").hasClass("disabled")) {
                        $("#b_WITHDRAW").addClass("disabled")
                    }
                }
            }
        })
        
        // totalDeposits
        await Geyser.methods.totalStaked().call().then(function(r) {
            if(r !== totalDeposits) {
                totalDeposits = r
                refresh($("#s_TOTALDEPOSITS"), totalDeposits) // Total deposits field
            }
        })
    }
    catch(e) {
        console.error(e)
    }
}

// Deposit / Stake 
async function deposit() {
    console.log(`Depositing from account: ${accounts[0]}`)
    try {
        // Get allowance to see how much we have to approve
        const allowance = await Token.methods.allowance(accounts[0], accounts[0]).send({ from: accounts[0] })
        .on("transactionHash", function(hash) {
            info("pendingAllowance")
        })
        .on("receipt", function(receipt) {
            info("allowanceComplete")
        })

        const inputValueInWei = web3.utils.toWei($("#v_DEPOSITAMT").val()),
              inputValueInWeiFloat = parseFloat(inputValueInWei),
              allowanceFloat = parseFloat(allowance)

        // If allowance is not enough, we need to call approve
        if (allowanceFloat < inputValueInWeiFloat) {
            const diff = inputValueInWei - allowanceFloat

            await Token.methods.approve(GeyserAddress, diff).send({ from: accounts[0] })
            .on("transactionHash", function(hash) {
                info("pendingApproval")
            })
            .on("receipt", function(receipt) {
                info("approvalComplete")
            })
        }

        await Geyser.methods.stake(inputValueInWei).send({ from: accounts[0] })
        .on("transactionHash", function(hash) {
            info("pendingDeposit")
        })
        .on("receipt", function(receipt) {
            info("depositComplete")
            load() // reload
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
            load() // reload
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
    }
    $(".error").show()
}

// Update UI with new values 
function refresh(element, newval) {
    $(element).fadeOut();
    $(element).text(decimal(web3.utils.fromWei(newval)));
    $(element).fadeIn();
}

// Truncates decimal places without rounding
function decimal(number) {
    // Truncate to 4 decimal places 
    return number.match(/^-?\d+(?:\.\d{0,4})?/)[0];
}

// Simple input validation
function valid(input) {
    return input !== "" && parseFloat(input) > 0
}
