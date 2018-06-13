/*jshint esversion: 6 */

/*
 *robotfindskitten: A Zen simulation
 *
 *Copyright (C) 1997,2000 Leonard Richardson 
 *                        leonardr@segfault.org
 *                        http://www.crummy.com/devel/
 *
 *Written as an Alexa Skill by Mohammad Arshad
 *			       arshad.comp@gmail.com
 *
 *   This program is free software; you can redistribute it and/or
 *   modify it under the terms of the GNU General Public License as
 *   published by the Free Software Foundation; either version 2 of
 *   the License, or (at your option) any later version.
 *
 *   This program is distributed in the hope that it will be useful,
 *   but WITHOUT ANY WARRANTY; without even the implied warranty of
 *   MERCHANTABILITY or EXISTANCE OF KITTEN.  See the GNU General
 *   Public License for more details.
 *
 *   http://www.gnu.org/copyleft/gpl.html
 *
 */

const Alexa = require("ask-sdk-core");
const https = require("https");



const invocationName = "find kitten";

const nki = require("./data/nonKittenItems.js");
const oi = require("./data/otherItems.js");

const NKI_COUNT = 20;
const MAX_X = 5;
const MAX_Y = 5;
const NEAR_BY_DISTANCE = 2;
const CLOSE_DISTANCE = 1;

var nonKittenItems = [];
var robot = {};
var kitten = {};

var locale = 'en';

const UP = 'up';
const DN = 'down';
const LT = 'left';
const RT = 'right';

// Session Attributes
//   Alexa will track attributes for you, by default only during the lifespan of your session.
//   The history[] array will track previous request(s), used for contextual Help/Yes/No handling.
//   Set up DynamoDB persistence to have the skill save and reload these attributes between skill sessions.

function getMemoryAttributes() {
  const memoryAttributes = {
       "history":[],

        // The remaining attributes will be useful after DynamoDB persistence is configured
       "launchCount":0,
       "lastUseTimestamp":0,

       "lastSpeechOutput":{},
       "nextIntent":[],

       "lastNki":{}

       // "favoriteColor":"",
       // "name":"",
       // "namePronounce":"",
       // "email":"",
       // "mobileNumber":"",
       // "city":"",
       // "state":"",
       // "postcode":"",
       // "birthday":"",
       // "bookmark":0,
       // "wishlist":[],
   };
   return memoryAttributes;
}

const maxHistorySize = 20; // remember only latest 20 intents


// 1. Intent Handlers =============================================

const CancelHandler =  {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest' && request.intent.name === 'AMAZON.CancelIntent' ;
    },
    handle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        const responseBuilder = handlerInput.responseBuilder;
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        let say = 'OK. '+ oi.exitSkillMessage();

        return responseBuilder
            .speak(say)
            .withShouldEndSession(true)
            .getResponse();
    },
};

const HelpHandler =  {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest' && request.intent.name === 'AMAZON.HelpIntent' ;
    },
    handle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        const responseBuilder = handlerInput.responseBuilder;
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        let previousIntent = getPreviousIntent(sessionAttributes);
        let say = oi.introduction().INTRO_SPEAK[0];
        if (previousIntent && !handlerInput.requestEnvelope.session.new) {
            //console.log('Your last intent was ' + previousIntent + '. ');
            if(previousIntent === 'MoveIntent') {
              say = 'Your pretty kitten is at '+getKittenDirection()+ ' with respect to you.';
            } else if (previousIntent === 'StartGameIntent') {
              say = oi.startGameReprompt();
            }
        }

        if (supportsDisplay(handlerInput) ) {
          const backgroundImage = new Alexa.ImageHelper()
            .addImageInstance(oi.nkiBackgroundImage())
            .getImage();

          const primaryText = new Alexa.RichTextContentHelper()
            .withPrimaryText(say)
            .getTextContent();

          responseBuilder.addRenderTemplateDirective({
            type: 'BodyTemplate1',
            token: 'string',
            backButton: 'HIDDEN',
            backgroundImage: backgroundImage,
            title: 'Robot Finds Kitten',
            textContent: primaryText,
          });
        }

        return responseBuilder
          .speak(say)
          .reprompt(say)
          .getResponse();
    },
};

const StopHandler =  {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest' && request.intent.name === 'AMAZON.StopIntent' ;
    },
    handle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        const responseBuilder = handlerInput.responseBuilder;
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        let say = oi.exitSkillMessage();

        return responseBuilder
            .speak(say)
            .withShouldEndSession(true)
            .getResponse();
    },
};

