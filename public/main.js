// Class to represent in a data a Tile
class GameTile
{
    constructor(_typeOfTile)
    {
        // The type wiil be a simple number index (0 -> 17)
        this.Type = _typeOfTile;
        this.IsRevealed = false;

        this.DOMTileElement = null;
    }
}

// ============ SOCKET IO ============ 
var socket = io();

// ============ TIMER ============ 
// Duration in seconds : N * 60 seconds = X minutes
const DurationGame = 3 * 60; 

// Used to compute the duration of the game
var StartDateGame;
var StoppedDateGame;
var IntervalUpdateTimer;


// ============ TILES ============ 
const NumberOfTypeOfTiles = 18;
const NumberOfRows = 4;

// We will stock all the tiles of the game to foreach them when needed
var TilesOfTheGame = []; 

// Stock the tiles clicked by pair to compare them and check if they match or not
var FirstObjectTileSelected = null;
var SecondObjectTileSelected = null;


// ============ GAME STATE ============ 
var IsGameRunning = false;
var IsHidingTiles = false;
var GameStarted = false;


// ============ DOM ELEMENTS ============ 
var HighScoreBoardElement = $("#highScoreBoard");
var GameBoardElement = $("#gameBoard");
var TimerForegroundElement = $("#timerForeground");
var TimerTextElement = $("#timerText");
var TileReferenceElement = $("#tileReference");



$( document ).ready(function(){

    InitGame();

    // Listen click event on every element of the page
    $("*").click(OnClickPage);

    // Listen to the click event on all tiles elements
    $(".tile").click(OnClickElement);

    // Listen socket io on when highscores are sent
    socket.on('sendHighscore', (data) => {

        // Create text in highscoreboard to display
        for (let index = 0; index < data.highscores.length; index += 1)
        {
            let score = data.highscores[index];
            HighScoreBoardElement.append("<p>" + score + " s</p>");
        }
    });

    /* NOTE : if we don't want to use the transition trick to animate the timer
    *    |_ we can use the setInterval() function to create an update function called every X milliseconds
    *    |_ here we only update the text of the timer every 100 milliseconds
    *    |_ and we can stock the interval function to stop it later
    */
    IntervalUpdateTimer = setInterval(function()
    {
        if (IsGameRunning)
            TimerTextElement.text(GetElapsedTimeInSeconds().toFixed(1));
    }, 100)
});

function OnClickPage()
{
    // We hide the highscore board and start the game
    if (!GameStarted)
    {
        HighScoreBoardElement.css("top", "-500px");
        HighScoreBoardElement.css("opacity", "0");
        
        StartGame();
    }
}

function InitGame()
{
    // create all new tiles
    // We go through all the type of tiles times 2 (a pair of each type)
    for (let tileNumber = 0; tileNumber < NumberOfTypeOfTiles * 2; tileNumber += 1)
    {
        // To get the type number we simply assign the tile current number divided by 2 (as it was multiplied by 2 for the loop) rounded down
        //   |_ that way we have the type value going from 0 to NumberOfTypeOfTiles - 1
        let typeOfTile = Math.floor(tileNumber * 0.5);
        let newTile = new GameTile(typeOfTile);
        TilesOfTheGame.push(newTile);
    }

    // We shuffle the array
    TilesOfTheGame = ShuffleArray(TilesOfTheGame);
    
    // We generate the element + add it to the DOM
    for (let index = 0; index < TilesOfTheGame.length; index += 1)
    {
        // create the tile by cloning our reference element
        let newDOMTileElement = TileReferenceElement.clone();
        TilesOfTheGame[index].DOMTileElement = newDOMTileElement;

        // remove the ID specifying the reference one
        newDOMTileElement.removeAttr("id");

        // We stock the index in a value attribute
        newDOMTileElement.attr("value", index);

        // set the position to crop at the right element
        //  |_ we move the image to the top like a mini scroll
        //  |_ the value offset is the type of tile * height of tile
        //       |_ NOTE : we cannot use the height of the newly created tile as the height is not set at this right moment
        let offsetTop = -(TilesOfTheGame[index].Type * TileReferenceElement.height());
        let imageElement = newDOMTileElement.find("img");
        imageElement.css("top", offsetTop + "px");

        // add to the DOM
        GameBoardElement.append(newDOMTileElement);
    }

    // Set the width of the board based on the number of tiles
    //  |_ Firstly the total width = numberOfTiles * width of 1 tile
    //       |_ outerWidth(true) return the width of the element + width of the margin
    //  |_ Secondly we devide by the number of rows we want to have the width of 1 row.
    let totalWidth = TilesOfTheGame.length * TileReferenceElement.outerWidth(true);
    GameBoardElement.css("width", totalWidth / NumberOfRows);
}

function StartGame()
{
    GameStarted = true;
    IsGameRunning = true;

    // start timer
    StartDateGame = Date.now();

    // css animation - check CSS code to understand this trick and the pros / cons of this
    TimerForegroundElement.css("transition-duration", DurationGame + "s");
    TimerForegroundElement.css("width", "100%");

    // Trigger a callback when the timer is finished
    //  |_ the delay is in milliseconds so we multiply our duration in seconds by 1000
    setTimeout(OnTimerFinished, DurationGame * 1000);
}

