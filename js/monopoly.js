var Monopoly = {};
Monopoly.allowRoll = true;
Monopoly.moneyAtStart = 100;
Monopoly.doubleCounter = 0;
Monopoly.userResponded = true;
Monopoly.speeding = 0;

Monopoly.init = function(){
    $(document).ready(function(){
        Monopoly.adjustBoardSize();
        $(window).bind("resize",Monopoly.adjustBoardSize);
        Monopoly.initDice();
        Monopoly.initPopups();
        Monopoly.start();        
    });
};

Monopoly.start = function(){
    Monopoly.showPopup("intro")
};


Monopoly.initDice = function(){
    $(".dice").click(function(){
        if (Monopoly.allowRoll){
            Monopoly.rollDice();
        }
    });
};


Monopoly.getCurrentPlayer = function(){
    return $(".player.current-turn");
};

Monopoly.getPlayersCell = function(player){
    return player.closest(".cell");
};


Monopoly.getPlayersMoney = function(player){
    return parseInt(player.attr("data-money"));
};

Monopoly.updatePlayersMoney = function(player,amount){
    var playersMoney = parseInt(player.attr("data-money"));
    playersMoney -= amount;
    if (playersMoney < 0 ){
        setTimeout( () => {
            Monopoly.playSound('no-money');
            var popup = Monopoly.getPopup("broke");
            popup.find(".popup-content #text-placeholder").text(`${player.attr('id')} is broke and therefore has been removed from the game`);
            popup.find(".popup-title").text('Out Of Money');
            popup.find("button").unbind("click").bind("click", function () {
                player.remove();
                $(`.cell[data-owner='${player.attr('id')}']`)
                .removeData('owner')
                .removeData('rent')
                .removeAttr('data-owner')
                .removeAttr('data-rent')
                .removeClass(player.attr("id"))
                .addClass('available');
                Monopoly.closePopup();
            });
            Monopoly.showPopup("broke");
        }, 0);
    } else {
        player.attr("data-money",playersMoney);
        player.attr("title",player.attr("id") + ": $" + playersMoney);
        Monopoly.playSound("chaching");
    }
};


Monopoly.rollDice = function(){
    var result1 = Math.floor(Math.random() * 6) + 1 ;
    var result2 = Math.floor(Math.random() * 6) + 1 ;
    $(".dice").find(".dice-dot").css("opacity",0);
    $(".dice#dice1").attr("data-num",result1).find(".dice-dot.num" + result1).css("opacity",1);
    $(".dice#dice2").attr("data-num",result2).find(".dice-dot.num" + result2).css("opacity",1);
    if (result1 == result2){
        if(++Monopoly.speeding >= 3) {
            var currentPlayer = Monopoly.getCurrentPlayer();
            while (currentPlayer.length === 0) {
                Monopoly.setNextPlayerTurn();
                currentPlayer = Monopoly.getCurrentPlayer();
            }
            Monopoly.handleSpeeding(currentPlayer);
        } else {
            Monopoly.doubleCounter++;
            Monopoly.userResponded = false;
            var popup = Monopoly.getPopup("doubles");
            popup.find("button").unbind("click").bind("click", function () {
                Monopoly.closePopup();
                Monopoly.userResponded = true;
            });
            setTimeout(function() { 
                Monopoly.showPopup("doubles");
            }, 0);
            var currentPlayer = Monopoly.getCurrentPlayer();
            while (currentPlayer.length === 0) {
                Monopoly.setNextPlayerTurn();
                currentPlayer = Monopoly.getCurrentPlayer();
            }
            Monopoly.handleAction(currentPlayer, "move", result1 + result2);
        }
    }
    else {
        var currentPlayer = Monopoly.getCurrentPlayer();
        while(currentPlayer.length === 0) {
            Monopoly.setNextPlayerTurn();
            currentPlayer = Monopoly.getCurrentPlayer();
        }
        Monopoly.handleAction(currentPlayer,"move",result1 + result2);
    }
};