const MoveHandler =  {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest' && request.intent.name === 'MoveIntent' ;
    },
    handle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        const responseBuilder = handlerInput.responseBuilder;
        //let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        let steps = 1;
        let direction = UP;

        let slotValues = getSlotValues(request.intent.slots);

        if(slotValues.stepsCount) {
          if (slotValues.stepsCount.heardAs) {
            steps = parseInt(slotValues.stepsCount.heardAs, 10);
          }
        }

        if(slotValues.direction) {
          if (slotValues.direction.heardAs) {
            direction = getResolvedDirection(slotValues.direction.heardAs);
            if (slotValues.direction.ERstatus === 'ER_SUCCESS_MATCH') {
              direction  = getResolvedDirection(slotValues.direction.resolved);
            }
          }
        }

        //console.log('Vars: '+ steps + ' Direction: '+direction);
        let output = move(steps, direction);

        if (supportsDisplay(handlerInput) ) {
          const backgroundImage = new Alexa.ImageHelper()
            .addImageInstance(output.backgroundImage)
            .getImage();

          const image = new Alexa.ImageHelper()
            .addImageInstance(output.image)
            .getImage();

          const primaryText = new Alexa.RichTextContentHelper()
            .withPrimaryText(output.text)
            .getTextContent();

          responseBuilder.addRenderTemplateDirective({
            type: output.bodyTemplate,
            token: 'string',
            backButton: 'HIDDEN',
            backgroundImage: backgroundImage,
            image: image,
            title: output.title,
            textContent: primaryText,
          });
        }

        return responseBuilder
          .speak(output.speak)
          .reprompt(output.reprompt)
          .withShouldEndSession(output.shouldEndSession)
          .getResponse();
    },
};

// const HintHandler = {
//   canHandle(handlerInput) {
//     const request = handlerInput.requestEnvelope.request;
//     return request.type === 'IntentRequest' && request.intent.name === 'HintIntent' ;
//   },
//   handle(handlerInput) {
//     //let robotDirection = getRobDirection();
//     let kittenDirection = getKittenDirection();
//     return handlerInput.responseBuilder
//             .speak('Your pretty kitten is at '+kittenDirection+ ' with respect to you.')
//             .reprompt('Say direction ')
//             .getResponse();
//   }
// };

const StoryHandler = {
  canHandle(handlerInput) {
    const request = handlerInput.requestEnvelope.request;
    return request.type === 'IntentRequest' && request.intent.name === 'StoryIntent' ;
  },
  handle(handlerInput) {
    if (supportsDisplay(handlerInput) ) {
      const backgroundImage = new Alexa.ImageHelper()
        .addImageInstance(oi.welcomeToSkillBackgroundImage())
        .getImage();

      const primaryText = new Alexa.RichTextContentHelper()
        .withPrimaryText(oi.introduction().HISTORY_TEXT[0])
        .getTextContent();

      handlerInput.responseBuilder.addRenderTemplateDirective({
        type: 'BodyTemplate1',
        token: 'string',
        backButton: 'HIDDEN',
        backgroundImage: backgroundImage,
        title: 'The Zen Simulation',
        textContent: primaryText,
      });
    }

    return handlerInput.responseBuilder
      .speak(oi.introduction().HISTORY_SPEAK[0])
      .withShouldEndSession(true)
      //.reprompt(oi.welcomeToSkillReprompt())
      //.withStandardCard(skillTitle, welcomeText, oi.welcomeToSkillCardImage().smallImageUrl, oi.welcomeToSkillCardImage().largeImageUrl)
      .getResponse();

    // return handlerInput.responseBuilder
    //         .speak(story)
    //         .reprompt('Say start game to play the game ')
    //         .getResponse();

  }
};

const StartOverHandler =  {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest' && request.intent.name === 'AMAZON.StartOverIntent' ;
    },
    handle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        const responseBuilder = handlerInput.responseBuilder;
        //let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        let say = 'Do you want to restart the game?';
        if (supportsDisplay(handlerInput) ) {
          const backgroundImage = new Alexa.ImageHelper()
            .addImageInstance(oi.welcomeToSkillBackgroundImage())
            .getImage();

          const primaryText = new Alexa.RichTextContentHelper()
            .withPrimaryText(say)
            .getTextContent();

          responseBuilder.addRenderTemplateDirective({
            type: 'BodyTemplate1',
            token: 'string',
            backButton: 'HIDDEN',
            backgroundImage: backgroundImage,
            title: 'Robot Finds Kitten',
            textContent: primaryText,
          });
        }

        return responseBuilder
          .speak(say)
          .reprompt(say)
          .getResponse();
    },
};

const YesHandler =  {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest' && request.intent.name === 'AMAZON.YesIntent' ;
    },
    handle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        const responseBuilder = handlerInput.responseBuilder;
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        return StartGameHandler.handle(handlerInput);

        // let say = 'You said Yes. ';
        // let previousIntent = getPreviousIntent(sessionAttributes);
        //
        // if (previousIntent && !handlerInput.requestEnvelope.session.new) {
        //     say += 'Your last intent was ' + previousIntent + '. ';
        // }

        // return responseBuilder
        //     .speak(say)
        //     .reprompt('try again, ' + say)
        //     .getResponse();
    },
};

