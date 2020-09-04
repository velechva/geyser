window.addEventListener('load', async () => {

    if (window.ethereum) {
        document.getElementById("connect").classList.remove("hidden") // In css => .hidden{display: none}
        window.web3 = new Web3(ethereum)
        try {
            document.getElementById("connect").onclick = async function() {
                await ethereum.enable()
                init()
            }
        } catch (e) {
            console.error(e)
        }
    }

    else if (window.web3) {
        window.web3 = new Web3(web3.currentProvider)
        init()
    }

    else {
        // getWeb3()
        console.log("Your browser does not support web3")
    }

})