Monopoly.movePlayer = function(player,steps){
    Monopoly.allowRoll = false;
    if (player.is('.owner')) {
        player.removeClass('owner');
    }
    var playerMovementInterval = setInterval(function(){
        if (steps == 0){
            if(Monopoly.userResponded) {
                clearInterval(playerMovementInterval);
                Monopoly.handleTurn(player);
            }
        }else{
            var playerCell = Monopoly.getPlayersCell(player);
            var nextCell = Monopoly.getNextCell(playerCell);
            if(nextCell.attr('id') === 'cell11') { //putting player in just a visit
                nextCell.append(player);
            } else{
                nextCell.find(".content").append(player);    
            }
            steps--;
        }
    }, 200);
};


Monopoly.handleTurn = function(){
    var player = Monopoly.getCurrentPlayer();
    var playerCell = Monopoly.getPlayersCell(player);
    if (playerCell.is(".available.property")){
        Monopoly.handleBuyProperty(player,playerCell);
    }else if(playerCell.is(".property:not(.available)")){
        if (!playerCell.hasClass(player.attr("id"))) {
            Monopoly.handlePayRent(player, playerCell);    
        } else {
            player.addClass('owner');
            Monopoly.setNextPlayerTurn();
        }
    }else if(playerCell.is(".go-to-jail")){
        Monopoly.handleGoToJail(player);
    }else if(playerCell.is(".chance")){
        Monopoly.handleChanceCard(player);
    }else if(playerCell.is(".community")){
        Monopoly.handleCommunityCard(player);
    }else{
        Monopoly.setNextPlayerTurn();
    }
}
//setting the next player turn
Monopoly.setNextPlayerTurn = function(){
    var currentPlayerTurn = Monopoly.getCurrentPlayer();
    var playerId = parseInt(currentPlayerTurn.attr("id").replace("player",""));
    var nextPlayerId = null;
    switch (Monopoly.doubleCounter) {
        case 0:
            Monopoly.speeding = 0;
            nextPlayerId = playerId + 1;
            break;
        case 1:
            nextPlayerId = playerId;
            --Monopoly.doubleCounter;
            break;
        default:
            console.log("doublesCounter more than 1");
    }
    if (nextPlayerId > Monopoly.numOfPlayers){
        nextPlayerId = 1;
    }
    currentPlayerTurn.removeClass("current-turn");
    var nextPlayer = $(".player#player" + nextPlayerId);
    while(nextPlayer.length === 0) {
        ++nextPlayerId;
        if (nextPlayerId > Monopoly.numOfPlayers) {
            nextPlayerId = 1;
        }
        nextPlayer = $(".player#player" + nextPlayerId);
    }
    nextPlayer.addClass("current-turn");
    if (nextPlayer.is(".jailed")){
        var currentJailTime = parseInt(nextPlayer.attr("data-jail-time"));
        currentJailTime++;
        nextPlayer.attr("data-jail-time",currentJailTime);
        if (currentJailTime > 3){
            nextPlayer.removeClass("jailed");
            nextPlayer.removeAttr("data-jail-time");
        }
        Monopoly.setNextPlayerTurn();
        return;
    }
    Monopoly.closePopup();
    Monopoly.allowRoll = true;
};


Monopoly.handleBuyProperty = function(player,propertyCell){
    var propertyCost = Monopoly.calculateProperyCost(propertyCell);
    var popup = Monopoly.getPopup("buy");
    popup.find(".cell-price").text(propertyCost);
    popup.find("button").unbind("click").bind("click",function(){
        var clickedBtn = $(this);
        if (clickedBtn.is("#yes")){
            Monopoly.handleBuy(player,propertyCell,propertyCost);
        }else{
            Monopoly.closeAndNextTurn();
        }
    });
    Monopoly.showPopup("buy");
};

Monopoly.handlePayRent = function(player,propertyCell){
    var popup = Monopoly.getPopup("pay");
    var currentRent = parseInt(propertyCell.attr("data-rent"));
    var properyOwnerId = propertyCell.attr("data-owner");
    popup.find("#player-placeholder").text(properyOwnerId);
    popup.find("#amount-placeholder").text(currentRent);
    popup.find("button").unbind("click").bind("click",function(){
        var properyOwner = $(".player#"+ properyOwnerId);
        Monopoly.updatePlayersMoney(properyOwner, -1 * currentRent);
        Monopoly.updatePlayersMoney(player,currentRent);
        Monopoly.closeAndNextTurn();
    });
   Monopoly.showPopup("pay");
};