const NoHandler =  {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest' && request.intent.name === 'AMAZON.NoIntent' ;
    },
    handle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        const responseBuilder = handlerInput.responseBuilder;
        //let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        let say = 'Thank you for playing. '  + oi.exitSkillMessage();

        return responseBuilder
            .speak(say)
            .withShouldEndSession(true)
            .getResponse();
        //
        // let say = 'You said No. ';
        // let previousIntent = getPreviousIntent(sessionAttributes);
        //
        // if (previousIntent && !handlerInput.requestEnvelope.session.new) {
        //     say += 'Your last intent was ' + previousIntent + '. ';
        // }
        //
        // return responseBuilder
        //     .speak(say)
        //     .reprompt('try again, ' + say)
        //     .getResponse();
    },
};
/*
const AMAZON_MoreIntent_Handler =  {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest' && request.intent.name === 'AMAZON.MoreIntent' ;
    },
    handle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        const responseBuilder = handlerInput.responseBuilder;
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        let say = 'Hello from AMAZON.MoreIntent. ';


        return responseBuilder
            .speak(say)
            .reprompt('try again, ' + say)
            .getResponse();
    },
};

const AMAZON_NavigateHomeIntent_Handler =  {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest' && request.intent.name === 'AMAZON.NavigateHomeIntent' ;
    },
    handle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        const responseBuilder = handlerInput.responseBuilder;
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        let say = 'Hello from AMAZON.NavigateHomeIntent. ';


        return responseBuilder
            .speak(say)
            .reprompt('try again, ' + say)
            .getResponse();
    },
};

const AMAZON_NavigateSettingsIntent_Handler =  {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest' && request.intent.name === 'AMAZON.NavigateSettingsIntent' ;
    },
    handle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        const responseBuilder = handlerInput.responseBuilder;
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        let say = 'Hello from AMAZON.NavigateSettingsIntent. ';


        return responseBuilder
            .speak(say)
            .reprompt('try again, ' + say)
            .getResponse();
    },
};

const AMAZON_NextIntent_Handler =  {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest' && request.intent.name === 'AMAZON.NextIntent' ;
    },
    handle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        const responseBuilder = handlerInput.responseBuilder;
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        let say = 'Hello from AMAZON.NextIntent. ';


        return responseBuilder
            .speak(say)
            .reprompt('try again, ' + say)
            .getResponse();
    },
};

const AMAZON_PageUpIntent_Handler =  {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest' && request.intent.name === 'AMAZON.PageUpIntent' ;
    },
    handle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        const responseBuilder = handlerInput.responseBuilder;
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        let say = 'Hello from AMAZON.PageUpIntent. ';


        return responseBuilder
            .speak(say)
            .reprompt('try again, ' + say)
            .getResponse();
    },
};

const AMAZON_PageDownIntent_Handler =  {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest' && request.intent.name === 'AMAZON.PageDownIntent' ;
    },
    handle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        const responseBuilder = handlerInput.responseBuilder;
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        let say = 'Hello from AMAZON.PageDownIntent. ';


        return responseBuilder
            .speak(say)
            .reprompt('try again, ' + say)
            .getResponse();
    },
};

const AMAZON_PreviousIntent_Handler =  {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest' && request.intent.name === 'AMAZON.PreviousIntent' ;
    },
    handle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        const responseBuilder = handlerInput.responseBuilder;
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        let say = 'Hello from AMAZON.PreviousIntent. ';


        return responseBuilder
            .speak(say)
            .reprompt('try again, ' + say)
            .getResponse();
    },
};

const AMAZON_ScrollRightIntent_Handler =  {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest' && request.intent.name === 'AMAZON.ScrollRightIntent' ;
    },
    handle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        const responseBuilder = handlerInput.responseBuilder;
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        let say = 'Hello from AMAZON.ScrollRightIntent. ';


        return responseBuilder
            .speak(say)
            .reprompt('try again, ' + say)
            .getResponse();
    },
};

const AMAZON_ScrollDownIntent_Handler =  {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest' && request.intent.name === 'AMAZON.ScrollDownIntent' ;
    },
    handle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        const responseBuilder = handlerInput.responseBuilder;
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        let say = 'Hello from AMAZON.ScrollDownIntent. ';


        return responseBuilder
            .speak(say)
            .reprompt('try again, ' + say)
            .getResponse();
    },
};

const AMAZON_ScrollLeftIntent_Handler =  {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest' && request.intent.name === 'AMAZON.ScrollLeftIntent' ;
    },
    handle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        const responseBuilder = handlerInput.responseBuilder;
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        let say = 'Hello from AMAZON.ScrollLeftIntent. ';


        return responseBuilder
            .speak(say)
            .reprompt('try again, ' + say)
            .getResponse();
    },
};

const AMAZON_ScrollUpIntent_Handler =  {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest' && request.intent.name === 'AMAZON.ScrollUpIntent' ;
    },
    handle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        const responseBuilder = handlerInput.responseBuilder;
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        let say = 'Hello from AMAZON.ScrollUpIntent. ';


        return responseBuilder
            .speak(say)
            .reprompt('try again, ' + say)
            .getResponse();
    },
};
*/
const LaunchRequestHandler =  {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'LaunchRequest';
    },
    handle(handlerInput) {
        const responseBuilder = handlerInput.responseBuilder;
        let welcomeText = oi.welcomeToSkillMessage();
        let skillTitle = 'Robot Finds Kitten';

        if (supportsDisplay(handlerInput) ) {
          const backgroundImage = new Alexa.ImageHelper()
            .addImageInstance(oi.welcomeToSkillBackgroundImage())
            .getImage();

          const primaryText = new Alexa.RichTextContentHelper()
            .withPrimaryText(welcomeText)
            .getTextContent();

          responseBuilder.addRenderTemplateDirective({
            type: 'BodyTemplate1',
            token: 'string',
            backButton: 'HIDDEN',
            backgroundImage: backgroundImage,
            title: skillTitle,
            textContent: primaryText,
          });
        }

        return responseBuilder
          .speak(welcomeText)
          .reprompt(oi.welcomeToSkillReprompt())
          .withStandardCard(skillTitle, welcomeText, oi.welcomeToSkillCardImage().smallImageUrl, oi.welcomeToSkillCardImage().largeImageUrl)
          .getResponse();
    },
};