function OnClickElement(_event)
{
    // Process only if the game is running && no tiles are hiding
    if (IsGameRunning && !IsHidingTiles)
    {
        // We get back the element with event attached to that has been clicked
        let currentElementClicked = $(this);
        let currentObjectClicked = GetObjectTileFromElement(currentElementClicked);

        if (currentObjectClicked == null)
        {
            Console.log("Error no such element with attribute value = " + currentElementClicked.attr('value'));
            return;
        }

        // Do not allow to click on already revealed tile
        if (currentObjectClicked.IsRevealed)
            return;

        // Is it the first of a pair ?
        if (FirstObjectTileSelected == null)
        {
            FirstObjectTileSelected = currentObjectClicked;
            ShowTile(FirstObjectTileSelected.DOMTileElement);
        }
        // Or the second one ? (also check if not clicked twice on the same tile)
        else if (SecondObjectTileSelected == null && currentObjectClicked != FirstObjectTileSelected)
        {
            SecondObjectTileSelected = currentObjectClicked;
            ShowTile(SecondObjectTileSelected.DOMTileElement);
        }

        // If a pair is consituted
        if (FirstObjectTileSelected != null && SecondObjectTileSelected != null)
        {
            if (AreTileMatching(FirstObjectTileSelected, SecondObjectTileSelected))
            {
                // Flag the tiles revealed
                FirstObjectTileSelected.IsRevealed = true;
                SecondObjectTileSelected.IsRevealed = true;

                // check if game is ended
                if (IsGameWon())
                    StopGame();

                // reset selected tiles
                FirstObjectTileSelected = null;
                SecondObjectTileSelected = null;
            }
            else
            {
                // Hide the tiles after a brief moment (1000 millisecond = 1 second)
                IsHidingTiles = true;

                setTimeout(function ()
                {
                    HideTile(FirstObjectTileSelected.DOMTileElement);
                    HideTile(SecondObjectTileSelected.DOMTileElement);

                    // reset selected tiles
                    FirstObjectTileSelected = null;
                    SecondObjectTileSelected = null;

                    IsHidingTiles = false;
                }, 500);
            }
        }
    }
}

function OnTimerFinished()
{
    if (IsGameRunning)
    {
        IsGameRunning = false;

        clearInterval(IntervalUpdateTimer);

        setTimeout(function()
        {
            alert("Timer is finished, Sorry");
        }, 300);
    }
}

function StopGame()
{
    IsGameRunning = false;

    clearInterval(IntervalUpdateTimer);

    StoppedDateGame = Date.now();

    // The score is the elapsed time divided by 1000 as Date.now() return the time in milliseconds and we want to print it in seconds
    let score = GetElapsedTimeInSeconds();
    // And we truncate 1 number after decimal
    score = score.toFixed(1);

    // lastly update the text in timer
    TimerTextElement.text(score);

    // Visually stops the timer by getting its current width and set it + reset the transition duration
    TimerForegroundElement.css("width", TimerForegroundElement.width() + "px");
    TimerForegroundElement.css("transition-duration", "0s");

    // Send score via socket io to server
    socket.emit('registerScore', {
        score : score,
    })

    // Wait before alerting -> pause the css transition animation
    setTimeout(function()
    {
        alert("Yeah you won in : " + score + " seconds");
    }, 300);
}

function GetElapsedTimeInSeconds()
{
    return (Date.now() - StartDateGame) / 1000;
}

function GetObjectTileFromElement(_tileElement)
{
    // We get back our class object by comparing the value attribute
    for (let index = 0; index < TilesOfTheGame.length; index += 1)
    {
        if (_tileElement.attr("value") == index)
            return TilesOfTheGame[index];
    }

    return null;
}

function AreTileMatching(_objectTileA, _objectTileB)
{
    return _objectTileA.Type == _objectTileB.Type;
}

function ShowTile(_tileElement)
{
    // fadeTo() allow to set the opacity with an animation
    _tileElement.find("img").fadeTo("fast", 1);
}

function HideTile(_tileElement)
{
    // fadeTo() allow to set the opacity with an animation
    _tileElement.find("img").fadeTo("fast", 0);
}

function IsGameWon()
{
    // We check if all tiles were revealed
    //   |_ we assume they are all revealed at first, then we go through all of them one by one
    //       |_ if one tile is not revealed so we can set the value to false and break to stop the loop
    let allTilesRevealed = true;
    for (let index = 0; index < TilesOfTheGame.length; index += 1)
    {
        if (!TilesOfTheGame[index].IsRevealed)
        {
            allTilesRevealed = false;
            break;
        }
    }

    return IsGameRunning && allTilesRevealed;
}

/*
* Utility function to shuffle an arary
* Implementation of Fisher–Yates Shuffle (better performance)
* Link : https://bost.ocks.org/mike/shuffle/
*/
function ShuffleArray(array)
{
    let index = array.length, tempValue, randomIndex;
  
    // While there remain elements to shuffle
    //  |_ as index reduce 1 by 1 and will reach 0 -> the while check will return false
    while (index) {
  
      // Pick a remaining element in the array
      //   |_ random() return a value from 0 to 1
      //   |_ so we get a random index from 0 to index
      randomIndex = Math.floor(Math.random() * index);

      // Reduce max index array for the next loop
      index -= 1;
  
      // And swap it with the current element.
      tempValue = array[index];
      array[index] = array[randomIndex];
      array[randomIndex] = tempValue;
    }
  
    return array;
}