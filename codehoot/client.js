/*
    NB: (This was mentioned in the docuementation) client.js is essentially all of the client-side code
    Comments explain each important section of this file, generally this is each function and jQuery/Socket.IO event listener
*/

var socket = io();
var editor;

var name;
var isHost = false;
var clientIndex;

var clientList;
var problemSet;
var gameType;

var currentProblem;
var currentGameId;

/*TODO:
    [x] replace children().hide() w/ something else 
    [x] fix starting new instance glitch
    [x] in progress bug?
    [x] reassignment of host on disconnect
    [x] ensure that a game in progress can not be joined midway
    [x] lobby selection system
    [x] indicate to players whether its one or multiple problems
    [x] choosing between two sets feature
    [x] max amount of players to 10
    [x] name, logo, navbar etc (raleway, source sans pro)
    [x] landing page
    [x] sound fx
    [x] more problems
    [x] hosting
    [x] timer issue - (same window/different window - need to document)
    [x] codemirror issues
    [x] compress audio
    [x] fonts
    [x] beta testing
    [x] instructions + screenshots
    [x] commenting
    [x] documentation
    [x] video
*/

/*
    General Term Note: 
    'client' refers to the present user, while 'player' refers to a specifc user (generally its index or data being passed as 
    parameter). Both terms are referred to as such in code (variable names for this file, doesn't apply to app.js) and comments.
*/

function isProperNumberInput(evt){
    if (evt.charCode >= 48 && evt.charCode <= 57)
        return true;
    else
        return false;
}

/*
    isProperNumberInput is called when a character is entered in the gameId text input (onkeypress), returns false the
    character is not a valid number therefore not allowing .
*/

function loadHostJoinPrompt(mode){
    //mode.addClass("active");
    //the above does not work as (mode) may be the buttons instead, therefore will not make the navBarButtons active
    $(document.body).children().not(".navbar").not(".top-right").detach();
    if (mode.attr("id") == "hostGameButton")
    {
        $("#hostGameButton").addClass("active");
        $("#joinGameButton").removeClass("active");
        $("#instructionsButton").removeClass("active");
        $(document.body).append($("#host-game-template").html());
    }else{
        $("#joinGameButton").addClass("active");
        $("#hostGameButton").removeClass("active");
        $("#instructionsButton").removeClass("active");
        $(document.body).append($("#join-game-template").html());
    }
}

/*
    loadHostJoinPrompt essentially loads either the host or join game screens, depending on what mode's (HTML element) id is.
    The other two nav bar buttons remove their 'active' class in case they were highlighted earlier.
*/

function confirmGame(isJoin){
    var gameId;
    var nameInputId;
    if (isJoin){
        gameId = $("#gameInput").val();
        nameInputId = "#joinNameInput";
    }else{
        gameId = Math.round((Math.random() * 99000) + 1000);
        nameInputId = "#nameInput";
        isHost = true;
    }

    name = $(nameInputId).val();
    if (!gameId || !name){
        invalidInput("empty");
        isHost = false;
        name = "";
    }else
        socket.emit("joinHostGame", gameId.toString(), name, isJoin, isHost,
         (($("#gameTypeDropdown").length != 0)? $("#gameTypeDropdown").text().trim() : ""));
}

/*
    confirmGame is called once the client selects either the 'Host' or 'Join' button after entering in the appropriate fields,
    "joinHostGame" is emitted assuming none of the fields are empty, otherwise will call invalidInput() presenting a notification 
*/

function invalidInput(inputType){
    var messageText;
    if (inputType == "empty")
        messageText = '<strong>Error!</strong> Please enter <strong>all</strong> info.';
    else if (inputType == "id")
        messageText = '<strong>Error!</strong> Not a valid Game ID!';
    else if (inputType == "name")
        messageText = '<strong>Error!</strong> Name is taken!';
    else if (inputType == "inProgress")
        messageText = '<strong>Error!</strong> Game already in progress!';
    else if (inputType == "maxPlayers")
        messageText ='<strong>Error!</strong> Game has max of 10 players!';
    presentNotification("danger", messageText);
    isHost = false;
}

/*
    invalidInput is called to present a notification regarding invalid input
    playSoundFx is called to play audio
*/