const StartGameHandler =  {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest' && (request.intent.name === 'StartGameIntent' || request.intent.name === 'AMAZON.YesIntent') ;
    },
    handle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        const responseBuilder = handlerInput.responseBuilder;
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        let startText = oi.startGameMessage();
        let skillTitle = 'Robot Finds Kitten';

        let locale = request.locale;

        initializeGame(NKI_COUNT);
        //Important Logs only leftout
        //console.log(nonKittenItems);
        //console.log(robot);
        //console.log(kitten);

        if (supportsDisplay(handlerInput) ) {
          const backgroundImage = new Alexa.ImageHelper()
            .addImageInstance(oi.startGameBackgroundImage())
            .getImage();

          const image = new Alexa.ImageHelper()
            .addImageInstance(oi.startGameImage())
            .getImage();

          const primaryText = new Alexa.RichTextContentHelper()
            .withPrimaryText(startText)
            .getTextContent();

          responseBuilder.addRenderTemplateDirective({
            type: 'BodyTemplate3',
            token: 'string',
            backButton: 'HIDDEN',
            backgroundImage: backgroundImage,
            image: image,
            title: skillTitle,
            textContent: primaryText,
          });
        }

        return responseBuilder
          .speak(startText)
          .reprompt(oi.startGameReprompt())
          .getResponse();
    },
};

const SessionEndedHandler =  {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);
        return handlerInput.responseBuilder.getResponse();
    }
};

const ErrorHandler =  {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        const request = handlerInput.requestEnvelope.request;

        console.log(`Error handled: ${error.message}`);
        // console.log(`Original Request was: ${JSON.stringify(request, null, 2)}`);

        return handlerInput.responseBuilder
            .speak('Sorry, an error occurred.  Please say again.')
            .reprompt('Sorry, an error occurred.  Please say again.')
            .getResponse();
    }
};

const UnhandledIntent = {
  canHandle() {
    return true;
  },
  handle(handlerInput) {
    return handlerInput.responseBuilder
      .speak('Sorry, this is not supported. Please say something else.')
      .reprompt('Sorry, this is not supported. Please say something else.')
      .getResponse();
  },
};


// 2. Constants ===========================================================================

    // Here you can define static data, to be used elsewhere in your code.  For example:
    //    const myString = "Hello World";
    //    const myArray  = [ "orange", "grape", "strawberry" ];
    //    const myObject = { "city": "Boston",  "state":"Massachusetts" };

const APP_ID = 'amzn1.ask.skill.ededf9eb-a1e4-4238-887a-3eb2805c3a2d';  // TODO replace with your Skill ID (OPTIONAL).

// 3.  Helper Functions ===================================================================

function initializeGame(totalNkiCount) {
  nonKittenItems.length = 0;

  for(let i=0;i<=MAX_Y;i++) {
    nonKittenItems[i] = [];
  }

  for (let nkiCount = 0; nkiCount < totalNkiCount; nkiCount++) {
    let x = randomX();
    let y = randomY();

    while (isNkiAtLocation(x, y)) {
      x = randomX();
      y = randomY();
    }
    let nonKittenItem = nki.randomNonKittenItem();
    nonKittenItems[y][x] = { "x" : x, "y" : y, "nki" : nonKittenItem };
  }
  initializeRobot();
  initializeKitten();

  // Important do not delete till confirmed

  // for (let nkiCount = 0; nkiCount < totalNkiCount; nkiCount++) {
  //   var x = randomX();
  //   var y = randomY();
  //
  //   if (!nonKittenItems[y]) {
  //     nonKittenItems[y] = [];
  //   }
  //
  //   while (nonKittenItems[y] && nonKittenItems[y][x]) {
  //     x = randomX();
  //   }
  //
  //   let nonKittenItem = nki.randomNonKittenItem();
  //   nonKittenItems[y][x] = { "x" : x, "y" : y, "nki" : nonKittenItem };
  // }
  //
  // initializeRobot();
  // initializeKitten();

}

function initializeRobot() {
  let x = randomX();
  let y = randomY();
  while (isNkiAtLocation(x, y)) {
    x = randomX();
    y = randomY();
  }
  robot.X = x;
  robot.Y = y;
}

function initializeKitten() {
  let x = randomX();
  let y = randomY();
  while (isNkiAtLocation(x, y) || (robot.X === x && robot.Y === y)) {
    x = randomX();
    y = randomY();
  }
  kitten.X = x;
  kitten.Y = y;
}


function randomX(){
  return Math.floor(Math.random() * (MAX_X+1));
}

function randomY(){
  return Math.floor(Math.random() * (MAX_Y+1));
}

