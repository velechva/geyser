const GEYSER_ADDRESS = "0xDa318eA78e32D8481bbc1916A3C11339b3d927bE",
      TOKEN_ADDRESS  = "0x372e79ac44b5d4f4f60b9a47dc8b3eb32bb5119b"

let Geyser

let userTokenBalance,
    totalStakedFor,
    totalDeposits,
    callerRewards,
    lockedBalance,
    unlockedBalance,
    totalBalance,
    estimatedRewards,
    apy

$(document).ready(function() {
    // Menu clicks
    $("#menu").on("click", function(e) {
        let page = $(e.target).attr("data")
        $("#menu ul li").removeClass("is-active")
        $(e.target).addClass("is-active")
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
    
    // Amount to deposit
    $("#v_DEPOSITAMT").on("input", function(event) {
        const num = parseFloat(event.target.value)
        if (isNaN(num)) { return; }

        estimatedRewards = calculateEstimatedRewards(num)
        refreshLiteral($("#v_ESTREWARDS"), estimatedRewards)

        apy = calculateApy(num)
        refreshLiteral($("#v_APY"), apy);
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
    Geyser = new web3.eth.Contract(abi, GEYSER_ADDRESS)
    Token = new web3.eth.Contract(token_abi, TOKEN_ADDRESS)
}

// Load data
async function load() {
    try {
        // Update accounting
        await Geyser.methods.updateAccounting().call().then(function(r) {
            const 
                n_lockedBalance = r[0],
                n_unlockedBalance = r[1]
                n_callerStakingShareSeconds = r[2]
                n_globalStakingShareSeconds = r[3]
                n_callerRewards = r[4]
                n_blockTimestamp = r[5]

            if (n_callerRewards !== callerRewards) {
                callerRewards = n_callerRewards
                refreshWei($("#v_REWARDS"), callerRewards)
            }

            if (n_lockedBalance !== lockedBalance) {
                lockedBalance = n_lockedBalance
                refreshWei($("#v_LOCKEDREWARDS"), lockedBalance)
            }
            if (n_unlockedBalance !== unlockedBalance) {
                unlockedBalance = n_unlockedBalance
                refreshWei($("#v_UNLOCKEDREWARDS"), unlockedBalance)
            }

            n_totalBalance = n_lockedBalance + n_unlockedBalance

            if (n_totalBalance !== totalBalance) {
                totalBalance = n_totalBalance
                refreshWei($("#v_TOTALBALANCE"), totalBalance)
            }
        })

        // BalanceOf 
        await Token.methods.balanceOf(accounts[0]).call().then(function(r) {
            if(r !== userTokenBalance) {
                userTokenBalance = r
                refreshWei($("#v_WALLETBALANCE"), userTokenBalance) // Balance field 
                refreshWei($("#v_DEPOSITAMT"), userTokenBalance) // Input field 
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
                refreshWei($("#v_DEPOSITEDAMT"), totalStakedFor) // Balance field 
                refreshWei($("#v_WITHDRAWAMT"), totalStakedFor) // Input field 

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
                refreshWei($("#s_TOTALDEPOSITS"), totalDeposits) // Total deposits field
            }
        })

        const tokensClaimedEvents = await Geyser.getPastEvents('TokensClaimed', {
            filter: { user: accounts[0] },
            fromBlock: 0,
            toBlock: 'latest'
        })
        const rewards = tokensClaimedEvents
            .map(x => x.returnValues['amount'])
            .reduce((a, b) => parseFloat(a) + parseFloat(b), 0)
        refreshWei($("#v_REWARDS"), rewards.toString())

        rewardMultiplier = calculateRewardMultiplier(parseInt(n_callerStakingShareSeconds));
        refreshLiteral($("#v_MULTIPLIER"), rewardMultiplier.toString());


        // TODO test when there have been some unlock schedules added
        Geyser.unlockSchedules().then(function(schedules) {
            const filteredSchedules = schedules
                .filter(function(a) { return new Date(a.endTimeSec) > new Date()})
                .sort(function(a, b) { return new Date(b.endTimeSec) - new Date(a.endTimeSec) });
            if (filteredSchedules.length > 0) {
                const nextUnlock = new Date(filteredSchedules[0].endTimeSec)
                const nextUnlockDays = (nextUnlock - new Date()) / (1000 * 3600 * 24)
                if (nextUnlockDays > 0) {
                    refreshLiteral($("#s_DURATION"), nextUnlockDays)
                }
            }
        })
    }
    catch(e) {
        console.error(e)
        error("UnknownError");
    }
}

// Deposit / Stake 
async function deposit() {
    console.log(`Depositing from account: ${accounts[0]}`)
    try {
        const inputValueInWei = web3.utils.toWei($("#v_DEPOSITAMT").val());

        await Token.methods.approve(GEYSER_ADDRESS, inputValueInWei).send({ from: accounts[0] })
        .on("transactionHash", function(hash) {
            info("pendingApproval")
        })
        .on("receipt", function(receipt) {
            info("approvalComplete")
        })

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
        error("Unknown");
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
            refreshWei("#v_AMTCLAIMED", receipt.events.TokensClaimed.returnValues['amount'])
            load() // reload
        })
    }
    catch(e) {
        console.error(e)
        error("Unknown");
    }
    
}

// Show error 
function error(e) {
    $(".error").show()
    switch(e) {
        case "invalidInputValue":
            $(".e_MESSAGE").text("Input value is invalid")
            break;
        default:
            $(".e_MESSAGE").text("Something went wrong. Refresh the page and try again later")
        break;
    }
}

// Show info 
function info(i) {
    switch(i) {
        case "pendingApproval":
            $(".e_MESSAGE").text("Pending approval...")
            break;
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

// Update UI with new values after converting newval to wei
function refreshWei(element, newval) {
    $(element).fadeOut();
    $(element).text(decimal(web3.utils.fromWei(newval)));
    $(element).fadeIn();
}

// Update UI with new values 
function refreshLiteral(element, newval) {
    $(element).fadeOut();
    $(element).text(newval);
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

$('.statrow div:first-child').after('<hr class="stat-hr"/>')