function playSoundFx(soundFx){
    var audio = new Audio("/audio/" + soundFx + ".mp3");
    audio.volume = 0.85;
    audio.play();
}

/////////(Skulpt functions)/////////

function sOutput(text){
    $("#programOutputField").append(text);
}

function builtInRead(x){
    if (Sk.builtinFiles === undefined || Sk.builtinFiles["files"][x] === undefined)
        throw "File not found: '" + x + "'";
    return Sk.builtinFiles["files"][x];
}

function sInput(prompt){
    return new Promise((resolve, reject) => {
        var inputLines = $("#programInputField").val().split("\n");
        //console.log($("#programInputField").val());
        //console.log(inputLines);
        resolve(inputLines[0]);
        inputLines.shift();
        $("#programInputField").val("");
        for (var i = 0; i < inputLines.length; i++){
            var currentInputFieldVal = $("#programInputField").val();
            $("#programInputField").val(currentInputFieldVal + ((i != 0)? "\n" : "")  + inputLines[i]);
            
        }

    });
}

////////////////////////////////////

/*
    The above functions all relate to Skulpt (in browser client-side Python implementation)
    sOutput and sInput are called whenever stdInput or stdOutput are required.
    buildInRead for reading files
    sInput essentially resolves each first line of the programInputField, taking the top line then rewriting the same input
    (minus the first line) back onto the textfield for when the function is called again
*/

function runCodeListener(){
    var program = editor.getValue();
    $("#programOutputField").html("");
    Sk.pre = "output";
    Sk.configure({output:sOutput, read:builtInRead, inputfun:sInput, inputfunTakesPrompt: true});
    var prom = Sk.misceval.asyncToPromise(function(){return Sk.importMainWithBody("<stdin>", false, program, true);});
    prom.then(function(mod){},
       function(err){
       $("#programOutputField").text(err.toString());
    });
}

function getEditorCharCount(){
    var accumCharCount = 0;
    for (var i = 0; i < editor.lineCount(); i++)
        accumCharCount += editor.getLine(i).replace(/\s/g, "").length;
    return accumCharCount;
}

function initCurrentProblem(){
    var currentProblemNumStr = (problemSet.indexOf(currentProblem) + 1).toString();
    $.getJSON("/problems.json", function(data){
        $("#outlineHeader").text(((problemSet.length == 1)? "" : "Q" + currentProblemNumStr + ": ") +
         data[((problemSet.length != 1)? "problems" : "majorProblems")][currentProblem].outline);
        $("#problemInfoElement").html(data[((problemSet.length != 1)? "problems" : "majorProblems")][currentProblem].info);
    });

}

/*
    runCodeListener is called to configure and then run skulpt, printing the output to the programOutputField
    getEditorCharCount returns the amount of characters currently in the editor, using regex to remove spaces
    initCurrentProblem is called to load the current problem, setting up problem info and the outline.
*/

