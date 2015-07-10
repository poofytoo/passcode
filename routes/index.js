var express = require('express');
var router = express.Router();
var syllable = require('syllable');
var randomWords = require('random-words');

var Firebase = require('firebase');
var fbref = new Firebase('http://miscdata.firebaseio.com');

var wordBank = {}

// Populate the wordbank only on change. Store on server.
fbref.child('wordbank').on('value', function(s) {
  wordBank = s.val()
  console.log('fetched wordbank, got ' + Object.keys(wordBank).length + ' entries')
});

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.get('/submit', function(req, res, next) {
  res.render('submit', {randomwords: randomWords({ exactly: 30, join: ' ' })});
});

router.get('/getsyllables', function(req, res, next) {
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
    var r = Math.random().toString(36).substring(10);
    var key = req.body.main + '_' + r
    wordset[key] = {related: data}
    wordset[key].syllables = req.body.syllables
    wordset[key].approval = Object.keys(data).length

    fbref.child('wordbank').update(wordset);
  }
  res.send('ok');
});

router.get('/scroll/', function(req, res, next) {
  res.send('please use: /scroll/[# players]')
});

router.get('/scroll/:id', function(req, res, next) {
  var wordList = fetchwords(req.params.id)
  var genList = {}
  var players = Array.apply(null, {length: req.params.id}).map(Number.call, Number)
  for (i in wordList) {
    randIndex = Math.floor(Math.random()*players.length)
    count = players[randIndex]
    players.splice(randIndex, 1)
    var role = i.split('_')[0] == 'imposter' ? 'IMPOSTER' : 'MEMBER OF THE UNION'
    genList[count] = {
      word: wordList[i], 
      role: role,
      playernum: (count+1)
    }
  }
  res.render('scroll', {gen: genList})
});

router.get('/getwords/', function(req, res, next) {
  res.send('please use: /getwords/[# players]')
});

router.get('/getwords/:id', function(req, res, next) {
  res.json(fetchwords(req.params.id));
});

var fetchwords = function(players) {
  var minorPlayers = Math.ceil(players/2)-1;
  var majorPlayers = players - minorPlayers;
  var numRelated = minorPlayers;
  var numHQ = 2;

  if (players <= 5) {
    minorPlayers = Math.ceil(players/2)-1
    majorPlayers = players - minorPlayers
    numRelated = minorPlayers + 1
    numHQ = 1
  } 

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

  // Function for founting number of different possible sets
  // Unnecessary and should be removed for prod

  function productRange(a,b) {
    var product=a,i=a;
   
    while (i++<b) {
      product*=i;
    }
    return product;
  }
   
  function combinations(n,k) {
    if (n==k) {
      return 1;
    } else {
      k=Math.max(k,n-k);
      return productRange(k+1,n)/productRange(1,n-k);
    }
  }

  var s = 0;
  for (i in usableBank) {
    n = Object.keys(usableBank[i].related).length
    k = numRelated
    s += combinations(n, k)
  }

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
    roles['imposter_' + i] = selection.syllables
  }

  for (i = 0; i < majorPlayers - numHQ; i ++) {
    roles['minion_' + i] = relatedWords[i]
  }

  for (i = 0; i < numHQ; i ++) {
    roles['hq_' + i] = mainWord.split('_')[0]
  }

  console.log('requested: ' + players + ' players. usable words: ' + usableBankKeys.length + '. unique sets: ' + s)

  return roles;
}

module.exports = router;
