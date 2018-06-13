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

var welcomeToSkill = {
  'WELCOME_MESSAGE' : [
    "Welcome to Robot Finds Kitten. You can directly start playing by saying start game.",
    "Robot Finds Kitten welcomes you! Say start game for playing.",
    "It's Robot Finds Kitten. Say start game for playing.",
    "Robot from Robot Finds Kitten here. Help me find the kitten by saying start game.",
    "I have lost my poor little kitten. Please help me find the kitten by saying start game."
  ],
  'REPROMPT'  : [
    "You can say help if you are stuck.",
    "You can say start game to start a new game.",
    "Poor little kitten needs your help. Please start a game by saying start game.",
    "To know the story behind robot finds kitten say tell me the story.",
    "Say start to start a new game.",
    "Say start to help me find the kitten.",
    "The kitten awaits. Please say start game."
  ],
  'CARD_IMAGE'  : {
    smallImageUrl: "https://s3-eu-west-1.amazonaws.com/robotfindskitten/rfk_logo_small.png",
    largeImageUrl: "https://s3-eu-west-1.amazonaws.com/robotfindskitten/rfk_logo_large.png"
  },
  'BACKGROUND_IMAGE' : [
    'https://s3-eu-west-1.amazonaws.com/robotfindskitten/rfk_bg_01.jpg',
    'https://s3-eu-west-1.amazonaws.com/robotfindskitten/rfk_bg_02.jpg',
    'https://s3-eu-west-1.amazonaws.com/robotfindskitten/rfk_bg_03.jpg',
    'https://s3-eu-west-1.amazonaws.com/robotfindskitten/rfk_bg_04.jpg',
    'https://s3-eu-west-1.amazonaws.com/robotfindskitten/rfk_bg_05.jpg',
    'https://s3-eu-west-1.amazonaws.com/robotfindskitten/rfk_bg_06.jpg',
    'https://s3-eu-west-1.amazonaws.com/robotfindskitten/rfk_bg_07.jpg',
    'https://s3-eu-west-1.amazonaws.com/robotfindskitten/rfk_bg_08.jpg',
  ]
};

var startGame = {
  'START_MESSAGE' : [
    "The lonely kitten sits in the dark somewhere, help me find her by saying something like",
    "Please help me find the kitten by saying something like",
    "My poor little kitten is lost. Help me find her by saying something like",
    "I am looking everywhere but can't find my kitten, help me find her by saying something like",
    "The legendary kitten from Robot Finds Kitten is lost. Help me find her by saying something like",
  ],
  'REPROMPT' : [
    "Help me find the kitten by saying something like",
    "Say something like",
    "You can always say help if you are stuck anywhere. To search further say something like"
  ],
  'MOVE_PHRASE' :[
    "move up, down, left or right.",
    "move two steps up.",
    "go two steps up.",
    "search two steps up.",
    "move two steps down.",
    "go two steps down.",
    "search two steps down.",
    "move two steps left.",
    "go two steps left.",
    "search two steps left.",
    "move two steps right.",
    "go two steps right.",
    "search two steps right.",
  ],
  'BACKGROUND_IMAGE' : [
    'https://s3-eu-west-1.amazonaws.com/robotfindskitten/rfk_bg_game_00.jpg',
    'https://s3-eu-west-1.amazonaws.com/robotfindskitten/rfk_bg_game_01.jpg',
    'https://s3-eu-west-1.amazonaws.com/robotfindskitten/rfk_bg_game_02.jpg',
    'https://s3-eu-west-1.amazonaws.com/robotfindskitten/rfk_bg_game_03.png'
  ],
  'IMAGE' : [
    'https://s3-eu-west-1.amazonaws.com/robotfindskitten/fg_game_00.png'
  ]
};

