'use strict';
var Alexa = require('alexa-sdk');

/**
 * Alexa Skill App ID
 */
var APP_ID = 'amzn1.ask.skill.ab98ce03-0b6c-4aed-a589-118b10880389';

/**
 * Used to send GET request to Wikipedia API
 */
var https = require('https');

/**
 * The AlexaSkill Module that has the AlexaSkill prototype and helper functions
 */
var AlexaSkill = require('./AlexaSkill');

/**
 * URL prefix to download music content from Wikipedia
 */
var urlPrefix = 'https://en.wikipedia.org/w/api.php?action=query&prop=extracts&format=json&explaintext=&exsectionformat=plain&redirects=&titles=';

/**
 * MusicBuffSkill is a child of AlexaSkill.
 * To read more about inheritance in JavaScript, see the link below.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Introduction_to_Object-Oriented_JavaScript#Inheritance
 */
var MusicBuffSkill = function() {
    AlexaSkill.call(this, APP_ID);
};

// Extend AlexaSkill
MusicBuffSkill.prototype = Object.create(AlexaSkill.prototype);
MusicBuffSkill.prototype.constructor = MusicBuffSkill;

MusicBuffSkill.prototype.eventHandlers.onSessionStarted = function (sessionStartedRequest, session) {
    console.log("MusicBuffSkill onSessionStarted requestId: " + sessionStartedRequest.requestId
        + ", sessionId: " + session.sessionId);

    // any session init logic would go here
};

MusicBuffSkill.prototype.eventHandlers.onLaunch = function (launchRequest, session, response) {
    console.log("MusicBuffSkill onLaunch requestId: " + launchRequest.requestId + ", sessionId: " + session.sessionId);
    getWelcomeResponse(response);
};

MusicBuffSkill.prototype.eventHandlers.onSessionEnded = function (sessionEndedRequest, session) {
    console.log("onSessionEnded requestId: " + sessionEndedRequest.requestId
        + ", sessionId: " + session.sessionId);

    // any session cleanup logic would go here
};

MusicBuffSkill.prototype.intentHandlers = {

    "GetFirstEventIntent": function (intent, session, response) {
        handleFirstEventRequest(intent, session, response);
    },

    "GetNextEventIntent": function (intent, session, response) {
        handleNextEventRequest(intent, session, response);
    },

    "AMAZON.HelpIntent": function (intent, session, response) {
        var speechText = "With Music Buff, you can get information for any artist on Wikipedia. " +
            "For example, you could say Beach House or Green Day. Now which artist do you want to know more about?";
        var repromptText = "Which artist do you want to know more about?";
        var speechOutput = {
            speech: speechText,
            type: AlexaSkill.speechOutputType.PLAIN_TEXT
        };
        var repromptOutput = {
            speech: repromptText,
            type: AlexaSkill.speechOutputType.PLAIN_TEXT
        };
        response.ask(speechOutput, repromptOutput);
    },

    "AMAZON.StopIntent": function (intent, session, response) {
        var speechOutput = {
                speech: "Goodbye",
                type: AlexaSkill.speechOutputType.PLAIN_TEXT
        };
        response.tell(speechOutput);
    },

    "AMAZON.CancelIntent": function (intent, session, response) {
        var speechOutput = {
                speech: "Goodbye",
                type: AlexaSkill.speechOutputType.PLAIN_TEXT
        };
        response.tell(speechOutput);
    }
};

/**
 * Function to handle the onLaunch skill behavior
 */

function getWelcomeResponse(response) {
    // If we wanted to initialize the session to have some attributes we could add those here.
    var cardTitle = "Music Buff your expert in all things music";
    var repromptText = "With Music Buff, you can get information about any artist. For example, you could say Beach House or Tame Impala. Now, which artist do you want to learn about?";
    var speechText = "<p>Music buff.</p> <p>What artist do you want to learn more about?</p>";
    var cardOutput = "Music Buff. What artist do you want to learn more about?";
    // If the user either does not reply to the welcome message or says something that is not
    // understood, they will be prompted again with this text.

    var speechOutput = {
        speech: "<speak>" + speechText + "</speak>",
        type: AlexaSkill.speechOutputType.SSML
    };
    var repromptOutput = {
        speech: repromptText,
        type: AlexaSkill.speechOutputType.PLAIN_TEXT
    };
    response.askWithCard(speechOutput, repromptOutput, cardTitle, cardOutput);
}


/**
 * Returns formatted artist string to search for the correct Artist query on Wikipedia.
 *   - Underscores instead of space delimiter and title cased string
 * Example:
 *      {input}  - String - beach house
 *      {output} - String - Beach_House
 */
function formatArtistString(artist){
  if (artist.indexOf(' ') == -1 ) return artist;

  return artist.split(' ')
               .map(function (x) { return x.charAt(0).toUpperCase() + x.substring(1, x.length)})
               .join('_');
}

/**
 * Gets a poster prepares the speech to reply to the user.
 */
function handleFirstEventRequest(intent, session, response) {
    var artistSlot = intent.slots.artist;
    var repromptText = "With Music Buff, you can get information about any artist. For example, you could say Beach House or Tame Impala. Now, which artist do you want to learn about?";
    var sessionAttributes = {};
    sessionAttributes.index = 1;
    var artist = "";

    // If the user provides an artist, then use that, otherwise use Nickelback
    if (artistSlot && artistSlot.value){
      artist = new String(formatArtistString(artistSlot.value));
    } else {
      artist = new String("Nickelback");
      // artist = new String("Rick_Astley");
    }

    getJsonArtistInfoFromWikipedia(artist, function(description) {
      var speechText = "";

      if (description.length == 0) {
        speechText = "There is a problem connecting to Wikipedia at this time. Please try again later.";
      } else {
        speechText = description;
      }
      response.tell(speechText);
    });
}

/**
 * Calls Wikipedia API with a query for an artist and parses the json response and sends
 *    the parsed description of the artist in a callback function.
 */
function getJsonArtistInfoFromWikipedia(artist, eventCallback){
  var url = urlPrefix + artist;

  https.get(url, function(res) {
    var body = '';

    res.on('data', function(chunk) {
      body += chunk;
    });

    res.on('end', function() {
      var stringResult = parseArtistJson(body);
      eventCallback(stringResult);
    });

  }).on('error', function(e) {
    console.log("Got error: ", e);
  });
}

/**
 * Parses description from artist Json
 */
function parseArtistJson(inputText){
  // var len = "\""extract\":\"".length;
  var text = inputText.substring(inputText.indexOf("\"extract\":\"")+11, inputText.indexOf("\\n\\n"));
  // var text = inputText.substring(0, inputText.indexOf("\\n\\n"));
  return text;
}


// Create the handler that responds to the Alexa Request.
exports.handler = function (event, context) {
    // Create an instance of the MusicBuff Skill.
    var skill = new MusicBuffSkill();
    skill.execute(event, context);
};
