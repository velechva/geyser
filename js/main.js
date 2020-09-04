$(document).ready(function() {
    $("#Menu").on("click", function(e) {
        let page = $(e.target).attr("data")
        $(".tab").removeClass("tab-selected")
        $(e.target).addClass("tab-selected")
        openPage(page)
    })
})

function openPage(tab) {
    $(".page").hide()
    $("#"+tab+"").show()
    $("#"+tab+"").css("display", "flex")
}

async function init() {
    console.log("Web3 connected...")
}