function checkTestCases(problem){
    var numCorrectCases = 0;
    var numCases;
    var successBadge = "<span class='label label-success'>Correct!</span>";
    var incorrectBadge = "<span class='label label-danger'>Incorrect.</span>";
    var problemType = [((problemSet.length != 1)? "problems" : "majorProblems")];

    $.getJSON("/problems.json", function(data){
        $.each(data[problemType][problem].testCases, function(index, val){
            setTimeout(function(){
                $("#programInputField").val(val.input);
                runCodeListener();
                setTimeout(function(){
                    $("<p class='text-center'>" +
                     (($("#programOutputField").text().trim() == val.output)? ("Test Case Successful!  " +
                      successBadge) : ("Test Case Unsuccessful.  " + incorrectBadge)) +
                      "</p>").hide().appendTo("#testCases").delay(500 * (data[problemType][problem].testCases.indexOf(val) +
                       1)).slideDown();
                    //can use of trim() be fixed later?
                    console.log($("#programOutputField").text().trim());
                    console.log(val.output);
                    if ($("#programOutputField").text().trim() == val.output)
                        numCorrectCases++;

                }, 10 * (index+1));
            }, 500 * (index+1));

        });
        setTimeout(function(){
            numCases = data[problemType][problem].testCases.length;
            var correct = false;
            if (numCorrectCases == numCases)
                correct = true;
            $("#subFrac").text(numCorrectCases.toString() + "/" + numCases.toString());
            $("#subFrac").removeClass("hidden").hide().delay(numCases * 500).slideDown();
            $("#subVerdict").text(((correct)? "Correct!" : "Incorrect!"));
            $("#subVerdict").addClass((correct)? "text-success"
             : "text-danger").removeClass((correct)? "text-danger"
              : "text-success").removeClass("hidden").hide().delay((numCases * 500) + 500).slideDown();
            $("#sameProblem").removeClass("hidden").hide().delay((numCases * 500) + 500).slideDown();
            setTimeout(function(){playSoundFx((correct)? "correct" : "incorrect");}, ((numCases * 500) + 500));
            if (correct){
                //socket.emit("emitToAllClientsInRoom", "updatePlayerStats", currentGameId, clientIndex, getEditorCharCount());
                $("#nextProblem").removeClass("hidden").hide().delay((numCases * 500) + 500).slideDown();
            }else{
                setTimeout(function(){
                    socket.emit("emitToAllClientsInRoom", "genericUniversalNotification", currentGameId, "danger", ("<strong>" +
                     name + "</strong>" + " attempted and failed <strong>Q" + (problemSet.indexOf(currentProblem)+1).toString() +
                      "</strong>!"));
                    socket.emit("emitToAllClientsInRoom", "updatePlayerStats", currentGameId, clientIndex, 0);
                }, 750 * data[problemType][problem].testCases.length);
            }

        }, 700 * data[problemType][problem].testCases.length);
    });
}

/*
    checkTestCases checks the client's program against the current problem's test cases. The test cases are run the same 
    way if the client hit the 'Run' button. There is a time delay between each test case so each one can be checked properly. 
*/

function prelimReset(){
    $("#programInputField").val("").show();
    $("#programOutputField").empty().show();
    $("#submitModal").modal("hide");
    $("#sameProblem").addClass("hidden");
    $("#nextProblem").addClass("hidden");
}

function presentNotification(theme, messageText){
     $(".top-right").notify({
        type: theme,
        message: {html: messageText},
        closable: false
    }).show();
}

/*
    prelimReset is called once the client has hit the 'Next' problem button. Essentially unhides the input/output boxes and hides
    the modals and their components.
    presentNotification presents a notification given specific arguments passed to it.
*/

function presentResultsScreen(){
    $(document.body).append($("#results-screen").html());
    var lowestFailedTrials = Infinity;
    var lowestCharCount = Infinity;
    var subWinLabel = '<span class="label label-warning">Best</span>';

    for (var i = 0; i < clientList.length; i++)
    {
        if (clientList[i].placing >= 1 || clientList[i].placing <= 3)
        {
            $("#" + clientList[i].placing.toString() + "Header").removeClass("hidden").append("<small> - " +
             clientList[i].userName + "</small>");
            $("#" + clientList[i].placing.toString() + "Jumbo").append('<p id="' + clientList[i].userName.replace(/\s/g, "") +
             'failed">Failed Submissions: ' + clientList[i].failedTrials + '</p>');
            $("#" + clientList[i].placing.toString() + "Jumbo").append('<p id="' + clientList[i].userName.replace(/\s/g, "") +
             'char">' + "Total Char Count: " + clientList[i].charCount + '</p>');
        }

        lowestFailedTrials = (clientList[i].failedTrials <= lowestFailedTrials)? clientList[i].failedTrials : lowestFailedTrials;
        lowestCharCount = (clientList[i].charCount <= lowestCharCount)? clientList[i].charCount : lowestCharCount;
    }

    for (var i = 0; i < clientList.length; i++){
        $("#" + clientList[i].userName.replace(/\s/g, "") + "failed").append((clientList[i].failedTrials == lowestFailedTrials)? " " +
         subWinLabel : "");
        $("#" + clientList[i].userName.replace(/\s/g, "") + "char").append((clientList[i].charCount == lowestCharCount)? " " + subWinLabel : "");
    }

    if (clientList[clientIndex].placing == 1)
        playSoundFx("win");
    else
        playSoundFx("loss");

    socket.emit("exitRoom", currentGameId);
}