function move(steps, direction) {
//console.log('Moving '+steps+' in '+direction+' direction.');
  switch(direction) {
    case UP:
      return moveRobot(0, -steps);
    case DN:
      return moveRobot(0, steps);
    case LT:
      return moveRobot(-steps, 0);
    case RT:
      return moveRobot(steps, 0);
  }
}

function moveRobot(deltaX, deltaY) {
  let output = {} ;
  let newRobotX = robot.X + deltaX;
  let newRobotY = robot.Y + deltaY;
  //console.log('After moving '+deltaX+' and '+deltaY+' position: '+newRobotX+', '+newRobotY);

  if (((newRobotX > 0) && (newRobotX < MAX_X)) &&
       ((newRobotY > 0) && (newRobotY < MAX_Y))) {  // <= can be replace by <
    robot.X = newRobotX;
    robot.Y = newRobotY;

    if(isNkiAtLocation(newRobotX, newRobotY)) {
      let nki = getNkiAtLocation(newRobotX, newRobotY);
      output = displayNki(nki);
      //console.log('Found Nki '+nki);
    } else if(isKittenAtLocation(newRobotX, newRobotY)) {
      output = foundKitten();
      //console.log('Found kitten');
    } else {
      output = emptyCell();
      //console.log('Found empty cell');
    }
  } else {
    if(newRobotX<0) {
      newRobotX = 0;
    }
    if(newRobotX>MAX_X) {
      newRobotX = MAX_X;
    }
    if(newRobotY<0) {
      newRobotY = 0;
    }
    if(newRobotY>MAX_Y) {
      newRobotY = MAX_Y;
    }

    if(robot.X == newRobotX && robot.Y == newRobotY){
      //console.log('Robot has reached end of the world repeatedly. '+ robot.X +' , '+robot.Y);
      output = borderCell(getNkiAtLocation(newRobotX, newRobotY));
      //output.speak = 'Looks like I have reached end of the world, I cannot move any further. Let us try going in someother direction.';
      //output.text = 'Looks like I have reached end of the world, I cannot move any further. Let us try going in someother direction.';
    } else {
      robot.X = newRobotX;
      robot.Y = newRobotY;

      if(isNkiAtLocation(newRobotX, newRobotY)) {
        let nki = getNkiAtLocation(newRobotX, newRobotY);
        output = displayNki(nki);
      } else if(isKittenAtLocation(newRobotX, newRobotY)) {
        output = foundKitten();
      } else {
        output = emptyCell();
      }

      // if(isNkiAtLocation(newRobotX, newRobotY) && (((newRobotX==0 || newRobotX==MAX_X) && deltaX!=0) || ((newRobotY==0 || newRobotY==MAX_Y) && deltaY!=0))){
      //   console.log('Robot has reached end of the world. '+ robot.X +' , '+robot.Y);
      //   output.speak = 'I have reached end of the world and look what I found here. ' + output.speak;
      //   output.text = 'I have reached end of the world and look what I found here. ' + output.text;
      // }
    }
  }

  if(!output.shouldEndSession) {
    if(isKittenNear(NEAR_BY_DISTANCE)) {
      output.speak += "<prosody volume='medium'><audio src='https://s3.amazonaws.com/ask-soundlibrary/animals/amzn_sfx_cat_meow_1x_01.mp3'/></prosody>";
    }
    if(isKittenNear(CLOSE_DISTANCE)) {
      output.speak += "<prosody volume='x-loud'><audio src='https://s3.amazonaws.com/ask-soundlibrary/animals/amzn_sfx_cat_meow_1x_01.mp3'/>" +
                      "<audio src='https://s3.amazonaws.com/ask-soundlibrary/animals/amzn_sfx_cat_meow_1x_01.mp3'/></prosody>";
    }
  }
  //console.log(output);
  return output;
}

function isNkiAtLocation(x, y) {
  return ((nonKittenItems[y]) !== undefined && (nonKittenItems[y][x] !== undefined));
}

function getNkiAtLocation(x, y) {
  return nonKittenItems[y][x];
}

function isKittenAtLocation(x, y) {
  return (kitten.X === x) && (kitten.Y === y);
}

function displayNki(nki) {
  let output = {};
  output.speak = nki.nki.say;
  output.text = nki.nki.text;
  output.title = 'Robot Finds Kitten';
  if(nki.nki.image=="")
    output.image = oi.nkiImageNotFound();
  else
    output.image = nki.nki.image;
  output.backgroundImage = oi.nkiBackgroundImage();
  output.reprompt = 'Kitten is waiting!';
  output.bodyTemplate = 'BodyTemplate2';
  output.shouldEndSession = false;
  return output;
}

function foundKitten() {
  let output = {};
  output.speak = oi.foundKittenMessage(locale);
  output.text = 'Kitten Found';
  output.title = 'Kitten Found';
  output.image = oi.foundKittenImage();
  output.backgroundImage = oi.nkiBackgroundImage();
  output.reprompt = 'To know the story behind robot finds kitten say tell me the story.';
  output.bodyTemplate = 'BodyTemplate7';
  output.shouldEndSession = true;
  return output;
}