const correctCons = ["Booya", "All righty", "Bam", "Bazinga", "Bingo", "Boom", "Bravo", "Cha Ching", "Cheers", "Dynomite",
  "Hip hip hooray", "Hurrah", "Hurray", "Huzzah", "Oh dear.  Just kidding.  Hurray", "Kaboom", "Kaching", "Oh snap", "Phew",
  "Righto", "Way to go", "Well done", "Whee", "Woo hoo", "Yay", "Wowza", "Yowsa"];

const wrongCons = ["Argh", "Aw man", "Blarg", "Blast", "Boo", "Bummer", "Darn", "D'oh", "Dun dun dun", "Eek", "Honk", "Le sigh",
  "Mamma mia", "Oh boy", "Oh dear", "Oof", "Ouch", "Ruh roh", "Shucks", "Uh oh", "Wah wah", "Whoops a daisy", "Yikes"];

const frustateCons = ["Argh", "Aw man", "Blarg","Bummer","Darn","D'oh","Le sigh","Shucks"];

const welcomeCons = [
  "Hi!", "Hello!", '<say-as interpret-as="interjection">howdy</say-as>!', "Greetings!", "Hey!", "Howdy-do!", "Hi-ya",
  "Whats up!", "Hey Beautiful!",  '<say-as interpret-as="interjection">Open Sesame!</say-as>' ];

  //knock knock, okey dokey, open sesame, oh boy,no way
  //just kidding, hurray,good luck,ding dong,bon voyage,bingo,bazinga,au revoir

const exitCons = [
  "Bye!", "Good Bye!", "Bye Bye!", "See you later.", "Have a nice day.",
  "Have a good day.", "Have a nice trip.", "Looking forward to our next meet.",
  "Take care.", "Catch you later!",
  "Aloha!", "Adiós!", "Adieu!", "Ciao!", '<say-as interpret-as="interjection">au revoir</say-as>!',
  '<say-as interpret-as="interjection">bon voyage</say-as>!', "Sayonara!", "Shalom!"
];

const emptyCell = {
  'MESSAGE' : [
    "Nothing but an empty cell.",
    "Nothing but en empty cell just like my heart.",
    "There seems to be nothing here.",
    "Can't see nothing, no matter how hard I look.",
    "Seems to be an empty room.",
    "Can't find nothing.",
    "Can't find nothing",
    "This is empty.",
    "This is empty, better to look somewhere else.",
  ],
  'IMAGE' : [
    'https://s3-eu-west-1.amazonaws.com/robotfindskitten/empty_cell_00.jpg',
    'https://s3-eu-west-1.amazonaws.com/robotfindskitten/empty_cell_01.jpg',
    'https://s3-eu-west-1.amazonaws.com/robotfindskitten/empty_cell_02.jpg',
    'https://s3-eu-west-1.amazonaws.com/robotfindskitten/empty_cell_03.jpg'
  ]
};

const borderCell = {
  'MESSAGE' : [
    "Looks like I have reached end of the world. I cannot move any further. Let us try going in some other direction.",
    "Nothing beyond here. Let us try going in some other direction.",
    "Can't move any further. Let us try going in some other direction.",
    "Looks like infinity and beyond. Let us try going in some other direction.",
    "Nothing but empty space here. Let us try going in some other direction.",
    "This is the end. Let us try going in some other direction.",
  ]
};

const nkiImageNotFound = [
  'https://s3-eu-west-1.amazonaws.com/robotfindskitten/not_cat_00.jpg',
  'https://s3-eu-west-1.amazonaws.com/robotfindskitten/not_cat_01.jpg',
  'https://s3-eu-west-1.amazonaws.com/robotfindskitten/not_cat_02.jpg',
];

const nkiBackgroundImage = [
  'https://s3-eu-west-1.amazonaws.com/robotfindskitten/rfk_bg_game_00.jpg',
  //'https://s3-eu-west-1.amazonaws.com/robotfindskitten/rfk_bg_game_02.jpg',
  //'https://s3-eu-west-1.amazonaws.com/robotfindskitten/rfk_bg_game_03.png'
];