Monopoly.handleGoToJail = function(player){
    var popup = Monopoly.getPopup("jail");
    popup.find("button").unbind("click").bind("click",function(){
        Monopoly.handleAction(player,"jail");
    });
    Monopoly.showPopup("jail");
};
Monopoly.handleSpeeding = function (player) {
    var popup = Monopoly.getPopup("speeding");
    popup.find("button").unbind("click").bind("click", function () {
        Monopoly.handleAction(player, "jail");
    });
    Monopoly.showPopup("speeding");
};


Monopoly.handleChanceCard = function(player){
    var popup = Monopoly.getPopup("chance");
    popup.find(".popup-content").addClass("loading-state");
    $.get("https://itcmonopoly.appspot.com/get_random_chance_card", function(chanceJson){
        popup.find(".popup-content #text-placeholder").text(chanceJson["content"]);
        popup.find(".popup-title").text(chanceJson["title"]);
        popup.find(".popup-content").removeClass("loading-state");
        popup.find(".popup-content button").attr("data-action",chanceJson["action"]).attr("data-amount",chanceJson["amount"]);
    },"json");
    popup.find("button").unbind("click").bind("click",function(){
        var currentBtn = $(this);
        var action = currentBtn.attr("data-action");
        var amount = currentBtn.attr("data-amount");
        
        Monopoly.handleAction(player,action,amount);
    });
    Monopoly.showPopup("chance");
};
//community card handle
Monopoly.handleCommunityCard = function(player){
    var popup = Monopoly.getPopup("community");
    popup.find(".popup-content").addClass("loading-state");
    $.get("https://itcmonopoly.appspot.com/get_random_community_card", function (json) {
        popup.find(".popup-content #text-placeholder").text(json["content"]);
        popup.find(".popup-title").text(json["title"]);
        popup.find(".popup-content").removeClass("loading-state");
        popup.find(".popup-content button").attr("data-action", json["action"]).attr("data-amount", json["amount"]);
    }, "json");
    popup.find("button").unbind("click").bind("click", function () {
        var currentBtn = $(this);
        var action = currentBtn.attr("data-action");
        var amount = currentBtn.attr("data-amount");
        
        Monopoly.handleAction(player, action, amount);
    });
    Monopoly.showPopup("community");
};

//sending to jail. putting the player inside the in-jail cell
Monopoly.sendToJail = function(player){
    player.addClass("jailed");
    player.attr("data-jail-time",1);
    $(".corner.game.cell.in-jail .content").append(player);
    Monopoly.playSound("woopwoop");
    Monopoly.setNextPlayerTurn();
    Monopoly.closePopup();
};

//getting the popup id
Monopoly.getPopup = function(popupId){
    return $(".popup-lightbox .popup-page#" + popupId);
};
//calculating the property cost as a function of the cell group. the bigger the group, the bigger the price will be
Monopoly.calculateProperyCost = function(propertyCell){
    var cellGroup = propertyCell.attr("data-group");
    var cellPrice = parseInt(cellGroup.replace("group","")) * 5;
    if (cellGroup == "rail"){
        cellPrice = 10;
    }
    return cellPrice;
};

//calculating the property rent with corelation of the property's cost
Monopoly.calculateProperyRent = function(propertyCost){
    return propertyCost/2;
};


Monopoly.closeAndNextTurn = function(){
    Monopoly.closePopup();
    Monopoly.setNextPlayerTurn();
};
//adding event listener on the first pop up and validating the number of players
Monopoly.initPopups = function(){
    $(".popup-page#intro").find("button").click(function(){
        var numOfPlayers = $(this).closest(".popup-page").find("input").val();
        if (Monopoly.isValidInput("numofplayers",numOfPlayers)){
            Monopoly.createPlayers(numOfPlayers);
            Monopoly.closePopup();
        }
    });
};