function emptyCell() {
  let output = {};
  output.speak = oi.emptyCellMessage();
  output.text = output.speak;
  output.title = 'Empty!';
  output.image = oi.emptyCellImage();
  output.backgroundImage = oi.nkiBackgroundImage();
  output.reprompt = 'Kitten is waiting!';
  output.bodyTemplate = 'BodyTemplate7';
  output.shouldEndSession = false;
  return output;
}

function borderCell(nki) {
  let output = {};
  output.speak = oi.borderCellMessage();
  output.text = output.speak;
  output.title = 'Border';
  if(nki) {
    if(nki.nki.image=="")
      output.image = oi.nkiImageNotFound();
    else
      output.image = nki.nki.image;
    output.bodyTemplate = 'BodyTemplate2';
  } else {
    output.image = oi.emptyCellImage();
    output.bodyTemplate = 'BodyTemplate7';
  }
  output.backgroundImage = oi.nkiBackgroundImage();
  output.reprompt = "This is end, let's try moving in other direction.";
  output.shouldEndSession = false;
  return output;
}

function isKittenNear(distance) {
   return ((Math.abs(robot.X - kitten.X) <= distance) && (Math.abs(robot.Y - kitten.Y) <= distance));
}

function getKittenDirection() {
  let direction = '';

  if(robot.Y == kitten.Y) {
    if(robot.X - kitten.X > 0) {
        return ' left';
    }
    if(robot.X - kitten.X < 0) {
        return ' right';
    }
  }

  if(robot.X == kitten.X) {
    if(robot.Y - kitten.Y > 0) {
        return ' top';
    }
    if(robot.Y - kitten.Y < 0) {
        return ' bottom';
    }
  }

  if(robot.Y - kitten.Y > 0) {
    direction += 'top';
  }
  if(robot.Y - kitten.Y < 0) {
    direction += 'bottom';
  }
  if(robot.X - kitten.X > 0) {
    direction += ' left';
  }
  if(robot.X - kitten.X < 0) {
    direction += ' right';
  }
  return direction;
}

function supportsDisplay(handlerInput) // returns true if the skill is running on a device with a display (Echo Show, Echo Spot, etc.)
{                                      //  Enable your skill for display as shown here: https://alexa.design/enabledisplay
  const hasDisplay =
  handlerInput.requestEnvelope.context &&
  handlerInput.requestEnvelope.context.System &&
  handlerInput.requestEnvelope.context.System.device &&
  handlerInput.requestEnvelope.context.System.device.supportedInterfaces &&
  handlerInput.requestEnvelope.context.System.device.supportedInterfaces.Display;

  return hasDisplay;
}

function capitalize(myString) {
     return myString.replace(/(?:^|\s)\S/g, function(a) { return a.toUpperCase(); }) ;
}


function randomElement(myArray) {
    return(myArray[Math.floor(Math.random() * myArray.length)]);
}

function getResolvedDirection(direction) {
  switch(direction) {
    case 'up':
      return UP;
    case 'down':
      return DN;
    case 'left':
      return LT;
    case 'right':
      return RT;
  }
}

function stripSpeak(str) {
    return(str.replace('<speak>', '').replace('</speak>', ''));
}






function getSlotValues(filledSlots) {
    const slotValues = {};

    Object.keys(filledSlots).forEach((item) => {
        const name  = filledSlots[item].name;

        if (filledSlots[item] &&
            filledSlots[item].resolutions &&
            filledSlots[item].resolutions.resolutionsPerAuthority[0] &&
            filledSlots[item].resolutions.resolutionsPerAuthority[0].status &&
            filledSlots[item].resolutions.resolutionsPerAuthority[0].status.code) {
            switch (filledSlots[item].resolutions.resolutionsPerAuthority[0].status.code) {
                case 'ER_SUCCESS_MATCH':
                    slotValues[name] = {
                        heardAs: filledSlots[item].value,
                        resolved: filledSlots[item].resolutions.resolutionsPerAuthority[0].values[0].value.name,
                        ERstatus: 'ER_SUCCESS_MATCH'
                    };
                    break;
                case 'ER_SUCCESS_NO_MATCH':
                    slotValues[name] = {
                        heardAs: filledSlots[item].value,
                        resolved: '',
                        ERstatus: 'ER_SUCCESS_NO_MATCH'
                    };
                    break;
                default:
                    break;
            }
        } else {
            slotValues[name] = {
                heardAs: filledSlots[item].value,
                resolved: '',
                ERstatus: ''
            };
        }
    }, this);

    return slotValues;
}

function getExampleSlotValues(intentName, slotName) {

    let examples = [];
    let slotType = '';
    let slotValuesFull = [];

    let intents = model.interactionModel.languageModel.intents;
    for (let i = 0; i < intents.length; i++) {
        if (intents[i].name == intentName) {
            let slots = intents[i].slots;
            for (let j = 0; j < slots.length; j++) {
                if (slots[j].name === slotName) {
                    slotType = slots[j].type;

                }
            }
        }

    }
    let types = model.interactionModel.languageModel.types;
    for (let i = 0; i < types.length; i++) {
        if (types[i].name === slotType) {
            slotValuesFull = types[i].values;
        }
    }


    examples.push(slotValuesFull[0].name.value);
    examples.push(slotValuesFull[1].name.value);
    if (slotValuesFull.length > 2) {
        examples.push(slotValuesFull[2].name.value);
    }


    return examples;
}