const foundKitten = {
  'MESSAGE' : [
    "Found you my love.",
    "I was so lost without you.",
    "Found my poor little fella",
    "I can't believe I found you.",
    "Only you are the love of my life.",
    "I will never ever leave you again.",
    "Never shall I ever leave you again.",
    "The things I been through to find you.",
    "Promise me you will never ever leave me again",
  ],
  'IMAGE' : [
    'https://s3-eu-west-1.amazonaws.com/robotfindskitten/fg_over_01.jpg',
  ],
  'APPLAUSE' :[
    "<audio src='https://s3.amazonaws.com/ask-soundlibrary/human/amzn_sfx_crowd_applause_01.mp3'/>",
    "<audio src='https://s3.amazonaws.com/ask-soundlibrary/human/amzn_sfx_crowd_applause_02.mp3'/>",
    "<audio src='https://s3.amazonaws.com/ask-soundlibrary/human/amzn_sfx_crowd_applause_03.mp3'/>",
    "<audio src='https://s3.amazonaws.com/ask-soundlibrary/human/amzn_sfx_crowd_applause_04.mp3'/>",
    "<audio src='https://s3.amazonaws.com/ask-soundlibrary/human/amzn_sfx_crowd_applause_05.mp3'/>",
    "<audio src='https://s3.amazonaws.com/ask-soundlibrary/human/amzn_sfx_crowd_cheer_med_01.mp3'/>",
    "<audio src='https://s3.amazonaws.com/ask-soundlibrary/human/amzn_sfx_crowd_excited_cheer_01.mp3'/>",
    "<audio src='https://s3.amazonaws.com/ask-soundlibrary/human/amzn_sfx_large_crowd_cheer_01.mp3'/>",
    "<audio src='https://s3.amazonaws.com/ask-soundlibrary/human/amzn_sfx_large_crowd_cheer_02.mp3'/>",
    "<audio src='https://s3.amazonaws.com/ask-soundlibrary/human/amzn_sfx_large_crowd_cheer_03.mp3'/>"
  ],
  'MUSIC': [
    "<audio src='https://s3-eu-west-1.amazonaws.com/robotfindskitten/over_music_01.mp3'/>",
    "<audio src='https://s3-eu-west-1.amazonaws.com/robotfindskitten/over_music_02.mp3'/>",
    "<audio src='https://s3-eu-west-1.amazonaws.com/robotfindskitten/over_music_03.mp3'/>",
    "<audio src='https://s3-eu-west-1.amazonaws.com/robotfindskitten/over_music_04.mp3'/>",
    "<audio src='https://s3-eu-west-1.amazonaws.com/robotfindskitten/over_music_05.mp3'/>",
    "<audio src='https://s3-eu-west-1.amazonaws.com/robotfindskitten/over_music_06.mp3'/>",
    "<audio src='https://s3-eu-west-1.amazonaws.com/robotfindskitten/over_music_07.mp3'/>",
  ],
  'MUSIC_HINDI': [
    "<audio src='https://s3-eu-west-1.amazonaws.com/robotfindskitten/over_music_80.mp3'/>",
    "<audio src='https://s3-eu-west-1.amazonaws.com/robotfindskitten/over_music_81.mp3'/>",
    "<audio src='https://s3-eu-west-1.amazonaws.com/robotfindskitten/over_music_82.mp3'/>",
    "<audio src='https://s3-eu-west-1.amazonaws.com/robotfindskitten/over_music_83.mp3'/>",
    "<audio src='https://s3-eu-west-1.amazonaws.com/robotfindskitten/over_music_84.mp3'/>",

  ]
};