/*
    presentResultsScreen shows the game results screen, presenting the first three places (1st, 2nd, 3rd) in order of who finished
    first as well presenting 'Best' badges to those with least in number of total characters and failed submissions.

    loadLobbyList is called to load the list of current games.

*/

function loadLobbyList(lobbyDict){
    $("#lobbyList").empty();
    var liPrefix = '<a href="#" class="list-group-item lobbyOption';
    $.each(lobbyDict, function(index, val){
        var indexGameType = val[0].gameType;
        if (val.length == 10)
            $("#lobbyList").append(liPrefix + ' list-group-item-danger">' + index + ' -  <strong>(MAX PLAYERS)</strong>' + '</a>');
        else if (val.indexOf("IN PROGRESS") == -1)
            $("#lobbyList").append(liPrefix + ' list-group-item-success">' + index +
             ' | <strong>' + indexGameType + ' (' + val.length.toString() + '/10 players)</strong></a>');
        else
            $("#lobbyList").append(liPrefix + ' list-group-item-danger">' + index + ' -  <strong>(IN PROGRESS)</strong>' + '</a>');
    });
    if ($("#lobbyList").children().length == 0)
        $("#lobbyList").append('<li class="list-group-item">' +
         "Currently no games; try <strong>refreshing</strong> or host one <strong>yourself</strong>!" + '</li>');
}

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