function sayArray(myData, penultimateWord = 'and') {
    let result = '';

    myData.forEach(function(element, index, arr) {

        if (index === 0) {
            result = element;
        } else if (index === myData.length - 1) {
            result += ` ${penultimateWord} ${element}`;
        } else {
            result += `, ${element}`;
        }
    });
    return result;
}
// function supportsDisplay(handlerInput) // returns true if the skill is running on a device with a display (Echo Show, Echo Spot, etc.)
// {                                      //  Enable your skill for display as shown here: https://alexa.design/enabledisplay
//     const hasDisplay =
//         handlerInput.requestEnvelope.context &&
//         handlerInput.requestEnvelope.context.System &&
//         handlerInput.requestEnvelope.context.System.device &&
//         handlerInput.requestEnvelope.context.System.device.supportedInterfaces &&
//         handlerInput.requestEnvelope.context.System.device.supportedInterfaces.Display;
//
//     return hasDisplay;
// }

function getCustomIntents() {
    const modelIntents = model.interactionModel.languageModel.intents;

    let customIntents = [];


    for (let i = 0; i < modelIntents.length; i++) {

        if(modelIntents[i].name.substring(0,7) != "AMAZON." && modelIntents[i].name !== "LaunchRequest" ) {
            customIntents.push(modelIntents[i]);
        }
    }
    return customIntents;
}

function getSampleUtterance(intent) {

    return randomElement(intent.samples);

}

function getPreviousIntent(attrs) {

    if (attrs.history && attrs.history.length > 1) {
        return attrs.history[attrs.history.length - 2].IntentRequest;

    } else {
        return false;
    }

}

function getPreviousSpeechOutput(attrs) {

    if (attrs.lastSpeechOutput && attrs.history.length > 1) {
        return attrs.lastSpeechOutput;

    } else {
        return false;
    }

}

function timeDelta(t1, t2) {

    const dt1 = new Date(t1);
    const dt2 = new Date(t2);
    const timeSpanMS = dt2.getTime() - dt1.getTime();
    const span = {
        "timeSpanMIN": Math.floor(timeSpanMS / (1000 * 60 )),
        "timeSpanHR": Math.floor(timeSpanMS / (1000 * 60 * 60)),
        "timeSpanDAY": Math.floor(timeSpanMS / (1000 * 60 * 60 * 24)),
        "timeSpanDesc" : ""
    };


    if (span.timeSpanHR < 2) {
        span.timeSpanDesc = span.timeSpanMIN + " minutes";
    } else if (span.timeSpanDAY < 2) {
        span.timeSpanDesc = span.timeSpanHR + " hours";
    } else {
        span.timeSpanDesc = span.timeSpanDAY + " days";
    }


    return span;

}


const InitMemoryAttributesInterceptor = {
    process(handlerInput) {
        let sessionAttributes = {};
        if(handlerInput.requestEnvelope.session['new']) {

            sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

            let memoryAttributes = getMemoryAttributes();

            if(Object.keys(sessionAttributes).length === 0) {

                Object.keys(memoryAttributes).forEach(function(key) {  // initialize all attributes from global list

                    sessionAttributes[key] = memoryAttributes[key];

                });

            }
            handlerInput.attributesManager.setSessionAttributes(sessionAttributes);


        }
    }
};

const RequestHistoryInterceptor = {
    process(handlerInput) {

        const thisRequest = handlerInput.requestEnvelope.request;
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        let history = sessionAttributes['history'] || [];

        let IntentRequest = {};
        if (thisRequest.type === 'IntentRequest' ) {

            let slots = [];

            IntentRequest = {
                'IntentRequest' : thisRequest.intent.name
            };

            if (thisRequest.intent.slots) {

                for (let slot in thisRequest.intent.slots) {
                    let slotObj = {};
                    slotObj[slot] = thisRequest.intent.slots[slot].value;
                    slots.push(slotObj);
                }

                IntentRequest = {
                    'IntentRequest' : thisRequest.intent.name,
                    'slots' : slots
                };

            }

        } else {
            IntentRequest = {'IntentRequest' : thisRequest.type};
        }
        if(history.length > maxHistorySize - 1) {
            history.shift();
        }
        history.push(IntentRequest);

        handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

    }

};




const RequestPersistenceInterceptor = {
    process(handlerInput) {

        if(handlerInput.requestEnvelope.session['new']) {

            return new Promise((resolve, reject) => {

                handlerInput.attributesManager.getPersistentAttributes()

                    .then((sessionAttributes) => {
                        sessionAttributes = sessionAttributes || {};


                        sessionAttributes['launchCount'] += 1;

                        handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

                        handlerInput.attributesManager.savePersistentAttributes()
                            .then(() => {
                                resolve();
                            })
                            .catch((err) => {
                                reject(err);
                            });
                    });

            });

        } // end session['new']
    }
};