const introduction = {
  'INTRO_TEXT' : [
    "My kitten is lost in a maze. In this game, you must help me (Alexa) find the kitten. "+
    "This task is complicated by the existence of various things which are not kitten."  +
    "The only way to determine if kitten is there is " +
    "to visit the location by saying something like move 2 steps up. The game " +
    "ends when I find the kitten. " +
    "Say start game to start a new game. "+
    "To know the story behind robot finds kitten say tell me the story."
  ],
  'INTRO_SPEAK' : [
    "My kitten is lost in a maze. In this game, you must help me find the kitten. "+
    "This task is complicated by the existence of various things which are not kitten. "  +
    "The only way to determine if kitten is there is " +
    "to visit the location by saying something like move 2 steps up. The game " +
    "ends when I find the kitten. " +
    "Say start game to start a new game. "+
    "To know the story behind robot finds kitten say tell me the story."
  ],
  'HISTORY_TEXT' : [
    "P. A. Peterson II originally stumbled across the " +
    "contest concept 'robotfindskitten' when perusing " +
    "Jake Berendes' web pages in 1996. " +
    "Jake had a contest for his friends called  " +
    "'robotfindskitten', wherein they would submit " +
    "pictures depicting, well, robotfindskitten.  " +
    "<br />  " +
    "Apparently not too many people submitted.  " +
    "<br /> " +
    "Well, ok, two people submitted, but both of those " +
    "were drawings of a robot obliterating a kitten in " +
    "some way. Kitten remained unfound. " +
    "<br />  " +
    "Later, Peterson started 'Nerth Pork', a " +
    "now-defunct webzine. " +
    "Peterson " +
    "thought that moving the 'robotfindskitten' contest " +
    "to Nerth Pork would be useful, fun, and might " +
    "attract submissions.  " +
    "<br />  " +
    "It didn't.  " +
    "<br /> " +
    "Well, not many. " +
    "Leonard Richardson (of Crummy and segfault.org  " +
    "fame) originally wrote 'robotfindskitten' for DOS " +
    "in 1997 as his submission to the robotfindskitten " +
    "contest. It won first prize (the fact that there " +
    "were no other entrants may have had something to " +
    "do with it). " +
    "<br /> " +
    "And then came a PalmOS port. And then a CGI. And " +
    "then Dreamcast. And then GameBoy. And then  " +
    "someone wrote robotfindskitten for an empty pop " +
    "can... you get the idea, and the rest..." +
    "<br />  " +
    "...is history. " +
    "<br />  " +
    "Yet to be written." +
    "<br />  " +
    "Enjoy. "
  ],
  'HISTORY_SPEAK' : [
    "P. A. Peterson II originally stumbled across the " +
    "contest concept 'robot finds kitten' when perusing " +
    "Jake Berendes' web pages in 1996. " +
    "Jake had a contest for his friends called  " +
    "'robot finds kitten', wherein they would submit " +
    "pictures depicting, well, robot finds kitten.  " +
    "<break strength='x-strong'/>  " +
    "Apparently not too many people submitted.  " +
    "<break strength='x-strong'/> " +
    "Well, ok, two people submitted. But both of those " +
    "were drawings of a robot obliterating a kitten in " +
    "some way. Kitten remained unfound. " +
    "<break strength='x-strong'/>  " +
    "Later, Peterson started 'Nerth Pork', a " +
    "now-defunct webzine. " +
    "Peterson " +
    "thought that moving the 'robot finds kitten' contest " +
    "to Nerth Pork would be useful, fun, and might " +
    "attract submissions.  " +
    "<break strength='x-strong'/>  " +
    "It didn't.  " +
    "<break strength='x-strong'/> " +
    "Well, not many. " +
    "Leonard Richardson " +
    "originally wrote 'robot finds kitten' for DOS " +
    "in 1997 as his submission to the robot finds kitten " +
    "contest. It won first prize. " +
    "The fact that there were no other " +
    "entrants may have had something to do with it." +
    "<break strength='x-strong'/> " +
    "And then came a Palm OS port. And then a CGI. And " +
    "then Dreamcast. And then Game Boy. And then  " +
    "someone wrote robot finds kitten for an empty pop " +
    "can. you get the idea, right. And the rest." +
    "<break strength='x-strong'/>  " +
    "is history. " +
    "<break strength='x-strong'/>  " +
    "Yet to be written. " +
    "<break strength='x-strong'/>  " +
    "Enjoy. "
  ]
};