$(document).ready(function(){
    $(document.body).append($("#title-screen").html());
    $(document).on("click", "#homeBrand", function(){
        $(document.body).children().detach();
        $(document.body).append($("#title-screen").html());
    });
    $(document).on("click", "#hostGameButton, #joinGameButton", function(){loadHostJoinPrompt($(this));});
    $(document).on("click", "#hostConfirm", function(){confirmGame(false);});
    $(document).on("click", "#joinConfirm", function(){confirmGame(true);});
    $(document).on("click", "#lobbySelectionButton, #refreshLobbyListButton", function(){socket.emit("requestLobbyList");});
    $(document).on("click", ".lobbyOption", function(){
        if ($(this).hasClass("list-group-item-success"))
            $("#gameInput").val($(this).text().split(" ")[0]);
    });

    $(document).on("click", "#instructionsButton", function(){
        $(document.body).children().not(".navbar").not(".top-right").detach();
        $(this).addClass("active");
        $("#hostGameButton").removeClass("active");
        $("#joinGameButton").removeClass("active");
        $(document.body).append($("#instructions-screen").html());
    });

    socket.on("getLobbyList", function(lobbyDict){loadLobbyList(lobbyDict);});
    socket.on("invalidInput", function(inputType){invalidInput(inputType);});

    /*
        The following above are jQuery and Socket.IO event listeners. The jQuery ones listen for "click" events on
        various HTML elements, while Socket.IO listen for socket events from app.js ('server').
    */
    
    //LOBBY AND GAME:
    socket.on("connectedToRoom", function(gameId, users){
        playSoundFx("connect");
        $(document.body).children().not($(".top-right")).detach();
        //if (currentGameId == undefined || currentGameId == 0)
        $(document.body).append($("#lobby-screen").html());
        //else
          //  $(".lobbyScreenEncapdiv").show();
        currentGameId = gameId;

        /*if ($("#gameTypeDropdownDiv").hasClass("hidden"))
        {
            $("#gameTypeDropdownDiv").removeClass("hidden");
        }*/
            
        if (!isHost){
            $("#startGame").addClass("disabled");
            $("#startGame").text("Only Host can start the game");
            $("#gameTypeDropdown").hide();
        }
        $("#idHeader").text("Game ID: " + gameId);

        clientList = users;
        $("#clientList").empty();
        gameType = users[0].gameType;

        for (var i = 0; i < users.length; i++){
            if (users[i].userName == name)
                clientIndex = i;
            $("#clientList").append('<li class="list-group-item">' + users[i].userName + '</li>');
        }
        $("#gameTypeHeader").text("Game Type: '" + gameType + "'");
    });

    /*
        "connectedToRoom" another Socket.IO event listener sets up the lobby for the client, everytime time a new player
        joins or player leaves, the "connectedToRoom" event is resent from app.js ('server') therefore this function
        is invoked and the lobby is reloaded.

        The below jQuery event listener emits "gameSettings" socket event to app.js when the host hits the 
        startGame button, therefore setting up the appropriate problems based off the gametype and starting the game.
    */

    $(document).on("click", "#startGame", function(){
        if (!$(this).hasClass("disabled") && clientList.length > 1)
        {
            socket.emit("gameSettings", currentGameId, gameType);
        }else if (clientList.length == 1)
        {
            presentNotification("danger", "Need more than <strong>1 player</strong> to start!");
        }
    });
    
    socket.on("startGame", function(problems){
        $(document.body).children().not($(".top-right")).detach();
        $(document.body).append($("#editor-components").html());
        editor = CodeMirror(function(elt){
            document.getElementById("mirrorContainer").replaceChild(elt, document.getElementById("codeEditor"));
        },{
            mode: "python",
            styleActiveLine: true,
            lineNumbers: true,
            lineWrapping: true,
            indentWithTabs: true,
            smartIndent: false,
            value: '#Enter your Python Code...\n#Input goes in the textbox below before hitting "Run"\n#Once ready, hit "Submit"!'
        });

        problemSet = problems;
        currentProblem = problemSet[0];
        initCurrentProblem();
        console.log(gameType);
        //alert($("#timerBar").css("width"));
        //$("#timerBar").animate({width: "20%"}, 5000);
        $("#timerBar").animate({width: "0%"},{progress: function(a, p, ms){
            $(this).text(Math.floor(ms / 1000) + " seconds left");
        }, complete: function(){
            $(document.body).children().not($(".top-right")).detach();
            //$(document.body).children().hide();
            presentNotification("danger", "Time has ended!");
            presentResultsScreen();
        }, duration: ((gameType != "5 Small Problems")? 600000 : 900000)});

        for (var i = 0; i < clientList.length; i++)
        {
            $("#gameClientList").append('<p>' + clientList[i].userName + '      <span class="label label-default" id="' +
             clientList[i].userName.replace(/\s/g, "") + '"">On Q' +
             1 + '</span>' + '</p>');
        }

        presentNotification("success", "Game has started!");

    });

    /*
        The "startGame" socket event listener essentially sets up all of the front end components of the game editor screen
        for the client. CodeMirror is initialised here, as well as the timer bar's animation.
    */

    $(document).on("click", ".editorThemeOption", function(){
        editor.setOption("theme", $(this).attr("id"));
        $("#themeDropdown").html($(this).text() + ' <span class="caret"></span>');
    });

    $(document).on("click", ".gameTypeOption", function(){
        $("#gameTypeDropdown").html($(this).text() + ' <span class="caret"</span>');
    });

    /*
        These jQuery event listeners above apply to the editor and gametype dropdown options. On clicking them they change
        their corresponding dropdown to said option. In the editorThemeOption's case, the editor theme is also changed accordingly.
    */

    $(document).on("click", "#runCode", runCodeListener);

    $(document).on("click", "#submitCode", function(){
        $("#programInputField").hide();
        $("#programOutputField").hide();
        checkTestCases(currentProblem);
        $("#testCases").empty();
        $("#subFrac").empty();
        $("#subVerdict").empty();
        $(document.body).append($("#modal-component").html());
        $("#submitModal").modal({backdrop: "static", keyboard: false});
        $("#submitModal").modal("show");
    });

    $(document).on("click", "#sameProblem", prelimReset);

    $(document).keydown(function(e){
        if ($("#submitModal").hasClass("in"))
            e.preventDefault();
    });

    /*
        The "runCode" and "submitCode" listeners are invoked when either the "Run" or "Submit button are hit". For runCode
        runCodeListener() is called. For submitCode a modal is shown, user control is locked (the keydown jQuery listener)
        and input/output boxes are hidden. checkTestCases is called. For "sameProblem" prelimReset() is called.
    */

    $(document).on("click", "#nextProblem", function(){
        socket.emit("emitToAllClientsInRoom", "updatePlayerStats", currentGameId, clientIndex, getEditorCharCount());
        prelimReset();
        editor.setValue("#keep going!");
        var newProbIndex = problemSet.indexOf(currentProblem) + 1;
        if (!(newProbIndex == problemSet.length)){
            currentProblem = problemSet[newProbIndex];
            initCurrentProblem();
        }else{
           $(document.body).children().not($(".top-right")).not($(".progress")).detach();
           $(document.body).append($("#finished-round").html());
           //$(document.body).children().hide();
        }
        socket.emit("emitToAllClientsInRoom", "updatePlayerStatus", currentGameId, clientIndex, newProbIndex + 1);

    });

    /*
        The jQuery event listener above is invoked when the client hits the "Next" button. Calling prelimReset() and emitting to
        all clients within the same room to update the badge/label showing that this player has moved onto the next problem or
        finished. If however the client has finished, then the "finished-round" page is displayed.
    */

    socket.on("updatePlayerStatus", function(playerIndex, probNum){
        var playerFinished = false;
        if (probNum == problemSet.length + 1){
            playerFinished = true;
            var highestPlacing = 0;
            for (var i = 0; i < clientList.length; i++)
            {
                if (clientList[i].placing > highestPlacing)
                    highestPlacing = clientList[i].placing;
            }
            clientList[playerIndex].placing = highestPlacing + 1;
            if (highestPlacing + 1 == clientList.length)
            {
                $(document.body).children().not($(".top-right")).detach();
                presentNotification("danger", "Game has ended!");
                presentResultsScreen();
            }   
            //alert((highestPlacing + 1).toString() + " : " + clientList.length);
        }
        presentNotification("info", ("<strong>" + clientList[playerIndex].userName + "</strong>" +
         ((!playerFinished)? " is now on <strong>Q" + probNum + "</strong>!" : " has finished!")));
        $("#" + clientList[playerIndex].userName.replace(/\s/g, "")).text((!playerFinished)? "On Q" + probNum : "Finished!");
        console.log("probNum is " + probNum);
    });

    /*
        "updatePlayerStatus" is called when the client receives said socket event from app.js and updates the appropriate
        player's status in the game to other clients and presents a notification as well, what new problem they're on
        or that they've finished. 
    */

    socket.on("removePlayerStatus", function(playerIndex){
        playSoundFx("disconnect");
        if ($("#" + clientList[playerIndex].userName.replace(/\s/g, "")).length)
            $("#" + clientList[playerIndex].userName.replace(/\s/g, "")).text("DISCONNECTED");
        else{
            $(".list-group-item").each(function(){
                if ($(this).text() == clientList[playerIndex].userName)
                    $(this).remove();
            });
        }

        clientList.splice(playerIndex, 1);
        if (clientIndex > playerIndex)
            clientIndex -= 1;

        if (clientIndex == 0)
        {
            isHost = true;
            $("#startGame").removeClass("disabled");
            $("#startGame").text("Start Game!");
            $("#gameTypeDropdown").show();
        }

    });

    /*
        "removePlayerStatus" essentially is called when a player disconnects. Removing their status (showing "DISCONNECTED" as
        their badge). Reassortment of clientIndexes and the new host (if reassigned) will now have access to start the game as 
        well as game type settings.

        "updatePlayerStats" updates the appropriate player's stats, either their total character count or if its zero, then their
        number of failed trials.
    */

    socket.on("updatePlayerStats", function(playerIndex, charCountToBeAdded){
        if (charCountToBeAdded == 0)
            clientList[playerIndex].failedTrials++;
        else
            clientList[playerIndex].charCount += charCountToBeAdded;
    });

    socket.on("genericUniversalNotification", function(theme, message){
        presentNotification(theme, message);
    });

    $(document).on("click", "#finishGameButton", function(){
        $(document.body).children().not($(".top-right")).detach();
        $(document.body).append($("#title-screen").html());
        //TODO (IS IT NECESSARY?) clear all client data
        //or just:
        isHost = false;
        currentGameId = 0;
        gameType = "";
    });

    /*
        "genericUniversalNotification" calls presentNotification passing in the appropriate parameters, since this is a socket
        event listener all clients shall see the notification.

        The last jQuery event listener is called when the client hits the exit button out of the game results screen, resetting
        client data and representing the main title screen.
    */

});