const ResponseRecordSpeechOutputInterceptor = {
    process(handlerInput, responseOutput) {

        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
        let lastSpeechOutput = {
            "outputSpeech":responseOutput.outputSpeech.ssml,
            "reprompt":responseOutput.reprompt.outputSpeech.ssml
        };

        sessionAttributes['lastSpeechOutput'] = lastSpeechOutput;

        handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

    }
};

const ResponsePersistenceInterceptor = {
    process(handlerInput, responseOutput) {

        const ses = (typeof responseOutput.shouldEndSession == "undefined" ? true : responseOutput.shouldEndSession);

        if(ses || handlerInput.requestEnvelope.request.type == 'SessionEndedRequest') { // skill was stopped or timed out

            let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

            sessionAttributes['lastUseTimestamp'] = new Date(handlerInput.requestEnvelope.request.timestamp).getTime();

            handlerInput.attributesManager.setPersistentAttributes(sessionAttributes);

            return new Promise((resolve, reject) => {
                handlerInput.attributesManager.savePersistentAttributes()
                    .then(() => {
                        resolve();
                    })
                    .catch((err) => {
                        reject(err);
                    });

            });

        }

    }
};



// 4. Exports handler function and setup ===================================================
//const skillBuilder = Alexa.SkillBuilders.standard();
const skillBuilder = Alexa.SkillBuilders.custom();
exports.handler = skillBuilder
    .addRequestHandlers(
        CancelHandler,
        HelpHandler,
        StopHandler,
        MoveHandler,
        StartGameHandler,
        StartOverHandler,
        YesHandler,
        NoHandler,
        // AMAZON_MoreIntent_Handler,
        // AMAZON_NavigateHomeIntent_Handler,
        // AMAZON_NavigateSettingsIntent_Handler,
        // AMAZON_NextIntent_Handler,
        // AMAZON_PageUpIntent_Handler,
        // AMAZON_PageDownIntent_Handler,
        // AMAZON_PreviousIntent_Handler,
        // AMAZON_ScrollRightIntent_Handler,
        // AMAZON_ScrollDownIntent_Handler,
        // AMAZON_ScrollLeftIntent_Handler,
        // AMAZON_ScrollUpIntent_Handler,
        StoryHandler,
        LaunchRequestHandler,
        SessionEndedHandler
    )
    .addErrorHandlers(ErrorHandler)
    .addRequestInterceptors(InitMemoryAttributesInterceptor)
    .addRequestInterceptors(RequestHistoryInterceptor)

   // .addResponseInterceptors(ResponseRecordSpeechOutputInterceptor)

 // .addRequestInterceptors(RequestPersistenceInterceptor)
 // .addResponseInterceptors(ResponsePersistenceInterceptor)

 // .withTableName("askMemorySkillTable")
 // .withAutoCreateTable(true)

    .lambda();


// End of Skill code -------------------------------------------------------------
// Static Language Model for reference

const model = {
  "interactionModel": {
    "languageModel": {
      "invocationName": "find kitten",
      "intents": [
        {
          "name": "AMAZON.CancelIntent",
          "samples": []
        },
        {
          "name": "AMAZON.HelpIntent",
          "samples": []
        },
        {
          "name": "AMAZON.StopIntent",
          "samples": []
        },
        {
          "name": "MoveIntent",
          "slots": [
            {
              "name": "stepsCount",
              "type": "AMAZON.NUMBER"
            },
            {
              "name": "direction",
              "type": "DIRECTION"
            }
          ],
          "samples": [
            "move {stepsCount} more",
            "go {stepsCount} steps {direction}",
            "move {direction}"
          ]
        },
        {
          "name": "AMAZON.StartOverIntent",
          "samples": []
        },
        {
          "name": "AMAZON.YesIntent",
          "samples": []
        },
        {
          "name": "AMAZON.NoIntent",
          "samples": []
        },
        {
          "name": "AMAZON.MoreIntent",
          "samples": []
        },
        {
          "name": "AMAZON.NavigateHomeIntent",
          "samples": []
        },
        {
          "name": "AMAZON.NavigateSettingsIntent",
          "samples": []
        },
        {
          "name": "AMAZON.NextIntent",
          "samples": []
        },
        {
          "name": "AMAZON.PageUpIntent",
          "samples": []
        },
        {
          "name": "AMAZON.PageDownIntent",
          "samples": []
        },
        {
          "name": "AMAZON.PreviousIntent",
          "samples": []
        },
        {
          "name": "AMAZON.ScrollRightIntent",
          "samples": []
        },
        {
          "name": "AMAZON.ScrollDownIntent",
          "samples": []
        },
        {
          "name": "AMAZON.ScrollLeftIntent",
          "samples": []
        },
        {
          "name": "AMAZON.ScrollUpIntent",
          "samples": []
        },
        {
          "name": "LaunchRequest"
        }
      ],
      "types": [
        {
          "name": "DIRECTION",
          "values": [
            {
              "name": {
                "value": "right"
              }
            },
            {
              "name": {
                "value": "left"
              }
            },
            {
              "name": {
                "value": "down",
                "synonyms": [
                  "back"
                ]
              }
            },
            {
              "name": {
                "value": "up",
                "synonyms": [
                  "forward"
                ]
              }
            }
          ]
        }
      ]
    }
  }
};