function randomArrayElement(myArray) {
    return(myArray[Math.floor(Math.random() * myArray.length)]);
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]]; // eslint-disable-line no-param-reassign
    }
    return array;
}

module.exports = {
  welcomeToSkillMessage : function() {
    return randomArrayElement(welcomeCons) + ', ' + randomArrayElement(welcomeToSkill.WELCOME_MESSAGE);
  },
  welcomeToSkillReprompt : function() {
    return randomArrayElement(welcomeToSkill.REPROMPT);
  },

  welcomeToSkillCardImage : function()  {
    return welcomeToSkill.CARD_IMAGE;
  },

  welcomeToSkillBackgroundImage : function()  {
    return randomArrayElement(welcomeToSkill.BACKGROUND_IMAGE);
  },

  startGameMessage : function() {
    return randomArrayElement(startGame.START_MESSAGE) + ', ' + randomArrayElement(startGame.MOVE_PHRASE);
  },

  startGameReprompt : function() {
    return  randomArrayElement(startGame.REPROMPT) + ', ' + randomArrayElement(startGame.MOVE_PHRASE);
  },

  startGameBackgroundImage : function() {
    return randomArrayElement(startGame.BACKGROUND_IMAGE);
  },

  startGameImage : function() {
    return randomArrayElement(startGame.IMAGE);
  },

  emptyCellMessage : function() {
    let random_boolean = Math.random() >= 0.5;
    if(random_boolean) {
      return randomArrayElement(frustateCons) + ', ' + randomArrayElement(emptyCell.MESSAGE);
    } else {
      return randomArrayElement(emptyCell.MESSAGE);
    }
  },

  borderCellMessage : function() {
    return randomArrayElement(borderCell.MESSAGE);
  },

  emptyCellImage : function() {
    return randomArrayElement(emptyCell.IMAGE);
  },

  nkiImageNotFound : function() {
    return randomArrayElement(nkiImageNotFound);
  },

  nkiBackgroundImage : function() {
    return randomArrayElement(nkiBackgroundImage);
  },

  foundKittenMessage : function(locale) {
    let message = [];
    // message[0] = randomArrayElement(foundKitten.MESSAGE) + randomArrayElement(foundKitten.MUSIC);
    // message[1] = randomArrayElement(foundKitten.APPLAUSE) + randomArrayElement(foundKitten.MESSAGE);
    // message[2] = randomArrayElement(foundKitten.MUSIC) + randomArrayElement(foundKitten.MESSAGE) + randomArrayElement(foundKitten.APPLAUSE);
    // return randomArrayElement(message);

    message[0] = randomArrayElement(foundKitten.MESSAGE);
    message[1] = randomArrayElement(foundKitten.APPLAUSE);
    if(locale=='en-IN')
      message[2] = randomArrayElement(foundKitten.MUSIC.merge(foundKitten.MUSIC_HINDI));
    else
      message[2] = randomArrayElement(foundKitten.MUSIC);

    message = shuffleArray(message);
    return message[0] + message[1] + message[2];
  },

  foundKittenImage : function() {
    return randomArrayElement(foundKitten.IMAGE);
  },

  exitSkillMessage : function() {
    return randomArrayElement(exitCons);
  },

  welcomeCons : function() {
    return randomArrayElement(welcomeCons);
  },

  introduction : function() {
    return introduction;
  },

  exitCons : function() {
    return randomArrayElement(exitCons);
  },

  correctCons : function() {
    return randomArrayElement(correctCons);
  },

  wrongCons : function() {
    return randomArrayElement(wrongCons);
  }
};
