var express = require('express');
var router = express.Router();
var syllable = require('syllable');

var Firebase = require('firebase');
var fbref = new Firebase('http://miscdata.firebaseio.com');

var wordBank = {}

// Populate the wordbank only on change. Store on server.
fbref.child('wordbank').on('value', function(s) {
  wordBank = s.val()
  console.log('fetched wordbank, got ' + Object.keys(wordBank).length)
});

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/submit', function(req, res, next) {
  res.render('submit');
});

router.get('/getsyllables', function(req, res, next) {
  console.log(syllable(req.query.main))
  res.send({s: syllable(req.query.main)})
});

router.post('/submitwords', function(req, res, next) {
  if (req.body.main) {
    var data = {};
    for (i in req.body) {
      if (i != 'main' && i != 'syllables') {
        data[i] = req.body[i]
      }
    }
    var wordset = {}
    var r = Math.random().toString(36).substring(15);
    var key = req.body.main + '_' + r
    wordset[key] = {related: data}
    wordset[key].syllables = req.body.syllables
    wordset[key].approval = Object.keys(data).length

    fbref.child('wordbank').update(wordset);
  }
  res.send({});
});

router.get('/getwords', function(req, res, next) {
  var players = 8;
  var minorPlayers = Math.ceil(players/2)-1
  var majorPlayers = players - minorPlayers
  var numRelated = minorPlayers

  var words = Object.keys(wordBank);
  var mainWord;
  var relatedWords = []
  var selection = {};
  var usableBank = {};
  var roles = {};

  for (i in words) {
    if (wordBank[words[i]].approval >= numRelated) {
      usableBank[words[i]] = wordBank[words[i]]
    }
  }

  var usableBankKeys = Object.keys(usableBank)
  var mainWord = usableBankKeys[Math.floor(Math.random()*usableBankKeys.length)]
  selection = usableBank[mainWord];
  var allRelatedWords = [];

  for (i in selection.related) {
    allRelatedWords.push(selection.related[i])
  }

  for (i = 0; i < numRelated; i++) {
    rIndex = Math.floor(Math.random()*allRelatedWords.length);
    relatedWords.push(allRelatedWords[rIndex])
    allRelatedWords.splice(rIndex, 1)
  }

  for (i = 0; i < minorPlayers; i ++) {
    roles['imposter' + i] = selection.syllables
  }

  for (i = 0; i < majorPlayers - 2; i ++) {
    roles['minion' + i] = relatedWords[i]
  }

  for (i = 0; i < 2; i ++) {
    roles['hq' + i] = mainWord
  }

  res.json(roles)
});

module.exports = router;
