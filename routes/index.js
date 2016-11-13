var express = require('express');
var router = express.Router();

router.get('/', function(req, res, next) {
  return res.json({'Winter': 'is coming'});
});

module.exports = router;