//if a player has money then the tile becomes the player's property
Monopoly.handleBuy = function(player,propertyCell,propertyCost){
    var playersMoney = Monopoly.getPlayersMoney(player)
    if (playersMoney < propertyCost){
        Monopoly.showErrorMsg();
    }else{
        var rent = Monopoly.calculateProperyRent(propertyCost);

        propertyCell.removeClass("available")
                    .addClass(player.attr("id"))
                    .attr("data-owner",player.attr("id"))
                    .attr("data-rent",rent);

        Monopoly.handleAction(player, 'pay', propertyCost);
    }
};




//handling different actions in one place
Monopoly.handleAction = function(player,action,amount){
    switch(action){
        case "move":
            Monopoly.movePlayer(player,amount);
             break;
        case "pay":
            Monopoly.updatePlayersMoney(player,amount);
            Monopoly.setNextPlayerTurn();
            break;
        case "jail":
            Monopoly.sendToJail(player);
            break;
    };
    Monopoly.closePopup();
};




//creating the players and putting them in the go tile position - if input is float, the fractional part is dismissed
Monopoly.createPlayers = function(numOfPlayers){
    var startCell = $(".go");
    Monopoly.numOfPlayers = Number.parseInt(numOfPlayers);
    for (var i=1; i<= Number.parseInt(numOfPlayers); i++){
        var player = $("<div />").addClass("player shadowed").attr("id","player" + i).attr("title","player" + i + ": $" + Monopoly.moneyAtStart);
        startCell.find(".content").append(player);
        if (i==1){
            player.addClass("current-turn");
        }
        player.attr("data-money",Monopoly.moneyAtStart);
    }
};

//getting the next cell id and returning it
Monopoly.getNextCell = function(cell){
    currentCellId = parseInt(cell.attr("id").replace("cell",""));
    var nextCellId = currentCellId + 1
    if (nextCellId > 40){
        Monopoly.handlePassedGo();
        nextCellId = 1;
    }
    return $(".cell#cell" + nextCellId);
};

//each full circle the player should be awarded with 10th of the games start money - fixed to add the amount
Monopoly.handlePassedGo = function(){
    var player = Monopoly.getCurrentPlayer();
    Monopoly.updatePlayersMoney(player,-1 * Monopoly.moneyAtStart/10);
};

//validation of the players number input
Monopoly.isValidInput = function(validate,value){
    var isValid = false;
    switch(validate){
        case "numofplayers":
            if(value > 1 && value <= 4){
                isValid = true;
            }
            break;
    }

    if (!isValid){
        Monopoly.showErrorMsg();
    }
    return isValid;

}
//pops up contextual error depends on the error, using the .invalid-error of the .popup-page
Monopoly.showErrorMsg = function(){
    $(".popup-page .invalid-error").fadeTo(500,1);
    setTimeout(function(){
            $(".popup-page .invalid-error").fadeTo(500,0);
    },2000);
};

//adjusting the board size according to the actual window width/height (minimum of the two)
Monopoly.adjustBoardSize = function(){
    var gameBoard = $(".board");
    var boardSize = Math.min($(window).height(),$(window).width());
    boardSize -= parseInt(gameBoard.css("margin-top")) *2;
    $(".board").css({"height":boardSize,"width":boardSize});
}
//closing the popup-lightbox parent of all the errors. just a quick way to close whatever error
Monopoly.closePopup = function(){
    $(".popup-lightbox").fadeOut();
};
//play the sound according to the context. taken from the 'sounds' folder in the game's path
Monopoly.playSound = function(sound){
    var snd = new Audio("./sounds/" + sound + ".wav"); 
    snd.play();
}
//hide the current popup child, show the popup passed to the function and show the parent lightbox
Monopoly.showPopup = function(popupId){
    $(".popup-lightbox .popup-page").hide();
    $(".popup-lightbox .popup-page#" + popupId).show();
    $(".popup-lightbox").fadeIn();
};

Monopoly.init();